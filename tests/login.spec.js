import { test, expect } from "@playwright/test";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { loginResponse } from "../utilities/apiHelper/loginHelper";
import { setMerchantID } from "../utilities/helper/sessionData";
import sessionDataStorage from "../utilities/helper/sessionDataStorage";
import merchants from "../api/testData/merchants.json";
import {
  navigateToLoginPage,
  getLoginUrl,
} from "../utilities/helper/navigationHelper";
const route = require("../utilities/routes");

const VALID_STORE = merchants.merchantLogin.storename;
const MERCHANT_EMAIL = merchants.merchantLogin.username;
const MERCHANT_PASSWORD = merchants.merchantLogin.password;

function incorrectLogin(session) {
  expect(session.status).toBeFalsy();
  expect(session.msg).toBe("Incorrect Username & Password");
  console.log(session.msg);
  return String(session.msg);
}

test.describe("Login Module", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  let loginpage;
  let dashboard;
  const url = route.API_URL.login;

  test.beforeEach(async ({ page }) => {
    await navigateToLoginPage(page);

    loginpage = new LoginPage(page);
    dashboard = new Dashboard(page);
    // page.waitForEvent();
    await loginpage.LogoDisplayed();
  });

  test("Merchant Login", async ({ page }) => {
    await loginpage.login(VALID_STORE, MERCHANT_EMAIL, MERCHANT_PASSWORD);

    const responseBody = await loginResponse(page);
    await expect(responseBody.login_type).toBe("merchant");
    console.log(responseBody.login_type);

    //    await dashboard.storenameDisplay();
    await dashboard.profileBtnClick();
    await dashboard.logoutBtnClick();
  });

  test("Employee Login", async ({ page, request }) => {
    await loginpage.login(
      merchants.employeeLogin.storename,
      merchants.employeeLogin.username,
      merchants.employeeLogin.password,
    );

    const respo = await loginResponse(page);
    await expect(respo.login_type).toBe("manager");
    console.log(respo.login_type);
    await dashboard.storenameDisplay();
    await dashboard.profileBtnClick();
    await dashboard.logoutBtnClick();
  });

  test("Incorrect Password", async ({ page }) => {
    await loginpage.login(
      merchants.incorrect_Login.storename,
      merchants.incorrect_Login.username,
      merchants.incorrect_Login.password,
    );

    // let msg = "Incorrect Username & Password";
    const APIresponse = await loginResponse(page);
    const msg = incorrectLogin(APIresponse);
    // await expect(APIresponse.status).toBeFalsy();
    // await expect(APIresponse.msg).toBe(msg);

    await loginpage.inputMessageDisplay();
    await loginpage.inputMessageText(msg);
  });

  test("loginWithInvalidUsername", async ({ page }) => {
    await loginpage.login(
      VALID_STORE,
      "vivek.dubey521gmail.com",
      MERCHANT_PASSWORD,
    );
    const APIresponse = await loginResponse(page);
    const msg = incorrectLogin(APIresponse);
    await loginpage.inputMessageDisplay();
    await loginpage.inputMessageText(msg);
  });

  test("loginWithInvalidStoreName", async ({ page }) => {
    await loginpage.login("chains", MERCHANT_EMAIL, MERCHANT_PASSWORD);
    const APIresponse = await loginResponse(page);
    const msg = incorrectLogin(APIresponse);
    await loginpage.inputMessageDisplay();
    await loginpage.inputMessageText(msg);
  });

  test("loginWithEmptyFields", async ({ page }) => {
    await loginpage.clickLogin();
    await loginpage.storeErrorDisplay();
    await loginpage.userErrorDisplay();
    await loginpage.pwdErrorDisplay();
    await expect(page).toHaveURL(getLoginUrl());
  });

  test("loginWithOnlyUsernameEntered", async ({ page }) => {
    await loginpage.fillUsername(MERCHANT_EMAIL);
    await loginpage.clickLogin();
    await loginpage.pwdErrorDisplay();
    await loginpage.storeErrorDisplay();

    await expect(page).toHaveURL(getLoginUrl());
  });

  test("loginWithOnlyPasswordEntered", async ({ page }) => {
    await loginpage.fillPassword(MERCHANT_PASSWORD);
    await loginpage.clickLogin();
    await loginpage.storeErrorDisplay();
    await loginpage.userErrorDisplay();

    await expect(page).toHaveURL(getLoginUrl());
  });
});
