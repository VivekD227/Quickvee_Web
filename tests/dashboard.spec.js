import { test, expect } from "@playwright/test";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import merchants from "../api/testData/merchants.json";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";

test.describe("DashBoard Module", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  let loginpage;
  let dashboard;
  let sName;
  let uName;
  let pwd;

  test.beforeEach(async ({ page }) => {
    await navigateToLoginPage(page);
    loginpage = new LoginPage(page);
    dashboard = new Dashboard(page);
    sName = merchants.merchantLogin.storename;
    uName = merchants.merchantLogin.username;
    pwd = merchants.merchantLogin.password;

    await loginpage.login(sName, uName, pwd);
    await dashboard.logoDisplayed();
  });

  test("Check UI", async ({ page }) => {
    let storeName = "Test Automation";
    let vName = "View Online Store";
    // await dashboard.storenameDisplay();

    // await dashboard.storeNameText(storeName);
    // await dashboard.viewStoreDisplay();

    await dashboard.menuClick();
  });
});
