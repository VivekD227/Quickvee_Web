import { test, expect } from "@playwright/test";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { OnlineOrdering } from "../pageObjects/OnlineOrdering";
import merchants from "../api/testData/merchants.json";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import sessionDataStorage from "../utilities/helper/sessionDataStorage";
import { waitForStorefrontApis } from "../utilities/apiHelper/onlineOrderingAPI";

test.describe("Online Ordering Module", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let onlineStorePage;
  let onlineOrdering;

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);

      await navigateToLoginPage(page);
      await loginpage.login(
        merchants.merchantLogin.storename,
        merchants.merchantLogin.username,
        merchants.merchantLogin.password,
      );
      const loginData = await loginpage.createSessionAPIMerchant();
      const merchantId = loginData.data.merchant_id;
      console.log(merchantId);
      sessionDataStorage.set("merchantId", merchantId);
      await dashboard.logoDisplayed();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    await context?.close();
  });

  async function openOnlineStore() {
    const popupPromise = page.waitForEvent("popup");
    await dashboard.viewStore.click();
    onlineStorePage = await popupPromise;
    const storeApis = await waitForStorefrontApis(onlineStorePage);
    sessionDataStorage.set("storefrontApis", storeApis);
    const storeData = OnlineOrdering.getStoreData(storeApis.storeAndCategory);
    sessionDataStorage.set("storeData", storeData);
    sessionDataStorage.set(
      "storeCategories",
      OnlineOrdering.getCategories(storeApis.storeAndCategory),
    );
    onlineOrdering = new OnlineOrdering(onlineStorePage);
    return storeApis;
  }

  test("Open View Online Store in new tab", async () => {
    const storeApis = await openOnlineStore();
    expect(storeApis.storeAndCategory).toBeDefined();
    expect(storeApis.storeAndCategory.status).toBe(200);

    const storeData = sessionDataStorage.get("storeData");
    expect(storeData, "result.store_data should exist").toBeTruthy();
    console.log("store_data:", {
      store_name: storeData.store_name,
      is_pickup: storeData.is_pickup,
      is_deliver: storeData.is_deliver ?? storeData.is_delivery,
      store_oc_status: storeData.store_oc_status,
    });
    expect(storeApis.bogoList).toBeDefined();
    expect(storeApis.mixMatch).toBeDefined();
    expect(storeApis.stateList).toBeDefined();
    expect(storeApis.products).toBeDefined();

    const storeInfo = await onlineOrdering.verifyStoreUrl();
    expect(storeInfo.merchantId).toBe(sessionDataStorage.get("merchantId"));
    expect(onlineStorePage.url()).toContain(
      `/merchant/${storeInfo.merchantId}`,
    );
  });

  test("Age verification popup is visible with all text", async () => {
    await onlineOrdering.verifyAgeModalCopy();
  });

  test("Underage user is redirected to privacy policy", async ({ browser }) => {
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    try {
      const storeApisPromise = waitForStorefrontApis(guestPage);
      await guestPage.goto(OnlineOrdering.storefrontUrl());
      await storeApisPromise;
      const guestStore = new OnlineOrdering(guestPage);
      await guestStore.verifyAgeModalVisible();
      await guestStore.declineAge();
      await guestStore.verifyUnderageBlocked();
    } finally {
      await guestContext.close();
    }
  });

  test("Confirming 21+ allows shopping to continue", async () => {
    await onlineOrdering.confirmAge21();
    await onlineOrdering.verifyStorefrontVisible();
  });

  test("is_pickup, is_deliver and store_oc_status match UI", async () => {
    const storeData = sessionDataStorage.get("storeData");
    await expect(
      onlineOrdering.page.getByRole("heading", { name: storeData.store_name }),
    ).toBeVisible();
    await onlineOrdering.verifyPickupDeliveryAndOpenStatus(storeData);
  });

  test("Check storefront UI", async () => {
    const storeData = sessionDataStorage.get("storeData");
    const categories = sessionDataStorage.get("storeCategories") ?? [];
    await onlineOrdering.verifyStorefrontUI(storeData, categories);
  });

  test("Browser title is Shop a Local Store | Quickvee", async () => {
    await onlineOrdering.verifyPageTitle();
  });

  test("Aisle/category count is consistent across UI", async () => {
    const categories = sessionDataStorage.get("storeCategories") ?? [];
    await onlineOrdering.verifyAisleCountAcrossUI(categories);
  });

  test("View Full Hours opens store timings", async () => {
    await onlineOrdering.verifyStoreHours();
  });

  test("Store URL merchant ID matches login merchant ID", async () => {
    await onlineOrdering.verifyMerchantIdMatchesLogin();
  });

  test("orderMethod=pickup selects Pickup everywhere", async () => {
    test.skip(
      !OnlineOrdering.pickupEnabled(sessionDataStorage.get("storeData")),
      "Pickup is disabled on this store (is_pickup is not Yes)",
    );
    await onlineOrdering.gotoOrderMethod("pickup");
  });

  test("orderMethod=delivery selects Delivery everywhere", async () => {
    test.skip(
      !OnlineOrdering.deliveryEnabled(sessionDataStorage.get("storeData")),
      "Delivery is disabled on this store (is_deliver is not Yes)",
    );
    await onlineOrdering.gotoOrderMethod("delivery");
  });

  test("Clicking Delivery updates URL and UI", async () => {
    test.skip(
      !OnlineOrdering.pickupEnabled(sessionDataStorage.get("storeData")) ||
        !OnlineOrdering.deliveryEnabled(sessionDataStorage.get("storeData")),
      "Both pickup and delivery must be enabled to toggle",
    );
    await onlineOrdering.gotoOrderMethod("pickup");
    await onlineOrdering.selectOrderMethod("delivery");
  });

  test("Clicking Pickup updates URL and UI", async () => {
    test.skip(
      !OnlineOrdering.pickupEnabled(sessionDataStorage.get("storeData")) ||
        !OnlineOrdering.deliveryEnabled(sessionDataStorage.get("storeData")),
      "Both pickup and delivery must be enabled to toggle",
    );
    await onlineOrdering.selectOrderMethod("pickup");
  });

  test("Selected method survives refresh", async () => {
    const store = sessionDataStorage.get("storeData");
    const method = OnlineOrdering.deliveryEnabled(store)
      ? "delivery"
      : "pickup";
    test.skip(
      method === "pickup" && !OnlineOrdering.pickupEnabled(store),
      "No enabled order method on this store",
    );
    await onlineOrdering.selectOrderMethod(method);
    await onlineOrdering.reloadStorefront();
    await onlineOrdering.verifyOrderMethod(method);
  });

  test("Empty cart then product list matches API", async () => {
    await onlineOrdering.verifyEmptyCartUI();
    await onlineOrdering.clickShopNowFromCart();
    await onlineOrdering.verifyProductListFromApi(
      sessionDataStorage.get("storefrontApis")?.products,
    );
  });

  test("Open first product, change qty, and add to cart", async () => {
    await onlineOrdering.openFirstProduct();
    await onlineOrdering.verifyQty(1);
    await onlineOrdering.increaseQty();
    await onlineOrdering.verifyQty(2);
    await onlineOrdering.decreaseQty();
    await onlineOrdering.verifyQty(1);
    await onlineOrdering.addProductToCartFromPdp();
  });

  test("Guest Buy it Again shows login card; after login API and buy work", async () => {
    test.setTimeout(90_000);
    if (!onlineOrdering) {
      await openOnlineStore();
    }
    // await onlineStorePage.bringToFront();
    // await onlineOrdering.ensureAgeConfirmed();
    await onlineOrdering.verifyGuestLogInVisible();
    await onlineOrdering.openBuyItAgain();
    await onlineOrdering.verifyGuestBuyItAgainLoginCard();
    await onlineOrdering.clickBuyItAgainLogIn();
    await onlineOrdering.verifyCustomerLoginPrompt();
    await onlineOrdering.loginAsCustomer(
      merchants.customerLogin.username,
      merchants.customerLogin.password,
    );
    //await onlineOrdering.ensureAgeConfirmed();
    await onlineOrdering.verifyLoggedInAccount();
    const buyItAgainBody = await onlineOrdering.openBuyItAgainAndValidateApi();
    expect(buyItAgainBody).toBeTruthy();
    const buyApi = await onlineOrdering.buyFromBuyItAgain();
    expect(buyApi).toBeTruthy();
    await onlineOrdering.navShopClick();
  });
});
