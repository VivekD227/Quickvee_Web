import { test, expect } from "@playwright/test";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { loginResponse } from "../utilities/apiHelper/loginHelper";
import { setMerchantID } from "../utilities/helper/sessionData";
import sessionDataStorage from "../utilities/helper/sessionDataStorage";
import merchants from "../api/testData/merchants.json";
import {
  getLoginUrl,
  navigateToLoginPage,
} from "../utilities/helper/navigationHelper";

const VALID_STORE = "chain";
const MERCHANT_EMAIL = "vivek.dubey521@gmail.com";
const MERCHANT_PASSWORD = "Quickvee123!";

test.describe("Login Module", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  let loginpage;
  let dashboard;

  test.beforeEach(async ({ page }) => {
    await navigateToLoginPage(page);

    loginpage = new LoginPage(page);
    dashboard = new Dashboard(page);
    // page.waitForEvent();
    await loginpage.LogoDisplayed();
  });

  test("Merchant Login", async ({ page }) => {
    const responseBody = await loginResponse(
      page,
      loginpage,
      merchants.merchantLogin.storename,
      merchants.merchantLogin.username,
      merchants.merchantLogin.password,
    );

    //const respo = await loginpage.successAPILoginMerchant();
    await expect(responseBody.login_type).toBe("merchant");
    console.log(responseBody.login_type);
    // const mid = await sessionDataStorage.get("merchantId");
    // console.log("Merchant ID from sessionDataStorage:", mid);
    // console.log(sessionDataStorage.get("token"));
    await dashboard.storenameDisplay();
    await dashboard.profileBtnClick();
    await dashboard.logoutBtnClick();
  });

  test("Employee Login", async ({ page }) => {
    const responseBody = await loginResponse(
      page,
      loginpage,
      merchants.employeeLogin.storename,
      merchants.employeeLogin.username,
      merchants.employeeLogin.password,
    );

    const respo = await loginpage.createSessionAPIEmployee();
    await expect(respo.login_type).toBe("manager");
    console.log(respo.login_type);
    await dashboard.storenameDisplay();
    await dashboard.profileBtnClick();
    await dashboard.logoutBtnClick();
  });

  test("Incorrect Password", async ({ page }) => {
    const response = await loginResponse(
      page,
      loginpage,
      merchants.incorrect_Login.storename,
      merchants.incorrect_Login.username,
      merchants.incorrect_Login.password,
    );
    let msg = "Incorrect Username & Password";
    const APIresponse = await loginpage.incorrectLoginAPI();
    await expect(APIresponse.status).toBeFalsy();
    await expect(APIresponse.msg).toBe(msg);
    // expect(response.status).toBeFalsy();
    // expect(response.msg).toBe(msg);
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
    expect(page).toHaveURL(getLoginUrl());
  });

  test("loginWithOnlyUsernameEntered", async ({ page }) => {
    await loginpage.fillUsername(MERCHANT_EMAIL);
    await loginpage.clickLogin();
    await loginpage.pwdErrorDisplay();
    await loginpage.storeErrorDisplay();

    expect(page).toHaveURL(getLoginUrl());
  });

  test("loginWithOnlyPasswordEntered", async ({ page }) => {
    await loginpage.fillPassword(MERCHANT_PASSWORD);
    await loginpage.clickLogin();
    await loginpage.storeErrorDisplay();
    await loginpage.userErrorDisplay();

    expect(page).toHaveURL(getLoginUrl());
  });
});
