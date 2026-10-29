import { test, expect } from "@playwright/test";
import { Tag } from "../../pageObjects/Tag";
import { Products } from "../../pageObjects/Products";
import { LoginPage } from "../../pageObjects/LoginPage";
import { Dashboard } from "../../pageObjects/Dashboard";
import { navigateToLoginPage } from "../../utilities/helper/navigationHelper";
import merchants from "../../api/testData/merchants.json";
import routes from "../../utilities/routes.js";

test.describe("Tag - Product Integration", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let tag;
  let products;
  let newTag;
  let editedTag;
  let specialTag;
  let singleProduct;
  let variantProduct;

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      tag = new Tag(page);
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
      await dashboard.tagsClick();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    await context?.close();
  });

  test("Add a new tag", async () => {
    newTag = await tag.generateUniqueTagName();
    await tag.addTagBtnClick();
    await tag.setTagName(newTag);
    await tag.addBtnAPI();
    await tag.successfullDialogDisplay();
    await tag.verifyAddedTagInListWithActions(newTag);
  });

  test("Add a tag with special characters", async () => {
    specialTag = `Auto Tag & Co.'s #${String(Date.now()).slice(-8)}`;
    await tag.addTagBtnClick();
    await tag.setTagName(specialTag);
    await tag.addBtnAPI();
    await tag.successfullDialogDisplay();
    await tag.verifyAddedTagInListWithActions(specialTag);
  });

  test("Non variant product with the new tag", async () => {
    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();

    singleProduct = {
      name: `Auto Tag Single ${Date.now()}`,
      category: "Quickadd",
      cost: "10.00",
      price: "20.00",
      tags: [newTag],
    };
    await products.reopenAddSingleProductForm();
    await products.addSingleProductWithRequiredFieldsAndVerifyMarginProfit(
      singleProduct,
    );
    await products.verifyProductTagsOnEditForm(singleProduct);
  });

  test("Variant product with the new tag", async () => {
    variantProduct = {
      name: `Auto Tag Variant ${Date.now()}`,
      category: "Quickadd",
      cost: "10.00",
      price: "20.00",
      tags: [newTag],
      attributes: [{ values: ["V1"] }],
    };
    await products.reopenAddVariantsProductForm();
    await products.addVariantProductWithRequiredFields(variantProduct);
    await products.verifyProductTagsOnEditForm(variantProduct);
  });

  test("Tags filter on Products listing shows both products", async () => {
    await products.verifyTagFilterShowsProducts(newTag, [
      singleProduct.name,
      variantProduct.name,
    ]);
  });

  test("Duplicate product keeps the tag", async () => {
    await products.verifyDuplicateKeepsTags(singleProduct);
  });

  test("Product can have multiple tags", async () => {
    await products.changeProductTags({
      name: singleProduct.name,
      add: [specialTag],
    });
    await products.verifyProductTagsOnEditForm({
      name: singleProduct.name,
      tags: [newTag, specialTag],
    });
    await products.verifyTagFilterShowsProducts(specialTag, [
      singleProduct.name,
    ]);
    await products.verifyTagFilterShowsProducts(newTag, [
      singleProduct.name,
      variantProduct.name,
    ]);
  });

  test("Remove one tag from product", async () => {
    await products.changeProductTags({
      name: singleProduct.name,
      remove: [specialTag],
    });
    await products.verifyProductTagsOnEditForm({
      name: singleProduct.name,
      tags: [newTag],
      absentTags: [specialTag],
    });
    await products.verifyTagFilterShowsProducts(specialTag, []);
  });

  test("Rename the tag from Tags page", async () => {
    editedTag = await tag.generateUniqueEditTagName();
    await dashboard.tagsClick();
    await tag.verifyTagsPageLoaded();
    await tag.renameTag(newTag, editedTag);
  });

  test("Renamed tag reflects on both products", async () => {
    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();
    for (const product of [singleProduct, variantProduct]) {
      await products.verifyProductTagsOnEditForm({
        name: product.name,
        tags: [editedTag],
        absentTags: [newTag],
      });
    }
  });

  test("Renamed tag reflects in Tags filter and Tags dropdown", async () => {
    await products.verifyTagFilterShowsProducts(editedTag, [
      singleProduct.name,
      variantProduct.name,
    ]);
    await products.verifyTagInListingFilter(newTag, false);

    await products.reopenAddSingleProductForm();
    await products.verifyTagInProductDropdown(editedTag, true);
    await products.verifyTagInProductDropdown(newTag, false);
    await products.returnToProductsList();
  });

  test("Merge the special characters tag into the renamed tag", async () => {
    // Variant ends up with both tags, so the merge also has to de-duplicate.
    await products.changeProductTags({
      name: variantProduct.name,
      add: [specialTag],
    });
    await products.verifyProductTagsOnEditForm({
      name: variantProduct.name,
      tags: [editedTag, specialTag],
    });
    // Single keeps only the merged-away tag, so the merge has to add the kept tag.
    await products.changeProductTags({
      name: singleProduct.name,
      remove: [editedTag],
      add: [specialTag],
    });
    await products.verifyProductTagsOnEditForm({
      name: singleProduct.name,
      tags: [specialTag],
      absentTags: [editedTag],
    });

    await dashboard.tagsClick();
    await tag.verifyTagsPageLoaded();
    await tag.clearTagSearch();
    await tag.selectTagByName(editedTag);
    await tag.selectTagByName(specialTag);
    await tag.mergeSelectedTagsKeeping(editedTag, 2);
    await tag.verifyTagNotInList(specialTag);
  });

  test("Merged tag is replaced on both products", async () => {
    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();
    for (const product of [singleProduct, variantProduct]) {
      await products.verifyProductTagsOnEditForm({
        name: product.name,
        tags: [editedTag],
        absentTags: [specialTag],
      });
    }
    await products.verifyTagFilterShowsProducts(editedTag, [
      singleProduct.name,
      variantProduct.name,
    ]);
    await products.verifyTagInListingFilter(specialTag, false);
  });

  test("Delete the tag from Tags page", async () => {
    await dashboard.tagsClick();
    await tag.verifyTagsPageLoaded();
    await tag.deleteTag(editedTag);
  });

  test("Deleted tag is removed from both products", async () => {
    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();
    for (const product of [singleProduct, variantProduct]) {
      await products.verifyProductTagsOnEditForm({
        name: product.name,
        tags: [],
        absentTags: [editedTag],
      });
    }
  });

  test("Deleted tag is not in Tags filter and Tags dropdown", async () => {
    await products.verifyTagInListingFilter(editedTag, false);

    await products.reopenAddSingleProductForm();
    await products.verifyTagInProductDropdown(editedTag, false);
    await products.verifyTagInProductDropdown(specialTag, false);
    await products.returnToProductsList();
  });
});
