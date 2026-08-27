import { test } from "@playwright/test";
import { Products } from "../pageObjects/Products";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import merchants from "../api/testData/merchants.json";
import routes from "../utilities/routes.js";

test.describe("Products Module", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let products;
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
      products = new Products(page);
      sName = merchants.merchantLogin.storename;
      uName = merchants.merchantLogin.username;
      pwd = merchants.merchantLogin.password;

      await navigateToLoginPage(page);
      const [loginApiResponse] = await Promise.all([
        page.waitForResponse(
          (res) =>
            res.request().method() === "POST" &&
            res.url().includes(routes.API_URL.login),
        ),
        loginpage.login(sName, uName, pwd),
      ]);
      await loginApiResponse.json();
      await dashboard.logoDisplayed();
      await dashboard.menuClick();
      await dashboard.inventoryClick();
      await dashboard.productsClick();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    await context?.close();
  });

  test("Validate Products page URL and UI elements", async () => {
    await products.verifyProductsPageLoaded();
    await products.verifyPageUrl();
    await products.verifyProductsMenuAndUrl();
    await products.verifyProductsPageUIElements();
  });
});
