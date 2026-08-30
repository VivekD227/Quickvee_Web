import { test } from "@playwright/test";
import { Products } from "../pageObjects/Products";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import { getStores } from "../utilities/apiHelper/getStoresAPI";
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
  let createdProduct;

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
      const storesPromise = getStores(page);
      const [loginApiResponse] = await Promise.all([
        page.waitForResponse(
          (res) =>
            res.request().method() === "POST" &&
            res.url().includes(routes.API_URL.login),
        ),
        loginpage.login(sName, uName, pwd),
      ]);
      const loginBody = await loginApiResponse.json();
      const storeResponse = await storesPromise;
      const loginStoreCount = Array.isArray(loginBody?.data2?.stores)
        ? loginBody.data2.stores.length
        : 0;
      const managerStoreCount = Array.isArray(storeResponse?.data)
        ? storeResponse.data.length
        : 0;
      products.setStoreCount(Math.max(loginStoreCount, managerStoreCount));
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

  test("Navigate to Products page", async () => {
    await products.verifyProductsPageLoaded();
    await products.verifyPageUrl();
    await products.verifyProductsMenuAndUrl();
    await products.productsHeadingDisplay();
    await products.loadedCountDisplay();
    await products.searchBarDisplay();
    await products.addProductBtnDisplay();
    await products.filtersDisplay();
    await products.onlineOrderingDisplay();
    await products.sortBtnDisplay();
    await products.columnHeadersDisplay();
    await products.verifySortOptionsDisplay();
  });

  test("Product list APIs on page load", async () => {
    await products.verifyListApiOnPageLoad();
    await products.verifyProductListOrEmptyState();
  });

  test("Click Add product and verify choose type dialog", async () => {
    await products.addProductBtnClick();
    await products.verifyAddProductTypeDialogUI();
    await products.verifyContinueDisabled();
  });


  test("Select Single product then Continue", async () => {
    await products.selectSingleProductType();
    await products.continueAddProductType();
    await products.verifyAddSingleProductUrl();
    await products.verifyAddSingleProductFormUI();
  });

  test("Required: Save with no data shows validation errors", async () => {
    await products.verifyRequiredAllEmptyValidation();
  });

  test("Required: Categories empty shows validation error", async () => {
    await products.verifyRequiredCategoriesEmptyValidation();
  });

  test("Required: Price empty shows validation error", async () => {
    await products.verifyRequiredPriceEmptyValidation();
  });

  test("Price does not accept negative value", async () => {
    await products.verifyPriceRejectsNegative();
    await products.verifyPriceZeroValidation();
  });

  test("Quantity does not accept negative value", async () => {
    await products.verifyQuantityRejectsNegative();
  });

  test("Compare-at price must be greater than Price", async () => {
    await products.verifyCompareAtLessThanPriceValidation();
  });

  test("Required: Name empty shows validation error", async () => {
    await products.verifyRequiredNameEmptyValidation();
  });

  test("Add single product with required fields and verify margin/profit", async () => {
    createdProduct = {
      name: `Auto Mandatory ${Date.now()}`,
      category: "Quickadd",
      cost: "10.00",
      price: "20.00",
    };
    await products.reopenAddSingleProductForm();
    await products.addSingleProductWithRequiredFieldsAndVerifyMarginProfit(
      createdProduct,
    );
  });

  test("Listing, view details, and edit for created product", async () => {
    await products.verifyCreatedProductInListing(createdProduct);
    await products.verifyCreatedProductViewDetails(createdProduct);
    await products.verifyCreatedProductEditForm(createdProduct);
  });

  test("Add product without UPC, generate from save dialog", async () => {
    createdProduct = {
      name: `Auto NoUpc ${Date.now()}`,
      category: "Quickadd",
      cost: "10.00",
      price: "20.00",
    };
    await products.reopenAddSingleProductForm();
    await products.addSingleProductWithoutUpcGenerateFromDialog(createdProduct);
  });

  test("Listing, view details, and edit for no-UPC generated product", async () => {
    await products.verifyCreatedProductInListing(createdProduct);
    await products.verifyCreatedProductViewDetails(createdProduct);
    await products.verifyCreatedProductEditForm(createdProduct);
  });

  test("Add single product with all details", async () => {
    createdProduct = {
      name: `Auto Full ${Date.now()}`,
      category: "Quickadd",
      cost: "10.00",
      price: "20.00",
      compareAt: "25.00",
      quantity: "5",
      reorderPoint: "2",
      reorderQty: "10",
      description: "Auto full product description",
      customCode: `CC${Date.now().toString().slice(-8)}`,
    };
    await products.reopenAddSingleProductForm();
    await products.addSingleProductWithAllDetails(createdProduct);
  });

  test("Listing, view details, and edit for fully filled product", async () => {
    await products.verifyCreatedProductInListing(createdProduct);
    await products.verifyCreatedProductViewDetails(createdProduct);
    await products.verifyCreatedProductEditForm(createdProduct);
  });

  test("Select Product with variants then Continue", async () => {
    await products.returnToProductsList();
    await products.addProductBtnClick();
    await products.verifyContinueDisabled();
    await products.selectVariantsProductType();
    await products.continueAddProductType();
    await products.verifyAddVariantsProductUrl();
  });
});
