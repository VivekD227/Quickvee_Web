import { test, expect } from "@playwright/test";
import { Products } from "../../pageObjects/Products";
import { Categories } from "../../pageObjects/Categories";
import { OnlineStore } from "../../pageObjects/OnlineStore";
import { LoginPage } from "../../pageObjects/LoginPage";
import { navigateToLoginPage } from "../../utilities/helper/navigationHelper";
import merchants from "../../api/testData/merchants.json";
import routes from "../../utilities/routes.js";

// Restricted keywords (Online Product Name): a product or category whose name
// contains a word from Superadmin's global list must never be orderable online.
// It is kept register-only, hidden from the online store, and refused in the
// cart and at checkout.
//
// The tests never change the keyword list (superadmin access isn't needed):
// they use a word that is already on it, "Delta 8" by default (on both QA and
// Live). Override with QV_RK_WORD. The matching test also relies on "Delta 8",
// and the over-blocking check on "THC".
//
// Runs on the Ash Rum store (login store name "ash") with products and
// categories each run creates; they are deleted in afterAll. Credentials come
// from the environment only:
//   QV_MS_USER, QV_MS_PASS              Ash Rum merchant login (same as the
//                                       multi-store stocktake test)
//   QV_CUSTOMER_USER, QV_CUSTOMER_PASS  online store customer; without it the
//                                       online store tests are skipped
// QV_RK_STORE=automation runs it on Test Automation with merchants.json instead.
// Each full run places one $1 Cash pickup order.

const STORE = process.env.QV_RK_STORE || "ash";
const ON_AUTOMATION = STORE === merchants.merchantLogin.storename;
const MERCHANT_USER = ON_AUTOMATION ? merchants.merchantLogin.username : process.env.QV_MS_USER;
const MERCHANT_PASS = ON_AUTOMATION ? merchants.merchantLogin.password : process.env.QV_MS_PASS;
const WORD = process.env.QV_RK_WORD || "Delta 8";
const CUSTOMER_USER = process.env.QV_CUSTOMER_USER;
const CUSTOMER_PASS = process.env.QV_CUSTOMER_PASS;

const PRODUCT_REFUSAL =
  "This product contains restricted words and cannot be enabled for online ordering.";
const CATEGORY_REFUSAL =
  "This category contains restricted words and cannot be enabled for online ordering.";
const RENAME_NOTICE =
  "Category updated. Its name contains a restricted word, so online ordering has been turned off for this category and the products in it.";

test.describe("Restricted keywords", () => {
  test.describe.configure({ mode: "serial", timeout: 300_000 });
  test.skip(!MERCHANT_USER || !MERCHANT_PASS, "Set QV_MS_USER and QV_MS_PASS for the Ash Rum login");

  const stamp = Date.now();
  const cat = {
    clean: { name: `AutoRK Clean Cat ${stamp}` },
    restricted: { name: `AutoRK ${WORD} Cat ${stamp}` },
    rename: { name: `AutoRK Rename Cat ${stamp}`, renamed: `AutoRK ${WORD} Rename ${stamp}` },
  };
  const prod = {
    restricted: { name: `AutoRK ${WORD} ${stamp}` },
    underscore: { name: `AutoRK Delta_8 ${stamp}` },
    // The name field drops "-", so the dot covers the separator + case check.
    upperDot: { name: `AutoRK DELTA.8 ${stamp}` },
    // Cyrillic "е" (U+0435) in place of the Latin "e".
    lookalike: { name: `AutoRK Dеlta 8 ${stamp}` },
    // "smiTH Coffee" holds "thc" across the space; it must stay online.
    smithCoffee: { name: `AutoRK Smith Coffee ${stamp}` },
    clean: { name: `AutoRK Clean ${stamp}` },
    cart: { name: `AutoRK Cart ${stamp}` },
    pay: { name: `AutoRK Pay ${stamp}` },
    inside: { name: `AutoRK Inside ${stamp}` },
  };

  let merchantContext;
  let page;
  let products;
  let categories;
  let merchantId;
  let shopContext;
  let shop;
  let cleanOrderPlaced = false;

  async function openProducts() {
    await page.goto(routes.page_URL.products);
    await products.verifyProductsPageLoaded();
  }

  async function openCategories() {
    await page.goto(routes.page_URL.categories);
    await expect(categories.categoryCount).toBeVisible({ timeout: 60_000 });
  }

  // Creates a category; returns the API body (status "Failed" when refused).
  async function submitCategory(name, online) {
    await openCategories();
    await categories.addCategoryBtnClick();
    await categories.setCategoryName(name);
    await categories.setToggle("online", online);
    return createCategoryResponse();
  }

  async function createCategoryResponse() {
    const response = page.waitForResponse(
      (res) =>
        res.request().method() === "POST" && res.url().includes(routes.API_URL.addCategory_URL),
      { timeout: 60_000 },
    );
    await categories.createCategoryBtn.click();
    return (await response).json();
  }

  async function createProduct(product, categoryName) {
    await openProducts();
    await products.addProductBtnClick();
    await products.selectSingleProductType();
    await products.continueAddProductType();
    await products.discardRestoredDraft();
    await products.fillProductName(product.name);
    await products.selectCategory(categoryName);
    await products.generateUpc();
    await products.fillCost("1.00");
    await products.fillPrice("1.00");
    await products.availableToSellInput.fill("20");
    const response = page.waitForResponse(
      (res) => res.request().method() === "POST" && products.isAddProductUrl(res.url()),
      { timeout: 60_000 },
    );
    await products.saveProductClick();
    const body = await (await response).json();
    expect(body.status, `create ${product.name}`).toBeTruthy();
    product.id = String(body.productid);
    product.created = true;
    await expect(page).not.toHaveURL(/\/new-products\/add/, { timeout: 30_000 });
  }

  async function moveProduct(product, categoryName) {
    await openProducts();
    await products.openEditSingleProduct(product.name);
    await products.clearAllCategoryChips();
    await products.selectCategory(categoryName);
    await products.saveChangesBtn.click();
    await expect(page.getByText("Updated Successfully").first()).toBeVisible({ timeout: 30_000 });
  }

  const offline = { delivery: false, pickup: false };
  const online = { delivery: true, pickup: true };

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240_000);
    merchantContext = await browser.newContext();
    page = await merchantContext.newPage();
    page.setDefaultNavigationTimeout(120_000);
    products = new Products(page);
    categories = new Categories(page);
    await navigateToLoginPage(page);
    await new LoginPage(page).login(STORE, MERCHANT_USER, MERCHANT_PASS);
    // The dashboard keeps loading for a while; navigating away at once can hang.
    await page.waitForURL(/\/merchants\/dashboard/, { timeout: 60_000 });
    await page.waitForTimeout(5_000);
    await openCategories();
    const storePage = await categories.openOnlineStore();
    merchantId = storePage.url().match(/\/merchant\/([^/?]+)/)[1];
    await storePage.close();

    if (CUSTOMER_USER && CUSTOMER_PASS) {
      shopContext = await browser.newContext();
      const shopPage = await shopContext.newPage();
      shopPage.setDefaultNavigationTimeout(120_000);
      shop = new OnlineStore(shopPage, merchantId);
      await shop.login(CUSTOMER_USER, CUSTOMER_PASS);
      await shop.clearCart();
    }
  });

  test.afterAll(async () => {
    test.setTimeout(600_000);
    if (shop) await shop.clearCart().catch((e) => console.log(`Cleanup cart: ${e.message}`));
    if (page) {
      page.on("dialog", (dialog) => dialog.accept().catch(() => {}));
      try {
        await openProducts();
        for (const product of Object.values(prod).filter((p) => p.created)) {
          await products.searchListing(product.name);
          await products.waitForCatalogIdle();
          if ((await products.productRows.filter({ hasText: product.name }).count()) > 0) {
            await products.deleteProductFromRowActions(product.name);
          }
        }
      } catch (error) {
        console.log(`Cleanup products: ${error.message}`);
      }
      await categories
        .cleanupCategories([cat.clean.name, cat.restricted.name, cat.rename.name, cat.rename.renamed])
        .catch((e) => console.log(`Cleanup categories: ${e.message}`));
    }
    await shopContext?.close();
    await merchantContext?.close();
  });

  // ---------------------------------------------------------------------------
  // Merchant panel: save-time checks
  // ---------------------------------------------------------------------------

  test("clean categories can be created with online ordering", async () => {
    for (const c of [cat.clean, cat.rename]) {
      const body = await submitCategory(c.name, true);
      expect(body.status, body.msg).toBe("Success");
      c.id = String(body.result);
    }
  });

  test("restricted category cannot be created with online ordering", async () => {
    const refused = await submitCategory(cat.restricted.name, true);
    expect(refused.status).toBe("Failed");
    expect(refused.msg).toBe(CATEGORY_REFUSAL);
    await expect(page.getByText(CATEGORY_REFUSAL).first()).toBeVisible();

    // Saved offline it is accepted.
    await categories.setToggle("online", false);
    const body = await createCategoryResponse();
    expect(body.status, body.msg).toBe("Success");
    cat.restricted.id = String(body.result);
    await openCategories();
    await categories.openEditDrawer(cat.restricted.name);
    expect(await categories.isToggleOn("online")).toBe(false);
    await categories.cancelDrawer();
  });

  test("product with a restricted word is saved offline", async () => {
    await createProduct(prod.restricted, cat.clean.name);
    await products.verifyListingChannels(prod.restricted.name, offline);
  });

  test("matching ignores separators, case and lookalike letters", async () => {
    for (const product of [prod.underscore, prod.upperDot, prod.lookalike]) {
      await createProduct(product, cat.clean.name);
      await products.verifyListingChannels(product.name, offline);
    }
  });

  test("restricted product cannot be turned online", async () => {
    await openProducts();
    await products.openEditSingleProduct(prod.restricted.name);
    await products.pickupChannelBtn.click();
    await products.deliveryChannelBtn.click();
    await products.saveChangesBtn.click();
    await expect(page.getByText(PRODUCT_REFUSAL).first()).toBeVisible({ timeout: 30_000 });
    await products.verifyListingChannels(prod.restricted.name, offline);
  });

  test("clean products stay online (no over-blocking)", async () => {
    for (const product of [prod.smithCoffee, prod.clean, prod.cart, prod.pay]) {
      await createProduct(product, cat.clean.name);
      await products.verifyListingChannels(product.name, online);
    }
    await createProduct(prod.inside, cat.rename.name);
    await products.verifyListingChannels(prod.inside.name, online);
  });

  // ---------------------------------------------------------------------------
  // Online store before any change
  // ---------------------------------------------------------------------------

  test("online store blocks restricted products and shows clean ones", async () => {
    test.skip(!shop, "Set QV_CUSTOMER_USER and QV_CUSTOMER_PASS");
    test.setTimeout(600_000);
    for (const product of [prod.restricted, prod.underscore, prod.lookalike]) {
      await shop.verifyProductBlocked(product.id, cat.clean.id);
    }
    await shop.verifyProductOpens(prod.smithCoffee.id, cat.clean.id);
    await shop.verifyProductOpens(prod.cart.id, cat.clean.id);
    await shop.verifyInSearch(prod.clean.name, prod.clean.name, true);
    await shop.verifyInSearch(prod.restricted.name, prod.restricted.name, false);
  });

  test("clean product can still be ordered", async () => {
    test.skip(!shop, "Set QV_CUSTOMER_USER and QV_CUSTOMER_PASS");
    await shop.clearCart();
    await shop.addProductToCart(prod.clean.id, cat.clean.id, prod.clean.name);
    await shop.goToPayment();
    await shop.chooseCashPickup();
    const result = await shop.placeOrder();
    expect(result.invalidProducts).toEqual([]);
    expect(result.orderId, JSON.stringify(result)).toBeTruthy();
    cleanOrderPlaced = true;

    // Leave a clean product in the cart for the move test below.
    await shop.addProductToCart(prod.cart.id, cat.clean.id, prod.cart.name);
    await shop.openCart();
    await expect(shop.cartItem(prod.cart.name)).toBeVisible();
    await shop.closeCart();
  });

  // ---------------------------------------------------------------------------
  // Merchant panel: category move and rename
  // ---------------------------------------------------------------------------

  test("moving a product into a restricted category turns it offline", async () => {
    await moveProduct(prod.cart, cat.restricted.name);
    await products.verifyListingChannels(prod.cart.name, offline);
  });

  test("renaming a category to a restricted name turns it and its products offline", async () => {
    await openCategories();
    await categories.openEditDrawer(cat.rename.name);
    await categories.setCategoryName(cat.rename.renamed);
    await categories.saveChangesBtn.click();
    await expect(page.getByText(RENAME_NOTICE, { exact: false }).first()).toBeVisible({
      timeout: 30_000,
    });
    await openCategories();
    await categories.openEditDrawer(cat.rename.renamed);
    expect(await categories.isToggleOn("online")).toBe(false);
    await categories.cancelDrawer();
    await products.verifyListingChannels(prod.inside.name, offline);
  });

  // ---------------------------------------------------------------------------
  // Online store after the change
  // ---------------------------------------------------------------------------

  test("item that became restricted is flagged in the cart and blocks checkout", async () => {
    test.skip(!shop || !cleanOrderPlaced, "Needs the customer login and the cart from the order test");
    test.setTimeout(600_000);
    await shop.openCart();
    await expect(shop.cartItem(prod.cart.name)).toBeVisible();
    await expect(shop.unavailableInCart).toBeVisible();
    await expect(shop.continueToCheckoutLink).toHaveAttribute("aria-disabled", "true");
    await shop.closeCart();

    await shop.verifyProductBlocked(prod.cart.id, cat.clean.id);
    await shop.verifyProductBlocked(prod.inside.id, cat.rename.id);
    await shop.verifyInSearch(prod.cart.name, prod.cart.name, false);
    await shop.clearCart();
  });

  test("order is refused when an item becomes restricted during checkout", async () => {
    test.skip(!shop, "Set QV_CUSTOMER_USER and QV_CUSTOMER_PASS");
    // Known issue: the customer sees a generic "not available for the Pickup
    // order method" popup and the cart is emptied, instead of the restricted
    // message. Only the refusal itself is checked here.
    await shop.clearCart();
    await shop.addProductToCart(prod.pay.id, cat.clean.id, prod.pay.name);
    await shop.goToPayment();
    await shop.chooseCashPickup();

    await moveProduct(prod.pay, cat.restricted.name);

    const result = await shop.placeOrder();
    expect(result.orderId).toBeNull();
    expect(result.invalidProducts).toContain(prod.pay.id);
    await expect(shop.page.getByText(prod.pay.name).first()).toBeVisible();
  });
});
