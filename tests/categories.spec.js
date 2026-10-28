import { test } from "@playwright/test";
import { Categories } from "../pageObjects/Categories";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import merchants from "../api/testData/merchants.json";
import routes from "../utilities/routes.js";

// Store tax shown in the category drawer for the test merchant.
const TAX_NAME = "DefaultTax";

// Mixed ON/OFF so a wrong field mapping shows up; UPDATED_FLAGS flips each one.
const CREATE_FLAGS = {
  register: true,
  online: true,
  pickup: false,
  delivery: true,
  earnPoints: false,
  redeemPoints: true,
  lottery: false,
  ebt: true,
  excludeInStoreCoupons: true,
  excludeOnlineCoupons: false,
};
const UPDATED_FLAGS = {
  register: false,
  online: true,
  pickup: true,
  delivery: false,
  earnPoints: true,
  redeemPoints: false,
  lottery: false,
  ebt: false,
  excludeInStoreCoupons: false,
  excludeOnlineCoupons: true,
};

test.describe("Category Module", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let category;
  let newCategory;
  let editCategory;
  // Must be unique per run — a fixed name fails add with "The name is Already exist".
  let seedCategory;
  let specialCharCategory;
  let flagsCategory;
  let lotteryCategory;
  let onlineCategory;
  let storePage;

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      category = new Categories(page);
      const { storename, username, password } = merchants.merchantLogin;

      await navigateToLoginPage(page);
      const [loginApiResponse] = await Promise.all([
        page.waitForResponse(
          (res) =>
            res.request().method() === "POST" &&
            res.url().includes(routes.API_URL.login),
        ),
        loginpage.login(storename, username, password),
      ]);
      await loginApiResponse.json();
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
    // A failed serial test skips the delete step, so remove anything this run created.
    const createdCategories = [
      seedCategory,
      newCategory,
      editCategory,
      specialCharCategory,
      flagsCategory,
      lotteryCategory,
      onlineCategory,
    ].filter(Boolean);
    if (page && createdCategories.length) {
      await category.cleanupCategories(createdCategories);
    }
    await context?.close();
  });

  test("Verify Categories page UI elements are displayed", async () => {
    await category.verifyCategoriesPageLoaded();
    await category.verifyCategoriesPageUI();
    await category.verifyCategoryCountMatchesAPI();
  });

  test("Verify Quickadd category is present and protected", async () => {
    await category.verifyQuickaddIsProtected();
  });

  test("Verify Add category drawer defaults", async () => {
    await category.addCategoryBtnClick();
    await category.verifyAddDrawerDefaults();
    await category.cancelDrawer();
  });

  test("Verify category name is required", async () => {
    await category.verifyNameRequired();
  });

  test("Seed category used for duplicate/edit checks", async () => {
    seedCategory = category.generateUniqueCategoryName("SeedCat");
    await category.addCategory(seedCategory);
  });

  test("Adding a new category", async () => {
    newCategory = category.generateUniqueCategoryName();
    await category.addCategory(newCategory, "Automation test category");
  });

  test("Search for the added category", async () => {
    await category.searchCategory(newCategory);
    await category.verifySearchedCategoryDisplayed(newCategory);
    await category.clearSearch();
  });

  test("Verify duplicate category name is not allowed", async () => {
    await category.verifyDuplicateNameNotAllowed(newCategory);
  });

  test("Verify special characters are not allowed in category name", async () => {
    specialCharCategory = category.generateUniqueCategoryName("SpecialCat");
    await category.verifySpecialCharactersStripped(specialCharCategory);
  });

  test("Verify Edit category name functionality", async () => {
    editCategory = category.generateUniqueCategoryName("EditCat");
    await category.editCategoryName(newCategory, editCategory);
  });

  test("Verify duplicate name while Editing", async () => {
    await category.verifyDuplicateOnEdit(editCategory, seedCategory);
  });

  test("Verify default toggle states in Add drawer", async () => {
    await category.addCategoryBtnClick();
    await category.verifyDefaultToggleStates(TAX_NAME);
    await category.cancelDrawer();
  });

  test("Verify Show online controls Pickup and Delivery", async () => {
    await category.addCategoryBtnClick();
    await category.verifyOnlineDependency();
    await category.cancelDrawer();
  });

  test("Verify Lottery disables other flags and taxes", async () => {
    await category.addCategoryBtnClick();
    await category.verifyLotteryLocksOtherFlags(TAX_NAME);
    await category.cancelDrawer();
  });

  test("Create category with custom flags and tax", async () => {
    flagsCategory = category.generateUniqueCategoryName("FlagCat");
    const payload = await category.createCategoryWithFlags(
      flagsCategory,
      CREATE_FLAGS,
      TAX_NAME,
      true,
    );
    category.verifyFlagPayload(payload, CREATE_FLAGS, true);
    // The Loyalty chip follows Earn points only, so it is absent here.
    await category.verifyRowCapabilities(flagsCategory, [
      "Register",
      "Delivery",
      "EBT",
    ]);
    await category.verifyPersistedFlags(
      flagsCategory,
      CREATE_FLAGS,
      TAX_NAME,
      true,
    );
  });

  test("Update every flag and tax on edit", async () => {
    const payload = await category.updateCategoryFlags(
      flagsCategory,
      UPDATED_FLAGS,
      TAX_NAME,
      false,
    );
    category.verifyFlagPayload(payload, UPDATED_FLAGS, false);
    await category.verifyRowCapabilities(flagsCategory, ["Pickup", "Loyalty"]);
    await category.verifyPersistedFlags(
      flagsCategory,
      UPDATED_FLAGS,
      TAX_NAME,
      false,
    );
  });

  // With the update above, every toggle has now gone both ON → OFF and OFF → ON via Edit.
  test("Revert every flag and tax on edit", async () => {
    const payload = await category.updateCategoryFlags(
      flagsCategory,
      CREATE_FLAGS,
      TAX_NAME,
      true,
    );
    category.verifyFlagPayload(payload, CREATE_FLAGS, true);
    await category.verifyRowCapabilities(flagsCategory, [
      "Register",
      "Delivery",
      "EBT",
    ]);
    await category.verifyPersistedFlags(
      flagsCategory,
      CREATE_FLAGS,
      TAX_NAME,
      true,
    );
  });

  test("Create lottery category", async () => {
    lotteryCategory = category.generateUniqueCategoryName("LottoCat");
    const lotteryFlags = { register: true, lottery: true };
    const payload = await category.createCategoryWithFlags(
      lotteryCategory,
      lotteryFlags,
    );
    category.verifyFlagPayload(
      payload,
      { ...lotteryFlags, online: false, earnPoints: false, redeemPoints: false, ebt: false },
      false,
    );
    await category.verifyRowCapabilities(lotteryCategory, [
      "Register",
      "Lottery",
    ]);
    await category.verifyPersistedFlags(lotteryCategory, {
      ...lotteryFlags,
      online: false,
      ebt: false,
    });
  });

  test("New category with Show online ON appears on online store", async () => {
    onlineCategory = category.generateUniqueCategoryName("OnlineCat");
    await category.addCategory(onlineCategory);
    await category.verifyCategoryInOnlineStoreTab(onlineCategory, true);
    await category.verifyCategoryInPosRegisterTab(onlineCategory, true);
    storePage = await category.openOnlineStore();
    await category.verifyCategoryOnOnlineStore(storePage, onlineCategory, true);
  });

  test("Show online OFF on edit hides category from online store", async () => {
    const payload = await category.updateCategoryFlags(onlineCategory, {
      online: false,
    });
    category.verifyFlagPayload(payload, { online: false });
    await category.verifyFulfillmentFollowsOnline(onlineCategory, false);
    await category.verifyRowCapabilities(onlineCategory, [
      "Register",
      "Loyalty",
    ]);
    await category.verifyCategoryInOnlineStoreTab(onlineCategory, false);
    await category.verifyCategoryOnOnlineStore(storePage, onlineCategory, false);
    // Register visibility is independent of Show online.
    await category.verifyCategoryInPosRegisterTab(onlineCategory, true);
  });

  test("Show online ON on edit shows category on online store again", async () => {
    const payload = await category.updateCategoryFlags(onlineCategory, {
      online: true,
    });
    category.verifyFlagPayload(payload, { online: true });
    await category.verifyFulfillmentFollowsOnline(onlineCategory, true);
    await category.verifyRowCapabilities(onlineCategory, [
      "Register",
      "Pickup",
      "Delivery",
      "Loyalty",
    ]);
    await category.verifyCategoryInOnlineStoreTab(onlineCategory, true);
    await category.verifyCategoryOnOnlineStore(storePage, onlineCategory, true);
  });

  test("Show on register OFF on edit removes category from POS register tab", async () => {
    await category.updateCategoryFlags(onlineCategory, { register: false });
    await category.verifyCategoryInPosRegisterTab(onlineCategory, false);
    // Online visibility is independent of Show on register.
    await category.verifyCategoryInOnlineStoreTab(onlineCategory, true);
    await category.verifyCategoryOnOnlineStore(storePage, onlineCategory, true);
  });

  test("Show on register ON on edit lists category in POS register tab again", async () => {
    await category.updateCategoryFlags(onlineCategory, { register: true });
    await category.verifyCategoryInPosRegisterTab(onlineCategory, true);
  });

  test("Quickadd and lottery categories are register-only", async () => {
    for (const name of ["Quickadd", lotteryCategory]) {
      await category.verifyCategoryInPosRegisterTab(name, true);
      await category.verifyCategoryInOnlineStoreTab(name, false);
      await category.verifyCategoryOnOnlineStore(storePage, name, false);
    }
  });

  test("Verify Cancel on delete keeps the category", async () => {
    await category.verifyCancelDelete(editCategory);
  });

  test("Verify Delete category", async () => {
    await category.deleteCategory(editCategory);
    await category.deleteCategory(seedCategory);
    await category.deleteCategory(specialCharCategory);
    await category.deleteCategory(flagsCategory);
    await category.deleteCategory(lotteryCategory);
    await category.deleteCategory(onlineCategory);
  });

  test("Deleted category is removed from online store", async () => {
    await category.verifyCategoryOnOnlineStore(storePage, onlineCategory, false);
  });
});
