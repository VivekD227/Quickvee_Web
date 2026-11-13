import { test, expect } from "@playwright/test";
import { Attributes } from "../../pageObjects/Attributes";
import { Products } from "../../pageObjects/Products";
import { LoginPage } from "../../pageObjects/LoginPage";
import { Dashboard } from "../../pageObjects/Dashboard";
import { navigateToLoginPage } from "../../utilities/helper/navigationHelper";
import merchants from "../../api/testData/merchants.json";
import routes from "../../utilities/routes.js";

// Attributes link to variant products only: each variant shows
// "<Attribute>: <value>" under its name on the Add, Edit and Duplicate forms.
// Unlike brands and tags, attributes can only be renamed (no delete or merge)
// and the Products listing has no Attributes filter.
test.describe("Attribute - Product Integration", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let attributes;
  let products;
  let firstAttribute;
  let secondAttribute;
  let renamedAttribute;
  let oneAttributeProduct;
  let twoAttributeProduct;

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      attributes = new Attributes(page);
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
      await dashboard.attributesClick();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    await context?.close();
  });

  test("Add two new attributes", async () => {
    await attributes.verifyAttributesPageLoaded();
    firstAttribute = await attributes.generateUniqueAttributeName();
    secondAttribute = await attributes.generateUniqueAttributeName();
    await attributes.addNewAttribute(firstAttribute);
    await attributes.addNewAttribute(secondAttribute);
  });

  test("New attribute is available in the product attribute picker", async () => {
    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();
    await products.verifyAttributeInPicker(firstAttribute, true);
  });

  test("Variant product with the new attribute", async () => {
    oneAttributeProduct = {
      name: `Auto Attr One ${Date.now()}`,
      category: "Quickadd",
      cost: "10.00",
      price: "20.00",
      attributes: [{ attribute: firstAttribute, values: ["S", "M"] }],
    };
    await products.reopenAddVariantsProductForm();
    // Also checks "<attribute>: <value>" under every variant on the Add form.
    await products.addVariantProductWithRequiredFields(oneAttributeProduct);
    await products.verifyVariantProductInListing(oneAttributeProduct);
  });

  test("Variant product with both new attributes", async () => {
    twoAttributeProduct = {
      name: `Auto Attr Two ${Date.now()}`,
      category: "Quickadd",
      cost: "10.00",
      price: "20.00",
      attributes: [
        { attribute: firstAttribute, values: ["S", "M"] },
        { attribute: secondAttribute, values: ["Red", "Blue"] },
      ],
    };
    await products.reopenAddVariantsProductForm();
    await products.addVariantProductWithRequiredFields(twoAttributeProduct);
    await products.verifyVariantProductInListing(twoAttributeProduct);
  });

  test("Edit form shows the attribute names on every variant", async () => {
    await products.verifyProductAttributesOnEditForm({
      name: oneAttributeProduct.name,
      attributes: [firstAttribute],
      unchanged: oneAttributeProduct,
    });
    await products.verifyProductAttributesOnEditForm({
      name: twoAttributeProduct.name,
      attributes: [firstAttribute, secondAttribute],
      unchanged: twoAttributeProduct,
    });
  });

  test("Add variants on Edit asks for a value of each attribute", async () => {
    await products.verifyAddVariantAsksForAttributes(twoAttributeProduct, [
      firstAttribute,
      secondAttribute,
    ]);
  });

  test("Duplicate product keeps the attribute names", async () => {
    await products.verifyDuplicateKeepsAttributes(twoAttributeProduct, [
      firstAttribute,
      secondAttribute,
    ]);
  });

  test("Attribute used by a product can only be renamed (no Delete or Merge)", async () => {
    await dashboard.attributesClick();
    await attributes.verifyAttributesPageLoaded();
    await attributes.verifyAttributeRowHasOnlyRename(firstAttribute);
  });

  test("Products listing has no Attributes filter", async () => {
    await dashboard.productsClick();
    await products.verifyNoAttributesListingFilter();
  });

  test("Rename the attribute from Attributes page", async () => {
    renamedAttribute = await attributes.generateUniqueEditAttributeName();
    await dashboard.attributesClick();
    await attributes.verifyAttributesPageLoaded();
    await attributes.renameAttribute(firstAttribute, renamedAttribute);
  });

  test("Renamed attribute reflects on both products without changing other details", async () => {
    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();
    await products.verifyProductAttributesOnEditForm({
      name: oneAttributeProduct.name,
      attributes: [renamedAttribute],
      previousAttributes: [firstAttribute],
      unchanged: oneAttributeProduct,
    });
    await products.verifyProductAttributesOnEditForm({
      name: twoAttributeProduct.name,
      attributes: [renamedAttribute, secondAttribute],
      previousAttributes: [firstAttribute],
      unchanged: twoAttributeProduct,
    });
  });

  test("Renamed attribute reflects in Add variants and Duplicate", async () => {
    await products.verifyAddVariantAsksForAttributes(twoAttributeProduct, [
      renamedAttribute,
      secondAttribute,
    ]);
    await products.verifyDuplicateKeepsAttributes(twoAttributeProduct, [
      renamedAttribute,
      secondAttribute,
    ]);
  });

  test("Renamed attribute replaces the old name in the attribute picker", async () => {
    await products.verifyAttributeInPicker(renamedAttribute, true);
    await products.verifyAttributeInPicker(firstAttribute, false);
  });
});
