import { test, expect } from "@playwright/test";
import { Vendor } from "../../pageObjects/Vendor";
import { Products } from "../../pageObjects/Products";
import { LoginPage } from "../../pageObjects/LoginPage";
import { Dashboard } from "../../pageObjects/Dashboard";
import { navigateToLoginPage } from "../../utilities/helper/navigationHelper";
import merchants from "../../api/testData/merchants.json";
import routes from "../../utilities/routes.js";

// Vendors can't be picked on Add product, so every assignment here happens on
// the product edit form.
test.describe("Vendor - Product Integration", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let vendor;
  let products;
  let newVendor;
  let editedVendor;
  let otherVendor;
  let singleProduct;
  let variantProduct;
  // Never gets a vendor: the picker hides vendors already on the product.
  let plainProduct;

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      vendor = new Vendor(page);
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
      await dashboard.vendorsClick();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    await context?.close();
  });

  test("Add a new vendor", async () => {
    newVendor = vendor.generateUniqueVendorName();
    await vendor.createVendorWithRequiredFieldsOnly(newVendor);
  });

  test("Add a second vendor", async () => {
    otherVendor = vendor.generateUniqueVendorName();
    await vendor.createVendorWithRequiredFieldsOnly(otherVendor, "5557654321");
  });

  test("Non variant product has no vendor after create", async () => {
    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();

    singleProduct = {
      name: `Auto Vendor Single ${Date.now()}`,
      category: "Quickadd",
      cost: "10.00",
      price: "20.00",
    };
    await products.reopenAddSingleProductForm();
    await products.addSingleProductWithRequiredFieldsAndVerifyMarginProfit(
      singleProduct,
    );
    await products.verifyProductVendorsOnEditForm({ product: singleProduct });
  });

  test("Variant product has no vendor after create", async () => {
    variantProduct = {
      name: `Auto Vendor Variant ${Date.now()}`,
      category: "Quickadd",
      cost: "10.00",
      price: "20.00",
      attributes: [{ values: ["V1"] }],
    };
    await products.reopenAddVariantsProductForm();
    await products.addVariantProductWithRequiredFields(variantProduct);
    await products.verifyProductVendorsOnEditForm({ product: variantProduct });
  });

  test("Assign the new vendor to non variant product on edit", async () => {
    await products.changeProductVendors({
      product: singleProduct,
      add: [newVendor],
    });
    await products.verifyProductVendorsOnEditForm({
      product: singleProduct,
      vendors: [{ name: newVendor }],
      unchanged: singleProduct,
    });
  });

  test("Assign the new vendor to variant product on edit", async () => {
    await products.changeProductVendors({
      product: variantProduct,
      add: [newVendor],
    });
    await products.verifyProductVendorsOnEditForm({
      product: variantProduct,
      vendors: [{ name: newVendor }],
      unchanged: variantProduct,
    });
  });

  test("Vendor picker lists the new vendor but not on a product that already has it", async () => {
    plainProduct = {
      name: `Auto Vendor Plain ${Date.now()}`,
      category: "Quickadd",
      cost: "10.00",
      price: "20.00",
    };
    await products.reopenAddSingleProductForm();
    await products.addSingleProductWithRequiredFieldsAndVerifyMarginProfit(
      plainProduct,
    );
    await products.verifyVendorInProductPicker(plainProduct, newVendor, true);
    await products.verifyVendorInProductPicker(singleProduct, newVendor, false);
  });

  test("Vendors filter on Products listing shows both products", async () => {
    await products.verifyVendorFilterShowsProducts(newVendor, [
      singleProduct.name,
      variantProduct.name,
    ]);
  });

  test("Product can have multiple vendors with one preferred", async () => {
    await products.changeProductVendors({
      product: singleProduct,
      add: [otherVendor],
      preferred: otherVendor,
    });
    await products.verifyProductVendorsOnEditForm({
      product: singleProduct,
      vendors: [
        { name: newVendor, preferred: false },
        { name: otherVendor, preferred: true },
      ],
    });
    await products.verifyVendorFilterShowsProducts(otherVendor, [
      singleProduct.name,
    ]);
  });

  test("Switching preferred vendor unmarks the previous one", async () => {
    await products.changeProductVendors({
      product: singleProduct,
      preferred: newVendor,
    });
    await products.verifyProductVendorsOnEditForm({
      product: singleProduct,
      vendors: [
        { name: newVendor, preferred: true },
        { name: otherVendor, preferred: false },
      ],
    });
  });

  test("Vendor cost per item is saved without changing product cost", async () => {
    await products.changeProductVendors({
      product: singleProduct,
      costs: { [newVendor]: "5.25" },
    });
    await products.verifyProductVendorsOnEditForm({
      product: singleProduct,
      vendors: [
        { name: newVendor, cost: "5.25", preferred: true },
        { name: otherVendor, cost: "0", preferred: false },
      ],
      unchanged: singleProduct,
    });
  });

  test("Remove one vendor from product", async () => {
    await products.changeProductVendors({
      product: singleProduct,
      remove: [otherVendor],
    });
    await products.verifyProductVendorsOnEditForm({
      product: singleProduct,
      vendors: [{ name: newVendor, cost: "5.25", preferred: true }],
      absentVendors: [otherVendor],
      unchanged: singleProduct,
    });
    await products.verifyVendorFilterShowsProducts(otherVendor, []);
  });

  test("Duplicate product does not copy vendors", async () => {
    await products.verifyDuplicateDoesNotCopyVendors(singleProduct);
  });

  test("Rename the vendor from Vendors page", async () => {
    editedVendor = `${newVendor}Edit`;
    await dashboard.vendorsClick();
    await vendor.verifyVendorsPageLoaded();
    await vendor.updateVendorFieldAndVerify({
      currentVendorName: newVendor,
      updates: { vendorName: editedVendor },
    });
  });

  test("Renamed vendor reflects on both products without changing other details", async () => {
    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();
    await products.verifyProductVendorsOnEditForm({
      product: singleProduct,
      vendors: [{ name: editedVendor, cost: "5.25", preferred: true }],
      absentVendors: [newVendor],
      unchanged: singleProduct,
    });
    await products.verifyProductVendorsOnEditForm({
      product: variantProduct,
      vendors: [{ name: editedVendor }],
      absentVendors: [newVendor],
      unchanged: variantProduct,
    });
    for (const product of [singleProduct, variantProduct]) {
      await products.verifyProductStillInListing(product);
    }
  });

  test("Renamed vendor reflects in Vendors filter and vendor picker", async () => {
    await products.verifyVendorFilterShowsProducts(editedVendor, [
      singleProduct.name,
      variantProduct.name,
    ]);
    await products.verifyVendorInListingFilter(newVendor, false);

    await products.verifyVendorInProductPicker(plainProduct, editedVendor, true);
    await products.verifyVendorInProductPicker(plainProduct, newVendor, false);
  });

  test("Delete the vendor from Vendors page", async () => {
    await dashboard.vendorsClick();
    await vendor.verifyVendorsPageLoaded();
    await vendor.deleteVendorAndVerifyRemoved(editedVendor);
  });

  test("Deleted vendor is removed from both products without changing other details", async () => {
    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();
    for (const product of [singleProduct, variantProduct]) {
      await products.verifyProductVendorsOnEditForm({
        product,
        vendors: [],
        absentVendors: [editedVendor],
        unchanged: product,
      });
      await products.verifyProductStillInListing(product);
    }
  });

  test("Deleted vendor is not in Vendors filter and vendor picker", async () => {
    await products.verifyVendorInListingFilter(editedVendor, false);
    await products.verifyVendorInProductPicker(plainProduct, editedVendor, false);
  });

  test("Delete the second vendor", async () => {
    await dashboard.vendorsClick();
    await vendor.verifyVendorsPageLoaded();
    await vendor.deleteVendorAndVerifyRemoved(otherVendor);
  });
});
