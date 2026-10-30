import { test, expect } from "@playwright/test";
import { Products } from "../pageObjects/Products";
import { Categories } from "../pageObjects/Categories";
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
  let otherProduct;
  let variantAttributes = [];
  let variantProduct;

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(120_000);
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
      expect(loginApiResponse.status()).toBe(200);
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
    { timeout: 120_000 },
  );

  test.afterAll(async () => {
    await context?.close();
  });

  test.describe("Products Listing", () => {
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
  });

  test.describe("Add Non Variant Product", () => {
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

    test("Price is optional: product saves without price", async () => {
      await products.verifyPriceOptionalOnAdd();
    });

    test("Price does not accept negative value, zero is allowed", async () => {
      await products.verifyPriceRejectsNegative();
      await products.verifyPriceZeroAllowed();
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

    test("Product name does not accept ~ - \\ , /", async () => {
      await products.reopenAddSingleProductForm();
      await products.verifyProductNameRejectsSpecialCharacters();
    });

    test("UPC does not accept space", async () => {
      await products.reopenAddSingleProductForm();
      await products.verifyUpcRejectsSpecialCharacters();
    });

    test("Custom code does not accept space or |", async () => {
      await products.reopenAddSingleProductForm();
      await products.verifyCustomCodeRejectsSpecialCharacters();
    });

    test("Only one brand can be assigned to a product", async () => {
      await products.reopenAddSingleProductForm();
      await products.verifyOnlyOneBrandCanBeAssigned();
    });

    test("Unsaved add-product draft restores then Start fresh clears it", async () => {
      await products.reopenAddSingleProductForm();
      await products.verifyUnsavedDraftRestoreAndStartFresh();
    });

    test("Add product with cover photo", async () => {
      createdProduct = {
        name: `Auto Photo ${Date.now()}`,
        category: "Quickadd",
        cost: "10.00",
        price: "20.00",
        hasPhoto: true,
      };
      await products.reopenAddSingleProductForm();
      await products.addProductWithCoverPhoto(createdProduct);
      await products.verifyCreatedProductInListing(createdProduct);
      await products.verifyCreatedProductViewDetails(createdProduct);
      await products.verifyCreatedProductEditForm(createdProduct);
    });

    test("Copy to stores shows when store.length is greater than 1", async () => {
      createdProduct = {
        name: `Auto CopyStores ${Date.now()}`,
        category: "Quickadd",
        cost: "10.00",
        price: "20.00",
      };
      await products.reopenAddSingleProductForm();
      const copied =
        await products.addProductWithCopyToStoresIfMultiStore(createdProduct);
      if (copied) {
        await products.verifyCreatedProductInListing(createdProduct);
      }
    });

    test("Add product with special characters in name and UPC", async () => {
      const stamp = Date.now();
      createdProduct = {
        name: `Geek Bar 25% ${stamp}`,
        upc: `GB25%#${String(stamp).slice(-8)}`,
        category: "Quickadd",
        cost: "10.00",
        price: "20.00",
      };
      await products.reopenAddSingleProductForm();
      await products.addProductWithSpecialNameAndUpc(createdProduct);
      await products.verifyCreatedProductInListing(createdProduct);
      await products.verifyCreatedProductViewDetails(createdProduct);
      await products.verifyCreatedProductEditForm(createdProduct);
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
      await products.addSingleProductWithoutUpcGenerateFromDialog(
        createdProduct,
      );
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
      await products.reopenAddSingleProductForm({ waitForTaxList: true });
      await products.addSingleProductWithAllDetails(createdProduct);
      otherProduct = {
        name: createdProduct.name,
        upc: createdProduct.upc,
        customCode: createdProduct.customCode,
      };
      await products.verifyCreatedProductInListing(createdProduct);
      await products.verifyCreatedProductViewDetails(createdProduct);
      await products.verifyCreatedProductEditForm(createdProduct);
    });

    test("Same UPC and custom code is not accepted", async () => {
      await products.reopenAddSingleProductForm();
      await products.verifySameUpcAndCustomCodeRejected();
    });

    test("Duplicate product name is not accepted", async () => {
      await products.verifyDuplicateProductNameRejected(createdProduct.name);
    });

    test("Duplicate UPC is not accepted", async () => {
      await products.verifyDuplicateUpcRejected(createdProduct.upc);
    });

    test("Duplicate custom code is not accepted", async () => {
      await products.verifyDuplicateCustomCodeRejected(createdProduct.customCode);
    });

    test("Add a product without any tax", async () => {
      createdProduct = {
        name: `Auto NoTax ${Date.now()}`,
        category: "Quickadd",
        cost: "10.00",
        price: "20.00",
      };
      await products.reopenAddSingleProductForm({ waitForTaxList: true });
      await products.addProductWithoutTax(createdProduct);
      await products.verifyCreatedProductInListing(createdProduct);
      await products.verifyProductHasNoTaxOnEdit(createdProduct);
    });

    test("Add product with 10 unique custom codes and search by each code", async () => {
      createdProduct = {
        name: `Auto TenCodes ${Date.now()}`,
        category: "Quickadd",
        cost: "10.00",
        price: "20.00",
      };
      await products.returnToProductsList();
      await products.reopenAddSingleProductForm();
      await products.addSingleProductWithTenCustomCodes(createdProduct);
      await products.verifyProductSearchableByEachCustomCode(createdProduct);
    });

    test("Cost greater than price shows negative margin/profit and listing Inactive when Active is unchecked", async () => {
      createdProduct = {
        name: `Auto Inactive ${Date.now()}`,
        category: "Quickadd",
        cost: "20.00",
        price: "10.00",
      };
      await products.reopenAddSingleProductForm();
      await products.addInactiveProductWithCostGreaterThanPrice(createdProduct);
      await products.verifyInactiveProductInListing(createdProduct);
      await products.verifyInactiveProductViewDetails(createdProduct);
    });

    test("Quantity 0 with Continue selling unchecked shows Out of stock on listing", async () => {
      createdProduct = {
        name: `Auto Oos ${Date.now()}`,
        category: "Quickadd",
        cost: "10.00",
        price: "20.00",
        quantity: "0",
      };
      await products.reopenAddSingleProductForm();
      await products.addOutOfStockProductWithContinueSellingOff(createdProduct);
      await products.verifyOutOfStockProductInListing(createdProduct);
    });

    test("Quantity 10 shows 10 in stock on listing", async () => {
      createdProduct = {
        name: `Auto Qty10 ${Date.now()}`,
        category: "Quickadd",
        cost: "10.00",
        price: "20.00",
        quantity: "10",
      };
      await products.reopenAddSingleProductForm();
      await products.addProductWithQuantity(createdProduct);
      await products.verifyInStockQuantityOnListing(createdProduct);
    });

    test("Description rich text B/I/U with multiple categories", async () => {
      const prefix = `Auto Rich ${Date.now()} `;
      createdProduct = {
        name: `${prefix}${"X".repeat(105)}`.slice(0, 105),
        category: "Quickadd",
        cost: "10.00",
        price: "20.00",
        description: "Auto bold italic underline",
      };
      await products.reopenAddSingleProductForm();
      await products.addProductWithRichDescriptionAndMultipleCategories(
        createdProduct,
      );
      await products.verifyCreatedProductInListing(createdProduct);
      await products.verifyCreatedProductViewDetails(createdProduct);
      await products.verifyCreatedProductEditForm(createdProduct);
    });
  });

  test.describe("Edit Non Variant Product", () => {
    test("Edit single product form UI", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditSingleProductFormUI(createdProduct);
    });

    test("Cannot change Single to Variant type", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditCannotChangeProductType();
      await products.returnToProductsList();
    });

    test("Edit single product fields and verify they persist", async () => {
      if (!createdProduct?.name) {
        let row = null;
        for (const prefix of ["Auto Edited", "Auto Rich", "Auto Full"]) {
          await products.searchListing(prefix);
          const candidate = products.getProductRow(prefix);
          const visible = await candidate
            .waitFor({ state: "visible", timeout: 8_000 })
            .then(() => true)
            .catch(() => false);
          if (visible) {
            row = candidate;
            break;
          }
        }
        expect(row, "Need an existing Auto product to edit").toBeTruthy();
        createdProduct = {
          name: (await row.locator("[data-prod-title]").innerText()).trim(),
          category: "Quickadd",
          cost: "10.00",
          price: "20.00",
        };
      }
      const previousName = createdProduct.name;
      await products.openEditSingleProduct(previousName);
      await products.editAndSaveSingleProductFields(createdProduct);
      await products.verifyProductNotCreatedInListing(previousName);
      await products.verifyCreatedProductInListing(createdProduct);
      await products.openRowActions(createdProduct.name);
      await products.verifyCreatedProductViewDetails(createdProduct);
      await products.verifyCreatedProductEditForm(createdProduct);
    });

    test("Required Save with no data shows validation errors", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditRequiredAllEmptyValidation(createdProduct);
    });

    test("Required Categories empty shows validation error", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditRequiredCategoriesEmptyValidation(createdProduct);
    });

    test("Price is optional: edit saves without price", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditPriceOptional(createdProduct);
    });

    test("Price does not accept negative value, zero is allowed", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyPriceRejectsNegative();
      await products.verifyEditPriceZeroAllowed(createdProduct);
    });

    test("Price 0 save turns off Pickup and Delivery", async () => {
      await products.verifyEditZeroPriceTurnsOffOnlineChannels(createdProduct);
    });

    test("Available to sell is locked", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditQuantityIsLocked();
      await products.returnToProductsList();
    });

    test("Compare-at price must be greater than Price", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditCompareAtLessThanPriceValidation(createdProduct);
    });

    test("Required Name empty shows validation error", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditRequiredNameEmptyValidation(createdProduct);
    });

    test("Product name does not accept ~ - \\ , /", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditProductNameRejectsSpecialCharacters();
      await products.returnToProductsList();
    });

    test("UPC does not accept space", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditUpcRejectsSpecialCharacters();
      await products.returnToProductsList();
    });

    test("Custom code does not accept space or |", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditCustomCodeRejectsSpecialCharacters();
      await products.returnToProductsList();
    });

    test("Only one brand can be assigned to a product", async () => {
      if (!createdProduct?.name) {
        await products.searchListing("Auto Edited");
        const row = products.getProductRow("Auto Edited");
        await expect(row).toBeVisible({ timeout: 15_000 });
        createdProduct = {
          name: (await row.locator("[data-prod-title]").innerText()).trim(),
        };
      }
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditOnlyOneBrandCanBeAssigned(createdProduct);
      await products.returnToProductsList();
    });

    test("Same UPC and custom code is not accepted", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditSameUpcAndCustomCodeRejected(createdProduct);
    });

    test("Duplicate product name is not accepted", async () => {
      if (!otherProduct?.name) {
        await products.returnToProductsList();
        await products.searchListing("Auto Full");
        const row = products.getProductRow("Auto Full");
        await expect(row).toBeVisible({ timeout: 15_000 });
        const rowText = await row.innerText();
        otherProduct = {
          name: (await row.locator("[data-prod-title]").innerText()).trim(),
          upc: (rowText.match(/\b\d{12}\b/) || [])[0] || "",
          customCode: (rowText.match(/\bCC\d+\b/) || [])[0] || "",
        };
      }
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditDuplicateProductNameRejected(
        createdProduct,
        otherProduct.name,
      );
    });

    test("Duplicate UPC is not accepted", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditDuplicateUpcRejected(
        createdProduct,
        otherProduct.upc,
      );
    });

    test("Duplicate custom code is not accepted", async () => {
      if (!createdProduct?.name) {
        await products.searchListing("Auto Edited");
        const row = products.getProductRow("Auto Edited");
        await expect(row).toBeVisible({ timeout: 15_000 });
        createdProduct = {
          name: (await row.locator("[data-prod-title]").innerText()).trim(),
        };
      }
      if (!otherProduct?.customCode) {
        if (!otherProduct?.name) {
          await products.returnToProductsList();
          await products.searchListing("Auto Full");
          const row = products.getProductRow("Auto Full");
          await expect(row).toBeVisible({ timeout: 15_000 });
          otherProduct = {
            ...(otherProduct || {}),
            name: (await row.locator("[data-prod-title]").innerText()).trim(),
          };
        }
        await products.openEditSingleProduct(otherProduct.name);
        otherProduct.customCode = (
          await products.customCodeInput.first().inputValue()
        ).trim();
        await products.returnToProductsList();
      }
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditDuplicateCustomCodeRejected(
        createdProduct,
        otherProduct.customCode,
      );
    });

    test("Discard changes restores name and price", async () => {
      if (!createdProduct?.name) {
        await products.searchListing("Auto Edited");
        const row = products.getProductRow("Auto Edited");
        await expect(row).toBeVisible({ timeout: 15_000 });
        createdProduct = {
          name: (await row.locator("[data-prod-title]").innerText()).trim(),
          hasPhoto: true,
          price: "24.99",
          cost: "12.50",
          delivery: false,
          pickup: true,
          category: "Quickadd",
        };
      }
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditDiscardChangesRestoresFields(createdProduct);
      await products.returnToProductsList();
    });

    test("Unsaved leave Stay then Discard & leave", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditUnsavedLeaveStayThenDiscard(createdProduct);
    });

    test("Generate UPC Keep current then Generate new", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditGenerateUpcKeepThenReplace(createdProduct);
      await products.returnToProductsList();
    });
  });

  test.describe("Duplicate Product", () => {
    test("More actions shows Duplicate Product", async () => {
      if (!createdProduct?.name) {
        await products.searchListing("Auto Edited");
        const row = products.getProductRow("Auto Edited");
        await expect(row).toBeVisible({ timeout: 15_000 });
        createdProduct = {
          name: (await row.locator("[data-prod-title]").innerText()).trim(),
          hasPhoto: true,
          price: "24.99",
          cost: "12.50",
          compareAt: "29.99",
          delivery: false,
          pickup: true,
          category: "Quickadd",
          checkId: true,
          foodStampable: true,
          description: "Edited product description",
        };
      }
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyDuplicateProductActionVisible();
    });

    test("Duplicate opens copy form without original name, UPC, or custom code", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.openDuplicateFromEdit();
      await products.verifyDuplicateFormClearsUniqueFields(createdProduct);
      await products.verifyDuplicateDoesNotChangeOriginal(createdProduct);
    });

    test("Duplicate copies product fields from the source", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.openDuplicateFromEdit();
      await products.verifyDuplicateFormCopiesSourceFields(createdProduct);
      await products.returnToProductsList();
    });

    test("Duplicate does not change the original product", async () => {
      await products.openEditSingleProduct(createdProduct.name);
      await products.openDuplicateFromEdit();
      await products.verifyDuplicateDoesNotChangeOriginal(createdProduct);
    });

    test("Duplicate cannot save with the original product name", async () => {
      await products.verifyDuplicateCannotSaveWithOriginalName(createdProduct);
    });

    test("Duplicate cannot save with the original UPC", async () => {
      await products.verifyDuplicateCannotSaveWithOriginalUpc(createdProduct);
    });

    test("Duplicate cannot save with the original custom code", async () => {
      await products.verifyDuplicateCannotSaveWithOriginalCustomCode(
        createdProduct,
      );
    });

    test("Duplicate same UPC and custom code is not accepted", async () => {
      await products.verifyDuplicateSameUpcAndCustomCodeRejected(
        createdProduct,
      );
    });

    test("Duplicate required Name empty shows validation error", async () => {
      await products.verifyDuplicateRequiredNameEmpty(createdProduct);
    });

    test("Duplicate price zero is allowed", async () => {
      await products.verifyDuplicatePriceZeroAllowed(createdProduct);
    });

    test("Duplicate ignores unsaved dirty edits", async () => {
      await products.verifyDuplicateIgnoresUnsavedEdits(createdProduct);
    });

    test("Duplicate save creates a second product", async () => {
      if (!createdProduct?.name) {
        await products.searchListing("Auto Edited");
        const row = products.getProductRow("Auto Edited");
        await expect(row).toBeVisible({ timeout: 15_000 });
        const rowText = await row.innerText();
        createdProduct = {
          name: (await row.locator("[data-prod-title]").innerText()).trim(),
          hasPhoto: true,
          price: "24.99",
          cost: "12.50",
          delivery: false,
          pickup: true,
          category: "Quickadd",
          upc: (rowText.match(/\b\d{12}\b/) || [])[0] || "",
        };
      }
      await products.saveDuplicateAsNewProduct(createdProduct);
    });

    test("Duplicate of a no-tax product has no tax", async () => {
      await products.verifyDuplicateNoTaxProduct();
    });
  });

  test.describe("Edit Product Photo & Status", () => {
    test("Remove photo and verify it does not persist", async () => {
      if (!createdProduct?.name) {
        await products.searchListing("Auto Edited");
        const row = products.getProductRow("Auto Edited");
        await expect(row).toBeVisible({ timeout: 15_000 });
        createdProduct = {
          name: (await row.locator("[data-prod-title]").innerText()).trim(),
          hasPhoto: true,
          price: "24.99",
          cost: "10.00",
          delivery: false,
          pickup: true,
          category: "Quickadd",
        };
      }
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditRemoveCoverPhotoPersists(createdProduct);
    });

    test("Uncheck Active shows Inactive on listing", async () => {
      if (!createdProduct?.name) {
        await products.searchListing("Auto Edited");
        const row = products.getProductRow("Auto Edited");
        await expect(row).toBeVisible({ timeout: 15_000 });
        createdProduct = {
          name: (await row.locator("[data-prod-title]").innerText()).trim(),
        };
      }
      await products.openEditSingleProduct(createdProduct.name);
      await products.verifyEditActiveOffShowsInactiveOnListing(createdProduct);
    });

    test("Duplicate of an inactive product stays inactive", async () => {
      if (!createdProduct?.name) {
        await products.searchListing("Auto Edited");
        const row = products.getProductRow("Auto Edited");
        await expect(row).toBeVisible({ timeout: 15_000 });
        createdProduct = {
          name: (await row.locator("[data-prod-title]").innerText()).trim(),
        };
      }
      await products.verifyDuplicateInactiveProduct(createdProduct);
    });
  });

  test.describe("Delete Product", () => {
    test("Cancel Delete item keeps the product", async () => {
      createdProduct = {
        name: `Auto Delete ${Date.now()}`,
        category: "Quickadd",
        cost: "10.00",
        price: "20.00",
      };
      await products.reopenAddSingleProductForm();
      await products.addSingleProductWithRequiredFieldsAndVerifyMarginProfit(
        createdProduct,
      );
      await products.cancelDeleteProduct(createdProduct.name);
    });

    test("Delete item removes the product from catalog", async () => {
      if (!createdProduct?.name) {
        createdProduct = {
          name: `Auto Delete ${Date.now()}`,
          category: "Quickadd",
          cost: "10.00",
          price: "20.00",
        };
        await products.reopenAddSingleProductForm();
        await products.addSingleProductWithRequiredFieldsAndVerifyMarginProfit(
          createdProduct,
        );
      }
      await products.deleteProductFromRowActions(createdProduct.name);
    });
  });

  test.describe("Add Variant Product", () => {
    test("Select Product with variants then Continue", async () => {
      await products.returnToProductsList();
      await products.addProductBtnClick();
      await products.verifyContinueDisabled();
      await products.selectVariantsProductType();
      await products.continueAddProductType();
      await products.verifyAddVariantsProductUrl();
    });

    test("Verify variant add form UI", async () => {
      await products.discardRestoredDraft();
      await products.verifyAddVariantsProductFormUI();
    });

    test("Required: Save with no data shows validation errors", async () => {
      await products.verifyRequiredVariantAllEmptyValidation();
    });

    test("One saved attribute and one value generates 1 variant", async () => {
      variantAttributes = [
        await products.verifyOneAttributeOneValueGeneratesOneVariant(),
      ];
    });

    test("Second value on the same attribute generates 2 variants", async () => {
      await products.verifySecondValueGeneratesTwoVariants();
    });

    test("Removing a value updates generated combinations", async () => {
      await products.verifyRemovingValueUpdatesCombinations();
    });

    test("Two attributes generate cartesian combinations", async () => {
      const second = await products.verifyTwoAttributesGenerateCartesianProduct(
        variantAttributes[0],
      );
      variantAttributes.push(second);
    });

    test("Cannot add more than 3 attributes", async () => {
      await products.verifyCannotAddMoreThanThreeAttributes(variantAttributes);
    });

    test("Price is optional: variant product saves without price", async () => {
      await products.verifyVariantPriceOptional();
    });

    test("Add variant product with one combination", async () => {
      createdProduct = {
        name: `Auto Var Single ${Date.now()}`,
        category: "Quickadd",
        cost: "10.00",
        price: "20.00",
        attributes: [{ values: ["111"] }],
        customCode: `VC${Date.now().toString().slice(-8)}`,
      };
      await products.reopenAddVariantsProductForm();
      await products.addVariantProductWithRequiredFields(createdProduct);
      await products.verifyVariantProductInListing(createdProduct);
      variantProduct = { ...createdProduct };
    });

    test("Add variant product with two values on one attribute", async () => {
      createdProduct = {
        name: `Auto Var Multi ${Date.now()}`,
        category: "Quickadd",
        cost: "10.00",
        price: "20.00",
        attributes: [{ values: ["S", "M"] }],
      };
      await products.reopenAddVariantsProductForm();
      await products.addVariantProductWithRequiredFields(createdProduct);
      await products.verifyVariantProductInListing(createdProduct);
    });

    test("Add variant product with two attributes", async () => {
      createdProduct = {
        name: `Auto Var Grid ${Date.now()}`,
        category: "Quickadd",
        cost: "10.00",
        price: "20.00",
        attributes: [{ values: ["S", "M"] }, { values: ["Red", "Blue"] }],
      };
      await products.reopenAddVariantsProductForm();
      await products.addVariantProductWithRequiredFields(createdProduct);
      await products.verifyVariantProductInListing(createdProduct);
    });

    test("Variant product name does not accept ~ - \\ , /", async () => {
      await products.verifyVariantProductNameRejectsSpecialCharacters();
    });

    test("Variant attribute value does not accept ~ - \\ , /", async () => {
      await products.verifyVariantAttributeValueRejectsSpecialCharacters();
    });

    test("Variant UPC does not accept space", async () => {
      await products.verifyVariantUpcRejectsSpecialCharacters();
    });

    test("Variant custom code does not accept space or |", async () => {
      await products.verifyVariantCustomCodeRejectsSpecialCharacters();
    });

    test("Same variant UPC and custom code is not accepted", async () => {
      await products.verifyVariantSameUpcAndCustomCodeRejected();
    });

    test("One variant UPC cannot be another variant custom code", async () => {
      await products.verifyVariantUpcUsedAsOtherCombinationCustomCodeRejected();
    });

    test("Two variants cannot share the same UPC", async () => {
      await products.verifyTwoVariantsCannotShareUpc();
    });

    test("Add variant without UPC, generate from save dialog", async () => {
      createdProduct = {
        name: `Auto Var NoUpc ${Date.now()}`,
        category: "Quickadd",
        cost: "10.00",
        price: "20.00",
      };
      await products.addVariantProductWithoutUpcGenerateFromDialog(
        createdProduct,
      );
      await products.verifyVariantProductInListing(createdProduct);
    });

    test("Duplicate variant UPC is not accepted", async () => {
      const existingUpc = variantProduct?.upc || createdProduct?.upc;
      await products.verifyDuplicateVariantUpcRejected(existingUpc);
    });

    test("Duplicate variant custom code is not accepted", async () => {
      await products.verifyDuplicateVariantCustomCodeRejected(
        variantProduct?.customCode,
      );
    });
  });

  test.describe("Edit Variant Product", () => {
    test("Edit variant product form UI", async () => {
      variantProduct = await products.ensureVariantProduct(variantProduct);
      await products.openEditSingleProduct(variantProduct.name);
      await products.verifyEditVariantProductFormUI(variantProduct);
    });

    test("Cannot change Variant to Single type", async () => {
      await products.openEditSingleProduct(variantProduct.name);
      await products.verifyEditCannotChangeVariantType();
      await products.returnToProductsList();
    });

    test("Edit variant product fields and verify they persist", async () => {
      variantProduct = await products.ensureVariantProduct(variantProduct);
      const previousName = variantProduct.name;
      await products.openEditSingleProduct(previousName);
      await products.editAndSaveVariantProductFields(variantProduct);
      await products.verifyProductNotCreatedInListing(previousName);
      await products.verifyVariantProductInListing(variantProduct);
    });

    test("Required Name empty shows validation error", async () => {
      await products.openEditSingleProduct(variantProduct.name);
      await products.verifyEditVariantRequiredNameEmpty(variantProduct);
    });

    test("Required Categories empty shows validation error", async () => {
      await products.openEditSingleProduct(variantProduct.name);
      await products.verifyEditVariantRequiredCategoriesEmpty(variantProduct);
    });

    test("Price is optional: edit variant saves without price", async () => {
      await products.openEditSingleProduct(variantProduct.name);
      await products.verifyEditVariantPriceOptional(variantProduct);
    });

    test("Product name does not accept ~ - \\ , /", async () => {
      await products.openEditSingleProduct(variantProduct.name);
      await products.verifyEditProductNameRejectsSpecialCharacters();
      await products.returnToProductsList();
    });

    test("Variant UPC does not accept space", async () => {
      await products.openEditSingleProduct(variantProduct.name);
      await products.verifyEditVariantUpcRejectsSpecialCharacters();
      await products.returnToProductsList();
    });

    test("Variant custom code does not accept space or |", async () => {
      await products.openEditSingleProduct(variantProduct.name);
      await products.verifyEditVariantCustomCodeRejectsSpecialCharacters();
      await products.returnToProductsList();
    });

    test("Same UPC and custom code is not accepted", async () => {
      await products.openEditSingleProduct(variantProduct.name);
      await products.verifyEditVariantSameUpcAndCustomCodeRejected(
        variantProduct,
      );
    });

    test("Discard changes restores name and price", async () => {
      await products.openEditSingleProduct(variantProduct.name);
      await products.verifyEditVariantDiscardChangesRestoresFields(
        variantProduct,
      );
      await products.returnToProductsList();
    });

    test("Unsaved leave Stay then Discard & leave", async () => {
      await products.openEditSingleProduct(variantProduct.name);
      await products.verifyEditVariantUnsavedLeaveStayThenDiscard(
        variantProduct,
      );
    });

    test("Generate UPC Keep current then Generate new", async () => {
      await products.openEditSingleProduct(variantProduct.name);
      await products.verifyEditVariantGenerateUpcKeepThenReplace(
        variantProduct,
      );
      await products.returnToProductsList();
    });
  });

  test.describe("Duplicate Variant Product", () => {
    test("More actions shows Duplicate Product", async () => {
      variantProduct = await products.ensureVariantProduct(variantProduct);
      await products.openEditSingleProduct(variantProduct.name);
      await products.verifyDuplicateProductActionVisible();
    });

    test("Duplicate opens copy form without original name or UPC", async () => {
      await products.openDuplicateVariantFromSource(variantProduct);
      await products.verifyDuplicateVariantClearsUniqueFields(variantProduct);
      await products.verifyDuplicateVariantDoesNotChangeOriginal(
        variantProduct,
      );
    });

    test("Duplicate copies variant combinations from the source", async () => {
      await products.openDuplicateVariantFromSource(variantProduct);
      await products.verifyDuplicateVariantCopiesCombinations(variantProduct);
      await products.returnToProductsList();
    });

    test("Duplicate does not change the original product", async () => {
      await products.openDuplicateVariantFromSource(variantProduct);
      await products.verifyDuplicateVariantDoesNotChangeOriginal(
        variantProduct,
      );
    });

    test("Duplicate cannot save with the original product name", async () => {
      await products.verifyDuplicateVariantCannotSaveWithOriginalName(
        variantProduct,
      );
    });

    test("Duplicate cannot save with the original UPC", async () => {
      test.setTimeout(180_000);
      variantProduct = await products.ensureVariantProduct(variantProduct);
      await products.verifyDuplicateVariantCannotSaveWithOriginalUpc(
        variantProduct,
      );
    });

    test("Duplicate cannot save with the original custom code", async () => {
      test.setTimeout(180_000);
      variantProduct = await products.ensureVariantProduct(variantProduct);
      await products.verifyDuplicateVariantCannotSaveWithOriginalCustomCode(
        variantProduct,
      );
    });

    test("Duplicate save creates a second variant product", async () => {
      test.setTimeout(180_000);
      variantProduct = await products.ensureVariantProduct(variantProduct);
      await products.saveDuplicateVariantAsNewProduct(variantProduct);
    });
  });

  test.describe("Create Category from Product Form", () => {
    let categories;
    let formCategory;
    let unsavedCategory;
    let editFormCategory;
    let formCategoryProduct;

    test.afterAll(async () => {
      test.setTimeout(120_000);
      const created = [formCategory, unsavedCategory, editFormCategory].filter(
        Boolean,
      );
      if (page && created.length) {
        await categories.cleanupCategories(created);
      }
    });

    test("Typing a new category name offers Create option", async () => {
      categories = new Categories(page);
      await products.reopenAddSingleProductForm();
      await products.verifyCreateCategoryOptionShown(
        categories.generateUniqueCategoryName("FormCat"),
      );
    });

    test("Existing category typed in another case is listed, not offered for create", async () => {
      await products.verifyExistingCategoryNotOfferedForCreate(
        "quickadd",
        "Quickadd",
      );
      await products.verifyExistingCategoryNotOfferedForCreate(
        "QUICKADD",
        "Quickadd",
      );
    });

    test("Cancel on Create category drawer adds nothing", async () => {
      await products.verifyCancelCreateCategoryAddsNothing(
        categories.generateUniqueCategoryName("FormCancel"),
      );
    });

    test("Create category needs a name", async () => {
      await products.verifyCreateCategoryNameRequired(
        categories.generateUniqueCategoryName("FormEmpty"),
      );
    });

    test("Create category drawer strips special characters", async () => {
      await products.verifyCreateCategoryStripsSpecialCharacters(
        categories.generateUniqueCategoryName("FormSpecial"),
      );
    });

    test("Create category drawer rejects an existing category name", async () => {
      await products.verifyCreateCategoryDuplicateRejected(
        categories.generateUniqueCategoryName("FormDup"),
        "QUICKADD",
      );
    });

    test("Create category from product form and save the product", async () => {
      formCategory = categories.generateUniqueCategoryName("FormCat");
      await products.createCategoryFromProductForm(formCategory);

      // The drawer already assigned the category, so the add flow picks none.
      formCategoryProduct = {
        name: `Auto Form Category ${Date.now()}`,
        categories: [],
        cost: "10.00",
        price: "20.00",
      };
      await products.addSingleProductWithRequiredFieldsAndVerifyMarginProfit(
        formCategoryProduct,
      );
      formCategoryProduct.categories = [formCategory];
      await products.verifyProductDetailsOnEditForm(formCategoryProduct);
    });

    test("Category created from product form filters the product and is on Categories page", async () => {
      await products.verifyCategoryFilterShowsProducts(formCategory, [
        formCategoryProduct.name,
      ]);
      await dashboard.categoriesClick();
      await categories.verifyCategoriesPageLoaded();
      await categories.searchCategory(formCategory);
      await categories.verifySearchedCategoryDisplayed(formCategory);
      await categories.clearSearch();
    });

    test("Create category from edit product form and assign it to the product", async () => {
      await dashboard.productsClick();
      await products.verifyProductsPageLoaded();
      await products.openEditSingleProduct(formCategoryProduct.name);
      await expect(products.productNameInput).toHaveValue(
        formCategoryProduct.name,
        { timeout: 15_000 },
      );
      editFormCategory = categories.generateUniqueCategoryName("EditFormCat");
      await products.createCategoryFromProductForm(editFormCategory);
      await products.saveEditedProduct();

      formCategoryProduct.categories = [formCategory, editFormCategory];
      await products.verifyProductDetailsOnEditForm(formCategoryProduct);
      await dashboard.categoriesClick();
      await categories.verifyCategoriesPageLoaded();
      await categories.searchCategory(editFormCategory);
      await categories.verifySearchedCategoryDisplayed(editFormCategory);
      await categories.clearSearch();
    });

    test("Category created from product form stays when the product is not saved", async () => {
      await dashboard.productsClick();
      await products.verifyProductsPageLoaded();
      await products.reopenAddSingleProductForm();
      unsavedCategory = categories.generateUniqueCategoryName("FormUnsaved");
      await products.createCategoryFromProductForm(unsavedCategory);
      await products.leaveAddFormWithoutSaving();

      await dashboard.categoriesClick();
      await categories.verifyCategoriesPageLoaded();
      await categories.searchCategory(unsavedCategory);
      await categories.verifySearchedCategoryDisplayed(unsavedCategory);
      await categories.clearSearch();
    });
  });
});
