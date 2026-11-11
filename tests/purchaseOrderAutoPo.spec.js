import { test, expect } from "@playwright/test";
import { PurchaseOrder } from "../pageObjects/PurchaseOrder";
import { Products } from "../pageObjects/Products";
import { Vendor } from "../pageObjects/Vendor";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import merchants from "../api/testData/merchants.json";
import routes from "../utilities/routes.js";

// Auto PO on the New Purchase Order form. Once a Supplier is chosen an
// "Auto PO" button shows next to Cancel; it adds every product for which that
// supplier is the preferred vendor and whose stock is at or below its reorder
// point. Each line's quantity is the product's reorder quantity (1 when it has
// none) and can be changed; its cost is the vendor's cost per item, or the
// product's cost price when none is set. Products already on an open PO,
// inactive products, products with Track quantity OFF and stock 0 with reorder
// point 0 are offered too. Auto PO appends to the lines already on the form
// and never adds a product twice; changing the Supplier keeps the lines.
//
// Runs on the Test Automation store with vendors and products this run
// creates. Products are deleted in afterAll; the one PO created is cancelled.

test.describe("Purchase Order — Auto PO", () => {
  test.describe.configure({ mode: "serial", timeout: 150_000 });

  let context;
  let page;
  let dashboard;
  let po;
  let products;
  const vendors = {};
  const items = {};
  let openPo;

  const allItems = () => Object.values(items);
  const names = (list) => list.map((item) => item.name);
  // What Auto PO should add for the main vendor, with the expected line values.
  // Products are created with cost price 2.00; only "due" has a vendor cost.
  const mainExpected = () => [
    { item: items.due, qty: "10", cost: "3.50" },
    { item: items.atPoint, qty: "1", cost: "2.00" },
    { item: items.untracked, qty: "4", cost: "2.00" },
    { item: items.zero, qty: "3", cost: "2.00" },
    { item: items.inactive, qty: "2", cost: "2.00" },
  ];
  const notForMain = () => [items.above, items.notPreferred, items.manual];

  async function newFormWithAutoPo(vendorName) {
    await po.gotoList();
    await po.openNewForm();
    await po.selectVendor(vendorName);
    return po.runAutoPo();
  }

  async function expectLines(expected, absent) {
    for (const { item, qty, cost } of expected) {
      await expect(po.lineRow(item.name), `${item.name} should be added by Auto PO`).toBeVisible({
        timeout: 15_000,
      });
      await expect(po.lineQty(item.name), `${item.name} quantity`).toHaveValue(qty);
      await expect(po.lineCost(item.name), `${item.name} cost`).toHaveValue(cost);
    }
    for (const item of absent) {
      await expect(po.lineRow(item.name), `${item.name} should not be added by Auto PO`).toHaveCount(0);
    }
  }

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();
      dashboard = new Dashboard(page);
      po = new PurchaseOrder(page);
      products = new Products(page);
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
    // A test that failed on a filled PO form leaves it open; leaving it asks
    // "Leave page?", which Playwright would otherwise dismiss (staying put).
    page?.on("dialog", (dialog) => dialog.accept().catch(() => {}));
    if (page && openPo?.id) {
      try {
        await po.openPo(openPo);
        if (await po.cancelPoBtn.isVisible().catch(() => false)) await po.cancelPo(openPo);
      } catch (error) {
        console.log(`Cleanup: could not cancel ${openPo.number}: ${error.message}`);
      }
    }
    if (page) {
      try {
        await page.goto(routes.page_URL.products);
        await products.verifyProductsPageLoaded();
        for (const product of allItems().filter((p) => p.upc)) {
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
    await context?.close();
  });

  test("Create three vendors and eight products with stock, reorder settings and vendors", async () => {
    test.setTimeout(900_000);
    const vendor = new Vendor(page);
    await dashboard.vendorsClick();
    for (const key of ["main", "other", "empty"]) {
      vendors[key] = vendor.generateUniqueVendorName();
      await vendor.createVendor({ vendorName: vendors[key], phone: "5553334455" });
    }

    const stamp = Date.now();
    const base = { cost: "2.00", price: "5.00" };
    // Stock at or below the reorder point, main vendor preferred, vendor cost set.
    items.due = { ...base, name: `AutoPO Due ${stamp}`, quantity: "2", reorderPoint: "5", reorderQty: "10" };
    // Stock equal to the reorder point, no reorder quantity.
    items.atPoint = { ...base, name: `AutoPO AtPoint ${stamp}`, quantity: "5", reorderPoint: "5" };
    // Stock above the reorder point.
    items.above = { ...base, name: `AutoPO Above ${stamp}`, quantity: "10", reorderPoint: "5", reorderQty: "8" };
    // Main vendor assigned but the other vendor is preferred.
    items.notPreferred = { ...base, name: `AutoPO NotPref ${stamp}`, quantity: "0", reorderPoint: "5", reorderQty: "6" };
    // Track quantity OFF.
    items.untracked = { ...base, name: `AutoPO Untracked ${stamp}`, quantity: "0", reorderPoint: "5", reorderQty: "4" };
    // Stock 0 with reorder point 0 (0 is at the reorder point).
    items.zero = { ...base, name: `AutoPO Zero ${stamp}`, quantity: "0", reorderPoint: "0", reorderQty: "3" };
    // Inactive product.
    items.inactive = { ...base, name: `AutoPO Inactive ${stamp}`, quantity: "1", reorderPoint: "5", reorderQty: "2" };
    // No vendor; only ever added by hand.
    items.manual = { ...base, name: `AutoPO Manual ${stamp}`, quantity: "10" };

    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();
    for (const product of allItems()) {
      await products.reopenAddSingleProductForm();
      await products.addProductWithQuantity(product);
    }

    await products.openEditSingleProduct(items.untracked.name);
    await products.setToggle(products.trackQuantityOption, false);
    await products.saveEditedProduct();
    await products.openEditSingleProduct(items.inactive.name);
    await products.setToggle(products.activeOption, false);
    await products.saveEditedProduct();

    await products.changeProductVendors({
      product: items.due,
      add: [vendors.main],
      preferred: vendors.main,
      costs: { [vendors.main]: "3.50" },
    });
    for (const product of [items.atPoint, items.above, items.untracked, items.zero, items.inactive]) {
      await products.changeProductVendors({ product, add: [vendors.main], preferred: vendors.main });
    }
    await products.changeProductVendors({
      product: items.notPreferred,
      add: [vendors.main, vendors.other],
      preferred: vendors.other,
    });
  });

  test("Auto PO shows only after a Supplier is chosen", async () => {
    await po.gotoList();
    await po.openNewForm();
    await expect(po.autoPoBtn).toHaveCount(0);
    await po.selectVendor(vendors.main);
    await expect(po.autoPoBtn).toBeVisible();
    await expect(po.autoPoBtn).toBeEnabled();
  });

  test("Auto PO adds the supplier's preferred products at or below the reorder point", async () => {
    const body = await po.runAutoPo();
    expect(body.status, `auto_po_list: ${JSON.stringify(body).slice(0, 300)}`).toBeTruthy();
    await expectLines(mainExpected(), notForMain());
    await expect(po.noProductsYet).toHaveCount(0);
  });

  test("Auto PO quantities and costs can be changed and the totals follow", async () => {
    await po.setLineQty(items.due.name, 7);
    await po.setLineQty(items.atPoint.name, 3);
    await po.setLineCost(items.atPoint.name, 1.25);
    // 7 × 3.50 + 3 × 1.25 + (4 + 3 + 2) × 2.00
    await po.verifyTotals(19, "46.25");
    await po.discardNewForm();
  });

  test("Auto PO keeps lines already on the form and doesn't add them twice", async () => {
    await po.gotoList();
    await po.openNewForm();
    await po.addProductFromDialog(items.manual.name);
    await po.setLineQty(items.manual.name, 5);
    await po.addProductFromDialog(items.due.name);
    await po.setLineQty(items.due.name, 3);
    await po.selectVendor(vendors.main);
    for (let click = 1; click <= 2; click++) {
      await po.runAutoPo();
      // Lines added by hand keep their quantity and cost (Due keeps its
      // product cost 2.00, not the vendor cost); the rest are appended.
      await expectLines(
        [
          { item: items.manual, qty: "5", cost: "2.00" },
          { item: items.due, qty: "3", cost: "2.00" },
          ...mainExpected().filter((line) => line.item !== items.due),
        ],
        [items.above, items.notPreferred],
      );
      await expect(page.getByText(items.due.name, { exact: true }), `Due once (click ${click})`).toHaveCount(1);
      // (5 + 3 + 1 + 4 + 3 + 2) × 2.00
      await po.verifyTotals(18, "36.00");
    }
  });

  test("Changing the Supplier keeps the lines; Auto PO then adds the new supplier's products", async () => {
    await po.selectVendor(vendors.other);
    await expect(po.unsavedDialog).toHaveCount(0);
    await po.verifyTotals(18, "36.00");
    await po.runAutoPo();
    await expectLines(
      [
        { item: items.manual, qty: "5", cost: "2.00" },
        { item: items.due, qty: "3", cost: "2.00" },
        ...mainExpected().filter((line) => line.item !== items.due),
        { item: items.notPreferred, qty: "6", cost: "2.00" },
      ],
      [items.above],
    );
    // + 6 × 2.00
    await po.verifyTotals(24, "48.00");
    await po.discardNewForm();
  });

  test("Auto PO for another supplier adds only its own preferred products", async () => {
    const body = await newFormWithAutoPo(vendors.other);
    expect(body.status, `auto_po_list: ${JSON.stringify(body).slice(0, 300)}`).toBeTruthy();
    await expectLines(
      [{ item: items.notPreferred, qty: "6", cost: "2.00" }],
      [items.due, items.atPoint, items.above, items.untracked, items.zero, items.inactive, items.manual],
    );
    await po.discardNewForm();
  });

  test("Auto PO for a supplier with no matching products adds nothing", async () => {
    const body = await newFormWithAutoPo(vendors.empty);
    expect(body.status).toBeFalsy();
    expect(body.message).toBe("No Product List Found");
    await expect(po.noProductsYet).toBeVisible();
    await po.verifyTotals(0, "0.00");
    await po.discardNewForm();
  });

  test("A product already on an open PO is still offered by Auto PO", async () => {
    await newFormWithAutoPo(vendors.main);
    await expectLines(mainExpected(), []);
    const order = await po.lineNames(names(mainExpected().map((line) => line.item)));
    const lines = [];
    for (const name of order) {
      lines.push({
        name,
        qty: Number(await po.lineQty(name).inputValue()),
        cost: Number(await po.lineCost(name).inputValue()),
      });
    }
    openPo = { number: po.generatePoNumber("AutoPOA"), vendor: vendors.main, lines };
    await po.setPoNumber(openPo.number);
    await po.saveNewPo(openPo, { draft: false });
    await po.verifyStatus(openPo, "Active");

    await newFormWithAutoPo(vendors.main);
    await expectLines(mainExpected(), notForMain());
    await po.discardNewForm();
  });
});
