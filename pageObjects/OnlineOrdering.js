const { expect } = require("@playwright/test");
import routes from "../utilities/routes.js";
const sessionDataStorage = require("../utilities/helper/sessionDataStorage");
import {
  waitForStorefrontApis,
  customerLoginAPI,
  buyNowProductAPI,
  buyItAgainAPI,
} from "../utilities/apiHelper/onlineOrderingAPI";

class OnlineOrdering {
  constructor(page) {
    this.page = page;

    this.ageDialog = page.getByRole("dialog");
    this.ageHeading = page.getByRole("heading", { name: "Age Verification" });
    this.ageYesBtn = page.getByRole("button", {
      name: "Yes, I am 21 year old",
    });
    this.ageNoBtn = page.getByRole("button", {
      name: "No, I am not of Legal Age",
    });
    this.ageRestrictedText = page.getByText(
      /The products available on Quickvee are age-restricted and intended for adults of legal smoking age only/i,
    );
    this.ageConfirmText = page.getByText(
      /By entering our website, you confirm that you are of legal smoking age in your jurisdiction/i,
    );

    this.pickupToggle = page
      .getByRole("button", { name: "Pickup", exact: true })
      .first();
    this.deliveryToggle = page
      .getByRole("button", { name: "Delivery", exact: true })
      .first();
    this.selectedOrderMethod = page.getByText("SELECTED ORDER METHOD");
    this.pickupReadyBadge = page.getByText("Pickup ready");
    this.localDeliveryBadge = page.getByText("Local delivery");
    this.pickupAvailable = page.getByText("Pickup available", { exact: true });
    this.deliveryAvailable = page.getByText("Delivery available", {
      exact: true,
    });
    this.openNow = page.getByText("OPEN NOW");
    this.startShopping = page.getByText("Start shopping");
    this.searchProduct = page.getByPlaceholder(/Search Product/i);
    this.cartBtn = page.getByRole("button", { name: /Cart/i }).first();
    this.cartHeading = page.getByText(/YOUR CART/i);
    this.emptyCartMessage = page.getByText("Your cart is empty");
    this.emptyCartSubtext = page.getByText(
      /haven't added anything to your cart yet/i,
    );
    this.shopNowBtn = page
      .getByRole("button", { name: /Shop Now/i })
      .or(page.getByRole("link", { name: /Shop Now/i }));
    this.continueToCheckoutBtn = page
      .getByRole("button", { name: /Continue to checkout/i })
      .or(page.getByRole("link", { name: /Continue to checkout/i }));
    this.closeCartBtn = page
      .getByRole("button", { name: /close( shopping)? cart|^close$/i })
      .or(page.getByTestId("CloseIcon"));
    this.increaseQtyBtn = page.getByRole("button", { name: /increase/i });
    this.decreaseQtyBtn = page.getByRole("button", { name: /decrease/i });
    this.qtyInput = page.locator('input[type="number"]').first();
    this.addToCartBtns = page.getByRole("button", { name: /Add to cart/i });
    this.selectOptionsBtns = page.getByRole("button", {
      name: /Select options/i,
    });
    this.outOfStock = page.getByText("OUT OF STOCK");
    this.logIn = page.getByText("Log In", { exact: true }).first();
    this.account = page.getByText("Account", { exact: true }).first();
    this.customerEmail = page.locator('input[name="username"]');
    this.customerPassword = page.locator('input[name="password"]');
    this.customerSignInBtn = page.locator('button[name="Login"]');
    this.signInHeading = page.getByRole("heading", {
      name: /Sign in to Quickvee/i,
    });
    this.buyItAgainPrivacyLabel = page.getByText(/YOUR HISTORY IS PRIVATE/i);
    this.buyItAgainLoginHeading = page.getByText(
      /Log in to see past favorites/i,
    );
    this.buyItAgainLoginCopy = page.getByText(
      /Sign in to find products from your previous orders and quickly add them to a new cart/i,
    );
    this.buyItAgainLogInBtn = page.getByRole("link", {
      name: "Log in",
      exact: true,
    });
    this.quickveeLogo = page
      .getByRole("img", { name: /Logo|Quickvee/i })
      .first();
    this.storeNavigator = page.getByText("STORE NAVIGATOR");
    this.navShop = page.getByText("Shop", { exact: true }).first();
    this.navHours = page.getByText("View Full Hours");
    this.navCoupons = page.getByText("Coupons").first();
    this.navBogo = page.getByText("BOGO", { exact: true }).first();
    this.navMixMatch = page.getByText("Mix N' Match").first();
    this.navBuyItAgain = page
      .getByText("Buy it Again", { exact: true })
      .first();
    this.browseCategories = page.getByText("BROWSE CATEGORIES");
    this.shopByDepartment = page.getByText("SHOP BY DEPARTMENT");
    this.allAisles = page.getByText(/All aisles/i).first();
    this.quickveeStorefront = page.getByText("QUICKVEE STOREFRONT");
    this.storeHoursDialog = page.getByRole("dialog", { name: "Store Hours" });
    this.closeHoursBtn = page.getByRole("button", {
      name: "Close store hours",
    });
  }

  static storefrontUrl({ orderMethod = "pickup", hash = "" } = {}) {
    const merchantId = sessionDataStorage.get("merchantId");
    expect(merchantId, "Merchant ID should be stored from login").toBeTruthy();
    const hashPart = hash ? (hash.startsWith("#") ? hash : `#${hash}`) : "";
    return `${routes.webBaseUrl}/merchant/${merchantId}?orderMethod=${orderMethod}${hashPart}`;
  }

  static isFlagOn(value) {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();
    return normalized === "yes" || normalized === "1" || normalized === "true";
  }

  static getStoreData(apiBody) {
    return apiBody?.result?.store_data || apiBody?.store_data || null;
  }

  static getCategories(apiBody) {
    const result = apiBody?.result || apiBody || {};
    return (
      result.categories || result.category_list || result.store_categories || []
    );
  }

  static pickupEnabled(store) {
    return OnlineOrdering.isFlagOn(store?.is_pickup);
  }

  static deliveryEnabled(store) {
    return OnlineOrdering.isFlagOn(store?.is_deliver ?? store?.is_delivery);
  }

  async verifyStoreUrl() {
    const merchantId = sessionDataStorage.get("merchantId");
    expect(merchantId, "Merchant ID should be stored from login").toBeTruthy();

    const url = new URL(this.page.url());
    expect(url.origin).toBe(new URL(routes.webBaseUrl).origin);
    expect(url.pathname).toBe(`/merchant/${merchantId}`);

    const orderMethod = (
      url.searchParams.get("orderMethod") || ""
    ).toLowerCase();
    expect(
      ["pickup", "delivery"],
      `orderMethod should be pickup or delivery, got: ${orderMethod}`,
    ).toContain(orderMethod);

    sessionDataStorage.set("onlineStoreUrl", this.page.url());
    sessionDataStorage.set("orderMethod", orderMethod);
    console.log("Online store URL:", this.page.url());
    console.log("Order method:", orderMethod);
    return { merchantId, orderMethod, url: this.page.url() };
  }

  async verifyAgeModalVisible() {
    await expect(this.ageDialog).toBeVisible();
    await expect(this.ageHeading).toBeVisible();
    await expect(this.ageYesBtn).toBeVisible();
    await expect(this.ageNoBtn).toBeVisible();
  }

  async verifyAgeModalHidden() {
    await expect(this.ageDialog).toHaveCount(0);
    await expect(this.ageHeading).toHaveCount(0);
  }

  async verifyAgeModalCopy() {
    await this.verifyAgeModalVisible();
    await expect(this.ageHeading).toHaveText("Age Verification");
    await expect(this.ageRestrictedText).toBeVisible();
    await expect(this.ageConfirmText).toBeVisible();
    await expect(this.ageYesBtn).toHaveText("Yes, I am 21 year old");
    await expect(this.ageNoBtn).toHaveText("No, I am not of Legal Age");
  }

  async confirmAge21() {
    await expect(this.ageYesBtn).toBeVisible();
    await this.ageYesBtn.click();
    await this.verifyAgeModalHidden();
  }

  async declineAge() {
    await expect(this.ageNoBtn).toBeVisible();
    await this.ageNoBtn.click();
  }

  async verifyUnderageBlocked() {
    await expect(this.page).toHaveURL(/privacy-policy/i);
    await this.verifyAgeModalHidden();
    await expect(this.addToCartBtns).toHaveCount(0);
    await expect(this.pickupToggle).toHaveCount(0);
  }

  async verifyStorefrontVisible() {
    await this.verifyAgeModalHidden();
    const store = sessionDataStorage.get("storeData");
    if (store) {
      await this.verifyPickupDeliveryAndOpenStatus(store);
    } else {
      await expect(this.pickupToggle).toBeVisible();
      await expect(this.deliveryToggle).toBeVisible();
    }
    await expect(this.selectedOrderMethod).toBeVisible();
    await expect(this.cartBtn).toBeVisible();
  }

  async verifyPickupDeliveryAndOpenStatus(store) {
    expect(store, "store_data should exist").toBeTruthy();

    const pickupOn = OnlineOrdering.pickupEnabled(store);
    const deliveryOn = OnlineOrdering.deliveryEnabled(store);
    const ocStatus = String(store.store_oc_status ?? "")
      .trim()
      .toLowerCase();

    console.log("is_pickup:", store.is_pickup, "=>", pickupOn);
    console.log(
      "is_deliver:",
      store.is_deliver ?? store.is_delivery,
      "=>",
      deliveryOn,
    );
    console.log("store_oc_status:", store.store_oc_status);

    if (pickupOn) {
      await expect(this.pickupAvailable).toBeVisible();
      await expect(this.pickupToggle).toBeVisible();
    } else {
      await expect(this.pickupAvailable).toHaveCount(0);
    }

    if (deliveryOn) {
      await expect(this.deliveryAvailable).toBeVisible();
      await expect(this.deliveryToggle).toBeVisible();
    } else {
      await expect(this.deliveryAvailable).toHaveCount(0);
    }

    expect(ocStatus, "store_oc_status should be present").toBeTruthy();
    if (ocStatus === "open") {
      await expect(this.openNow).toBeVisible();
    } else {
      await expect(this.openNow).toHaveCount(0);
    }

    return { pickupOn, deliveryOn, ocStatus };
  }

  async verifyStorefrontUI(store, categories = []) {
    await this.verifyAgeModalHidden();

    await expect(this.quickveeLogo).toBeVisible();
    await expect(this.searchProduct).toBeVisible();
    await expect(this.logIn).toBeVisible();
    await expect(this.cartBtn).toBeVisible();

    await expect(
      this.page.getByRole("heading", { name: store.store_name }),
    ).toBeVisible();
    if (store.add) {
      await expect(this.page.getByText(store.add).first()).toBeVisible();
    }
    await expect(this.quickveeStorefront).toBeVisible();
    await expect(this.selectedOrderMethod).toBeVisible();
    await expect(this.startShopping).toBeVisible();
    await this.verifyPickupDeliveryAndOpenStatus(store);

    await expect(this.storeNavigator).toBeVisible();
    await expect(this.navShop).toBeVisible();
    await expect(this.navHours).toBeVisible();
    await expect(this.navCoupons).toBeVisible();
    await expect(this.navBogo).toBeVisible();
    await expect(this.navMixMatch).toBeVisible();
    await expect(this.navBuyItAgain).toBeVisible();
    await expect(this.browseCategories).toBeVisible();
    await expect(this.shopByDepartment).toBeVisible();
    await expect(this.allAisles).toBeVisible();
    await expect(
      this.addToCartBtns.or(this.selectOptionsBtns).or(this.outOfStock).first(),
    ).toBeVisible();

    await this.verifyPageTitle();
    await this.verifyAisleCountAcrossUI(categories);
  }

  async navShopClick() {
    await this.navShop.click();
  }

  async verifyPageTitle() {
    await expect(this.page).toHaveTitle("Shop a Local Store | Quickvee");
  }

  async verifyAisleCountAcrossUI(categories = []) {
    const aisleCount = categories.length;
    expect(aisleCount, "categories should be present").toBeGreaterThan(0);

    await expect(
      this.page.getByText(`${aisleCount} store aisles`).first(),
    ).toBeVisible();

    const browseText = await this.browseCategories.evaluate((el) => {
      const root = el.parentElement?.parentElement || el.parentElement || el;
      return (root.innerText || "").replace(/\s+/g, " ");
    });
    expect(
      browseText,
      `BROWSE CATEGORIES should show ${aisleCount}. Got: ${browseText}`,
    ).toMatch(new RegExp(`BROWSE CATEGORIES\\s*${aisleCount}`, "i"));

    const departmentText = await this.shopByDepartment.evaluate((el) => {
      const root = el.parentElement?.parentElement || el.parentElement || el;
      return (root.innerText || "").replace(/\s+/g, " ");
    });
    expect(
      departmentText,
      `SHOP BY DEPARTMENT should show Aisles ${aisleCount}. Got: ${departmentText}`,
    ).toMatch(new RegExp(`Aisles\\s*${aisleCount}`, "i"));

    await expect(this.allAisles).toBeVisible();

    for (const category of categories.slice(0, 3)) {
      if (category?.title) {
        await expect(
          this.page.getByText(category.title, { exact: true }).first(),
        ).toBeVisible();
      }
    }
  }

  async verifyStoreHours() {
    await expect(this.navHours).toBeVisible();
    await this.navHours.click();
    await expect(this.storeHoursDialog).toBeVisible();
    await expect(this.storeHoursDialog.getByText("Store Hours")).toBeVisible();

    for (const day of [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]) {
      await expect(this.storeHoursDialog.getByText(day).first()).toBeVisible();
    }

    await expect(
      this.storeHoursDialog.getByText(/Today/i).first(),
    ).toBeVisible();
    await expect(
      this.storeHoursDialog.getByText(/\d{1,2}:\d{2}\s*(AM|PM)/i).first(),
    ).toBeVisible();
    await expect(
      this.storeHoursDialog.getByText(/Estimated Pickup Time/i),
    ).toBeVisible();

    await this.closeHoursBtn.click();
    await expect(this.storeHoursDialog).toHaveCount(0);
  }

  async verifyMerchantIdMatchesLogin() {
    const merchantId = sessionDataStorage.get("merchantId");
    expect(merchantId, "Merchant ID should be stored from login").toBeTruthy();
    const url = new URL(this.page.url());
    expect(url.origin).toBe(new URL(routes.webBaseUrl).origin);
    expect(url.pathname).toBe(`/merchant/${merchantId}`);
    console.log("URL merchant ID:", merchantId);
  }

  async verifyOrderMethod(method) {
    const expected = method.toLowerCase();
    const methodLabel = expected === "pickup" ? "Pickup" : "Delivery";
    await expect(this.page).toHaveURL(
      new RegExp(`orderMethod=${expected}`, "i"),
    );

    const store = sessionDataStorage.get("storeData");
    const pickupOn = store ? OnlineOrdering.pickupEnabled(store) : true;
    const deliveryOn = store ? OnlineOrdering.deliveryEnabled(store) : true;

    const activeToggle =
      expected === "pickup" ? this.pickupToggle : this.deliveryToggle;
    const inactiveToggle =
      expected === "pickup" ? this.deliveryToggle : this.pickupToggle;
    const inactiveEnabled = expected === "pickup" ? deliveryOn : pickupOn;

    await expect(activeToggle).toHaveAttribute("aria-pressed", "true");
    if (inactiveEnabled) {
      await expect(inactiveToggle).not.toHaveAttribute("aria-pressed", "true");
    } else {
      await expect(inactiveToggle).toHaveCount(0);
    }

    await expect(this.selectedOrderMethod).toBeVisible();
    const selectedSummary = await this.selectedOrderMethod.evaluate((el) => {
      const root = el.parentElement?.parentElement || el.parentElement || el;
      return (root.innerText || "").replace(/\s+/g, " ");
    });
    expect(
      selectedSummary,
      `SELECTED ORDER METHOD should show ${methodLabel}. Got: ${selectedSummary}`,
    ).toMatch(new RegExp(`SELECTED ORDER METHOD\\s+${methodLabel}`, "i"));

    const badge =
      expected === "pickup" ? this.pickupReadyBadge : this.localDeliveryBadge;
    await expect(badge.first()).toBeVisible();
    sessionDataStorage.set("orderMethod", expected);
    console.log("Verified order method:", expected);
  }

  async gotoOrderMethod(method) {
    const apisPromise = waitForStorefrontApis(this.page);
    await this.page.goto(OnlineOrdering.storefrontUrl({ orderMethod: method }));
    await this.page.waitForLoadState("domcontentloaded");
    const apiBodies = await apisPromise;
    sessionDataStorage.set("storefrontApis", apiBodies);
    await this.verifyAgeModalHidden();
    await this.verifyOrderMethod(method);
    return apiBodies;
  }

  async reloadStorefront() {
    const apisPromise = waitForStorefrontApis(this.page);
    await this.page.reload({ waitUntil: "domcontentloaded" });
    const apiBodies = await apisPromise;
    sessionDataStorage.set("storefrontApis", apiBodies);
    await this.verifyAgeModalHidden();
    return apiBodies;
  }

  async selectOrderMethod(method) {
    const expected = method.toLowerCase();
    const toggle =
      expected === "pickup" ? this.pickupToggle : this.deliveryToggle;
    await toggle.click();
    await this.page.waitForURL(new RegExp(`orderMethod=${expected}`, "i"), {
      timeout: 15_000,
    });
    await this.verifyOrderMethod(expected);
  }

  async ensureAgeConfirmed() {
    if (await this.ageYesBtn.isVisible()) {
      await this.confirmAge21();
    }
  }

  async verifyGuestLogInVisible() {
    await expect(this.logIn).toBeVisible();
    await expect(this.account).toHaveCount(0);
  }

  async openBuyItAgain() {
    await expect(this.navBuyItAgain).toBeVisible();
    await this.navBuyItAgain.click();
    await expect(this.page).toHaveURL(/filter_type=buy-it-again/i);
    await expect(this.buyItAgainLoginHeading).toBeVisible({ timeout: 15_000 });
  }

  async verifyGuestBuyItAgainLoginCard() {
    await expect(this.buyItAgainPrivacyLabel).toBeVisible();
    await expect(this.buyItAgainLoginHeading).toBeVisible();
    await expect(this.buyItAgainLoginCopy).toBeVisible();
    await expect(this.buyItAgainLogInBtn).toBeVisible();
  }

  async clickBuyItAgainLogIn() {
    await expect(this.buyItAgainLogInBtn).toBeVisible();
    await this.buyItAgainLogInBtn.click();
  }

  async verifyCustomerLoginPrompt() {
    await expect(this.page).toHaveURL(/customer-login/);
    await expect(this.signInHeading).toBeVisible();
    await expect(this.customerEmail).toBeVisible();
    await expect(this.customerPassword).toBeVisible();
    await expect(this.customerSignInBtn).toBeVisible();
  }

  async loginAsCustomer(email, password) {
    await this.customerEmail.fill(email);
    await this.customerPassword.fill(password);
    const body = await customerLoginAPI(this.page, () =>
      this.customerSignInBtn.click(),
    );
    expect(body.status).toBe(200);
    expect(String(body.message || "")).toMatch(/login successfully/i);
    expect(body.record?.email).toBe(email);
    await this.page.waitForURL(/\/merchant\//, { timeout: 20_000 });
    await this.page.waitForLoadState("domcontentloaded");
    return body;
  }

  async verifyLoggedInAccount() {
    await expect(this.account).toBeVisible();
    await expect(this.logIn).toHaveCount(0);
  }

  async openBuyItAgainAndValidateApi() {
    await expect(this.navBuyItAgain).toBeVisible();
    const body = await buyItAgainAPI(this.page, () =>
      this.navBuyItAgain.click(),
    );
    await expect(this.page).toHaveURL(/filter_type=buy-it-again/i);
    await expect(this.buyItAgainLoginHeading).toHaveCount(0);
    return body;
  }

  visibleAddToCart() {
    return this.page
      .locator("button")
      .filter({ hasText: /^Add to cart$/i })
      .filter({ visible: true })
      .first();
  }

  async buyFromBuyItAgain() {
    await expect(this.visibleAddToCart()).toBeVisible({ timeout: 20_000 });
    return buyNowProductAPI(this.page, () => this.visibleAddToCart().click());
  }

  static flattenProducts(apiBody) {
    const grouped = apiBody?.result?.all_product || {};
    return Object.values(grouped)
      .flatMap((item) => (Array.isArray(item) ? item : Object.values(item || {})))
      .filter((product) => product?.title);
  }

  async openCart() {
    await expect(this.cartBtn).toBeVisible();
    if (await this.cartHeading.first().isVisible()) {
      return;
    }
    await this.cartBtn.click();
    await expect(this.cartHeading.first()).toBeVisible();
  }

  async closeCartIfOpen() {
    if (!(await this.cartHeading.first().isVisible())) {
      return;
    }
    await this.closeCartBtn.first().click();
    await this.expectCartClosed();
  }

  async verifyEmptyCartUI() {
    await this.openCart();
    await expect(this.page.getByText(/0 items/i).first()).toBeVisible();
    await expect(this.emptyCartMessage).toBeVisible();
    await expect(this.emptyCartSubtext).toBeVisible();
    await expect(this.shopNowBtn).toBeVisible();
    await expect(this.continueToCheckoutBtn).toBeHidden();
    await expect(this.closeCartBtn.first()).toBeVisible();
  }

  async expectCartClosed() {
    await expect(this.emptyCartMessage).toBeHidden();
    await expect(this.cartHeading.first()).toBeHidden();
  }

  async clickShopNowFromCart() {
    await expect(this.shopNowBtn).toBeVisible();
    await this.shopNowBtn.click();
    await this.expectCartClosed();
  }

  async verifyProductListFromApi(apiBody) {
    const products = OnlineOrdering.flattenProducts(apiBody);
    expect(products.length, "merchant-products API should return products").toBeGreaterThan(0);

    for (const product of products.slice(0, 5)) {
      await expect(
        this.page.getByText(product.title, { exact: true }).first(),
      ).toBeVisible();
    }
  }

  async openFirstProduct() {
    const products = OnlineOrdering.flattenProducts(
      sessionDataStorage.get("storefrontApis")?.products,
    );
    expect(products.length, "merchant-products API should return products").toBeGreaterThan(0);
    const title = products[0].title;
    await this.page.getByText(title, { exact: true }).first().click();
    await expect(
      this.page.getByRole("heading", { name: title }).first(),
    ).toBeVisible({ timeout: 15_000 });
    return title;
  }

  async verifyQty(expected) {
    if (await this.qtyInput.isVisible()) {
      await expect(this.qtyInput).toHaveValue(String(expected));
      return;
    }
    await expect(this.page.getByText(String(expected), { exact: true }).first()).toBeVisible();
  }

  async increaseQty() {
    await expect(this.increaseQtyBtn).toBeVisible();
    await this.increaseQtyBtn.click();
  }

  async decreaseQty() {
    await expect(this.decreaseQtyBtn).toBeVisible();
    await this.decreaseQtyBtn.click();
  }

  async addProductToCartFromPdp() {
    await expect(this.visibleAddToCart()).toBeVisible();
    await this.visibleAddToCart().click();
    await expect(this.cartBtn).toContainText("1", { timeout: 15_000 });
  }
}

module.exports = { OnlineOrdering };
