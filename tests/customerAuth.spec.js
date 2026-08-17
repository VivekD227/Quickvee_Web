import { test, expect } from "@playwright/test";
import { OnlineOrdering } from "../pageObjects/OnlineOrdering";
import { CustomerAuth } from "../pageObjects/CustomerAuth";
import { APIClients } from "../api/clients/APIClients";
import { loginPayload } from "../api/payloads/merchantLoginPayload";
import merchants from "../api/testData/merchants.json";
import sessionDataStorage from "../utilities/helper/sessionDataStorage";
import { waitForStorefrontApis } from "../utilities/apiHelper/onlineOrderingAPI";
import routes from "../utilities/routes.js";

test.describe("Customer Sign In and Sign Up", () => {
  test.describe.configure({ timeout: 60_000 });

  test.beforeAll(async ({ request }) => {
    const apiClients = new APIClients(request);
    const payload = loginPayload(
      merchants.merchantLogin.username,
      merchants.merchantLogin.password,
      merchants.merchantLogin.storename,
      merchants.merchantLogin.otp,
    );
    const response = await apiClients.post(routes.API_URL.login, payload);
    expect(response.ok()).toBeTruthy();
    const loginData = await response.json();
    const merchantId = loginData.data.merchant_id;
    expect(merchantId, "merchant_id from merchant session").toBeTruthy();
    sessionDataStorage.set("merchantId", merchantId);
    console.log(merchantId);
  });

  test.beforeEach(async ({ page }) => {
    const store = new OnlineOrdering(page);
    const storeApisPromise = waitForStorefrontApis(page);
    await page.goto(OnlineOrdering.storefrontUrl(), {
      waitUntil: "domcontentloaded",
    });
    await storeApisPromise;
    await store.ensureAgeConfirmed();
  });

  test("Sign in form opens from storefront Log In", async ({ page }) => {
    const auth = new CustomerAuth(page);
    await auth.openSignInFromStorefront();
  });

  test("Empty sign in stays on the sign in page", async ({ page }) => {
    const auth = new CustomerAuth(page);
    await auth.openSignInFromStorefront();
    await auth.submitEmptySignIn();
  });

  test("Invalid customer password does not log in", async ({ page }) => {
    const auth = new CustomerAuth(page);
    await auth.openSignInFromStorefront();
    await auth.signInExpectError(
      merchants.incorrect_Customer_Login.username,
      merchants.incorrect_Customer_Login.password,
    );
  });

  test("Valid customer sign in shows Account", async ({ page }) => {
    const auth = new CustomerAuth(page);
    await auth.openSignInFromStorefront();
    const loginBody = await auth.signIn(
      merchants.customerLogin.username,
      merchants.customerLogin.password,
    );
    expect(loginBody.record.email).toBe(merchants.customerLogin.username);
    await auth.verifyLoggedInAccount();
  });

  test("Sign up form opens from Sign up tab", async ({ page }) => {
    const auth = new CustomerAuth(page);
    await auth.openSignInFromStorefront();
    await auth.openSignUp();
  });
});
