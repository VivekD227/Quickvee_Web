import { test, expect } from "@playwright/test";
import { Lottery } from "../pageObjects/Lottery";
import { Categories } from "../pageObjects/Categories";
import { Products } from "../pageObjects/Products";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import merchants from "../api/testData/merchants.json";
import routes from "../utilities/routes.js";
import sessionDataStorage from "../utilities/helper/sessionDataStorage";

// Sorting and permissions are tested manually.

// Shared by every lottery this run creates, so partial-name search can target them.
const RUN = `Lotto${Date.now().toString().slice(-6)}`;
const LOTTERY_FLAGS = { register: true, lottery: true };

test.describe("Lottery Module", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let lottery;
  let category;
  let products;
  let lotteryCategory;
  let otherLotteryCategory;
  let mainLottery;
  let secondLottery;
  let reusedLottery;
  let crossProduct;
  const createdLotteryNames = [];

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      lottery = new Lottery(page);
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
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    test.setTimeout(240_000);
    // A failed serial test skips the delete steps, so remove what this run created.
    if (page && createdLotteryNames.length) {
      await lottery.cleanupLotteries(createdLotteryNames);
    }
    if (page && crossProduct?.upc) {
      try {
        await page.goto(routes.page_URL.products);
        await products.verifyProductsPageLoaded();
        await products.searchListing(crossProduct.name);
        if ((await products.productRows.filter({ hasText: crossProduct.name }).count()) > 0) {
          await products.deleteProductFromRowActions(crossProduct.name);
        }
      } catch (error) {
        console.log(`Cleanup: could not delete ${crossProduct.name}: ${error.message}`);
      }
    }
    const createdCategories = [lotteryCategory, otherLotteryCategory].filter(Boolean);
    if (page && createdCategories.length) {
      await category.cleanupCategories(createdCategories);
    }
    await context?.close();
  });

  const trackName = (item) => {
    createdLotteryNames.push(item.name);
    return item;
  };

  test("Create lottery categories used by the lottery form", async () => {
    await dashboard.categoriesClick();
    await category.selectAlphabeticalMode();
    lotteryCategory = category.generateUniqueCategoryName("LottoCat");
    await category.createCategoryWithFlags(lotteryCategory, LOTTERY_FLAGS);
    otherLotteryCategory = category.generateUniqueCategoryName("LottoCatB");
    await category.createCategoryWithFlags(otherLotteryCategory, LOTTERY_FLAGS);
  });

  test.describe("List page", () => {
    test("Open Lottery from Inventory menu", async () => {
      await dashboard.lotteryClick();
      await lottery.verifyLotteryPageLoaded();
      expect(page.url()).toBe(routes.page_URL.lottery);
      await lottery.verifyLotteryPageUI();
    });

    test("Lottery list matches the list API and shows only lotteries", async () => {
      await lottery.verifyListMatchesApi();
    });

    test("Direct URL and browser refresh keep the Lottery page", async () => {
      await lottery.gotoLotteryList();
      const listPromise = lottery.waitForListApi();
      await page.reload();
      await lottery.readListApi(await listPromise);
      await lottery.verifyLotteryPageLoaded();
      await lottery.verifyListMatchesApi();
    });
  });

  test.describe("Add form", () => {
    test("Add form UI and default values", async () => {
      await lottery.openAddForm();
      expect(page.url()).toBe(routes.page_URL.lottery_add);
      await lottery.verifyAddFormUI();
      await lottery.verifyAddFormDefaults();
    });

    test("Saving an empty form shows every required error", async () => {
      await lottery.saveExpectingRejection();
      await lottery.verifyRequiredErrors({
        name: true,
        quantity: true,
        category: true,
        upc: true,
      });
    });

    test("Required errors clear once each field is filled", async () => {
      await lottery.fillName(`${RUN} Errors`);
      await lottery.verifyRequiredErrors({ name: false, quantity: true, category: true, upc: true });
      await lottery.fillQuantity(5);
      await lottery.verifyRequiredErrors({ quantity: false, category: true, upc: true });
      await lottery.selectCategory(lotteryCategory);
      await lottery.verifyRequiredErrors({ category: false, upc: true });
      await lottery.generateUpc();
      await lottery.verifyRequiredErrors({ upc: false });
      await lottery.cancelForm();
    });

    // Known bug: the form sends a spaces-only name to add_product (which rejects
    // it) and shows no error. Remove test.fail once fixed.
    test.fail("Lottery name with only spaces is treated as empty", async () => {
      await lottery.openAddForm();
      await lottery.fillLotteryForm({
        name: "   ",
        price: "1.00",
        quantity: 5,
        category: lotteryCategory,
      });
      await lottery.saveExpectingRejection();
      await lottery.verifyRequiredErrors({ name: true });
    });

    test("Lottery name accepts at most 100 characters", async () => {
      await lottery.assertTyped(lottery.nameInput, "L".repeat(120), "L".repeat(100));
    });

    test("Lottery name keeps special characters", async () => {
      const name = "Lucky@#$%^&*()~-,/ 7s";
      await lottery.assertTyped(lottery.nameInput, name, name);
    });

    test("Ticket price is typed cents-style and updates the preview", async () => {
      await lottery.fillPrice("5");
      await expect(lottery.priceInput).toHaveValue("0.05");
      await lottery.fillPrice("5.00");
      await expect(lottery.priceInput).toHaveValue("5.00");
      await lottery.verifyPreview({ kicker: "$5 tier", price: "5.00" });
    });

    test("Ticket price drops minus and letters and allows 10 characters", async () => {
      await lottery.assertTyped(lottery.priceInput, "-12.345abc", "123.45");
      await lottery.assertTyped(lottery.priceInput, "abc", "");
      await lottery.assertTyped(lottery.priceInput, "99999999.99", "9999999.99");
    });

    test("Quantity accepts only digits up to 6 and updates the preview", async () => {
      await lottery.assertTyped(lottery.quantityInput, "-5.5abc", "55");
      await lottery.assertTyped(lottery.quantityInput, "1234567890", "123456");
      await lottery.fillQuantity(25);
      await lottery.verifyPreview({ meta: "25 tickets" });
    });

    test("UPC drops spaces, accepts letters and symbols, and allows 20 characters", async () => {
      await lottery.assertTyped(lottery.upcInput, "12 34", "1234");
      await lottery.assertTyped(lottery.upcInput, "1234-ab@#CD", "1234-ab@#CD");
      await lottery.assertTyped(lottery.upcInput, "1".repeat(40), "1".repeat(20));
    });

    test("Generate UPC fills a 12-digit code and is disabled until cleared", async () => {
      const firstUpc = await lottery.generateUpc();
      await expect(lottery.generateBtn).toBeDisabled();
      await expect(lottery.generateBtn).toHaveAttribute(
        "title",
        "Clear the code first to generate a new one",
      );
      await lottery.verifyPreview({ upc: firstUpc });

      await lottery.fillUpc("");
      await expect(lottery.generateBtn).toBeEnabled();
      const secondUpc = await lottery.generateUpc();
      expect(secondUpc, "A new click should generate a different UPC").not.toBe(firstUpc);
    });

    test("Lottery category dropdown lists only lottery categories", async () => {
      // Start from a fresh form: earlier tests left a category selected.
      await lottery.cancelForm();
      await lottery.openAddForm();
      await lottery.openCategoryList();
      const offered = await lottery.categoryOptions.allInnerTexts();
      const lotteryCategories = sessionDataStorage
        .get("lottery_formCategories")
        .map((c) => c.title);
      expect(offered.sort()).toEqual([...lotteryCategories].sort());
      expect(offered).toContain(lotteryCategory);
      expect(offered).toContain(otherLotteryCategory);
      expect(offered).not.toContain("Quickadd");
      await lottery.closeCategoryList();
    });

    test("Searching a non-lottery category shows no result", async () => {
      await lottery.openCategoryList();
      await lottery.categoryInput.fill("Quickadd");
      await expect(lottery.noCategoryResult).toBeVisible();
      await expect(lottery.categoryOptions).toHaveCount(0);
      await lottery.categoryInput.fill("");
      await lottery.closeCategoryList();
    });

    test("Select and remove a lottery category", async () => {
      await lottery.selectCategory(otherLotteryCategory);
      await lottery.removeCategory(otherLotteryCategory);
      await expect(lottery.categoryChips).toHaveCount(0);
    });

    test("Track quantity is ON by default and the preview follows it", async () => {
      await expect(lottery.trackQuantityInput).toBeChecked();
      await lottery.verifyPreview({ tracked: true });
      await lottery.setTrackQuantity(false);
      await lottery.verifyPreview({ tracked: false });
      await lottery.setTrackQuantity(true);
      await lottery.verifyPreview({ tracked: true });
    });

    test("Cancel with entered data leaves without saving", async () => {
      const name = `${RUN} Cancelled`;
      await lottery.fillName(name);
      await lottery.cancelForm();
      await lottery.verifyLotteryNotListed(name);
    });

    test("Back arrow returns to the list", async () => {
      await lottery.openAddForm();
      await lottery.backToList();
    });
  });

  test.describe("Add lottery", () => {
    test("Add lottery with all fields", async () => {
      mainLottery = trackName({
        name: `${RUN} Alpha`,
        price: "5.00",
        quantity: 10,
        category: lotteryCategory,
      });
      await lottery.addLottery(mainLottery);
    });

    test("Saved lottery opens in edit with the same data", async () => {
      const id = await lottery.openEditLottery(mainLottery.name);
      expect(id).toBe(mainLottery.id);
      await lottery.verifyEditForm(mainLottery);
      await lottery.cancelForm();
    });

    test("Add lottery with a typed UPC and tracking OFF", async () => {
      secondLottery = trackName({
        name: `${RUN} Beta`,
        price: "2.00",
        quantity: 25,
        category: otherLotteryCategory,
        upc: lottery.generateUniqueUpc(),
        track: false,
      });
      await lottery.addLottery(secondLottery);
      await lottery.openEditLottery(secondLottery.name);
      await lottery.verifyEditForm(secondLottery);
      await lottery.cancelForm();
    });

    test("Duplicate lottery name is rejected", async () => {
      await lottery.verifyAddRejected(
        { name: mainLottery.name, price: "1.00", quantity: 5, category: lotteryCategory },
        lottery.duplicateNameError,
      );
    });

    test("Duplicate lottery UPC is rejected", async () => {
      await lottery.verifyAddRejected(
        {
          name: `${RUN} DupUpc`,
          price: "1.00",
          quantity: 5,
          category: lotteryCategory,
          upc: mainLottery.upc,
        },
        lottery.duplicateUpcError,
      );
    });
  });

  test.describe("Search", () => {
    test("Search by full name, any case, and partial name", async () => {
      await lottery.verifySearchShows(mainLottery.name, [mainLottery.name]);
      await lottery.verifySearchShows(mainLottery.name.toLowerCase(), [mainLottery.name]);
      await lottery.verifySearchShows(mainLottery.name.toUpperCase(), [mainLottery.name]);
      await lottery.verifySearchShows(RUN, [mainLottery.name, secondLottery.name]);
    });

    test("Search by full and partial UPC", async () => {
      await lottery.verifySearchShows(mainLottery.upc, [mainLottery.name]);
      await lottery.verifySearchShows(secondLottery.upc.slice(-6), [secondLottery.name]);
    });

    test("Search with no match shows the message and Clear search restores the list", async () => {
      await lottery.verifySearchNoMatch(`zz${RUN}nomatch`);
      await lottery.verifyClearSearchRestoresList();
    });
  });

  test.describe("Lottery and Products", () => {
    // Lotteries are products (is_lottery=1), so they also show on the Products listing.
    test("Lottery is listed on the Products listing by name and UPC", async () => {
      await dashboard.productsClick();
      await products.verifyProductsPageLoaded();
      for (const searchText of [mainLottery.name, mainLottery.upc]) {
        await products.searchListing(searchText);
        await products.waitForCatalogIdle();
        await expect(
          products.productRows.filter({ hasText: mainLottery.name }),
          `Searching "${searchText}" should show the lottery on the Products listing`,
        ).toHaveCount(1, { timeout: 15_000 });
      }
      await products.searchListing("");
    });

    test("Product with a lottery's name, UPC or custom code is rejected", async () => {
      await products.reopenAddSingleProductForm();
      await products.verifyDuplicateProductNameRejected(mainLottery.name);
      await products.verifyDuplicateUpcRejected(mainLottery.upc);
      await products.verifyDuplicateCustomCodeRejected(mainLottery.upc);
    });

    test("Create a product with a custom code for cross checks", async () => {
      crossProduct = {
        name: `Auto Lottery Cross ${Date.now()}`,
        cost: "1.00",
        price: "2.00",
        customCode: `CC${Date.now().toString().slice(-8)}`,
      };
      await products.addSingleProductWithRequiredFieldsAndVerifyMarginProfit(crossProduct);
      await products.openEditSingleProduct(crossProduct.name);
      await products.customCodeInput.first().fill(crossProduct.customCode);
      await products.saveEditedProduct();
    });

    test("Lottery with a product's name, UPC or custom code is rejected", async () => {
      await lottery.gotoLotteryList();
      await lottery.verifyAddRejected(
        { name: crossProduct.name, price: "1.00", quantity: 5, category: lotteryCategory },
        lottery.duplicateNameError,
      );
      for (const [label, upc] of [
        ["ProductUpc", crossProduct.upc],
        ["ProductCustomCode", crossProduct.customCode],
      ]) {
        await lottery.verifyAddRejected(
          {
            name: `${RUN} ${label}`,
            price: "1.00",
            quantity: 5,
            category: lotteryCategory,
            upc,
          },
          lottery.duplicateUpcError,
        );
      }
    });

    test("Lottery edit to a product's UPC or custom code is rejected", async () => {
      await lottery.verifyEditUpcRejected(mainLottery, crossProduct.upc);
      await lottery.verifyEditUpcRejected(mainLottery, crossProduct.customCode);
    });

    test("Product edit to a lottery's UPC as UPC or custom code is rejected", async () => {
      await dashboard.productsClick();
      await products.verifyProductsPageLoaded();
      await products.openEditSingleProduct(crossProduct.name);
      await products.verifyEditDuplicateUpcRejected(crossProduct, mainLottery.upc);
      await products.openEditSingleProduct(crossProduct.name);
      await products.verifyEditDuplicateCustomCodeRejected(crossProduct, mainLottery.upc);
      await lottery.gotoLotteryList();
    });
  });

  test.describe("Edit lottery", () => {
    test("Edit lottery name and price", async () => {
      await lottery.openEditLottery(mainLottery.name);
      const oldName = mainLottery.name;
      mainLottery.name = `${RUN} Alpha Edited`;
      createdLotteryNames.push(mainLottery.name);
      mainLottery.price = "10.00";
      await lottery.fillName(mainLottery.name);
      await lottery.fillPrice(mainLottery.price);
      await expect(lottery.quantityInput).toBeDisabled();
      await lottery.saveEditedLottery(mainLottery);
      await lottery.verifyLotteryNotListed(oldName);
    });

    test("Change category, UPC and tracking on edit", async () => {
      await lottery.openEditLottery(mainLottery.name);
      const oldUpc = mainLottery.upc;
      await lottery.removeCategory(mainLottery.category);
      mainLottery.category = otherLotteryCategory;
      await lottery.selectCategory(mainLottery.category);
      mainLottery.upc = lottery.generateUniqueUpc();
      await lottery.fillUpc(mainLottery.upc);
      mainLottery.track = false;
      await lottery.setTrackQuantity(false);
      await lottery.saveEditedLottery(mainLottery);

      await lottery.verifySearchNoMatch(oldUpc);
      await lottery.clearSearch();
      await lottery.openEditLottery(mainLottery.name);
      await lottery.verifyEditForm(mainLottery);
      await lottery.cancelForm();
    });

    test("Edit to a duplicate name or UPC is rejected", async () => {
      await lottery.openEditLottery(mainLottery.name);
      await lottery.fillName(secondLottery.name);
      await lottery.saveExpectingRejection(lottery.saveChangesBtn);
      await expect(lottery.duplicateNameError).toBeVisible({ timeout: 10_000 });

      await lottery.fillName(mainLottery.name);
      await lottery.fillUpc(secondLottery.upc);
      await lottery.saveExpectingRejection(lottery.saveChangesBtn);
      await expect(lottery.duplicateUpcError).toBeVisible({ timeout: 10_000 });

      await lottery.cancelForm();
      await lottery.verifyLotteryRow(mainLottery);
    });

    test("Clearing required fields on edit shows errors", async () => {
      await lottery.openEditLottery(mainLottery.name);
      await lottery.fillName("");
      await lottery.removeCategory(mainLottery.category);
      await lottery.fillUpc("");
      await lottery.saveExpectingRejection(lottery.saveChangesBtn);
      await lottery.verifyRequiredErrors({ name: true, category: true, upc: true });
      await lottery.cancelForm();
      await lottery.verifyLotteryRow(mainLottery);
    });

    test("Save without changes keeps the lottery", async () => {
      await lottery.openEditLottery(mainLottery.name);
      await lottery.saveEditedLottery(mainLottery);
    });

    test("Cancel discards edits", async () => {
      await lottery.openEditLottery(mainLottery.name);
      await lottery.fillName(`${RUN} Discarded`);
      await lottery.fillPrice("99.00");
      await lottery.cancelForm();
      await lottery.verifyLotteryRow(mainLottery);
      await lottery.verifyLotteryNotListed(`${RUN} Discarded`);
    });
  });

  test.describe("Delete lottery", () => {
    test("Cancel on delete dialog keeps the lottery", async () => {
      await lottery.cancelDelete(secondLottery.name);
    });

    test("Delete lottery removes it from the list and search", async () => {
      await lottery.deleteLottery(secondLottery.name);
      await lottery.verifySearchNoMatch(secondLottery.name);
      await lottery.clearSearch();
    });

    test("Deleted lottery's name and UPC can be reused", async () => {
      reusedLottery = {
        name: secondLottery.name,
        price: "3.00",
        quantity: 7,
        category: lotteryCategory,
        upc: secondLottery.upc,
      };
      await lottery.addLottery(reusedLottery);
      await lottery.deleteLottery(reusedLottery.name);
    });
  });

  test.describe("Lottery category", () => {
    test("Category with Lottery items turned off is not offered", async () => {
      await dashboard.categoriesClick();
      await category.selectAlphabeticalMode();
      await category.updateCategoryFlags(lotteryCategory, { lottery: false });

      await lottery.gotoLotteryList();
      await lottery.openAddForm();
      await lottery.openCategoryList();
      await expect(
        lottery.categoryOptions.getByText(lotteryCategory, { exact: true }),
      ).toHaveCount(0);
      await expect(
        lottery.categoryOptions.getByText(otherLotteryCategory, { exact: true }),
      ).toBeVisible();
      await lottery.closeCategoryList();
      await lottery.cancelForm();
    });

    test("Delete the last lottery of this run", async () => {
      await lottery.deleteLottery(mainLottery.name);
    });
  });
});
