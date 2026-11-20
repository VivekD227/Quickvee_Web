import { test, expect } from "@playwright/test";
import { Products } from "../../pageObjects/Products";
import { ProductStocktake } from "../../pageObjects/ProductStocktake";
import { LoginPage } from "../../pageObjects/LoginPage";
import { navigateToLoginPage } from "../../utilities/helper/navigationHelper";
import routes from "../../utilities/routes.js";

// Product Stocktake for a merchant with more than one store: a product copied
// to the other store is stocked per store, so a stocktake in Ash Rum must not
// change Chain Smoker.
//
// Runs on the user's two test stores (same login, store chosen by the login
// "Store Name"). Credentials come from the environment only:
//   QV_MS_USER, QV_MS_PASS
// The product is created in Ash Rum, copied to Chain Smoker, and deleted from
// both stores in afterAll.

const ASH = "ash";
const CHAIN = "chain";

test.describe("Product Stocktake — multi-store", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });
  test.skip(
    !process.env.QV_MS_USER || !process.env.QV_MS_PASS,
    "Set QV_MS_USER and QV_MS_PASS for the multi-store login",
  );

  const product = { name: `AutoStocktake MS ${Date.now()}`, cost: "2.00", price: "5.00" };
  const sessions = {};

  async function session(browser, store) {
    if (sessions[store]) return sessions[store];
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60_000);
    page.setDefaultTimeout(30_000);
    await navigateToLoginPage(page);
    await new LoginPage(page).login(store, process.env.QV_MS_USER, process.env.QV_MS_PASS);
    await page.waitForURL(/\/merchants\/dashboard/, { timeout: 60_000 });
    // The dashboard keeps loading for a while; navigating away at once can hang.
    await page.waitForTimeout(5_000);
    const products = new Products(page);
    sessions[store] = { context, page, products, stocktake: new ProductStocktake(page, products) };
    return sessions[store];
  }

  async function onHand({ page, products, stocktake }) {
    await page.goto(routes.page_URL.products);
    await products.verifyProductsPageLoaded();
    await products.searchListing(product.name);
    await expect(products.productRows.filter({ hasText: product.name }), `${product.name} listed`).toHaveCount(1, {
      timeout: 20_000,
    });
    await stocktake.openFromRow(product.name);
    const qty = await stocktake.currentOnHand();
    await stocktake.close();
    return qty;
  }

  test.afterAll(async () => {
    test.setTimeout(180_000);
    for (const s of Object.values(sessions)) {
      try {
        await s.page.goto(routes.page_URL.products);
        await s.products.verifyProductsPageLoaded();
        await s.products.searchListing(product.name);
        await s.products.waitForCatalogIdle();
        if ((await s.products.productRows.filter({ hasText: product.name }).count()) > 0) {
          await s.products.deleteProductFromRowActions(product.name);
        }
      } catch (error) {
        console.log(`Cleanup: ${error.message}`);
      }
      await s.context.close();
    }
  });

  test("Create a product in Ash Rum and copy it to Chain Smoker", async ({ browser }) => {
    const { page, products } = await session(browser, ASH);
    await page.goto(routes.page_URL.products);
    await products.verifyProductsPageLoaded();
    await products.reopenAddSingleProductForm();
    await expect(products.copyToStoresHeading).toBeVisible({ timeout: 15_000 });
    await products.fillProductName(product.name);
    await products.selectCategory("Quickadd");
    product.upc = await products.generateUpc();
    await products.fillCost(product.cost);
    await products.fillPrice(product.price);
    await page.getByRole("button", { name: "Open store list" }).click();
    await expect(page.getByText("Select All", { exact: true })).toBeVisible();
    await page.getByText("Chain Smoker").last().click();
    // Once a store is ticked the list offers "Deselect All".
    await expect(page.getByText("Deselect All", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    const addPromise = page.waitForResponse(
      (res) => res.request().method() === "POST" && products.isAddProductUrl(res.url()),
      { timeout: 30_000 },
    );
    await products.saveProductClick();
    const addResponse = await addPromise;
    expect(addResponse.status(), "add product").toBe(200);
    await expect(page).not.toHaveURL(/\/new-products\/add/, { timeout: 30_000 });
  });

  test("A stocktake in Ash Rum changes only Ash Rum", async ({ browser }) => {
    const ash = await session(browser, ASH);
    expect(await onHand(ash)).toBe(0);
    await ash.stocktake.openFromRow(product.name);
    await expect(ash.stocktake.dialog).toContainText(`UPC: ${product.upc}`);
    await ash.stocktake.fill(0, 7, "Ash Rum only");
    const [save] = await ash.stocktake.submit();
    expect(save.item).toMatchObject({ current_qty: "0", new_qty: "7" });
    expect(await onHand(ash)).toBe(7);

    const chain = await session(browser, CHAIN);
    expect(await onHand(chain), "Chain Smoker keeps its own stock").toBe(0);
  });

  test("A stocktake in Chain Smoker changes only Chain Smoker", async ({ browser }) => {
    const chain = await session(browser, CHAIN);
    await chain.page.goto(routes.page_URL.products);
    await chain.products.verifyProductsPageLoaded();
    await chain.stocktake.openFromRow(product.name);
    await chain.stocktake.fill(0, 3);
    await chain.stocktake.submit();
    expect(await onHand(chain)).toBe(3);

    const ash = await session(browser, ASH);
    expect(await onHand(ash), "Ash Rum keeps its own stock").toBe(7);
  });
});
