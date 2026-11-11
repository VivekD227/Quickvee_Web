import { test, expect } from "@playwright/test";
import { PurchaseOrder } from "../pageObjects/PurchaseOrder";
import { Products } from "../pageObjects/Products";
import { Vendor } from "../pageObjects/Vendor";
import { Lottery } from "../pageObjects/Lottery";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import merchants from "../api/testData/merchants.json";
import routes from "../utilities/routes.js";
import sessionDataStorage from "../utilities/helper/sessionDataStorage";

// Multi-line, variant, cancel-after-receive, double-click, KPI, vendor filter
// and other edge cases for purchase orders. Runs on the Test Automation store
// with a vendor and products this run creates.

test.describe("Purchase Order — advanced", () => {
  test.describe.configure({ mode: "serial", timeout: 150_000 });

  let context;
  let page;
  let dashboard;
  let po;
  let products;
  let vendorName;
  let single;
  let variant;
  let untracked;
  let multiPo;
  let kpiBefore;
  const kpi = () => {
    const data = sessionDataStorage.get("po_kpiAPI").data;
    return { open: Number(data.open_po_count), units: Number(data.total_units) };
  };

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
    test.setTimeout(180_000);
    if (page) {
      try {
        await page.goto(routes.page_URL.products);
        await products.verifyProductsPageLoaded();
        for (const product of [single, variant, untracked].filter((p) => p?.upc)) {
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

  test("Create a vendor, a product, a 2-variant product and an untracked product", async () => {
    const vendor = new Vendor(page);
    await dashboard.vendorsClick();
    vendorName = vendor.generateUniqueVendorName();
    await vendor.createVendor({ vendorName, phone: "5553334455" });

    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();
    const stamp = Date.now();
    single = { name: `Auto PO Single ${stamp}`, cost: "4.00", price: "9.00" };
    untracked = { name: `Auto PO Untracked ${stamp}`, cost: "3.00", price: "6.00" };
    variant = {
      name: `Auto PO Variant ${stamp}`,
      cost: "5.00",
      price: "10.00",
      attributes: [{ values: ["V1", "V2"] }],
    };
    for (const product of [single, untracked]) {
      await products.reopenAddSingleProductForm();
      await products.addSingleProductWithRequiredFieldsAndVerifyMarginProfit(product);
    }
    await products.reopenAddVariantsProductForm();
    await products.addVariantProductWithRequiredFields(variant);
    await products.openEditSingleProduct(untracked.name);
    await products.setToggle(products.trackQuantityOption, false);
    await products.saveEditedProduct();
  });

  test.describe("Multi-line and variants", () => {
    test("Variants are listed under their product in Add items", async () => {
      await po.openNewForm();
      await po.addItemsBtn.click();
      await po.addItemsSearch.fill(variant.name);
      await expect(
        po.addItemsDialog.getByRole("button", { name: new RegExp(`^${variant.name} 2 variants`) }),
      ).toBeVisible({ timeout: 15_000 });
      for (const [i, v] of variant.variantNames.entries()) {
        await expect(po.variantOption(v)).toContainText(variant.upcs[i]);
        await expect(po.variantOption(v)).toContainText("Qty: 0");
      }
      await page.keyboard.press("Escape");
    });

    test("Multi-line PO: totals, 'On PO' badge, remove line", async () => {
      await po.openNewForm();
      await po.addVariantsFromDialog(variant.name, variant.variantNames);
      await po.addProductFromDialog(single.name);
      await po.verifyTotals(3, "14.00");

      // A product already on the PO is marked "On PO" and can't be picked again.
      await po.addItemsBtn.click();
      await po.addItemsSearch.fill(single.name);
      const option = po.addItemsDialog.getByRole("button", { name: new RegExp(single.name) }).first();
      await expect(option).toContainText("On PO", { timeout: 15_000 });
      await option.click();
      await expect(po.addSelectedBtn).toHaveCount(0);
      await expect(po.addItemsDialog.getByRole("button", { name: "Add to PO", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(po.addItemsDialog).toBeHidden();
      await expect(page.getByText(single.name, { exact: true })).toHaveCount(1);
      await expect(po.lineQty(single.name)).toHaveValue("1");

      await page.getByRole("button", { name: `Remove ${single.name}` }).click();
      await po.verifyTotals(2, "10.00");
      for (const v of variant.variantNames) {
        await page.getByRole("button", { name: `Remove ${variant.name} / ${v}` }).click();
      }
      await expect(po.noProductsYet).toBeVisible();
      await expect(po.createPoBtn).toBeDisabled();
      await expect(po.saveDraftBtn).toBeDisabled();
    });

    test("Receiving one line of a multi-line PO only adds that line's stock and updates KPIs", async () => {
      const lineV1 = `${variant.name} / V1`;
      const lineV2 = `${variant.name} / V2`;
      multiPo = {
        vendor: vendorName,
        lines: [
          { name: lineV1, qty: 4, cost: 5 },
          { name: lineV2, qty: 3, cost: 5 },
          { name: single.name, qty: 2, cost: 4 },
        ],
      };
      await po.gotoList();
      kpiBefore = kpi();
      await po.openNewForm();
      await po.addVariantsFromDialog(variant.name, variant.variantNames);
      await po.addProductFromDialog(single.name);
      for (const line of multiPo.lines) {
        await po.setLineQty(line.name, line.qty);
        await po.setLineCost(line.name, line.cost);
      }
      multiPo.number = po.generatePoNumber("AutoPOML");
      await po.setPoNumber(multiPo.number);
      await po.selectVendor(vendorName);
      await po.saveNewPo(multiPo, { draft: false });
      await po.verifyDetailData(multiPo);
      await po.gotoList();
      expect(kpi(), "KPIs after creating a 9-unit PO").toEqual({
        open: kpiBefore.open + 1,
        units: kpiBefore.units + 9,
      });

      await po.openPo(multiPo);
      await po.receive(multiPo, { [lineV1]: 2 });
      await po.verifyStatus(multiPo, "Partial");
      await expect(page.getByText(/Affected lines:\s*1/).first()).toBeVisible();
      const variantStock = await po.getVariantStock(variant.name, variant.variantNames);
      expect(variantStock).toEqual({ V1: 2, V2: 0 });
      expect((await po.getProductStock(single.name)).quantity).toBe(0);
      await po.gotoList();
      // "Across N purchase orders" counts Active POs only (a Partial one drops
      // out), while units incoming still include a Partial PO's pending units.
      expect(kpi(), "Units incoming drop by the received units").toEqual({
        open: kpiBefore.open,
        units: kpiBefore.units + 7,
      });
    });

    test("Cancelling a partial PO keeps the received stock", async () => {
      await po.openPo(multiPo);
      await po.cancelPo(multiPo);
      await po.openPo(multiPo);
      await po.verifyStatus(multiPo, "Cancelled");
      await po.verifyActions([], ["Receive units", "Cancel PO", "Edit"]);
      const variantStock = await po.getVariantStock(variant.name, variant.variantNames);
      expect(variantStock, "Received units stay in stock after cancel").toEqual({ V1: 2, V2: 0 });
      await po.gotoList();
      expect(kpi(), "A cancelled PO leaves the open KPIs").toEqual(kpiBefore);
    });
  });

  test.describe("Double clicks", () => {
    test("Double-clicking Create PO creates one purchase order", async () => {
      const dc = { lines: [{ name: single.name, qty: 2, cost: 4 }] };
      await po.openNewForm();
      await po.fillPoForm(dc);
      let adds = 0;
      const count = (req) => { if (req.method() === "POST" && req.url() === routes.API_URL.poAdd_URL) adds += 1; };
      page.on("request", count);
      await po.createPoBtn.dblclick();
      await expect(page).toHaveURL(/\/purchase-order\/\d+$/, { timeout: 20_000 });
      await page.waitForTimeout(3_000);
      page.off("request", count);
      expect(adds, "add_new_purchase_order calls").toBe(1);
      dc.id = page.url().match(/(\d+)$/)[1];
      await po.gotoList();
      await po.selectTab("All");
      await po.verifySearchShows(dc.number, [dc.number]);
      sessionDataStorage.set("po_dblclick", dc);
    });

    test("Double-clicking Receive receives once", async () => {
      const dc = sessionDataStorage.get("po_dblclick");
      const before = (await po.getProductStock(single.name)).quantity;
      await po.openPo(dc);
      await po.openReceiveDialog();
      await po.receiveAllBtn.click();
      let receives = 0;
      const count = (req) => { if (req.method() === "POST" && req.url() === routes.API_URL.poReceive_URL) receives += 1; };
      page.on("request", count);
      await po.receiveSubmitBtn.dblclick();
      await expect(po.receiveDialog).toBeHidden({ timeout: 15_000 });
      await page.waitForTimeout(3_000);
      page.off("request", count);
      expect(receives, "receive_new_purchase_order calls").toBe(1);
      expect((await po.getProductStock(single.name)).quantity).toBe(before + 2);
    });
  });

  test.describe("Received PO", () => {
    test("Adding a new line to a received PO re-opens it and the line can be received", async () => {
      const dc = sessionDataStorage.get("po_dblclick");
      dc.lines[0].received = 2;
      await po.openPo(dc);
      await po.verifyStatus(dc, "Received");
      await po.startEdit();
      await po.addProductFromDialog(untracked.name);
      await expect(po.lineQty(untracked.name, true)).toHaveValue("1");
      await po.setLineQty(untracked.name, 2, true);
      await po.saveEdit();
      dc.lines.push({ name: untracked.name, qty: 2, cost: Number(untracked.cost) });
      await po.openPo(dc);
      await po.verifyStatus(dc, "Partial");
      await po.verifyDetailData(dc);

      // Current behaviour: receiving a product with Track quantity OFF still
      // adds to its quantity.
      const before = await po.getProductStock(untracked.name);
      await po.openPo(dc);
      await po.receive(dc, { [untracked.name]: 2 });
      await po.verifyStatus(dc, "Received");
      const after = await po.getProductStock(untracked.name);
      expect(after.quantity).toBe(before.quantity + 2);
    });
  });

  test.describe("List", () => {
    test("Vendor filter shows only that vendor's purchase orders", async () => {
      // An active PO for the run's vendor, cancelled again at the end.
      const vendorPo = { vendor: vendorName, lines: [{ name: single.name, qty: 1, cost: 4 }] };
      await po.openNewForm();
      await po.fillPoForm(vendorPo);
      await po.saveNewPo(vendorPo, { draft: false });
      try {
        await po.gotoList();
        await po.selectTab("All");
        const listPromise = po.waitForApi(routes.API_URL.poList_URL, 15_000);
        await po.vendorFilterBtn.click();
        const search = page.getByRole("textbox", { name: /Search vendors/i });
        if (await search.isVisible().catch(() => false)) await search.fill(vendorName);
        await page.getByRole("button", { name: vendorName, exact: true }).last().click();
        const body = await po.readApi(await listPromise, "PO list (vendor filter)");
        const numbers = body.data.map((d) => d.po_number);
        expect(numbers, "Active PO of the vendor").toContain(vendorPo.number);
        for (const d of body.data) expect(d.vendor_name).toBe(vendorName);
        await expect(po.row(vendorPo.number)).toBeVisible({ timeout: 15_000 });
        await expect(po.rows).toHaveCount(numbers.length);
      } finally {
        await po.openPo(vendorPo);
        await po.cancelPo(vendorPo);
      }
    });

    test("Search inside a status tab and clear it", async () => {
      await po.gotoList();
      if ((await po.vendorFilterBtn.count()) === 0) {
        // The vendor filter is remembered: put it back to All vendors.
        await page.getByRole("button", { name: vendorName, exact: true }).first().click();
        await page.getByRole("button", { name: "All vendors", exact: true }).last().click();
        await expect(po.vendorFilterBtn).toBeVisible();
      }
      await po.selectTab("Cancelled");
      await po.verifySearchShows(multiPo.number, [multiPo.number]);
      await po.selectTab("Received");
      await po.verifySearchNoMatch(multiPo.number);
      await po.search("");
      await expect(po.rows.first()).toBeVisible({ timeout: 15_000 });
      await po.selectTab("All");
    });
  });

  test.describe("Other", () => {
    test("Add columns shows the selling price", async () => {
      await po.openPo(multiPo);
      await expect(page.getByText(/^Selling price$/i)).toHaveCount(0);
      await page.getByRole("button", { name: "Add columns" }).click();
      await page.getByRole("checkbox", { name: "Selling Price" }).click();
      await page.getByRole("button", { name: "Apply" }).click();
      await expect(page.getByRole("button", { name: "Apply" })).toBeHidden();
      await expect(page.getByText(/^Selling price$/i).first()).toBeVisible();
    });

    test("Unknown code: Create a new product", async () => {
      await po.openNewForm();
      const code = `0${Date.now().toString().slice(-11)}`;
      await po.scanCode(code);
      await expect(po.notFoundDialog).toBeVisible({ timeout: 10_000 });
      await po.notFoundDialog.getByRole("button", { name: /^Create a new product/ }).click();
      // The product form opens over the PO with the scanned code as its UPC.
      const productDialog = page
        .getByRole("dialog")
        .filter({ hasText: "Creating a product for this purchase order." });
      await expect(productDialog).toBeVisible({ timeout: 15_000 });
      await expect(productDialog).toContainText("Save it and it is added to the order");
      await expect(page).toHaveURL(/\/purchase-order\/add/);
      await expect(page.getByPlaceholder("Scan or enter UPC")).toHaveValue(code);
    });

    test("Lottery products in Add items", async () => {
      const lottery = new Lottery(page);
      await lottery.gotoLotteryList();
      const lot = { name: `Auto PO Lotto ${Date.now()}`, price: "1.00", quantity: 4, category: "lottery" };
      try {
        await lottery.addLottery(lot);
        await po.openNewForm();
        await po.addItemsBtn.click();
        await po.addItemsSearch.fill(lot.name);
        // Lotteries can be ordered on a PO like products.
        await expect(
          po.addItemsDialog.getByRole("button", { name: new RegExp(lot.name) }).first(),
        ).toContainText(`Qty: ${lot.quantity}`, { timeout: 15_000 });
        await page.keyboard.press("Escape");
      } finally {
        await lottery.cleanupLotteries([lot.name]);
      }
    });
  });
});
