import { test, expect } from "@playwright/test";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { loginResponse } from "../utilities/apiHelper/loginHelper";

const VALID_STORE = "chain";
const MERCHANT_EMAIL = "vivek.dubey521@gmail.com";
const MERCHANT_PASSWORD = "Quickvee123!";

test.describe("Login Module", () => {
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
    const responseBody = await loginResponse(
      page,
      loginpage,
      "chain",
      "vivek.dubey521@gmail.com",
      "Quickvee123!",
    );

    expect(responseBody.login_type).toBe("merchant");
    await dashboard.storenameDisplay();
    await dashboard.profileBtnClick();
    await dashboard.logoutBtnClick();
  });

  test("Employee Login", async ({ page }) => {
    const responseBody = await loginResponse(
      page,
      loginpage,
      "chain",
      "vivek@gmail.com",
      "Vivek@123",
    );

    expect(responseBody.login_type).toBe("manager");
    await dashboard.storenameDisplay();
    await dashboard.profileBtnClick();
    await dashboard.logoutBtnClick();
  });

  test("Incorrect Password", async ({ page }) => {

    const response = await loginResponse(
      page,
      loginpage,
      "chain",
      "vivek.dubey521@gmail.com",
      "Quickvee@123",
    );
    let msg = "Incorrect Username & Password";

    expect(response.status).toBeFalsy();
    expect(response.msg).toBe(msg);
    await loginpage.inputMessageDisplay();
    await loginpage.inputMessageText(msg);
  });

  test("loginWithInvalidUsername", async ({ page }) => {
    await loginpage.login(
      VALID_STORE,
      "vivek.dubey521gmail.com",
      MERCHANT_PASSWORD,
    );
    await loginpage.inputMessageDisplay();
    await loginpage.inputMessageText("Incorrect Username & Password");
  });

  test("loginWithInvalidStoreName", async ({ page }) => {
    await loginpage.login("chains", MERCHANT_EMAIL, MERCHANT_PASSWORD);
    await loginpage.inputMessageDisplay();
    await loginpage.inputMessageText("Incorrect Username & Password");
  });

  test("loginWithEmptyFields", async ({ page }) => {
    await loginpage.clickLogin();
    await loginpage.storeErrorDisplay();
    await loginpage.userErrorDisplay();
    await loginpage.pwdErrorDisplay();
    expect(page).toHaveURL("https://quickvee.com/merchants/login");
  });

  test("loginWithOnlyUsernameEntered", async ({ page }) => {
    await loginpage.fillUsername(MERCHANT_EMAIL);
    await loginpage.clickLogin();
    await loginpage.pwdErrorDisplay();
    await loginpage.storeErrorDisplay();

    expect(page).toHaveURL("https://quickvee.com/merchants/login");
  });

  test("loginWithOnlyPasswordEntered", async ({ page }) => {
    await loginpage.fillPassword(MERCHANT_PASSWORD);
    await loginpage.clickLogin();
    await loginpage.storeErrorDisplay();
    await loginpage.userErrorDisplay();

    expect(page).toHaveURL("https://quickvee.com/merchants/login");
  });
});
