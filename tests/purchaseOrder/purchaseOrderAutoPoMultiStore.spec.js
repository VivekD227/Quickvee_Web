import { test, expect } from "@playwright/test";
import { PurchaseOrder } from "../../pageObjects/PurchaseOrder";
import { Products } from "../../pageObjects/Products";
import { Vendor } from "../../pageObjects/Vendor";
import { LoginPage } from "../../pageObjects/LoginPage";
import { Dashboard } from "../../pageObjects/Dashboard";
import { navigateToLoginPage } from "../../utilities/helper/navigationHelper";
import routes from "../../utilities/routes.js";

// Auto PO for a merchant with more than one store: Auto PO works on the
// Location's stock, and changing the Location resets the Supplier.
//
// Runs on the user's two test stores (same login, store chosen by the login
// "Store Name"). Credentials come from the environment only:
//   QV_MS_USER, QV_MS_PASS
// Each run creates a vendor and a product of the same name in both stores
// (low stock only at Chain Smoker) and deletes the products in afterAll.

const ASH = { name: "Ash Rum", city: "San Ramon, CA", id: "VIV271990CA", login: "ash" };
const CHAIN = { name: "Chain Smoker", city: "Banta, AZ", id: "VIV102927MA", login: "chain" };

async function login(browser, store) {
  const context = await browser.newContext();
  const page = await context.newPage();
  // Some pages never fire "load"; don't let a navigation hang the run.
  page.setDefaultNavigationTimeout(60_000);
  page.setDefaultTimeout(30_000);
  await navigateToLoginPage(page);
  await new LoginPage(page).login(store.login, process.env.QV_MS_USER, process.env.QV_MS_PASS);
  await page.waitForURL(/\/merchants\/dashboard/, { timeout: 60_000 });
  // The dashboard keeps loading for a while; navigating away at once can hang.
  await page.waitForTimeout(5_000);
  return { context, page };
}

test.describe("Purchase Order — Auto PO multi-store", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });
  test.skip(
    !process.env.QV_MS_USER || !process.env.QV_MS_PASS,
    "Set QV_MS_USER and QV_MS_PASS for the multi-store login",
  );

  let ash;
  let chain;
  let page;
  let po;
  let vendorName;
  // Same name in both stores; each store has its own product (own UPC).
  let ashProduct;
  let chainProduct;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(150_000);
    ash = await login(browser, ASH);
    chain = await login(browser, CHAIN);
    page = ash.page;
    po = new PurchaseOrder(page);
  });

  test.afterAll(async () => {
    test.setTimeout(300_000);
    for (const [session, product] of [[ash, ashProduct], [chain, chainProduct]]) {
      if (!session || !product?.upc) continue;
      try {
        session.page.on("dialog", (dialog) => dialog.accept().catch(() => {}));
        const products = new Products(session.page);
        await session.page.goto(routes.page_URL.products);
        await products.verifyProductsPageLoaded();
        await products.searchListing(product.name);
        await products.waitForCatalogIdle();
        if ((await products.productRows.filter({ hasText: product.name }).count()) > 0) {
          await products.deleteProductFromRowActions(product.name);
        }
      } catch (error) {
        console.log(`Cleanup ${product.name}: ${error.message}`);
      }
    }
    await ash?.context.close();
    await chain?.context.close();
  });

  test("Create the same vendor and product in both stores, low stock only at Chain Smoker", async () => {
    test.setTimeout(420_000);
    vendorName = `AutoVendorMS${Date.now()}`;
    const name = `AutoPO MS ${Date.now()}`;
    ashProduct = { name, cost: "2.00", price: "5.00", quantity: "10", reorderPoint: "5", reorderQty: "7" };
    chainProduct = { name, cost: "3.00", price: "6.00", quantity: "2", reorderPoint: "5", reorderQty: "7" };
    for (const [session, product] of [[ash, ashProduct], [chain, chainProduct]]) {
      const dashboard = new Dashboard(session.page);
      await dashboard.logoDisplayed();
      await dashboard.menuClick();
      await dashboard.inventoryClick();
      await dashboard.vendorsClick();
      await new Vendor(session.page).createVendor({ vendorName, phone: "5553334455" });
      const products = new Products(session.page);
      await dashboard.productsClick();
      await products.verifyProductsPageLoaded();
      await products.reopenAddSingleProductForm();
      await products.addProductWithQuantity(product);
      await products.changeProductVendors({ product, add: [vendorName], preferred: vendorName });
    }
  });

  test("Auto PO at another Location uses that store's stock, reorder quantity and cost", async () => {
    await po.gotoList();
    await po.openNewForm();
    await po.selectLocation(CHAIN);
    await po.selectVendor(vendorName);
    const requestPromise = page.waitForRequest((req) => req.url() === routes.API_URL.poAutoList_URL);
    const body = await po.runAutoPo();
    const payload = po.parseFormData((await requestPromise).postData());
    expect(payload.merchant_id, "auto_po_list runs for the Location").toBe(CHAIN.id);
    expect(body.status, `auto_po_list: ${JSON.stringify(body).slice(0, 300)}`).toBeTruthy();
    // Chain Smoker: stock 2 ≤ reorder point 5 → reorder qty 7 at its cost 3.00.
    await expect(po.lineRow(chainProduct.name)).toBeVisible({ timeout: 15_000 });
    await expect(po.lineQty(chainProduct.name)).toHaveValue("7");
    await expect(po.lineCost(chainProduct.name)).toHaveValue("3.00");
  });

  test("Changing the Location asks first and resets the Supplier", async () => {
    await po.locationBtn.click();
    await po.locationOption(ASH).click();
    await expect(po.changeLocationDialog).toContainText("Change location?");
    await po.changeLocationDialog.getByRole("button", { name: "Change location" }).click();
    await expect(po.changeLocationDialog).toBeHidden();
    await po.verifyLocation(ASH);
    await expect(po.supplierBtn).toHaveText(/No Vendor/);
    await expect(po.autoPoBtn).toHaveCount(0);
    // Ash Rum's product has another UPC, so the line is not in this store.
    await expect(po.lineRow(chainProduct.name)).toHaveCount(0);
  });

  test("Auto PO at the header store adds nothing when its stock is above the reorder point", async () => {
    await po.selectVendor(vendorName);
    const requestPromise = page.waitForRequest((req) => req.url() === routes.API_URL.poAutoList_URL);
    const body = await po.runAutoPo();
    const payload = po.parseFormData((await requestPromise).postData());
    expect(payload.merchant_id).toBe(ASH.id);
    expect(body.status).toBeFalsy();
    expect(body.message).toBe("No eligible products for Auto PO — reorder points not reached.");
    await expect(po.noProductsYet).toBeVisible();
    await po.discardNewForm();
  });
});
