import { test, expect } from "@playwright/test";
import { Products } from "../../pageObjects/Products";
import { ProductStocktake } from "../../pageObjects/ProductStocktake";
import { PurchaseOrder } from "../../pageObjects/PurchaseOrder";
import { LoginPage } from "../../pageObjects/LoginPage";
import { navigateToLoginPage } from "../../utilities/helper/navigationHelper";
import merchants from "../../api/testData/merchants.json";
import routes from "../../utilities/routes.js";

// Stocktake from a product: Products list → row actions → "Stocktake", or the
// product edit page → More actions → Stocktake. It sets the new on-hand
// quantity (not a quantity to add) with an optional note. Products with
// variants get one line per variant; each changed line is saved as its own
// posted walkaround stocktake ("ST0001", ...), which shows in Stock Control →
// Stocktake and in Reporting → Inventory → Stocktake History Report. (Audit Log
// checks are left out for now: the Audit Log is still being worked on.)
//
// Runs on the Test Automation store with products each run creates; they are
// deleted in afterAll (stocktakes and the cancelled purchase order used to take
// a product below 0 stay).

test.describe("Product Stocktake", () => {
  test.describe.configure({ mode: "serial", timeout: 150_000 });

  let context;
  let page;
  let products;
  let stocktake;
  const stamp = Date.now();
  const single = { name: `AutoStocktake Single ${stamp}`, cost: "10.00", price: "20.00", quantity: "10" };
  // Taken below 0 through a purchase order, then made inactive.
  const negative = { name: `AutoStocktake Negative ${stamp}`, cost: "2.00", price: "5.00", quantity: "0" };
  const untracked = { name: `AutoStocktake Untracked ${stamp}`, cost: "10.00", price: "20.00", quantity: "5" };
  const variant = {
    name: `AutoStocktake Variant ${stamp}`,
    cost: "5.00",
    price: "10.00",
    attributes: [{ values: ["V1", "V2"] }],
  };
  const created = [];
  // Saved stocktakes the Stock Control and report tests look for.
  const saved = [];

  async function reloadProducts() {
    await page.goto(routes.page_URL.products);
    await products.verifyProductsPageLoaded();
  }

  // Opens the dialog on a freshly loaded Products list: without a reload the
  // dialog keeps the stock from before the last save (see the known bug below).
  async function openFresh(name) {
    await reloadProducts();
    await stocktake.openFromRow(name);
  }

  async function onHand(name) {
    await openFresh(name);
    const qty = await stocktake.currentOnHand();
    await stocktake.close();
    return qty;
  }

  // What Stock Control → Stocktake recorded for a stocktake's product line:
  // expected (the real stock at save time), counted, Δ units and Δ $.
  async function recordedLine(stocktakeId, productName) {
    await page.goto(`${routes.page_URL.stocktakeApp}/${stocktakeId}`);
    await expect(page.getByText(/^ST\d+ · Walkaround · /).first()).toBeVisible({ timeout: 20_000 });
    const line = page
      .getByText(productName, { exact: true })
      .first()
      .locator("xpath=ancestor::*[contains(., 'Gain') or contains(., 'Loss')][1]");
    const text = (await line.innerText()).replace(/\s+/g, " ");
    const m = text.match(/(-?\d+) (-?\d+) ([+-]\d+) (-?)\$([\d,.]+) (Gain|Loss)/);
    expect(m, `stocktake line: ${text}`).toBeTruthy();
    return {
      expected: Number(m[1]),
      counted: Number(m[2]),
      delta: Number(m[3]),
      cost: Number(m[5].replace(/,/g, "")) * (m[4] === "-" ? -1 : 1),
    };
  }

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      // The server dates stocktakes in UTC while date filters (e.g. the report's
      // "Today") use the browser's date; a UTC browser keeps them in step at any
      // time of day.
      context = await browser.newContext({ timezoneId: "UTC" });
      page = await context.newPage();
      products = new Products(page);
      stocktake = new ProductStocktake(page, products);
      await navigateToLoginPage(page);
      await new LoginPage(page).login(
        merchants.merchantLogin.storename,
        merchants.merchantLogin.username,
        merchants.merchantLogin.password,
      );
      // The dashboard keeps loading for a while; navigating away at once can hang.
      await page.waitForURL(/\/merchants\/dashboard/, { timeout: 60_000 });
      await page.waitForTimeout(5_000);
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    test.setTimeout(300_000);
    if (!page) return;
    page.on("dialog", (dialog) => dialog.accept().catch(() => {}));
    try {
      await reloadProducts();
      for (const name of created) {
        await products.searchListing(name);
        await products.waitForCatalogIdle();
        if ((await products.productRows.filter({ hasText: name }).count()) > 0) {
          await products.deleteProductFromRowActions(name);
        }
      }
    } catch (error) {
      console.log(`Cleanup: ${error.message}`);
    }
    await context?.close();
  });

  test("Create the test products", async () => {
    test.setTimeout(400_000);
    await reloadProducts();
    for (const product of [single, untracked, negative]) {
      await products.reopenAddSingleProductForm();
      await products.addProductWithQuantity(product);
      created.push(product.name);
    }
    await products.reopenAddVariantsProductForm();
    await products.addVariantProductWithRequiredFields(variant);
    created.push(variant.name);

    await products.openEditSingleProduct(untracked.name);
    await products.setToggle(products.trackQuantityOption, false);
    await products.saveEditedProduct();
    await reloadProducts();
  });

  test("Row actions offer Stocktake and the dialog shows the product and its stock", async () => {
    await openFresh(single.name);
    await expect(stocktake.title).toBeVisible();
    await expect(stocktake.subtitle).toBeVisible();
    await expect(stocktake.dialog.getByText("Product", { exact: true })).toBeVisible();
    await expect(stocktake.dialog).toContainText("Single product");
    await expect(stocktake.dialog).toContainText(`UPC: ${single.upc}`);
    expect(await stocktake.currentOnHand()).toBe(10);
    await expect(stocktake.dialog.getByText("New quantity", { exact: true })).toBeVisible();
    await expect(stocktake.dialog.getByText("Note", { exact: true })).toBeVisible();
    await expect(stocktake.quantityInputs).toHaveCount(1);
    await expect(stocktake.quantityInputs.first()).toHaveValue("");
    await expect(stocktake.noteInputs.first()).toHaveValue("");
    await expect(stocktake.counter).toHaveText("0 item updated");
    await expect(stocktake.updateBtn).toBeDisabled();
    await expect(stocktake.cancelBtn).toBeEnabled();
    await stocktake.close();
  });

  test("New quantity takes whole numbers only, up to 6 digits", async () => {
    await openFresh(single.name);
    // Letters, the minus sign and the decimal point are dropped while typing.
    expect(await stocktake.typeQuantity(0, "abc")).toBe("");
    await expect(stocktake.updateBtn).toBeDisabled();
    expect(await stocktake.typeQuantity(0, "-5")).toBe("5");
    expect(await stocktake.typeQuantity(0, "2.5")).toBe("25");
    expect(await stocktake.typeQuantity(0, "1234567")).toBe("123456");
    await expect(stocktake.updateBtn).toBeEnabled();
    await stocktake.close();
  });

  test("The difference against the current stock shows while typing", async () => {
    await openFresh(single.name);
    await stocktake.fill(0, 15);
    expect(await stocktake.difference()).toBe("+5");
    await expect(stocktake.counter).toHaveText("1 item updated");
    await stocktake.fill(0, 0);
    expect(await stocktake.difference()).toBe("-10");
    await stocktake.fill(0, 10);
    expect(await stocktake.difference(), "same as current: no badge").toBeNull();
    await stocktake.fill(0, "");
    await expect(stocktake.counter).toHaveText("0 item updated");
    await expect(stocktake.updateBtn).toBeDisabled();
    await stocktake.close();
  });

  test("Cancel and ✕ close a filled dialog without saving", async () => {
    let requests = 0;
    const count = (res) => {
      if (res.url() === routes.API_URL.stocktakeSave_URL) requests++;
    };
    page.on("response", count);

    await openFresh(single.name);
    await stocktake.fill(0, 7, "cancelled");
    await stocktake.close();

    await openFresh(single.name);
    await expect(stocktake.quantityInputs.first(), "reopened empty").toHaveValue("");
    await expect(stocktake.noteInputs.first()).toHaveValue("");
    await stocktake.fill(0, 7);
    await stocktake.closeBtn.click();
    await expect(stocktake.dialog).toBeHidden();

    page.off("response", count);
    expect(requests).toBe(0);
    expect(await onHand(single.name)).toBe(10);
  });

  test("Raising the stock from row actions sets the new on-hand quantity", async () => {
    await openFresh(single.name);
    await stocktake.fill(0, 15, "Stocktake automation +5");
    const [save] = await stocktake.submit();

    expect(save.item).toMatchObject({
      product_name: single.name,
      upc: single.upc,
      current_qty: "10",
      new_qty: "15",
      discrepancy: 5,
      note: "Stocktake automation +5",
      variant_id: "",
    });
    expect(save.form.total_qty).toBe("15");
    expect(save.form.total_discrepancy).toBe("5");
    saved.push({ ...save, before: 10, after: 15, discrepancy: 5, cost: 10 });

    await expect(products.getProductRow(single.name)).toContainText("15 in stock");
    expect(await onHand(single.name)).toBe(15);
  });

  test("Entering the current quantity saves a stocktake with no difference", async () => {
    await openFresh(single.name);
    await stocktake.fill(0, 15);
    await expect(stocktake.counter).toHaveText("1 item updated");
    const [save] = await stocktake.submit();
    expect(save.item).toMatchObject({ current_qty: "15", new_qty: "15", discrepancy: 0 });
    expect(await onHand(single.name)).toBe(15);
  });

  test("Double-clicking Update stock saves once", async () => {
    let requests = 0;
    const count = (res) => {
      if (res.url() === routes.API_URL.stocktakeSave_URL) requests++;
    };
    await openFresh(single.name);
    await stocktake.fill(0, 20);
    page.on("response", count);
    await stocktake.updateBtn.dblclick();
    await expect(stocktake.successToast).toBeVisible({ timeout: 20_000 });
    await expect(stocktake.dialog).toBeHidden();
    await page.waitForTimeout(3_000);
    page.off("response", count);
    expect(requests).toBe(1);
    expect(await onHand(single.name)).toBe(20);
  });

  test("Lowering the stock to 0", async () => {
    await openFresh(single.name);
    await stocktake.fill(0, 0, "Stocktake automation to zero");
    expect(await stocktake.difference()).toBe("-20");
    const [save] = await stocktake.submit();
    expect(save.item).toMatchObject({ current_qty: "20", new_qty: "0", discrepancy: -20 });
    expect(save.form.total_discrepancy).toBe("-20");
    saved.push({ ...save, before: 20, after: 0, discrepancy: -20, cost: 10 });
    expect(await onHand(single.name)).toBe(0);
  });

  test("Edit page: Available to sell is locked and Stocktake updates it", async () => {
    await products.openEditSingleProduct(single.name);
    await expect(products.availableToSellInput).toBeDisabled();
    await expect(products.availableToSellLockedHelper).toBeVisible();
    await expect(products.availableToSellInput).toHaveValue("0");

    await stocktake.openFromEdit();
    await expect(stocktake.dialog).toContainText(single.name);
    expect(await stocktake.currentOnHand()).toBe(0);
    await stocktake.fill(0, 8, "From the edit page");
    const [save] = await stocktake.submit();
    expect(save.item).toMatchObject({ current_qty: "0", new_qty: "8", discrepancy: 8, note: "From the edit page" });
    // The edit page refreshes itself a few seconds after the save.
    await expect(products.availableToSellInput).toHaveValue("8", { timeout: 20_000 });
    await page.waitForLoadState("load");

    // Reopened on the same edit page, the dialog shows the new quantity.
    await stocktake.openFromEdit();
    expect(await stocktake.currentOnHand()).toBe(8);
    await stocktake.close();

    await reloadProducts();
    expect(await onHand(single.name)).toBe(8);
  });

  // Was a bug (reported 19 Nov 2026, fixed on live 20 Nov 2026): the reopened
  // dialog kept the old on-hand quantity until the page was reloaded.
  test("Reopening Stocktake from the Products list after a save shows the new on-hand quantity", async () => {
    await openFresh(single.name);
    expect(await stocktake.currentOnHand()).toBe(8);
    await stocktake.fill(0, 12);
    await stocktake.submit();

    await stocktake.openFromRow(single.name);
    expect(await stocktake.currentOnHand()).toBe(12);
    await stocktake.fill(0, 14);
    expect(await stocktake.difference()).toBe("+2");
    await stocktake.close();
  });

  test("A stale dialog still records the difference against the real stock", async () => {
    const start = await onHand(single.name);
    await openFresh(single.name);
    await stocktake.fill(0, start + 5);
    await stocktake.submit();

    // Reopened at once, before the dialog refreshes: it still shows `start`.
    await stocktake.openFromRow(single.name);
    await stocktake.fill(0, start + 8);
    const [save] = await stocktake.submit();
    expect(await recordedLine(save.stocktakeId, single.name)).toEqual({
      expected: start + 5,
      counted: start + 8,
      delta: 3,
      cost: 30,
    });
    expect(await onHand(single.name)).toBe(start + 8);
  });

  test("Enter in the dialog does not save", async () => {
    let requests = 0;
    const count = (res) => {
      if (res.url() === routes.API_URL.stocktakeSave_URL) requests++;
    };
    const before = await onHand(single.name);
    await openFresh(single.name);
    page.on("response", count);
    await stocktake.fill(0, before + 2, "enter key");
    await stocktake.quantityInputs.first().press("Enter");
    await stocktake.noteInputs.first().press("Enter");
    await page.waitForTimeout(3_000);
    page.off("response", count);
    expect(requests).toBe(0);
    await expect(stocktake.dialog).toBeVisible();
    await expect(stocktake.updateBtn).toBeEnabled();
    await stocktake.close();
    expect(await onHand(single.name)).toBe(before);
  });

  test("Two tabs: the later save wins and is recorded against the real stock", async () => {
    const before = await onHand(single.name);
    const page2 = await context.newPage();
    try {
      const products2 = new Products(page2);
      const stocktake2 = new ProductStocktake(page2, products2);
      await page2.goto(routes.page_URL.products);
      await products2.verifyProductsPageLoaded();
      await stocktake2.openFromRow(single.name);

      await openFresh(single.name);
      await stocktake.fill(0, 30);
      await stocktake.submit();

      await stocktake2.fill(0, 40);
      const [save] = await stocktake2.submit();
      expect(save.item.current_qty, "tab 2 opened before tab 1 saved").toBe(String(before));
      expect(await recordedLine(save.stocktakeId, single.name)).toEqual({
        expected: 30,
        counted: 40,
        delta: 10,
        cost: 100,
      });
    } finally {
      await page2.close();
    }
    expect(await onHand(single.name)).toBe(40);
  });

  test("Purchase Order Add items shows the stocktake quantity", async () => {
    const expected = await onHand(single.name);
    const po = new PurchaseOrder(page);
    expect((await po.getProductStock(single.name)).quantity).toBe(expected);
  });

  test("Negative stock: the dialog shows it and a stocktake brings it back", async () => {
    test.setTimeout(240_000);
    // Receive 3 on a PO, set the stock to 1, then cancel the PO removing the 3
    // received units: stock -2.
    const po = new PurchaseOrder(page);
    await po.openNewForm();
    await po.addProductFromDialog(negative.name);
    await po.setLineQty(negative.name, 3);
    const { body } = await po.submitAndCapture(po.createPoBtn, routes.API_URL.poAdd_URL, "add_new_purchase_order");
    const order = { id: String(body.po_id), number: body.po_number };
    await po.openPo(order);
    await po.openReceiveDialog();
    await po.receiveAllBtn.click();
    await po.submitAndCapture(po.receiveSubmitBtn, routes.API_URL.poReceive_URL, "receive_new_purchase_order");
    await openFresh(negative.name);
    await stocktake.fill(0, 1);
    await stocktake.submit();
    await po.openPo(order);
    await po.cancelPoBtn.click();
    await po.removeStockOption.check();
    await po.submitAndCapture(
      po.cancelPoDialog.getByRole("button", { name: "Cancel PO" }),
      routes.API_URL.poVoid_URL,
      "void_new_purchase_order",
    );

    await openFresh(negative.name);
    expect(await stocktake.currentOnHand()).toBe(-2);
    await stocktake.fill(0, 5);
    expect(await stocktake.difference()).toBe("+7");
    const [save] = await stocktake.submit();
    expect(save.item).toMatchObject({ current_qty: "-2", new_qty: "5", discrepancy: 7 });
    expect(await onHand(negative.name)).toBe(5);
  });

  test("Inactive products offer Stocktake too", async () => {
    await products.openEditSingleProduct(negative.name);
    await products.setToggle(products.activeOption, false);
    await products.saveEditedProduct();
    await openFresh(negative.name);
    await stocktake.fill(0, 6);
    const [save] = await stocktake.submit();
    expect(save.item).toMatchObject({ current_qty: "5", new_qty: "6" });
    expect(await onHand(negative.name)).toBe(6);
  });

  test("Products with variants: one line per variant, each saved on its own", async () => {
    await openFresh(variant.name);
    await expect(stocktake.dialog).toContainText("2 variants");
    await expect(stocktake.quantityInputs).toHaveCount(2);
    expect(await stocktake.currentOnHand("V1")).toBe(0);
    expect(await stocktake.currentOnHand("V2")).toBe(0);
    await expect(stocktake.counter).toHaveText("0 variants updated");

    await stocktake.fill(0, 4, "V1 count");
    await stocktake.fill(1, 6);
    expect(await stocktake.difference("V1")).toBe("+4");
    expect(await stocktake.difference("V2")).toBe("+6");
    await expect(stocktake.counter).toHaveText("2 variants updated");

    const saves = await stocktake.submit({ requests: 2 });
    const byVariant = Object.fromEntries(saves.map((s) => [s.item.variant, s.item]));
    expect(byVariant.V1).toMatchObject({ current_qty: "0", new_qty: "4", discrepancy: 4, note: "V1 count" });
    expect(byVariant.V2).toMatchObject({ current_qty: "0", new_qty: "6", discrepancy: 6 });
    expect(byVariant.V1.product_name).toBe(`${variant.name}~V1`);
    expect(new Set(saves.map((s) => s.stocktakeId)).size, "one stocktake per variant").toBe(2);
    saved.push({ ...saves.find((s) => s.item.variant === "V1"), product: variant.name, variantName: "V1", before: 0, after: 4, discrepancy: 4, cost: 5 });
    saved.push({ ...saves.find((s) => s.item.variant === "V2"), product: variant.name, variantName: "V2", before: 0, after: 6, discrepancy: 6, cost: 5 });

    await openFresh(variant.name);
    expect(await stocktake.currentOnHand("V1")).toBe(4);
    expect(await stocktake.currentOnHand("V2")).toBe(6);
    await stocktake.close();
  });

  test("Products with variants: only the changed variant is saved", async () => {
    await openFresh(variant.name);
    await stocktake.fill(0, 9);
    await expect(stocktake.counter).toHaveText(/^1 variants? updated$/);

    let requests = 0;
    const count = (res) => {
      if (res.url() === routes.API_URL.stocktakeSave_URL) requests++;
    };
    page.on("response", count);
    const [save] = await stocktake.submit();
    await page.waitForTimeout(2_000);
    page.off("response", count);
    expect(requests).toBe(1);
    expect(save.item).toMatchObject({ variant: "V1", current_qty: "4", new_qty: "9", discrepancy: 5 });

    await openFresh(variant.name);
    expect(await stocktake.currentOnHand("V1")).toBe(9);
    expect(await stocktake.currentOnHand("V2")).toBe(6);
    await stocktake.close();
  });

  test("Products with variants: Stocktake from the edit page", async () => {
    await products.openEditSingleProduct(variant.name);
    await stocktake.openFromEdit();
    await expect(stocktake.dialog).toContainText("2 variants");
    await expect(stocktake.quantityInputs).toHaveCount(2);
    expect(await stocktake.currentOnHand("V2")).toBe(6);
    await stocktake.fill(1, 7, "V2 from the edit page");
    const [save] = await stocktake.submit();
    expect(save.item).toMatchObject({ variant: "V2", current_qty: "6", new_qty: "7", note: "V2 from the edit page" });
    await openFresh(variant.name);
    expect(await stocktake.currentOnHand("V1")).toBe(9);
    expect(await stocktake.currentOnHand("V2")).toBe(7);
    await stocktake.close();
  });

  test("Products with variants: lowering both variants at once", async () => {
    await openFresh(variant.name);
    await stocktake.fill(0, 2, "V1 lower");
    await stocktake.fill(1, 3, "V2 lower");
    expect(await stocktake.difference("V1")).toBe("-7");
    expect(await stocktake.difference("V2")).toBe("-4");
    await expect(stocktake.counter).toHaveText("2 variants updated");

    const saves = await stocktake.submit({ requests: 2 });
    const byVariant = Object.fromEntries(saves.map((s) => [s.item.variant, s]));
    expect(byVariant.V1.item).toMatchObject({ current_qty: "9", new_qty: "2", discrepancy: -7, note: "V1 lower" });
    expect(byVariant.V2.item).toMatchObject({ current_qty: "7", new_qty: "3", discrepancy: -4, note: "V2 lower" });
    saved.push({ ...byVariant.V1, product: variant.name, variantName: "V1", before: 9, after: 2, discrepancy: -7, cost: 5 });
    saved.push({ ...byVariant.V2, product: variant.name, variantName: "V2", before: 7, after: 3, discrepancy: -4, cost: 5 });

    await openFresh(variant.name);
    expect(await stocktake.currentOnHand("V1")).toBe(2);
    expect(await stocktake.currentOnHand("V2")).toBe(3);
    await stocktake.close();
  });

  test("Track quantity OFF products offer Stocktake too", async () => {
    await openFresh(untracked.name);
    await expect(stocktake.dialog).toContainText(untracked.name);
    await expect(stocktake.quantityInputs).toHaveCount(1);
    await stocktake.close();
  });

  // Stock Control → Stocktake: each product stocktake is a posted walkaround
  // count, and its detail shows the product line. The list shows 10 a page, so
  // each stocktake is opened by id and then found with the list's search.
  test("Stock Control → Stocktake lists each stocktake with its product line", async () => {
    for (const s of saved) {
      const { stocktakeId, before, after, discrepancy, cost } = s;
      await page.goto(`${routes.page_URL.stocktakeApp}/${stocktakeId}`);
      const header = page.getByText(/^ST\d+ · Walkaround · /).first();
      await expect(header).toBeVisible({ timeout: 20_000 });
      const label = (await header.innerText()).match(/^(ST\d+)/)[1];
      s.label = label;
      await expect(page.locator("body")).toContainText("Posted");
      // The item line (not a table row): product, SKU, expected, counted, Δ, status.
      const line = page
        .getByText(s.product || single.name)
        .first()
        .locator("xpath=ancestor::*[contains(., 'Gain') or contains(., 'Loss')][1]");
      // A variant's line reads "<product> - V1".
      if (s.variantName) await expect(line).toContainText(`${s.product} - ${s.variantName}`);
      await expect(line).toContainText(String(before));
      await expect(line).toContainText(String(after));
      await expect(line).toContainText(`${discrepancy > 0 ? "+" : ""}${discrepancy}`);
      await expect(line).toContainText(`$${Math.abs(discrepancy * cost).toFixed(2)}`);
      await expect(line).toContainText(discrepancy > 0 ? "Gain" : "Loss");

      await page.goto(routes.page_URL.stocktakeApp);
      const searched = page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url() === routes.API_URL.stocktakeAppList_URL &&
          (res.request().postData() || "").includes(`name="search_by"\r\n\r\n${label}\r\n`),
        { timeout: 30_000 },
      );
      await page.getByPlaceholder("Search counts…").fill(label);
      const list = await (await searched).json();
      const item = (list.result || []).find((r) => r.st_id === label);
      expect(item, `${label} in stocktake_list`).toMatchObject({ id: stocktakeId, scope_type: "walkaround" });
      const listRow = page
        .getByText(label, { exact: true })
        .first()
        .locator("xpath=ancestor::*[contains(., 'Walkaround') and contains(., 'Posted')][1]");
      await expect(listRow).toBeVisible();
    }
  });

  // Reporting → Inventory → (report dropdown) Stocktake History Report, today.
  // It lists 10 stocktakes a page, so each one is found with the search box.
  test("Stocktake History Report lists each stocktake", async () => {
    expect(saved.every((s) => s.label), "labels from the Stock Control → Stocktake test").toBe(true);
    const reportCall = (searchBy) =>
      page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url() === routes.API_URL.stocktakeReport_URL &&
          (res.request().postData() || "").includes(`name="search_by"\r\n\r\n${searchBy}\r\n`),
        { timeout: 30_000 },
      );
    const first = reportCall("");
    await page.goto(routes.page_URL.stocktakeHistoryReport);
    expect((await (await first).json()).status).toBeTruthy();
    await expect(page.getByText("Stocktake History Report").first()).toBeVisible();
    const search = page.getByPlaceholder("Search Stocktake by ID or Employee Name");

    for (const { label, stocktakeId, after, discrepancy, cost } of saved) {
      // The report searches on Enter (typing alone doesn't).
      const searched = reportCall(label);
      await search.fill(label);
      await search.press("Enter");
      const body = await (await searched).json();
      expect(body.status, JSON.stringify(body).slice(0, 300)).toBeTruthy();
      const row = body.result.find((r) => r.stocktake === label);
      expect(row, `${label} in stocktake_list`).toBeTruthy();
      expect(row).toMatchObject({ id: Number(stocktakeId), status: "completed", total_quantity: after });
      expect(Number(row.total_discrepancy_cost)).toBe(discrepancy * cost);
      const money = `${discrepancy < 0 ? "-" : ""}$${Math.abs(discrepancy * cost).toFixed(2)}`;
      const shown = page.getByRole("row").filter({ hasText: label });
      await expect(shown).toContainText("Posted");
      await expect(shown).toContainText(money);
    }
  });
});
