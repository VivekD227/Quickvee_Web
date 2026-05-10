import { test, expect } from "@playwright/test";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { loginResponse } from "../utilities/loginHelper";

const VALID_STORE = "chain";
const MERCHANT_EMAIL = "vivek.dubey521@gmail.com";
const MERCHANT_PASSWORD = "Quickvee123!";

/** Stays on login URL and shows an inline/HTML5 validation failure or API error banner. */
async function expectStayOnLoginWithFailure(page, loginpage) {
  await expect(page).toHaveURL(/merchants\/login/);

  const bannerVisible = await loginpage.incorrectMessage
    .isVisible()
    .catch(() => false);
  const inputErrorCount = await loginpage.errorMessage.count();
  const storeInvalid = await loginpage.storeName.evaluate((el) => !el.validity.valid);
  const userInvalid = await loginpage.username.evaluate((el) => !el.validity.valid);
  const passInvalid = await loginpage.password.evaluate((el) => !el.validity.valid);

  expect(
    bannerVisible ||
      inputErrorCount > 0 ||
      storeInvalid ||
      userInvalid ||
      passInvalid
  ).toBeTruthy();
}

test.describe("Login Module", () => {

  /** Avoid two full logins hitting production in parallel; allow slow API responses. */
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  let loginpage;
  let dashboard;

  test.beforeEach(async ({ page }) => {

    await page.goto("https://quickvee.com/merchants/login");

    loginpage = new LoginPage(page);
    dashboard = new Dashboard(page);
    // page.waitForEvent();
    await loginpage.LogoDisplayed();
  });

  test("Merchant Login", async ({ page }) => {

    const responseBody = await loginResponse(page, loginpage, "chain", "vivek.dubey521@gmail.com", "Quickvee123!")

    expect(responseBody.login_type).toBe("merchant");
    await dashboard.storenameDisplay();
    await dashboard.profileBtnClick();
    await dashboard.logoutBtnClick();
  });

  test("Employee Login", async ({ page }) => {

    const responseBody = await loginResponse(page, loginpage, "chain", "vivek@gmail.com", "Vivek@123");

    expect(responseBody.login_type).toBe("manager");
    await dashboard.storenameDisplay();
    await dashboard.profileBtnClick();
    await dashboard.logoutBtnClick();
  });

  test("Incorrect Password", async ({ page }) => {
    await loginpage.login(VALID_STORE, MERCHANT_EMAIL, "Quickvee123");
    await loginpage.inputMessageDisplay();
    await loginpage.inputMessageText("Incorrect Username & Password");
  });

  test("loginWithInvalidUsername", async ({ page }) => {
    await loginpage.login(
      VALID_STORE,
      "not-a-real-user@invalid.local",
      MERCHANT_PASSWORD
    );
    await loginpage.inputMessageDisplay();
    await loginpage.inputMessageText("Incorrect Username & Password");
  });

  test("loginWithInvalidStoreName", async ({ page }) => {
    await loginpage.login(
      "nonexistent-store-xyz",
      MERCHANT_EMAIL,
      MERCHANT_PASSWORD
    );
    await loginpage.inputMessageDisplay();
    await loginpage.inputMessageText("Incorrect Username & Password");
  });

  test("loginWithEmptyFields", async ({ page }) => {
    await loginpage.clickLogin();
    await expectStayOnLoginWithFailure(page, loginpage);
  });

  test("loginWithOnlyUsernameEntered", async ({ page }) => {
    await loginpage.fillUsername(MERCHANT_EMAIL);
    await loginpage.clickLogin();
    await expectStayOnLoginWithFailure(page, loginpage);
  });

  test("loginWithOnlyPasswordEntered", async ({ page }) => {
    await loginpage.fillPassword(MERCHANT_PASSWORD);
    await loginpage.clickLogin();
    await expectStayOnLoginWithFailure(page, loginpage);
  });
});