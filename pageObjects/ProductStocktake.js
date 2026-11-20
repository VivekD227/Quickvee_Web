import { expect } from "@playwright/test";
import routes from "../utilities/routes.js";

const flat = (text) => text.replace(/\s+/g, " ").trim();

const parseFormData = (postData) =>
  Object.fromEntries(
    [...(postData || "").matchAll(/name="([^"]+)"\r?\n\r?\n([^\r\n]*)/g)].map((m) => [m[1], m[2]]),
  );

const isStocktakeSave = (res) =>
  res.request().method() === "POST" && res.url() === routes.API_URL.stocktakeSave_URL;

// The "Stocktake" dialog for one product. It opens from the Products list
// (row actions → "Stocktake — Adjust on-hand quantities") or from the product
// edit page (More actions → Stocktake). It sets the new on-hand quantity, with
// an optional note, for a single product or for each variant.
//
// Each saved line is its own create_update_stocktake request, and the server
// records it as a posted walkaround stocktake ("ST0001", ...), so it also shows
// in Stock Control → Stocktake and the Stocktake History Report.
class ProductStocktake {
  constructor(page, products) {
    this.page = page;
    this.products = products;

    this.dialog = page
      .getByRole("dialog")
      .filter({ hasText: "Enter the new on-hand quantity and an optional note for the adjustment." });
    this.title = this.dialog.getByText("Stocktake", { exact: true });
    this.subtitle = this.dialog.getByText(
      "Enter the new on-hand quantity and an optional note for the adjustment.",
    );
    this.quantityInputs = this.dialog.getByPlaceholder("Enter quantity");
    this.noteInputs = this.dialog.getByPlaceholder("Optional note");
    this.updateBtn = this.dialog.getByRole("button", { name: "Update stock" });
    this.cancelBtn = this.dialog.getByRole("button", { name: "Cancel", exact: true });
    // The ✕ in the header (an icon button without a label).
    this.closeBtn = this.dialog.locator("button").first();
    this.counter = this.dialog.getByText(/^\d+ (items?|variants?) updated$/);
    this.successToast = page.getByRole("alert").filter({ hasText: "Updated Successfully" }).last();
    this.moreActionsBtn = page.getByRole("button", { name: "More actions" });
  }

  async openFromRow(productName) {
    await this.products.openRowActions(productName);
    await expect(this.products.stocktakeAction.first()).toContainText("Adjust on-hand quantities");
    await this.products.stocktakeAction.first().click();
    await this.waitLoaded();
  }

  // On the product edit page.
  async openFromEdit() {
    await this.moreActionsBtn.click();
    await this.page.getByRole("button", { name: /^Stocktake/ }).first().click();
    await this.waitLoaded();
  }

  async waitLoaded() {
    await expect(this.dialog).toBeVisible();
    await expect(this.quantityInputs.first()).toBeVisible({ timeout: 15_000 });
    await expect(this.dialog).toContainText(/Currently -?\d+ on hand/);
  }

  async close() {
    await this.cancelBtn.click();
    await expect(this.dialog).toBeHidden();
  }

  // A variant's line in the dialog; the whole dialog for a single product.
  line(variantName) {
    if (!variantName) return this.dialog;
    return this.dialog
      .getByText(variantName, { exact: true })
      .locator("xpath=ancestor::*[.//input[@placeholder='Enter quantity']][1]");
  }

  async lineText(variantName) {
    return flat(await this.line(variantName).innerText());
  }

  async currentOnHand(variantName) {
    const text = await this.lineText(variantName);
    return Number(text.match(/Currently (-?\d+) on hand/)[1]);
  }

  // The "+5" / "-10" badge next to the line, or null when there is none.
  async difference(variantName) {
    const text = await this.lineText(variantName);
    const match = text.match(/on hand ([+-]\d+) New quantity/);
    return match ? match[1] : null;
  }

  async fill(index, qty, note) {
    if (qty !== undefined) await this.quantityInputs.nth(index).fill(String(qty));
    if (note !== undefined) await this.noteInputs.nth(index).fill(note);
  }

  // Types like a user would, so the field's own filtering applies.
  async typeQuantity(index, text) {
    const input = this.quantityInputs.nth(index);
    await input.fill("");
    await input.pressSequentially(String(text));
    return input.inputValue();
  }

  // Clicks Update stock and waits for one create_update_stocktake per changed
  // line. Returns each request's stocktake item and the stocktake id.
  async submit({ requests = 1 } = {}) {
    // Read each body as soon as it arrives: the edit page's refresh after the
    // save discards response bodies that are read later.
    const responses = [];
    const onResponse = (res) => {
      if (!isStocktakeSave(res)) return;
      const saved = this.readSave(res);
      saved.catch(() => {}); // rethrown by Promise.all below
      responses.push(saved);
    };
    // The product edit page refreshes itself right after a save, which can
    // take the toast away before it is seen, so a refresh counts too.
    let refreshed = false;
    const onNavigate = (frame) => {
      if (frame === this.page.mainFrame()) refreshed = true;
    };
    this.page.on("response", onResponse);
    this.page.on("framenavigated", onNavigate);
    try {
      await this.updateBtn.click();
      await expect
        .poll(() => responses.length, { timeout: 20_000, message: "create_update_stocktake requests" })
        .toBeGreaterThanOrEqual(requests);
      await expect
        .poll(async () => refreshed || (await this.successToast.isVisible()), {
          timeout: 10_000,
          message: "'Updated Successfully' toast (or the edit page refreshing)",
        })
        .toBe(true);
      await expect(this.dialog).toBeHidden();
      // On the edit page, let its own refresh finish before the test navigates.
      if (/\/new-products\/edit\//.test(this.page.url())) {
        await expect
          .poll(() => refreshed, { timeout: 15_000, message: "edit page refresh after the save" })
          .toBe(true)
          .catch(() => {});
        await this.page.waitForLoadState("load");
      }
    } finally {
      this.page.off("response", onResponse);
      this.page.off("framenavigated", onNavigate);
    }
    return Promise.all(responses);
  }

  async readSave(res) {
    expect(res.status(), "create_update_stocktake").toBe(200);
    const body = await res.json();
    expect(body.status, JSON.stringify(body)).toBeTruthy();
    expect(body.message).toBe("Stocktake created successfully.");
    const form = parseFormData(res.request().postData());
    const items = Object.values(JSON.parse(form.stocktake_items));
    expect(items, "one stocktake item per request").toHaveLength(1);
    return { form, item: items[0], stocktakeId: String(body.result.stocktake_id) };
  }
}

module.exports = { ProductStocktake };
