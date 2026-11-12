import { test, expect } from "@playwright/test";
import { Products } from "../../pageObjects/Products";
import { InstantPurchaseOrder } from "../../pageObjects/InstantPurchaseOrder";
import { PurchaseOrder } from "../../pageObjects/PurchaseOrder";
import { Vendor } from "../../pageObjects/Vendor";
import { LoginPage } from "../../pageObjects/LoginPage";
import { Dashboard } from "../../pageObjects/Dashboard";
import { navigateToLoginPage } from "../../utilities/helper/navigationHelper";
import merchants from "../../api/testData/merchants.json";
import routes from "../../utilities/routes.js";

// Instant Purchase Order: Products list → row actions → "Instant Purchase
// Order". It adds stock with a quantity, a cost per unit and a description,
// without creating a purchase order; the cost is recorded for the entry only
// (the product's cost doesn't change). Products with variants get one line
// per variant on the same dialog. Entries show in Reporting → Inventory →
// Instant PO Activity Report.
//
// Runs on the Test Automation store, plus one check on Ash Rum (multi-store
// login, QV_MS_USER / QV_MS_PASS), with products each run creates; they are
// deleted in afterAll (report entries stay). Negative stock can't be set from
// the UI (product form and Stocktake take no "-"), so it is a manual case.

const isSave = (req) =>
  [routes.API_URL.saveInstantPo_URL, routes.API_URL.bulkInstantPo_URL].includes(req.url());

async function deleteProducts(page, products, list) {
  page.on("dialog", (dialog) => dialog.accept().catch(() => {}));
  try {
    await page.goto(routes.page_URL.products);
    await products.verifyProductsPageLoaded();
    for (const product of list.filter((p) => p.upc)) {
      await products.searchListing(product.name);
      await products.waitForCatalogIdle();
      if ((await products.productRows.filter({ hasText: product.name }).count()) > 0) {
        await products.deleteProductFromRowActions(product.name);
      }
    }
  } catch (error) {
    console.log(`Cleanup: ${error.message}`);
  }
}

test.describe("Instant Purchase Order", () => {
  test.describe.configure({ mode: "serial", timeout: 150_000 });

  let context;
  let page;
  let dashboard;
  let products;
  let instant;
  let po;
  let vendorName;
  const stamp = Date.now();
  const base = { cost: "2.00", price: "5.00" };
  const single = { ...base, name: `AutoInstantPO Single ${stamp}`, quantity: "5" };
  const untracked = { ...base, name: `AutoInstantPO Untracked ${stamp}`, quantity: "5" };
  const inactive = { ...base, name: `AutoInstantPO Inactive ${stamp}`, quantity: "5" };
  // Below its reorder point with a preferred vendor, so Auto PO offers it.
  const reorder = { ...base, name: `AutoInstantPO Reorder ${stamp}`, quantity: "2", reorderPoint: "5", reorderQty: "10" };
  const variant = {
    name: `AutoInstantPO Variant ${stamp}`,
    cost: "5.00",
    price: "10.00",
    attributes: [{ values: ["V1", "V2"] }],
  };
  const all = [single, untracked, inactive, reorder, variant];

  async function productStockAndCost(product) {
    // From a PO page the sidebar's Products link is hidden; start on the list.
    if (!/\/inventory\/new-products/.test(page.url())) await reloadProducts();
    await products.openEditSingleProduct(product.name);
    const stock = await products.availableToSellInput.inputValue();
    const cost = await products.costInput.inputValue();
    await products.returnToProductsList();
    return { stock, cost };
  }

  async function reloadProducts() {
    await page.goto(routes.page_URL.products);
    await products.verifyProductsPageLoaded();
  }

  async function addInventory(product, { qty, cost, description = "Instant PO automation" }) {
    await instant.open(product.name);
    await instant.fill(0, { qty, cost });
    await instant.description.fill(description);
    return instant.submit();
  }

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();
      dashboard = new Dashboard(page);
      products = new Products(page);
      instant = new InstantPurchaseOrder(page, products);
      po = new PurchaseOrder(page);
      await navigateToLoginPage(page);
      await new LoginPage(page).login(
        merchants.merchantLogin.storename,
        merchants.merchantLogin.username,
        merchants.merchantLogin.password,
      );
      await dashboard.logoDisplayed();
      await dashboard.menuClick();
      await dashboard.inventoryClick();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    test.setTimeout(300_000);
    if (page) await deleteProducts(page, products, all);
    await context?.close();
  });

  test("Create a vendor and the test products", async () => {
    test.setTimeout(600_000);
    await dashboard.vendorsClick();
    const vendor = new Vendor(page);
    vendorName = vendor.generateUniqueVendorName();
    await vendor.createVendor({ vendorName, phone: "5553334455" });

    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();
    for (const product of [single, untracked, inactive, reorder]) {
      await products.reopenAddSingleProductForm();
      await products.addProductWithQuantity(product);
    }
    await products.reopenAddVariantsProductForm();
    await products.addVariantProductWithRequiredFields(variant);
    await products.openEditSingleProduct(untracked.name);
    await products.setToggle(products.trackQuantityOption, false);
    await products.saveEditedProduct();
    await products.openEditSingleProduct(inactive.name);
    await products.setToggle(products.activeOption, false);
    await products.saveEditedProduct();
    await products.changeProductVendors({ product: reorder, add: [vendorName], preferred: vendorName });
  });

  test("Instant PO dialog shows the product and its current stock", async () => {
    await instant.open(single.name);
    await expect(instant.dialog).toContainText("Add inventory to your product with a quick purchase order.");
    await expect(instant.dialog).toContainText(single.name);
    await expect(instant.dialog).toContainText("Single product");
    await expect(instant.dialog).toContainText(`UPC: ${single.upc}`);
    expect(await instant.currentStock()).toBe(5);
    await expect(instant.quantityInputs).toHaveCount(1);
    await expect(instant.costInputs.first()).toHaveValue("");
    expect(await instant.footer()).toEqual(["0", "0.00"]);
  });

  test("Quantity, cost per unit and description are required", async () => {
    let saves = 0;
    const count = (req) => { if (isSave(req)) saves++; };
    page.on("request", count);
    try {
      await instant.addBtn.click();
      await expect(instant.quantityRequired).toBeVisible();
      await expect(instant.costRequired).toBeVisible();
      await expect(instant.descriptionRequired).toBeVisible();

      await instant.fill(0, { qty: 3 });
      await instant.addBtn.click();
      await expect(instant.costRequired).toBeVisible();
      await expect(instant.descriptionRequired).toBeVisible();

      await instant.description.fill("Instant PO automation");
      await instant.addBtn.click();
      await expect(instant.descriptionRequired).toBeHidden();
      await expect(instant.costRequired).toBeVisible();

      await instant.quantityInputs.first().fill("");
      await instant.fill(0, { cost: 2.5 });
      await instant.addBtn.click();
      await expect(instant.quantityRequired).toBeVisible();
      expect(saves, "nothing is saved while a field is missing").toBe(0);
    } finally {
      page.off("request", count);
    }
    await instant.close();
  });

  test("Cancel and ✕ close a filled dialog without saving", async () => {
    let saves = 0;
    const count = (req) => { if (isSave(req)) saves++; };
    page.on("request", count);
    try {
      for (const closeWith of [instant.cancelBtn, instant.closeBtn]) {
        await instant.open(single.name);
        await instant.fill(0, { qty: 3, cost: 2.5 });
        await instant.description.fill("Instant PO automation (not saved)");
        await closeWith.click();
        await expect(instant.dialog).toBeHidden();
        // Opening it again starts empty.
        await instant.open(single.name);
        await expect(instant.quantityInputs.first()).toHaveValue("");
        await expect(instant.costInputs.first()).toHaveValue("");
        await expect(instant.description).toHaveValue("");
        await instant.close();
      }
      expect(saves, "Cancel / ✕ save nothing").toBe(0);
    } finally {
      page.off("request", count);
    }
    expect((await productStockAndCost(single)).stock).toBe("5");
  });

  test("Add inventory adds the quantity to the stock and keeps the product cost", async () => {
    await instant.open(single.name);
    await instant.fill(0, { qty: 3, cost: 2.5 });
    expect(await instant.footer()).toEqual(["3", "7.50"]);
    await instant.description.fill("Instant PO automation");
    const { payload } = await instant.submit();
    expect(payload).toMatchObject({ qty: "3", price: "2.50", description: "Instant PO automation", variant_id: "" });

    expect(await productStockAndCost(single)).toEqual({ stock: "8", cost: "2.00" });
    // The dialog shows the new stock once the Products page reloads.
    await page.reload();
    await products.verifyProductsPageLoaded();
    await instant.open(single.name);
    await expect.poll(() => instant.currentStock(), { message: "dialog current stock" }).toBe(8);
    await instant.close();
  });

  test("Double-clicking Add inventory adds the stock once", async () => {
    let saves = 0;
    const count = (req) => { if (isSave(req)) saves++; };
    await instant.open(single.name);
    await instant.fill(0, { qty: 2, cost: 2 });
    await instant.description.fill("Instant PO automation double click");
    page.on("request", count);
    try {
      const responsePromise = page.waitForResponse((res) => isSave(res.request()), { timeout: 20_000 });
      await instant.addBtn.dblclick();
      await responsePromise;
      await expect(instant.successToast).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(2_000);
      expect(saves, "one save_instant_po call").toBe(1);
    } finally {
      page.off("request", count);
    }
    expect((await productStockAndCost(single)).stock).toBe("10");
  });

  test("Products with variants: one line per variant, each gets its own quantity and cost", async () => {
    await reloadProducts();
    await instant.open(variant.name);
    await expect(instant.dialog).toContainText("2 variants");
    await expect(instant.dialog).toContainText("Add inventory by variant");
    await expect(instant.quantityInputs).toHaveCount(2);
    for (const [i, v] of variant.variantNames.entries()) {
      await expect(instant.line(v)).toContainText(`UPC: ${variant.upcs[i]}`);
      expect(await instant.currentStock(v)).toBe(0);
    }
    await instant.fill(0, { qty: 2, cost: 3 });
    await instant.fill(1, { qty: 1, cost: 4 });
    // 2 × 3.00 + 1 × 4.00
    expect(await instant.footer()).toEqual(["3", "10.00"]);
    await instant.description.fill("Instant PO automation variants");
    const { payload } = await instant.submit({ bulk: true });
    expect(payload.qty).toBe("2,1");
    expect(payload.price).toBe("3.00,4.00");
    expect(payload.variant_id.split(",")).toHaveLength(2);

    await page.reload();
    await products.verifyProductsPageLoaded();
    await instant.open(variant.name);
    await expect.poll(() => instant.currentStock("V1"), { timeout: 15_000 }).toBe(2);
    await expect.poll(() => instant.currentStock("V2"), { timeout: 15_000 }).toBe(1);
    await instant.close();

    // The cost is for the entry only: the variants keep their cost.
    await products.openEditSingleProduct(variant.name);
    for (const v of variant.variantNames) {
      await products.expandVariantRow(v);
      await expect(products.getVariantCard(v).getByPlaceholder("0.00").first(), `${v} cost`).toHaveValue("5.00");
    }
    await products.returnToProductsList();
  });

  test("Variant search finds a variant by name or UPC", async () => {
    await instant.open(variant.name);
    const [v1, v2] = variant.variantNames;
    await instant.variantSearch.fill(v2);
    await expect(instant.dialog.getByText(v2, { exact: true })).toBeVisible();
    await expect(instant.dialog.getByText(v1, { exact: true })).toHaveCount(0);
    await expect(instant.quantityInputs).toHaveCount(1);

    await instant.variantSearch.fill(variant.upcs[0]);
    await expect(instant.dialog.getByText(v1, { exact: true })).toBeVisible();
    await expect(instant.dialog.getByText(v2, { exact: true })).toHaveCount(0);

    await instant.variantSearch.fill("");
    await expect(instant.quantityInputs).toHaveCount(2);
    await instant.close();
  });

  test("Track quantity OFF and inactive products offer Instant PO too", async () => {
    for (const product of [untracked, inactive]) {
      await addInventory(product, { qty: 2, cost: 1 });
      expect((await productStockAndCost(product)).stock, product.name).toBe("7");
    }
  });

  test("Auto PO stops offering a product once Instant PO lifts it above its reorder point", async () => {
    // Stock 2 ≤ reorder point 5: offered with its reorder quantity.
    await po.gotoList();
    await po.openNewForm();
    await po.selectVendor(vendorName);
    const before = await po.runAutoPo();
    expect(before.status, JSON.stringify(before).slice(0, 300)).toBeTruthy();
    await expect(po.lineQty(reorder.name)).toHaveValue("10");
    await po.discardNewForm();

    await reloadProducts();
    await addInventory(reorder, { qty: 5, cost: 2 });

    // Stock 7 > reorder point 5: nothing to reorder.
    await po.gotoList();
    await po.openNewForm();
    await po.selectVendor(vendorName);
    const after = await po.runAutoPo();
    expect(after.status).toBeFalsy();
    expect(after.message).toBe("No eligible products for Auto PO — reorder points not reached.");
    await expect(po.lineRow(reorder.name)).toHaveCount(0);
    await po.discardNewForm();
  });

  test("A purchase order received after an Instant PO adds on top of it", async () => {
    // The PO form sees the Instant PO stock.
    expect((await po.getProductStock(reorder.name)).quantity).toBe(7);
    await po.discardNewForm().catch(() => {});

    const order = { vendor: vendorName, lines: [{ name: reorder.name, qty: 4, cost: 2 }] };
    await po.gotoList();
    await po.openNewForm();
    await po.fillPoForm(order);
    await po.saveNewPo(order, { draft: false });
    await po.receive(order, { [reorder.name]: 4 });
    await po.verifyStatus(order, "Received");

    expect((await productStockAndCost(reorder)).stock).toBe("11");
    await reloadProducts();
    await instant.open(reorder.name);
    await expect.poll(() => instant.currentStock(), { message: "dialog current stock" }).toBe(11);
    await instant.close();
  });

  test("Instant PO while a purchase order is open: receiving it later adds on top", async () => {
    // An Active PO for 4 units, not received yet: stock stays 11.
    const order = { vendor: vendorName, lines: [{ name: reorder.name, qty: 4, cost: 2 }] };
    await po.gotoList();
    await po.openNewForm();
    await po.fillPoForm(order);
    await po.saveNewPo(order, { draft: false });
    await po.verifyStatus(order, "Active");
    expect((await productStockAndCost(reorder)).stock, "an open PO doesn't change stock").toBe("11");

    // Instant PO while the PO is open: 11 + 3.
    await reloadProducts();
    await addInventory(reorder, { qty: 3, cost: 2 });
    expect((await productStockAndCost(reorder)).stock).toBe("14");

    // Receiving the PO now adds its 4 units to the new stock: 14 + 4.
    await po.openPo(order);
    await po.verifyStatus(order, "Active");
    await po.receive(order, { [reorder.name]: 4 });
    await po.verifyStatus(order, "Received");
    expect((await productStockAndCost(reorder)).stock).toBe("18");
    expect((await po.getProductStock(reorder.name)).quantity, "PO form stock").toBe(18);
    await reloadProducts();
    await instant.open(reorder.name);
    await expect.poll(() => instant.currentStock(), { message: "dialog current stock" }).toBe(18);
    await instant.close();
  });

  test("Instant PO Activity Report lists every entry", async () => {
    const rows = await instant.openReport();
    const expected = [
      { title: single.name, variant: "", before: "5", qty: "3", after: "8", price: "2.50", total: "7.5" },
      { title: single.name, variant: "", before: "8", qty: "2", after: "10", price: "2.00", total: "4" },
      { title: variant.name, variant: "V1", before: "0", qty: "2", after: "2", price: "3.00", total: "6" },
      { title: variant.name, variant: "V2", before: "0", qty: "1", after: "1", price: "4.00", total: "4" },
      { title: untracked.name, variant: "", before: "5", qty: "2", after: "7", price: "1.00", total: "2" },
      { title: inactive.name, variant: "", before: "5", qty: "2", after: "7", price: "1.00", total: "2" },
      { title: reorder.name, variant: "", before: "2", qty: "5", after: "7", price: "2.00", total: "10" },
      { title: reorder.name, variant: "", before: "11", qty: "3", after: "14", price: "2.00", total: "6" },
    ];
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    for (const e of expected) {
      const row = rows.find(
        (r) => r.title === e.title && (r.variant || "") === e.variant && r.current_qty === e.before,
      );
      expect(row, `${e.title} ${e.variant} (before ${e.before}) in instant_po_activity_report`).toBeTruthy();
      // real_qty is the product's stock now, not after this entry; the screen
      // shows before + adjusted, checked below.
      expect(row).toMatchObject({ qty: e.qty, price: e.price });
      expect(Number(row.totalcost)).toBe(Number(e.total));
      expect(row.emp_name).toBe("Test Automation");
      const shown = new RegExp(
        `${e.title}${e.variant ? ` ${e.variant}` : ""} \\d{2}/\\d{2}/\\d{4} \\d{1,2}:\\d{2} [AP]M Test Automation ${e.before} ${e.qty} ${e.after} ${e.price.replace(".", "\\.")} \\$${e.total.replace(".", "\\.")}`,
      );
      expect(text, `${e.title} ${e.variant} row on the report`).toMatch(shown);
    }
    // Cancel / ✕ / validation left no extra entry for the single product.
    expect(rows.filter((r) => r.title === single.name)).toHaveLength(2);
  });

  // Fixed by dev: a quantity of 0 used to be saved (single product) or end in
  // "Something Went Wrong!." (variants).
  test("Quantity 0 is rejected: 'Quantity must be greater than 0'", async () => {
    let saves = 0;
    const count = (req) => { if (isSave(req)) saves++; };
    page.on("request", count);
    try {
      await reloadProducts();
      await instant.open(single.name);
      await instant.fill(0, { qty: 0, cost: 3 });
      await instant.description.fill("Instant PO automation qty 0");
      await instant.addBtn.click();
      await expect(instant.quantityAboveZero).toBeVisible();
      await expect(instant.dialog).toBeVisible();
      await instant.close();

      await instant.open(variant.name);
      await instant.fill(0, { qty: 0, cost: 3 });
      await instant.description.fill("Instant PO automation variant qty 0");
      await instant.addBtn.click();
      await expect(instant.quantityAboveZero.first()).toBeVisible();
      await expect(page.getByText(/Something Went Wrong/i)).toHaveCount(0);
      await instant.close();
      expect(saves, "nothing is saved for 0 units").toBe(0);
    } finally {
      page.off("request", count);
    }
    expect((await productStockAndCost(single)).stock, "stock unchanged").toBe("10");
  });
});

test.describe("Instant Purchase Order — Ash Rum", () => {
  test.describe.configure({ mode: "serial", timeout: 300_000 });
  test.skip(
    !process.env.QV_MS_USER || !process.env.QV_MS_PASS,
    "Set QV_MS_USER and QV_MS_PASS for the Ash Rum login",
  );

  let context;
  let page;
  let products;
  let instant;
  const product = { name: `AutoInstantPO Ash ${Date.now()}`, cost: "2.00", price: "5.00", quantity: "5" };

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    context = await browser.newContext();
    page = await context.newPage();
    page.setDefaultNavigationTimeout(60_000);
    products = new Products(page);
    instant = new InstantPurchaseOrder(page, products);
    await navigateToLoginPage(page);
    await new LoginPage(page).login("ash", process.env.QV_MS_USER, process.env.QV_MS_PASS);
    await page.waitForURL(/\/merchants\/dashboard/, { timeout: 60_000, waitUntil: "commit" });
  });

  test.afterAll(async () => {
    test.setTimeout(180_000);
    if (page) await deleteProducts(page, products, [product]);
    await context?.close();
  });

  test("Instant PO on Ash Rum adds the stock and shows on the report", async () => {
    await page.goto(routes.page_URL.products);
    await products.verifyProductsPageLoaded();
    await products.reopenAddSingleProductForm();
    await products.addProductWithQuantity(product);

    await instant.open(product.name);
    await instant.fill(0, { qty: 2, cost: 1.5 });
    await instant.description.fill("Instant PO automation Ash Rum");
    const { payload } = await instant.submit();
    expect(payload).toMatchObject({ qty: "2", price: "1.50", merchant_id: "VIV271990CA" });

    await products.openEditSingleProduct(product.name);
    await expect(products.availableToSellInput).toHaveValue("7");
    await products.returnToProductsList();

    const rows = await instant.openReport();
    const row = rows.find((r) => r.title === product.name);
    console.log(`Ash Rum report row: ${JSON.stringify(row)}`);
    expect(row, `${product.name} in instant_po_activity_report`).toBeTruthy();
    expect(row).toMatchObject({ current_qty: "5", qty: "2", price: "1.50" });
    expect(Number(row.totalcost)).toBe(3);
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    expect(text).toMatch(
      new RegExp(`${product.name} \\d{2}/\\d{2}/\\d{4} \\d{1,2}:\\d{2} [AP]M ${row.emp_name} 5 2 7 1\\.50 \\$3`),
    );
  });
});
