import { expect } from "@playwright/test";
import routes from "../utilities/routes.js";

const flat = (text) => text.replace(/\s+/g, " ").trim();

const parseFormData = (postData) =>
  Object.fromEntries(
    [...(postData || "").matchAll(/name="([^"]+)"\r?\n\r?\n([^\r\n]*)/g)].map((m) => [m[1], m[2]]),
  );

// "Instant Purchase Order" from a product's row actions on the Products list:
// adds stock with a quantity, a cost per unit and a description. Single
// products save through save_instant_po, products with variants through
// bulk_instant_po (one row per variant). Entries are listed in Reporting →
// Inventory → Instant PO Activity Report.
class InstantPurchaseOrder {
  constructor(page, products) {
    this.page = page;
    this.products = products;

    this.dialog = page.getByRole("dialog").filter({ hasText: "Instant Purchase Order" });
    this.quantityInputs = this.dialog.getByPlaceholder("0", { exact: true });
    this.costInputs = this.dialog.getByPlaceholder("0.00", { exact: true });
    this.description = this.dialog.locator("textarea");
    this.variantSearch = this.dialog.getByPlaceholder("Find a variant by name or UPC");
    this.addBtn = this.dialog.getByRole("button", { name: "Add inventory" });
    this.cancelBtn = this.dialog.getByRole("button", { name: "Cancel", exact: true });
    // The ✕ in the header (an icon button without a label).
    this.closeBtn = this.dialog.locator("button").first();
    this.costRequired = this.dialog.getByText("Cost Per Item is required");
    this.quantityRequired = this.dialog.getByText("Quantity is required");
    this.descriptionRequired = this.dialog.getByText("Description is required");
    this.successToast = page.getByRole("alert").filter({ hasText: "Updated Successfully" }).last();
  }

  async open(productName) {
    await this.products.openRowActions(productName);
    await expect(this.products.instantPoAction.first()).toContainText("Add inventory via quick PO");
    await this.products.instantPoAction.first().click();
    await expect(this.dialog).toBeVisible();
    // The product loads after the dialog opens ("Loading product…").
    await expect(this.quantityInputs.first()).toBeVisible({ timeout: 15_000 });
  }

  async close() {
    await this.cancelBtn.click();
    await expect(this.dialog).toBeHidden();
  }

  // The variant's (or single product's) line inside the dialog.
  line(variantName) {
    if (!variantName) return this.dialog;
    return this.dialog
      .getByText(variantName, { exact: true })
      .locator("xpath=ancestor::*[.//input[@placeholder='0']][1]");
  }

  async currentStock(variantName) {
    const text = flat(await this.line(variantName).innerText());
    return Number(text.match(/Current stock:\s*(-?\d+)\s*units?/)[1]);
  }

  // Quantity and cost are typed: cost is a cents mask ("2.50" is typed 250).
  async fill(index, { qty, cost }) {
    if (qty !== undefined) {
      await this.quantityInputs.nth(index).click();
      await this.page.keyboard.type(String(qty));
    }
    if (cost !== undefined) {
      await this.costInputs.nth(index).click();
      await this.page.keyboard.type(Number(cost).toFixed(2).replace(/\D/g, ""));
      await expect(this.costInputs.nth(index)).toHaveValue(Number(cost).toFixed(2));
    }
  }

  async footer() {
    return flat(await this.dialog.innerText()).match(/(\d+) units? Total \$([\d,.]+)/).slice(1, 3);
  }

  // Clicks Add inventory and returns the request payload and response body.
  async submit({ bulk = false } = {}) {
    const url = bulk ? routes.API_URL.bulkInstantPo_URL : routes.API_URL.saveInstantPo_URL;
    const responsePromise = this.page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url() === url,
      { timeout: 20_000 },
    );
    await this.addBtn.click();
    const response = await responsePromise;
    expect(response.status(), url).toBe(200);
    const body = await response.json();
    expect(body.status, JSON.stringify(body)).toBeTruthy();
    expect(body.message).toBe("Data Saved Successfully");
    await expect(this.successToast).toBeVisible({ timeout: 10_000 });
    await expect(this.dialog).toBeHidden();
    return { payload: parseFormData(response.request().postData()), body };
  }

  // Opens the Instant PO Activity Report for today; returns the API rows.
  // An employee (cashier) login doesn't get the cost columns.
  async openReport({ costColumns = true } = {}) {
    const responsePromise = this.page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url() === routes.API_URL.instantPoReport_URL,
      { timeout: 30_000 },
    );
    await this.page.goto(routes.page_URL.instantPoReport);
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status, JSON.stringify(body).slice(0, 300)).toBeTruthy();
    await expect(this.page.getByText("Instant PO Activity Report").first()).toBeVisible();
    const columns = ["Instant PO Info", "Employee", "Before Adjusted Qty", "Adjusted Qty", "After Adjusted Qty"];
    if (costColumns) columns.push("Per Item Cost", "Total Cost");
    for (const column of columns) {
      await expect(this.page.getByText(column, { exact: true }).first()).toBeVisible();
    }
    return body.result || [];
  }
}

module.exports = { InstantPurchaseOrder };
