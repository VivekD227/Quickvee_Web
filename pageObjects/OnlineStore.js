import { expect } from "@playwright/test";
import { webBaseUrl } from "../utilities/baseUrl";

// Customer-facing online store (quickvee.com/merchant/<merchantId>), used for
// Pickup orders. Covers the age gate, the Uber delivery popup, customer login,
// product links, search, the cart drawer and the 3-step checkout.

export class OnlineStore {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {string} merchantId store id from the storefront URL, e.g. "VIV1458857AE"
   */
  constructor(page, merchantId) {
    this.page = page;
    this.merchantId = merchantId;
    this.homeUrl = `${webBaseUrl}/merchant/${merchantId}?orderMethod=pickup`;

    this.ageGateYesBtn = page.getByRole("button", { name: /Yes, I am 21/i });
    this.uberOverlay = page.locator(".uber-delivery-modal-overlay");
    this.searchInput = page.getByPlaceholder(/Search Product/i).first();
    this.addToCartBtn = page.getByRole("button", { name: "Add to cart", exact: true });
    this.openCartBtn = page.getByRole("button", { name: /Open shopping cart/ });
    this.continueToCheckoutLink = page.getByRole("link", { name: /Continue to checkout/ });
    this.popupOkBtn = page.getByRole("button", { name: "Ok", exact: true });
    this.proceedToCheckoutBtn = page.getByRole("button", { name: /^Proceed to checkout$/i }).first();
    this.paymentHeading = page.getByRole("heading", { name: "Payment & fulfillment" });
    this.cashOption = page.getByText("Cash", { exact: true }).first();
    this.pickupDateInput = page.locator('input[name="pickupdate"]');
    this.pickupTimeSelect = page.locator("#pickup-time-select");
    this.placeOrderBtn = page.getByRole("button", { name: /^PLACE ORDER$/i });
    this.unavailableInCart = page.getByText(
      "This item is no longer available at this store. Remove it to continue.",
    );
  }

  productUrl(productId, categoryId) {
    return `${webBaseUrl}/product/${this.merchantId}?orderMethod=pickup&categoryid=${categoryId}&product=${productId}`;
  }

  // ---------------------------------------------------------------------------
  // Popups and login
  // ---------------------------------------------------------------------------

  async dismissPopups() {
    if (await this.ageGateYesBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.ageGateYesBtn.click();
    }
    for (let i = 0; i < 5; i++) {
      if (!(await this.uberOverlay.isVisible({ timeout: 1_500 }).catch(() => false))) return;
      await this.uberOverlay
        .locator("button, [role=button], img, svg")
        .first()
        .click({ force: true })
        .catch(() => {});
      if (await this.uberOverlay.isVisible().catch(() => false)) {
        await this.page.keyboard.press("Escape");
      }
    }
  }

  async login(username, password) {
    await this.page.goto(`${webBaseUrl}/customer-login`, { waitUntil: "domcontentloaded" });
    await this.dismissPopups();
    await this.page.locator('input[name="username"]').fill(username);
    await this.page.locator('input[name="password"]').fill(password);
    await this.page.locator('input[name="password"]').press("Enter");
    await expect(this.page).not.toHaveURL(/customer-login/, { timeout: 60_000 });
    await this.openHome();
    await expect(this.page.getByRole("button", { name: "Open account menu" })).toBeVisible({
      timeout: 30_000,
    });
  }

  async openHome() {
    await this.page.goto(this.homeUrl, { waitUntil: "domcontentloaded" });
    await expect(this.openCartBtn).toBeVisible({ timeout: 60_000 });
    await this.dismissPopups();
  }

  // ---------------------------------------------------------------------------
  // Product page
  // ---------------------------------------------------------------------------

  // Opens a product link. A product that can't be ordered online sends the
  // customer back to the store home; an orderable one shows "Add to cart".
  async openProduct(productId, categoryId) {
    await this.page.goto(this.productUrl(productId, categoryId), { waitUntil: "domcontentloaded" });
    await expect
      .poll(
        async () =>
          (await this.addToCartBtn.isVisible()) || /\/merchant\//.test(this.page.url()),
        { timeout: 45_000, message: `product ${productId} page settles` },
      )
      .toBe(true);
    await this.dismissPopups();
  }

  async verifyProductOpens(productId, categoryId) {
    await this.openProduct(productId, categoryId);
    await expect(this.page).toHaveURL(/\/product\//);
    await expect(this.addToCartBtn).toBeVisible();
  }

  async verifyProductBlocked(productId, categoryId) {
    await this.openProduct(productId, categoryId);
    await expect(this.page).toHaveURL(new RegExp(`/merchant/${this.merchantId}`));
    await expect(this.addToCartBtn).toBeHidden();
  }

  async addProductToCart(productId, categoryId, productName) {
    await this.verifyProductOpens(productId, categoryId);
    await this.addToCartBtn.click();
    await this.page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    if (productName) {
      // The cart is saved on the server; check it from a fresh page.
      await expect(async () => {
        await this.openCart();
        await expect(this.cartItem(productName)).toBeVisible({ timeout: 10_000 });
      }).toPass({ timeout: 60_000 });
      await this.closeCart();
    }
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  // Types in the header search and returns whether the product is among the
  // results of the search-products call the search box makes.
  async searchShows(text, productName) {
    await this.openHome();
    const response = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        /search-products/.test(res.url()) &&
        (res.request().postData() || "").includes(text),
      { timeout: 30_000 },
    );
    await this.searchInput.click();
    await this.searchInput.pressSequentially(text, { delay: 80 });
    const body = await (await response).text();
    const titles = [...body.matchAll(/"title":"((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`));
    return titles.includes(productName);
  }

  // Search is backed by an index that can lag a few minutes behind a save on
  // Live.
  async verifyInSearch(text, productName, shown, timeout = 300_000) {
    await expect
      .poll(() => this.searchShows(text, productName), {
        timeout,
        intervals: [5_000, 10_000, 20_000],
        message: `"${productName}" ${shown ? "shown" : "hidden"} in search for "${text}"`,
      })
      .toBe(shown);
  }

  // ---------------------------------------------------------------------------
  // Cart
  // ---------------------------------------------------------------------------

  async openCart() {
    await this.openHome();
    await this.openCartBtn.click();
    await expect(this.page.getByText("Your cart", { exact: true })).toBeVisible();
    await expect(this.page.getByText(/Loading your cart/i)).toBeHidden({ timeout: 30_000 });
  }

  async closeCart() {
    await this.page.keyboard.press("Escape");
  }

  async clearCart() {
    await this.openCart();
    const remove = this.page.getByRole("button", { name: /^Remove .* from cart$/ }).first();
    for (let i = 0; i < 10 && (await remove.isVisible().catch(() => false)); i++) {
      const before = await this.page.getByRole("button", { name: /^Remove .* from cart$/ }).count();
      await remove.click();
      await expect(this.page.getByRole("button", { name: /^Remove .* from cart$/ })).toHaveCount(
        before - 1,
      );
    }
    await this.closeCart();
  }

  cartItem(productName) {
    return this.page.getByRole("button", { name: `Remove ${productName} from cart` });
  }

  // ---------------------------------------------------------------------------
  // Checkout
  // ---------------------------------------------------------------------------

  // Cart drawer → step 1 → step 2 → "Payment & fulfillment".
  async goToPayment() {
    await this.openCart();
    await expect(this.page.getByRole("button", { name: /^Remove .* from cart$/ }).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(this.continueToCheckoutLink).not.toHaveAttribute("aria-disabled", "true");
    await this.continueToCheckoutLink.click();
    await expect(this.proceedToCheckoutBtn.or(this.popupOkBtn).first()).toBeVisible({
      timeout: 60_000,
    });
    if (await this.popupOkBtn.isVisible().catch(() => false)) await this.popupOkBtn.click();
    await this.dismissPopups();
    await expect(async () => {
      if (await this.proceedToCheckoutBtn.isVisible()) await this.proceedToCheckoutBtn.click();
      await expect(this.paymentHeading).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
    await this.dismissPopups();
  }

  // Cash and Pickup Now when offered; otherwise (or with later=true) Pickup
  // Later with the first open date and time slot.
  async chooseCashPickup({ later = false } = {}) {
    await this.cashOption.click();
    const pickupNow = this.page.getByText("Pickup Now", { exact: true });
    const pickupLater = this.page.getByText("Pickup Later", { exact: true });
    if (!later && (await pickupNow.isVisible().catch(() => false))) {
      await pickupNow.click();
      return;
    }
    if (await pickupLater.isVisible().catch(() => false)) await pickupLater.click();
    if (await this.pickupDateInput.isVisible().catch(() => false)) {
      await this.pickupDateInput.click();
      await this.page.locator("button[role=gridcell]:not([disabled])").first().click();
      await expect(this.pickupDateInput).not.toHaveValue(/^$|MM\/DD\/YYYY/);
      await this.pickupTimeSelect.click();
      await this.page
        .locator('ul[role=listbox] li[data-value]:not([data-value=""]):not([aria-disabled="true"])')
        .first()
        .click();
      await expect(this.page.locator('input[name="pickuptime"]')).not.toHaveValue("");
    }
  }

  // Clicks Place order and waits for the order to be accepted or refused.
  // Returns { orderId, invalidProducts, ... }.
  //
  // A click made while the payment page is still loading can pass the cart
  // checks yet never send the order (no saveOrder call, no message). So the
  // click waits for the page to settle, and is repeated if no order was sent;
  // that is safe because nothing was saved by the first click.
  async placeOrder({ attempts = 3 } = {}) {
    const posts = [];
    const logPost = (res) => {
      if (res.request().method() === "POST") posts.push(`${res.url().split("/").pop()} ${res.status()}`);
    };
    this.page.on("response", logPost);
    let saveResponse = null;
    let verified = null;
    let invalidProducts = [];
    for (let attempt = 1; attempt <= attempts && !saveResponse; attempt++) {
      await this.page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      const validate = this.page.waitForResponse(
        (res) => res.request().method() === "POST" && /validateProductOrderMethod/.test(res.url()),
        { timeout: 60_000 },
      );
      const saved = this.page
        .waitForResponse(
          (res) => res.request().method() === "POST" && /Process_order_online\/saveOrder/.test(res.url()),
          { timeout: 25_000 },
        )
        .catch(() => null);
      const cartCheck = this.page
        .waitForResponse(
          (res) => res.request().method() === "POST" && /verify_cart_quantity/.test(res.url()),
          { timeout: 30_000 },
        )
        .then((res) => res.json())
        .catch(() => null);
      await this.placeOrderBtn.click();
      const validateBody = await (await validate).json();
      invalidProducts = (validateBody.invalidProducts || []).map(String);
      if (invalidProducts.length) {
        this.page.off("response", logPost);
        return { orderId: null, invalidProducts, posts };
      }
      saveResponse = await saved;
      verified = await cartCheck;
      if (!saveResponse && (await this.placeOrderBtn.isVisible().catch(() => false)) === false) {
        // Left the payment page without an order call we saw: stop retrying.
        break;
      }
    }
    this.page.off("response", logPost);
    const body = saveResponse ? await saveResponse.json().catch(() => ({})) : {};
    return {
      orderId: body?.result?.order_id || null,
      invalidProducts,
      body,
      posts,
      cartCheck: verified,
      screenText: saveResponse
        ? ""
        : (await this.page.locator("body").innerText()).split("Pickup Option")[1]?.slice(0, 1200),
    };
  }
}
