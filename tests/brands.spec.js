import { test, expect } from "@playwright/test";
import { navigateToQALoginPage } from "../utilities/helper/navigationHelper";
import { loginResponse } from "../utilities/apiHelper/loginHelper";
import { Dashboard } from "../pageObjects/Dashboard";
import { LoginPage } from "../pageObjects/LoginPage";
import merchants from "../api/testData/merchants.json";

test.describe("New Brand Module", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let sName;
  let uName;
  let pwd;

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      sName = merchants.merchantLogin.storename;
      uName = merchants.merchantLogin.username;
      pwd = merchants.merchantLogin.password;
      await navigateToQALoginPage(page);
      const login = await loginResponse(page, loginpage, sName, uName, pwd);
      await dashboard.logoDisplayed();
      await dashboard.menuClick();
      await dashboard.inventoryClick();
      await dashboard.brandsClick();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    await context?.close();
  });

  test("Check UI", async () => {
    console.log("Test");
    await page.pause();
  });
});
