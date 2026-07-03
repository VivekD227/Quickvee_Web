import { test } from "@playwright/test";
import { Brands } from "../pageObjects/Brands";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import merchants from "../api/testData/merchants.json";
import routes from "../utilities/routes.js";

test.describe("New Brand Module", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let brand;
  let sName;
  let uName;
  let pwd;
  let newBrand;
  let editBrand;
  const duplicate_Brand = "Duplicate Brand";

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      brand = new Brands(page);
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
      await dashboard.brandsClick();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    await context?.close();
  });

  // test("Merchant login and navigate to Brands page", async () => {
  //   await brand.verifyBrandsPageLoaded();
  // });

  test("Verify Brands page UI elements are displayed", async () => {
    await brand.brandsHeadingDisplay();
    await brand.brandCountDisplay();
    await brand.verifyBrandCountMatchesAPI();
    await brand.addBrandBtnDisplay();
    await brand.searchBarDisplay();
    await brand.onlineDisplayOrderDisplay();
    await brand.reorderHintDisplay();
    await brand.multipleClickAdd();
    await brand.cancelBtnClick();
  });

  test("Adding Duplicate Brand", async () => {
    await brand.addBrandBtnClick();
    await brand.setBrandName(duplicate_Brand);
    await brand.addBtnAPI();
    await brand.successfullDialogDisplay();
    await brand.verifyAddedBrandInListWithActions(duplicate_Brand);
  });

  test("Adding a new brand", async () => {
    newBrand = await brand.generateUniqueBrandName();
    await brand.addBrandBtnClick();
    await brand.setBrandName(newBrand);
    await brand.addBtnAPI();
    await brand.successfullDialogDisplay();
    await brand.verifyAddedBrandInListWithActions(newBrand);
  });

  test("Search for the added brand", async () => {
    await brand.searchBrand(newBrand);
    await brand.verifySearchedBrandDisplayed(newBrand);
  });

  test("Verify duplicate brand name is not allowed", async () => {
    await brand.clearBrandSearch();
    await brand.verifyDuplicateBrandNameNotAllowed(newBrand);
  });

  test("Verify brand name exceeding 50 characters shows error", async () => {
    await brand.verifyBrandNameExceedingMaxLengthNotAllowed(50);
  });

  test("Verify Edit brand name functionality", async () => {
    editBrand = await brand.generateUniqueEditBrandName();
    await brand.clickEditButton(editBrand);
  });

  test("Verify duplicate name while Editing", async () => {
    await brand.verifyDuplicateOnEdit(duplicate_Brand);
  });

  test("Verify Delete Brand", async () => {
    await brand.deleteBrand(duplicate_Brand);
  });
});
