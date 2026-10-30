import { test, expect } from "@playwright/test";
import { Categories } from "../../pageObjects/Categories";
import { Products } from "../../pageObjects/Products";
import { LoginPage } from "../../pageObjects/LoginPage";
import { Dashboard } from "../../pageObjects/Dashboard";
import { navigateToLoginPage } from "../../utilities/helper/navigationHelper";
import merchants from "../../api/testData/merchants.json";
import routes from "../../utilities/routes.js";

test.describe("Category - Product Integration", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let category;
  let products;
  let newCategory;
  let otherCategory;
  let singleProduct;
  let variantProduct;
  let twoCategoryProduct;
  let multiCategoryProduct;

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      category = new Categories(page);
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
      await dashboard.categoriesClick();
      await category.selectAlphabeticalMode();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    test.setTimeout(120_000);
    const createdCategories = [newCategory, otherCategory].filter(Boolean);
    if (page && createdCategories.length) {
      await category.cleanupCategories(createdCategories);
    }
    await context?.close();
  });

  test("Add a new category", async () => {
    newCategory = category.generateUniqueCategoryName();
    await category.addCategory(newCategory, "Automation integration category");
  });

  test("Add a second category", async () => {
    otherCategory = category.generateUniqueCategoryName("AutoCatOther");
    await category.addCategory(otherCategory);
  });

  test("New category is listed in Categories filter and product Categories dropdown", async () => {
    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();
    await products.verifyCategoryInListingFilter(newCategory, true);

    await products.reopenAddSingleProductForm();
    await products.verifyCategoryInProductDropdown(newCategory, true);
    await products.returnToProductsList();
  });

  test("Non variant product with the new category", async () => {
    singleProduct = {
      name: `Auto Cat Single ${Date.now()}`,
      categories: [newCategory],
      cost: "10.00",
      price: "20.00",
    };
    await products.reopenAddSingleProductForm();
    await products.addSingleProductWithRequiredFieldsAndVerifyMarginProfit(
      singleProduct,
    );
    await products.verifyProductDetailsOnEditForm(singleProduct);
  });

  test("Variant product with the new category", async () => {
    variantProduct = {
      name: `Auto Cat Variant ${Date.now()}`,
      categories: [newCategory],
      cost: "10.00",
      price: "20.00",
      attributes: [{ values: ["V1"] }],
    };
    await products.reopenAddVariantsProductForm();
    await products.addVariantProductWithRequiredFields(variantProduct);
    await products.verifyProductDetailsOnEditForm(variantProduct);
  });

  test("Product with the new category and the second category", async () => {
    twoCategoryProduct = {
      name: `Auto Cat Two ${Date.now()}`,
      categories: [newCategory, otherCategory],
      cost: "10.00",
      price: "20.00",
    };
    await products.reopenAddSingleProductForm();
    await products.addSingleProductWithRequiredFieldsAndVerifyMarginProfit(
      twoCategoryProduct,
    );
    await products.verifyProductDetailsOnEditForm(twoCategoryProduct);
  });

  test("Product with the new category and Quickadd", async () => {
    multiCategoryProduct = {
      name: `Auto Cat Multi ${Date.now()}`,
      categories: [newCategory, "Quickadd"],
      cost: "10.00",
      price: "20.00",
    };
    await products.reopenAddSingleProductForm();
    await products.addSingleProductWithRequiredFieldsAndVerifyMarginProfit(
      multiCategoryProduct,
    );
    await products.verifyProductDetailsOnEditForm(multiCategoryProduct);
  });

  test("Categories filter on Products listing shows all four products", async () => {
    await products.verifyCategoryFilterShowsProducts(newCategory, [
      singleProduct.name,
      variantProduct.name,
      twoCategoryProduct.name,
      multiCategoryProduct.name,
    ]);
    await products.verifyCategoryFilterShowsProducts(otherCategory, [
      twoCategoryProduct.name,
    ]);
  });

  test("Products listing shows the new category products with their price", async () => {
    for (const product of [
      singleProduct,
      variantProduct,
      twoCategoryProduct,
      multiCategoryProduct,
    ]) {
      await products.verifyProductStillInListing(product);
    }
  });

  test("Duplicate product keeps the category", async () => {
    await products.verifyDuplicateKeepsCategories(multiCategoryProduct);
  });

  test("Delete the new category from Categories page", async () => {
    await dashboard.categoriesClick();
    await category.verifyCategoriesPageLoaded();
    await category.deleteCategory(newCategory);
  });

  // A product can't be left without a category: delete falls back to Quickadd
  // only when no other category remains.
  test("Products with only the deleted category get Quickadd", async () => {
    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();
    for (const product of [singleProduct, variantProduct]) {
      await products.verifyProductDetailsOnEditForm({
        ...product,
        categories: ["Quickadd"],
      });
    }
  });

  test("Product with two categories keeps only the other one", async () => {
    await products.verifyProductDetailsOnEditForm({
      ...twoCategoryProduct,
      categories: [otherCategory],
    });
  });

  test("Product with Quickadd and the deleted category keeps only Quickadd", async () => {
    await products.verifyProductDetailsOnEditForm({
      ...multiCategoryProduct,
      categories: ["Quickadd"],
    });
  });

  test("Products stay in the listing with their price after category delete", async () => {
    for (const product of [
      singleProduct,
      variantProduct,
      twoCategoryProduct,
      multiCategoryProduct,
    ]) {
      await products.verifyProductStillInListing(product);
    }
    await products.verifyCategoryFilterShowsProducts(otherCategory, [
      twoCategoryProduct.name,
    ]);
  });

  test("Deleted category is not in Categories filter and product Categories dropdown", async () => {
    await products.verifyCategoryInListingFilter(newCategory, false);

    await products.reopenAddSingleProductForm();
    await products.verifyCategoryInProductDropdown(newCategory, false);
    await products.returnToProductsList();
  });
});
