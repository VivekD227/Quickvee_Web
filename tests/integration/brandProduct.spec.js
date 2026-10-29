import { test, expect } from "@playwright/test";
import { Brands } from "../../pageObjects/Brands";
import { Products } from "../../pageObjects/Products";
import { LoginPage } from "../../pageObjects/LoginPage";
import { Dashboard } from "../../pageObjects/Dashboard";
import { navigateToLoginPage } from "../../utilities/helper/navigationHelper";
import merchants from "../../api/testData/merchants.json";
import routes from "../../utilities/routes.js";

test.describe("Brand - Product Integration", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let brand;
  let products;
  let newBrand;
  let editedBrand;
  let specialBrand;
  let singleProduct;
  let variantProduct;

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      brand = new Brands(page);
      products = new Products(page);

      await navigateToLoginPage(page);
      const [loginApiResponse] = await Promise.all([
        page.waitForResponse(
          (res) =>
            res.request().method() === "POST" &&
            res.url().includes(routes.API_URL.login),
        ),
        loginpage.login(
          merchants.merchantLogin.storename,
          merchants.merchantLogin.username,
          merchants.merchantLogin.password,
        ),
      ]);
      expect(loginApiResponse.status()).toBe(200);
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

  test("Add a new brand", async () => {
    newBrand = await brand.generateUniqueBrandName();
    await brand.addBrandBtnClick();
    await brand.setBrandName(newBrand);
    await brand.addBtnAPI();
    await brand.successfullDialogDisplay();
    await brand.verifyAddedBrandInListWithActions(newBrand);
  });

  test("Add a brand with special characters", async () => {
    specialBrand = `Auto & Co.'s #${String(Date.now()).slice(-8)}`;
    await brand.addBrandBtnClick();
    await brand.setBrandName(specialBrand);
    await brand.addBtnAPI();
    await brand.successfullDialogDisplay();
    await brand.verifyAddedBrandInListWithActions(specialBrand);
  });

  test("Non variant product with the new brand", async () => {
    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();

    singleProduct = {
      name: `Auto Brand Single ${Date.now()}`,
      category: "Quickadd",
      cost: "10.00",
      price: "20.00",
      brand: newBrand,
    };
    await products.reopenAddSingleProductForm();
    await products.addSingleProductWithRequiredFieldsAndVerifyMarginProfit(
      singleProduct,
    );
    await products.verifyProductBrandOnEditForm(singleProduct);
  });

  test("Variant product with the new brand", async () => {
    variantProduct = {
      name: `Auto Brand Variant ${Date.now()}`,
      category: "Quickadd",
      cost: "10.00",
      price: "20.00",
      brand: newBrand,
      attributes: [{ values: ["V1"] }],
    };
    await products.reopenAddVariantsProductForm();
    await products.addVariantProductWithRequiredFields(variantProduct);
    await products.verifyProductBrandOnEditForm(variantProduct);
  });

  test("Brands filter on Products listing shows both products", async () => {
    await products.verifyBrandFilterShowsProducts(newBrand, [
      singleProduct.name,
      variantProduct.name,
    ]);
  });

  test("Duplicate product keeps the brand", async () => {
    await products.verifyDuplicateKeepsBrand(singleProduct);
  });

  test("Change product brand to the special characters brand", async () => {
    await products.changeProductBrand({
      name: singleProduct.name,
      fromBrand: newBrand,
      toBrand: specialBrand,
    });
    await products.verifyProductBrandOnEditForm({
      name: singleProduct.name,
      brand: specialBrand,
      previousBrand: newBrand,
    });
    await products.verifyBrandFilterShowsProducts(specialBrand, [
      singleProduct.name,
    ]);
    await products.verifyBrandFilterShowsProducts(newBrand, [
      variantProduct.name,
    ]);
  });

  test("Remove brand from product", async () => {
    await products.changeProductBrand({
      name: singleProduct.name,
      fromBrand: specialBrand,
    });
    await products.verifyProductBrandRemovedOnEditForm({
      name: singleProduct.name,
      removedBrand: specialBrand,
    });
    await products.verifyBrandFilterShowsProducts(specialBrand, []);
  });

  test("Assign the brand back to the product", async () => {
    await products.changeProductBrand({
      name: singleProduct.name,
      toBrand: newBrand,
    });
    await products.verifyProductBrandOnEditForm(singleProduct);
  });

  test("Rename the brand from Brands page", async () => {
    editedBrand = await brand.generateUniqueEditBrandName();
    await dashboard.brandsClick();
    await brand.brandsHeadingDisplay();
    await brand.renameBrand(newBrand, editedBrand);
  });

  test("Renamed brand reflects on both products", async () => {
    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();
    for (const product of [singleProduct, variantProduct]) {
      await products.verifyProductBrandOnEditForm({
        name: product.name,
        brand: editedBrand,
        previousBrand: newBrand,
      });
    }
  });

  test("Renamed brand reflects in Brands filter and Brand dropdown", async () => {
    await products.verifyBrandFilterShowsProducts(editedBrand, [
      singleProduct.name,
      variantProduct.name,
    ]);
    await products.verifyBrandInListingFilter(newBrand, false);

    await products.reopenAddSingleProductForm();
    await products.verifyBrandInProductDropdown(editedBrand, true);
    await products.verifyBrandInProductDropdown(newBrand, false);
    await products.returnToProductsList();
  });

  test("Delete the brand from Brands page", async () => {
    await dashboard.brandsClick();
    await brand.brandsHeadingDisplay();
    await brand.deleteBrand(editedBrand);
  });

  test("Deleted brand is removed from both products", async () => {
    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();
    for (const product of [singleProduct, variantProduct]) {
      await products.verifyProductBrandRemovedOnEditForm({
        name: product.name,
        removedBrand: editedBrand,
      });
    }
  });

  test("Deleted brand is not in Brands filter and Brand dropdown", async () => {
    await products.verifyBrandInListingFilter(editedBrand, false);

    await products.reopenAddSingleProductForm();
    await products.verifyBrandInProductDropdown(editedBrand, false);
    await products.returnToProductsList();
  });

  test("Delete the special characters brand", async () => {
    await dashboard.brandsClick();
    await brand.brandsHeadingDisplay();
    await brand.deleteBrand(specialBrand);
  });
});
