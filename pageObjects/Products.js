const { expect } = require("@playwright/test");
const routes = require("../utilities/routes.js");
const sessionDataStorage = require("../utilities/helper/sessionDataStorage");

const PRODUCTS_PAGE_URL = /\/merchants\/inventory\/new-products/;
const PRODUCTS_MENU_HREF = /\/merchants\/inventory\/new-products/;
const SORT_OPTIONS = [
  "Newest first",
  "Oldest first",
  "Name (A → Z)",
  "Name (Z → A)",
  "Category (A → Z)",
  "Category (Z → A)",
];
const TYPE_WARNING =
  /Pick carefully\.\s*Once the product is created, switching between single and variants isn't possible/i;
const SINGLE_PRODUCT_FEATURES = [
  "One UPC & scan codes",
  "One price",
  "Single inventory count",
];
const VARIANT_PRODUCT_FEATURES = [
  "Per-variant UPC",
  "Per-variant price",
  "Per-variant inventory",
];
const ADD_SINGLE_HEADINGS = [
  "Product Information",
  "Photos",
  "Description",
  "Pricing & Inventory",
  "Selling Channels",
  "Product Options",
  "SKU Codes",
  "Vendor Information",
  "Tax Information",
  "Related Products",
];
const OPTIONAL_ADD_SINGLE_HEADINGS = ["Copy to stores"];
const ADD_SINGLE_LABELS = [
  "Name*",
  "Brand",
  "Tags",
  "Categories*",
  "UPC",
  "Cost",
  "Price*",
  "Compare-at price",
  "Margin",
  "Profit",
  "Available to sell",
  "Reorder point",
  "Reorder quantity",
  "Custom Code",
];
const ADD_SINGLE_PLACEHOLDERS = [
  "Enter product name",
  "Choose a brand",
  "Add a tag",
  "Add a category",
  "Scan or enter UPC",
  "0.00",
  "0.00",
  "0.00",
  "—",
  "—",
  "0",
  "0",
  "0",
  "Enter custom code",
  "Search products to add...",
];
const ADD_SINGLE_HEADER_BUTTONS = ["Back", "Save product"];

class Products {
  constructor(page) {
    this.page = page;

    this.pageHeader = page.locator("[data-prod-head]");
    this.productsHeading = this.pageHeader.getByText("Products", {
      exact: true,
    });
    this.loadedCount = this.pageHeader.getByText(/\d+\s+(loaded|items?)/i);
    this.searchBar = page.getByRole("textbox", {
      name: /Search by product name, variant name, UPC, SKU, or custom code/i,
    });
    this.addProductBtn = page.getByRole("button", {
      name: "Add product",
      exact: true,
    });

    this.filtersBar = page.locator("[data-prod-filters]");
    this.categoriesFilter = this.filtersBar.getByRole("button", {
      name: "Categories",
    });
    this.brandsFilter = this.filtersBar.getByRole("button", { name: "Brands" });
    this.tagsFilter = this.filtersBar.getByRole("button", { name: "Tags" });
    this.vendorsFilter = this.filtersBar.getByRole("button", {
      name: "Vendors",
    });
    this.moreFiltersBtn = this.filtersBar.getByRole("button", {
      name: /^More/,
    });
    this.channelsFilter = page.getByRole("button", { name: "Channels" });
    this.noPhotoFilter = page.getByRole("button", { name: "No photo" });
    this.statusFilter = page.getByRole("button", { name: "Status" });
    this.onlineOrderingBtn = this.filtersBar.getByRole("button", {
      name: /Online ordering/i,
    });
    this.sortBtn = this.filtersBar.getByRole("button", { name: /Sort:/i });
    this.sortMenu = page.getByRole("menu");

    this.columnHeader = page.locator("[data-prod-colhead]");
    this.productColumn = this.columnHeader.getByText("Product", {
      exact: true,
    });
    this.availabilityColumn = this.columnHeader.getByText("Availability", {
      exact: true,
    });
    this.priceColumn = this.columnHeader.getByText("Price", { exact: true });

    this.productList = page.locator("[data-prod-list]");
    this.productRows = page.locator("[data-prod-row]");
    this.showActionsBtns = page.getByRole("button", {
      name: /Show actions|Hide actions/i,
    });
    this.editProductAction = page.getByRole("link", {
      name: /Edit product/i,
    });
    this.viewDetailsAction = page.getByRole("button", {
      name: /View details/i,
    });
    this.salesHistoryAction = page.getByRole("button", {
      name: /Sales history/i,
    });
    this.instantPoAction = page.getByRole("button", {
      name: /Instant Purchase Order/i,
    });
    this.stocktakeAction = page.getByRole("button", { name: /Stocktake/i });
    this.deleteItemAction = page.getByRole("button", { name: /Delete item/i });
    this.rowDeliveryToggle = page.getByRole("button", {
      name: /^Delivery$/i,
    });
    this.rowPickupToggle = page.getByRole("button", { name: /^Pickup$/i });
    this.rowOnlineOrderingHeading = page
      .getByText("Online ordering", { exact: true })
      .and(page.locator("span"));
    this.productDetailsHeading = page.getByText("Product details", {
      exact: true,
    });
    this.discardChangesBtn = page.getByRole("button", {
      name: "Discard changes",
      exact: true,
    });
    this.saveChangesBtn = page.getByRole("button", {
      name: "Save changes",
      exact: true,
    });
    this.emptyStateTitle = page.getByText("Your shelf is empty", {
      exact: true,
    });
    this.emptyStateBody = page.getByText(
      /Add your first product and it will appear here/i,
    );
    this.addFirstProductBtn = page.getByRole("button", {
      name: /Add your first product/i,
    });
    this.addProductTypeDialog = page.getByRole("dialog");
    this.typeStepLabel = this.addProductTypeDialog.getByText(/step 1 of 2/i);
    this.typeTitle = this.addProductTypeDialog.getByText(
      "Choose product type",
      {
        exact: true,
      },
    );
    this.typeSubtitle = this.addProductTypeDialog.getByText(
      /Pick how you.?ll track this product\. This affects how UPCs, prices, and inventory are managed\./i,
    );
    this.closeTypeDialogBtn = this.addProductTypeDialog.getByRole("button", {
      name: "Close",
    });
    this.typeCards = this.addProductTypeDialog.locator("[data-prod-typecard]");
    this.singleProductCard = this.typeCards.filter({
      hasText: "Single product",
    });
    this.variantsProductCard = this.typeCards.filter({
      hasText: "Product with variants",
    });
    this.typeWarning = this.addProductTypeDialog.locator(
      "[data-prod-typenote]",
    );
    this.cancelTypeDialogBtn = this.addProductTypeDialog.getByRole("button", {
      name: "Cancel",
      exact: true,
    });
    this.continueTypeDialogBtn = this.addProductTypeDialog.locator("a").filter({
      hasText: /Continue/i,
    });
    this.productsMenuLink = page.getByRole("link", {
      name: "Products",
      exact: true,
    });

    this.formHead = page.locator("[data-npf-formhead]");
    this.formBody = page.locator("[data-npf-body]");
    this.backBtn = page.getByRole("button", { name: "Back", exact: true });
    this.newProductTitle = page.getByText("New product", { exact: true });
    this.singleProductBadge = page.getByText("Single product", { exact: true });
    this.saveProductBtn = page.getByRole("button", {
      name: "Save product",
      exact: true,
    });
    this.draftRestoredBanner = page.getByText(/Restored your unsaved draft/i);
    this.startFreshBtn = page.getByRole("button", {
      name: "Start fresh",
      exact: true,
    });
    this.resetDraftConfirmBtn = page.getByRole("button", {
      name: "Reset everything",
      exact: true,
    });

    this.productInformationHeading = page.getByRole("heading", {
      name: "Product Information",
    });
    this.productNameLabel = page.getByText("Name*", { exact: true });
    this.productNameInput = page.getByPlaceholder("Enter product name");
    this.brandLabel = page.locator("label").filter({ hasText: /^Brand$/ });
    this.brandInput = page.getByPlaceholder("Choose a brand");
    this.brandHelper = page.getByText("One brand per product", { exact: true });
    this.tagsLabel = page.locator("label").filter({ hasText: /^Tags$/ });
    this.tagsInput = page.getByPlaceholder("Add a tag");
    this.categoriesLabel = page.getByText("Categories*", { exact: true });
    this.categoriesInput = page.getByPlaceholder("Add a category");

    this.photosHeading = page.getByRole("heading", { name: "Photos" });
    this.photosHelper = page.getByText(
      /Shown on the register and your online storefront\. The first photo is the cover\./i,
    );
    this.addPhotosBtn = page.getByRole("button", { name: "Add photos" });

    this.descriptionHeading = page.getByRole("heading", {
      name: "Description",
    });
    this.onlineOnlyBadge = page.getByText(/online only/i);
    this.descriptionHelper = page.getByText(
      /Shown to customers on your online storefront/i,
    );
    this.descriptionBoldBtn = page.getByRole("button", {
      name: "B",
      exact: true,
    });
    this.descriptionItalicBtn = page.getByRole("button", {
      name: "I",
      exact: true,
    });
    this.descriptionUnderlineBtn = page.getByRole("button", {
      name: "U",
      exact: true,
    });
    this.descriptionCharCount = page.getByText(/0\s*\/\s*2,?000/);
    this.descriptionEditor = this.formBody.locator("[contenteditable='true']");
    this.descriptionPlaceholder = this.formBody.getByText(
      /Tell customers about this product/i,
    );

    this.pricingHeading = page.getByRole("heading", {
      name: "Pricing & Inventory",
    });
    this.upcLabel = page.getByText("UPC", { exact: true });
    this.upcInput = page.getByPlaceholder("Scan or enter UPC");
    this.generateUpcBtn = page.getByRole("button", { name: "Generate" });
    this.missingUpcPrompt = page.getByText(/item has no UPC code/i);
    this.missingUpcHelper = page.getByText(
      /Every item needs a UPC to be scannable at the register/i,
    );
    this.fillUpcMyselfBtn = page.getByRole("button", {
      name: /I.?ll fill them in/i,
    });
    this.generateAndSaveUpcBtn = page.getByRole("button", {
      name: /Generate & save/i,
    });
    this.costLabel = page.getByText("Cost", { exact: true });
    this.costInput = page.getByPlaceholder("0.00").nth(0);
    this.priceLabel = page.getByText("Price*", { exact: true });
    this.priceInput = page.getByPlaceholder("0.00").nth(1);
    this.compareAtLabel = page.getByText("Compare-at price", { exact: true });
    this.compareAtInput = page.getByPlaceholder("0.00").nth(2);
    this.marginLabel = page.getByText("Margin", { exact: true });
    this.profitLabel = page.getByText("Profit", { exact: true });
    this.marginInput = this.formBody.getByPlaceholder("—").nth(0);
    this.profitInput = this.formBody.getByPlaceholder("—").nth(1);
    this.computedHelper = page.getByText("Computed from price and cost");
    this.availableToSellLabel = page.getByText("Available to sell", {
      exact: true,
    });
    this.quantityInputs = page.getByPlaceholder("0", { exact: true });
    this.availableToSellInput = this.quantityInputs.nth(0);
    this.reorderPointLabel = page.getByText("Reorder point", { exact: true });
    this.reorderPointInput = this.quantityInputs.nth(1);
    this.reorderQtyLabel = page.getByText("Reorder quantity", { exact: true });
    this.reorderQtyInput = this.quantityInputs.nth(2);

    this.copyToStoresHeading = page.getByRole("heading", {
      name: "Copy to stores",
    });
    this.copyToStoresHelper = page.getByText(
      /Also create this product in your other linked stores when saving\./i,
    );
    this.selectAllStoresBtn = page.getByRole("button", { name: "Select all" });

    this.sellingChannelsHeading = page.getByRole("heading", {
      name: "Selling Channels",
    });
    this.sellingChannelsHelper = page.getByText(
      /New products start with delivery and pickup enabled/i,
    );
    this.posChannelBtn = page.getByRole("button", { name: /Point of Sale/i });
    this.deliveryChannelBtn = page.getByRole("button", {
      name: /^Delivery/i,
    });
    this.pickupChannelBtn = page.getByRole("button", { name: /^Pickup/i });

    this.productOptionsHeading = page.getByRole("heading", {
      name: "Product Options",
    });
    this.trackQuantityOption = page.getByRole("button", {
      name: /Track quantity/i,
    });
    this.continueSellingOption = page.getByRole("button", {
      name: /Continue selling when out of stock/i,
    });
    this.checkIdOption = page.getByRole("button", { name: /Check ID/i });
    this.activeOption = page.getByRole("button", { name: /^Active/i });
    this.foodStampableOption = page.getByRole("button", {
      name: /Food Stampable/i,
    });

    this.skuCodesHeading = page.getByRole("heading", { name: "SKU Codes" });
    this.skuCodesHelper = page.getByText(/UPC, EAN, or supplier codes/i);
    this.customCodeLabel = page.getByText("Custom Code", { exact: true });
    this.customCodeInput = page.getByPlaceholder("Enter custom code");
    this.addAnotherCodeBtn = page.getByRole("button", {
      name: /Add another code/i,
    });
    this.skuLimitHelper = page.getByText(/Up to \d+ additional scan codes/i);

    this.vendorInfoHeading = page.getByRole("heading", {
      name: "Vendor Information",
    });
    this.vendorInfoHelper = page.getByText(
      /Assign vendors and their cost per item/i,
    );
    this.vendorAssignAfterCreate = page.getByText(
      /Vendors can be assigned after the product is created/i,
    );

    this.taxInfoHeading = page.getByRole("heading", {
      name: "Tax Information",
    });
    this.taxInfoHelper = page.getByText(/Extra taxes applied to this product/i);
    this.addAnotherTaxBtn = page.getByRole("button", {
      name: /Add another tax/i,
    });
    this.taxNameLabel = page.getByText(/tax name/i);
    this.defaultTaxName = page.getByText("DefaultTax", { exact: true });
    this.taxRateLabel = page.getByText(/tax rate/i);

    this.relatedProductsHeading = page.getByRole("heading", {
      name: "Related Products",
    });
    this.relatedProductsHelper = page.getByText(
      /Suggested alongside this product online/i,
    );
    this.relatedProductsSearch = page.getByPlaceholder(
      "Search products to add...",
    );
    this.nameRequiredError = page.getByText("Title is required");
    this.categoriesRequiredError = page.getByText("Select Category", {
      exact: true,
    });
    this.priceRequiredError = page.getByText("Price is required");
    this.priceGreaterThanZeroError = page.getByText(
      "Price must be greater than 0",
    );
    this.compareAtLessThanPriceError = page.getByText(
      "Compare Price must be greater than price.",
    );
  }

  async verifyProductsPageLoaded() {
    await expect(this.productsHeading).toBeVisible({ timeout: 15_000 });
    await expect(this.loadedCount).toBeVisible({ timeout: 15_000 });
    await expect(this.searchBar).toBeVisible();
  }

  async getDisplayedProductCount() {
    await expect(this.loadedCount).toBeVisible();
    const countText = (await this.loadedCount.textContent())?.trim() ?? "";
    return parseInt(countText.match(/\d+/)?.[0] ?? "0", 10);
  }

  async verifyListApiOnPageLoad() {
    const productApiCount = sessionDataStorage.get("product_APIcount");
    expect(
      productApiCount,
      "Product list API count should be stored on page load",
    ).toBeDefined();
    expect(typeof productApiCount).toBe("number");
    expect(productApiCount).toBeGreaterThanOrEqual(0);

    const categoryApiCount = sessionDataStorage.get("category_APIcount");
    expect(
      categoryApiCount,
      "Category list API count should be stored on page load",
    ).toBeDefined();
    expect(typeof categoryApiCount).toBe("number");
    expect(
      categoryApiCount,
      "Category list should never be empty",
    ).toBeGreaterThan(0);

    const uiCount = await this.getDisplayedProductCount();
    console.log(`UI product loaded count: ${uiCount}`);
    console.log(`API product list count: ${productApiCount}`);
    console.log(`API category list count: ${categoryApiCount}`);
    expect(
      uiCount,
      `UI count (${uiCount}) should match Products_list API count (${productApiCount})`,
    ).toBe(productApiCount);

    if (productApiCount === 0) {
      await expect(this.loadedCount).toHaveText(/^0\s+items?$/i);
      await this.verifyEmptyCatalogState();
    }
  }

  async verifyPageUrl() {
    await expect(this.page).toHaveURL(PRODUCTS_PAGE_URL);
    expect(this.page.url()).toBe(routes.page_URL.products);
  }

  async verifyProductsMenuAndUrl() {
    await expect(this.productsMenuLink).toBeVisible();
    await expect(this.productsMenuLink).toHaveAttribute(
      "href",
      PRODUCTS_MENU_HREF,
    );
    await expect(this.productsMenuLink).toHaveClass(
      /qv-app-sidebar__submenu-link--active/,
    );
    await this.verifyPageUrl();
  }

  async productsHeadingDisplay() {
    await expect(this.productsHeading).toBeVisible();
    await expect(this.productsHeading).toHaveText("Products");
  }

  async loadedCountDisplay() {
    await expect(this.loadedCount).toBeVisible();
    const count = await this.getDisplayedProductCount();
    if (count === 0) {
      await expect(this.loadedCount).toHaveText(/^0\s+items?$/i);
      return;
    }
    await expect(this.loadedCount).toHaveText(/\d+\s+loaded/i);
  }

  async searchBarDisplay() {
    await expect(this.searchBar).toBeVisible();
    await expect(this.searchBar).toHaveAttribute(
      "placeholder",
      /Search by product name, variant name, UPC, SKU, or custom code/i,
    );
  }

  async addProductBtnDisplay() {
    await expect(this.addProductBtn).toBeVisible();
  }

  async filtersDisplay() {
    await expect(this.categoriesFilter).toBeVisible();
    await expect(this.brandsFilter).toBeVisible();
    await expect(this.tagsFilter).toBeVisible();
    await expect(this.vendorsFilter).toBeVisible();

    if (!(await this.channelsFilter.isVisible())) {
      await expect(this.moreFiltersBtn).toBeVisible();
      await this.moreFiltersBtn.click();
    }

    await expect(this.channelsFilter).toBeVisible();
    await expect(this.noPhotoFilter).toBeVisible();
    await expect(this.statusFilter).toBeVisible();
    await this.page.keyboard.press("Escape");
  }

  async onlineOrderingDisplay() {
    await expect(this.onlineOrderingBtn).toBeVisible();
  }

  async sortBtnDisplay() {
    await expect(this.sortBtn).toBeVisible();
    await expect(this.sortBtn).toHaveText(/Sort:/i);
  }

  async sortBtnClick() {
    await this.sortBtn.click();
    await expect(this.sortMenu).toBeVisible();
  }

  async verifySortOptionsDisplay() {
    await this.sortBtnClick();
    for (const option of SORT_OPTIONS) {
      await expect(
        this.sortMenu.getByRole("button", { name: option, exact: true }),
      ).toBeVisible();
    }
    await expect(this.sortMenu.getByRole("button")).toHaveCount(
      SORT_OPTIONS.length,
    );
    await this.page.keyboard.press("Escape");
    await expect(this.sortMenu).toBeHidden();
  }

  async addProductBtnClick() {
    await this.addProductBtn.click();
    await expect(this.addProductTypeDialog).toBeVisible({ timeout: 10_000 });
  }

  async verifyAddProductTypeDialogUI() {
    await expect(this.typeStepLabel).toBeVisible();
    await expect(this.typeTitle).toBeVisible();
    await expect(this.typeSubtitle).toBeVisible();
    await expect(this.closeTypeDialogBtn).toBeVisible();

    await expect(this.typeCards).toHaveCount(2);

    await expect(this.singleProductCard).toBeVisible();
    await expect(this.singleProductCard).toContainText("Single product");
    for (const feature of SINGLE_PRODUCT_FEATURES) {
      await expect(this.singleProductCard).toContainText(feature);
    }

    await expect(this.variantsProductCard).toBeVisible();
    await expect(this.variantsProductCard).toContainText(
      "Product with variants",
    );
    for (const feature of VARIANT_PRODUCT_FEATURES) {
      await expect(this.variantsProductCard).toContainText(feature);
    }

    await expect(this.typeWarning).toBeVisible();
    await expect(this.typeWarning).toContainText(TYPE_WARNING);

    await expect(this.cancelTypeDialogBtn).toBeVisible();
    await this.verifyContinueDisabled();
  }

  async verifyContinueDisabled() {
    await expect(this.continueTypeDialogBtn).toBeVisible();
    await expect(this.continueTypeDialogBtn).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  }

  async verifyContinueEnabled() {
    await expect(this.continueTypeDialogBtn).toBeVisible();
    await expect(this.continueTypeDialogBtn).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  }

  async selectSingleProductType() {
    await this.singleProductCard.click();
    await this.verifyContinueEnabled();
    await expect(this.continueTypeDialogBtn).toHaveAttribute(
      "href",
      /type=single/,
    );
  }

  async selectVariantsProductType() {
    await this.variantsProductCard.click();
    await this.verifyContinueEnabled();
    await expect(this.continueTypeDialogBtn).toHaveAttribute(
      "href",
      /type=variants/,
    );
  }

  async continueAddProductType() {
    await this.verifyContinueEnabled();
    await this.continueTypeDialogBtn.click();
    await expect(this.addProductTypeDialog).toBeHidden({ timeout: 10_000 });
  }

  async verifyAddSingleProductUrl() {
    await expect(this.page).toHaveURL(
      /\/merchants\/inventory\/new-products\/add\?type=single/,
    );
  }

  async verifyAddSingleProductHeader() {
    await expect(this.backBtn).toBeVisible();
    await expect(this.newProductTitle).toBeVisible();
    await expect(this.singleProductBadge).toBeVisible();
    await expect(this.saveProductBtn).toBeVisible();
  }

  async verifyProductInformationSection() {
    await expect(this.productInformationHeading).toBeVisible();
    await expect(this.productNameLabel).toBeVisible();
    await expect(this.productNameInput).toBeVisible();
    await expect(this.brandLabel).toBeVisible();
    await expect(this.brandInput).toBeVisible();
    await expect(this.brandHelper).toBeVisible();
    await expect(this.tagsLabel).toBeVisible();
    await expect(this.tagsInput).toBeVisible();
    await expect(this.categoriesLabel).toBeVisible();
    await expect(this.categoriesInput).toBeVisible();
  }

  async verifyPhotosSection() {
    await expect(this.photosHeading).toBeVisible();
    await expect(this.photosHelper).toBeVisible();
    await expect(this.addPhotosBtn).toBeVisible();
  }

  async verifyDescriptionSection() {
    await expect(this.descriptionHeading).toBeVisible();
    await expect(this.onlineOnlyBadge).toBeVisible();
    await expect(this.descriptionHelper).toBeVisible();
    await expect(this.descriptionBoldBtn).toBeVisible();
    await expect(this.descriptionItalicBtn).toBeVisible();
    await expect(this.descriptionUnderlineBtn).toBeVisible();
    await expect(this.descriptionCharCount).toBeVisible();
  }

  async verifyPricingInventorySection() {
    await expect(this.pricingHeading).toBeVisible();
    await expect(this.upcLabel).toBeVisible();
    await expect(this.upcInput).toBeVisible();
    await expect(this.generateUpcBtn).toBeVisible();
    await expect(this.costLabel).toBeVisible();
    await expect(this.priceLabel).toBeVisible();
    await expect(this.compareAtLabel).toBeVisible();
    await expect(this.marginLabel).toBeVisible();
    await expect(this.profitLabel).toBeVisible();
    await expect(this.computedHelper.first()).toBeVisible();
    await expect(this.availableToSellLabel).toBeVisible();
    await expect(this.reorderPointLabel).toBeVisible();
    await expect(this.reorderQtyLabel).toBeVisible();
  }

  setStoreCount(count) {
    sessionDataStorage.set("storeCount", Number(count) || 0);
  }

  async verifyCopyToStoresSection() {
    const storeCount = Number(sessionDataStorage.get("storeCount") ?? 0);
    if (storeCount > 1) {
      await expect(this.copyToStoresHeading).toBeVisible();
      await expect(this.copyToStoresHelper).toBeVisible();
      await expect(this.selectAllStoresBtn).toBeVisible();
      return;
    }
    await expect(this.copyToStoresHeading).toBeHidden();
    await expect(this.copyToStoresHelper).toBeHidden();
    await expect(this.selectAllStoresBtn).toBeHidden();
  }

  async expectToggleChecked(locator, shouldBeChecked) {
    const checkMark = locator.locator('svg path[d="M5 12l4 4 10-10"]');
    if (shouldBeChecked) {
      await expect(checkMark).toHaveCount(1);
    } else {
      await expect(checkMark).toHaveCount(0);
    }
  }

  async verifySellingChannelsSection() {
    await expect(this.sellingChannelsHeading).toBeVisible();
    await expect(this.sellingChannelsHelper).toBeVisible();
    await expect(this.posChannelBtn).toBeVisible();
    await expect(this.deliveryChannelBtn).toBeVisible();
    await expect(this.pickupChannelBtn).toBeVisible();
    await this.expectToggleChecked(this.posChannelBtn, true);
    await this.expectToggleChecked(this.deliveryChannelBtn, true);
    await this.expectToggleChecked(this.pickupChannelBtn, true);
  }

  async verifyProductOptionsSection() {
    await expect(this.productOptionsHeading).toBeVisible();
    await expect(this.trackQuantityOption).toBeVisible();
    await expect(this.continueSellingOption).toBeVisible();
    await expect(this.checkIdOption).toBeVisible();
    await expect(this.activeOption).toBeVisible();
    await expect(this.foodStampableOption).toBeVisible();
    await this.expectToggleChecked(this.trackQuantityOption, true);
    await this.expectToggleChecked(this.continueSellingOption, true);
    await this.expectToggleChecked(this.checkIdOption, false);
    await this.expectToggleChecked(this.activeOption, true);
    await this.expectToggleChecked(this.foodStampableOption, false);
  }

  async verifySkuCodesSection() {
    await expect(this.skuCodesHeading).toBeVisible();
    await expect(this.skuCodesHelper).toBeVisible();
    await expect(this.customCodeLabel).toBeVisible();
    await expect(this.customCodeInput).toBeVisible();
    await expect(this.addAnotherCodeBtn).toBeVisible();
    await expect(this.skuLimitHelper).toBeVisible();
  }

  async verifyVendorInformationSection() {
    await expect(this.vendorInfoHeading).toBeVisible();
    await expect(this.vendorInfoHelper).toBeVisible();
    await expect(this.vendorAssignAfterCreate).toBeVisible();
  }

  async verifyTaxInformationSection() {
    await expect(this.taxInfoHeading).toBeVisible();
    await expect(this.taxInfoHelper).toBeVisible();
    await expect(this.addAnotherTaxBtn).toBeVisible();
    await expect(this.taxNameLabel).toBeVisible();
    await expect(this.defaultTaxName).toBeVisible();
    await expect(this.taxRateLabel).toBeVisible();
    const taxSection = this.taxInfoHeading.locator("xpath=ancestor::section");
    await expect(taxSection.getByText(/%/)).toBeVisible();
  }

  async verifyRelatedProductsSection() {
    await expect(this.relatedProductsHeading).toBeVisible();
    await expect(this.relatedProductsHelper).toBeVisible();
    await expect(this.relatedProductsSearch).toBeVisible();
  }

  async fillProductName(name) {
    const [titleCheckResponse] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.checkProductTitle),
        { timeout: 15_000 },
      ),
      this.productNameInput.fill(String(name)),
    ]);
    expect(titleCheckResponse.status()).toBe(200);
    const titleBody = await titleCheckResponse.json();
    expect(
      titleBody.status,
      "check_productTitle API should succeed when a title is entered",
    ).toBeTruthy();
    expect(titleBody.message).toBe("Success");
  }

  async fillPrice(value) {
    await this.priceInput.fill(String(value));
  }

  async fillCost(value) {
    await this.costInput.fill(String(value));
  }

  parseMoney(text) {
    const cleaned = String(text ?? "")
      .replace(/[$,%\s]/g, "")
      .replace(/—/g, "")
      .trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  expectedProfit(price, cost) {
    return Number((Number(price) - Number(cost)).toFixed(2));
  }

  expectedMargin(price, cost) {
    const priceNum = Number(price);
    if (!priceNum) return 0;
    return Number((((priceNum - Number(cost)) / priceNum) * 100).toFixed(2));
  }

  async readComputedNumber(input) {
    const fromValue = this.parseMoney(await input.inputValue());
    if (fromValue != null) return fromValue;
    const fromText = this.parseMoney(await input.innerText());
    if (fromText != null) return fromText;
    const fromParent = this.parseMoney(
      await input.locator("xpath=..").innerText(),
    );
    return fromParent;
  }

  async verifyMarginAndProfitComputed(cost, price) {
    const expectedProfit = this.expectedProfit(price, cost);
    const expectedMargin = this.expectedMargin(price, cost);

    await this.priceInput.blur();

    await expect
      .poll(async () => this.readComputedNumber(this.marginInput), {
        timeout: 10_000,
        message: `Margin should be ${expectedMargin}% for cost ${cost} and price ${price}`,
      })
      .toBe(expectedMargin);

    await expect
      .poll(async () => this.readComputedNumber(this.profitInput), {
        timeout: 10_000,
        message: `Profit should be ${expectedProfit} for cost ${cost} and price ${price}`,
      })
      .toBe(expectedProfit);
  }

  async addSingleProductWithRequiredFieldsAndVerifyMarginProfit(product) {
    const {
      name,
      category = "Quickadd",
      cost = "10.00",
      price = "20.00",
    } = product;
    await this.verifyAddSingleProductUrl();
    await this.fillProductName(name);
    await this.selectCategory(category);
    const upc = await this.generateUpc();
    product.upc = upc;
    await this.fillCost(cost);
    await this.fillPrice(price);
    await this.compareAtInput.fill("");
    await expect(this.compareAtLessThanPriceError).toHaveCount(0);
    await this.verifyMarginAndProfitComputed(cost, price);

    const addPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.addProduct),
      { timeout: 20_000 },
    );

    await this.saveProductClick();
    const addResponse = await addPromise;
    expect(addResponse.status()).toBe(200);

    await expect(this.page).not.toHaveURL(/\/new-products\/add/, {
      timeout: 15_000,
    });
    await this.searchBar.fill(name);
    await expect(
      this.productRows.filter({ hasText: name }).first(),
      `Product "${name}" should appear in the listing after save`,
    ).toBeVisible({ timeout: 15_000 });
    sessionDataStorage.set("createdProduct", {
      name,
      category,
      cost: String(cost),
      price: String(price),
      upc,
    });
  }

  async readUpcFromFrontend() {
    await expect
      .poll(
        async () => {
          const fromInput = (await this.upcInput.inputValue().catch(() => "")).trim();
          if (/^\d{12}$/.test(fromInput)) return fromInput;
          const fromPrompt = await this.missingUpcPrompt
            .locator("xpath=ancestor::*[1]")
            .innerText()
            .catch(() => "");
          const match = fromPrompt.match(/\b\d{12}\b/);
          return match ? match[0] : "";
        },
        {
          timeout: 10_000,
          message: "Generate & save should show a 12-digit UPC on the form",
        },
      )
      .toMatch(/^\d{12}$/);

    const fromInput = (await this.upcInput.inputValue().catch(() => "")).trim();
    if (/^\d{12}$/.test(fromInput)) return fromInput;
    const fromPrompt = await this.missingUpcPrompt
      .locator("xpath=ancestor::*[1]")
      .innerText();
    return fromPrompt.match(/\b\d{12}\b/)[0];
  }

  async addSingleProductWithoutUpcGenerateFromDialog(product) {
    const {
      name,
      category = "Quickadd",
      cost = "10.00",
      price = "20.00",
    } = product;
    await this.verifyAddSingleProductUrl();
    await this.fillProductName(name);
    await this.selectCategory(category);
    await expect(this.upcInput).toHaveValue("");
    await this.fillCost(cost);
    await this.fillPrice(price);
    await this.compareAtInput.fill("");
    await expect(this.compareAtLessThanPriceError).toHaveCount(0);
    await this.verifyMarginAndProfitComputed(cost, price);

    await this.saveProductClick();
    await expect(this.missingUpcPrompt).toBeVisible({ timeout: 10_000 });
    await expect(this.missingUpcHelper).toBeVisible();
    await expect(
      this.page.getByText(new RegExp(`·\\s*${name}`)),
    ).toBeVisible();
    await expect(this.fillUpcMyselfBtn).toBeVisible();
    await expect(this.generateAndSaveUpcBtn).toBeVisible();

    const addPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.addProduct),
      { timeout: 25_000 },
    );
    await this.generateAndSaveUpcBtn.click();
    const upc = await this.readUpcFromFrontend();
    product.upc = upc;

    const addResponse = await addPromise;
    expect(addResponse.status()).toBe(200);

    await expect(this.missingUpcPrompt).toBeHidden({ timeout: 10_000 });
    await expect(this.page).not.toHaveURL(/\/new-products\/add/, {
      timeout: 15_000,
    });
    await this.searchBar.fill(name);
    await expect(
      this.productRows.filter({ hasText: name }).first(),
      `Product "${name}" should appear in the listing after Generate & save`,
    ).toBeVisible({ timeout: 15_000 });
    sessionDataStorage.set("createdProductWithoutUpc", {
      name,
      category,
      cost: String(cost),
      price: String(price),
      upc,
    });
  }

  async pickFirstOpenListOption() {
    const closeList = this.page.getByRole("button", { name: "Close list" });
    await expect(closeList.first()).toBeVisible({ timeout: 10_000 });
    const firstOption = closeList.first().locator(
      "xpath=following::*[(local-name()='button' or @role='button') and not(contains(normalize-space(.), 'Load more'))][1]",
    );
    await expect(firstOption).toBeVisible({ timeout: 10_000 });
    const label = (await firstOption.innerText()).replace(/\s+/g, " ").trim();
    await firstOption.click();
    return label;
  }

  async selectFirstBrand() {
    await this.brandInput.click();
    return this.pickFirstOpenListOption();
  }

  async selectFirstTag() {
    await this.tagsInput.click();
    return this.pickFirstOpenListOption();
  }

  async fillDescription(text) {
    const editor = this.descriptionEditor.first();
    if (await editor.count()) {
      await editor.click();
      await editor.fill(text);
      return;
    }
    await this.descriptionPlaceholder.click();
    await this.page.keyboard.type(text);
  }

  async selectProductTaxes(product) {
    await expect(this.defaultTaxName).toBeVisible();
    const taxes = ["DefaultTax"];

    await this.addAnotherTaxBtn.click();
    const chooseTax = this.page.getByPlaceholder("Choose a tax");
    const pickerVisible = await chooseTax
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);

    if (!pickerVisible) {
      product.taxes = taxes;
      return;
    }

    await chooseTax.click();
    const label = await this.pickFirstOpenListOption();
    const taxName = label.replace(/\s*[\d.]+%\s*$/, "").trim();
    taxes.push(taxName);
    await expect(
      this.formBody.getByText(taxName, { exact: true }).first(),
    ).toBeVisible();
    product.taxes = taxes;
  }

  async selectFirstRelatedProduct() {
    await this.relatedProductsSearch.click();
    const closeList = this.page.getByRole("button", { name: "Close list" });
    const opened = await closeList
      .first()
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (!opened) return "";
    return this.pickFirstOpenListOption();
  }

  async addSingleProductWithAllDetails(product) {
    const {
      name,
      category = "Quickadd",
      cost = "10.00",
      price = "20.00",
      compareAt = "25.00",
      quantity = "5",
      reorderPoint = "2",
      reorderQty = "10",
      description = "Auto full product description",
      customCode,
    } = product;
    await this.verifyAddSingleProductUrl();
    await this.fillProductName(name);
    product.brand = await this.selectFirstBrand();
    product.tag = await this.selectFirstTag();
    await this.selectCategory(category);
    await this.fillDescription(description);
    const upc = await this.generateUpc();
    product.upc = upc;
    await this.fillCost(cost);
    await this.fillPrice(price);
    await this.compareAtInput.fill(String(compareAt));
    await expect(this.compareAtLessThanPriceError).toHaveCount(0);
    await this.verifyMarginAndProfitComputed(cost, price);
    await this.availableToSellInput.fill(String(quantity));
    await this.reorderPointInput.fill(String(reorderPoint));
    await this.reorderQtyInput.fill(String(reorderQty));
    await this.customCodeInput.fill(String(customCode));
    await this.foodStampableOption.click();
    await this.expectToggleChecked(this.foodStampableOption, true);
    await this.selectProductTaxes(product);
    product.relatedProduct = await this.selectFirstRelatedProduct();

    const addPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.addProduct),
      { timeout: 20_000 },
    );
    await this.saveProductClick();
    const addResponse = await addPromise;
    expect(addResponse.status()).toBe(200);

    await expect(this.page).not.toHaveURL(/\/new-products\/add/, {
      timeout: 15_000,
    });
    await this.searchBar.fill(name);
    await expect(
      this.productRows.filter({ hasText: name }).first(),
      `Product "${name}" should appear in the listing after save`,
    ).toBeVisible({ timeout: 15_000 });
    sessionDataStorage.set("createdFullProduct", { ...product });
  }

  formatPrice(value) {
    return `$${Number(value).toFixed(2)}`;
  }

  getProductRow(name) {
    return this.productRows.filter({ hasText: name }).first();
  }

  async waitForCatalogIdle() {
    await expect(this.page.getByText(/Loading your catalog/i)).toHaveCount(0, {
      timeout: 15_000,
    });
  }

  isProductListResponse(res) {
    return (
      res.request().method() === "POST" &&
      res.url().includes(routes.API_URL.productList_URL)
    );
  }

  async searchCreatedProduct(name) {
    await this.returnToProductsList();
    const listResponse = this.page.waitForResponse(
      (res) => this.isProductListResponse(res),
      { timeout: 15_000 },
    );
    await this.searchBar.fill(name);
    await listResponse.catch(() => { });
    await expect(this.getProductRow(name)).toBeVisible({ timeout: 15_000 });
    await this.page
      .waitForResponse((res) => this.isProductListResponse(res), {
        timeout: 2_000,
      })
      .catch(() => { });
    await this.waitForCatalogIdle();
    return this.getProductRow(name);
  }

  getRowActionsToggle(row) {
    return row.getByRole("button", { name: /Show actions|Hide actions/i });
  }

  async openRowActionsMenu(row) {
    await this.waitForCatalogIdle();
    if (!(await this.editProductAction.first().isVisible())) {
      await this.getRowActionsToggle(row).click({ force: true });
    }
    await expect(this.editProductAction.first()).toBeVisible({
      timeout: 3_000,
    });
  }

  async openRowActions(name) {
    const row = await this.searchCreatedProduct(name);
    await expect(async () => {
      await this.openRowActionsMenu(row);
    }).toPass({ timeout: 15_000 });
    return row;
  }

  async expectRowActionsMenuVisible() {
    await expect(this.editProductAction.first()).toBeVisible({ timeout: 2_000 });
    await expect(this.page.getByText("Open the full product form")).toBeVisible({
      timeout: 2_000,
    });
    await expect(this.viewDetailsAction.first()).toBeVisible({ timeout: 2_000 });
    await expect(this.page.getByText("Quick look, no page change")).toBeVisible({
      timeout: 2_000,
    });
    await expect(this.salesHistoryAction.first()).toBeVisible({ timeout: 2_000 });
    await expect(this.instantPoAction.first()).toBeVisible({ timeout: 2_000 });
    await expect(this.stocktakeAction.first()).toBeVisible({ timeout: 2_000 });
    await expect(this.deleteItemAction.first()).toBeVisible({ timeout: 2_000 });
    await expect(this.rowOnlineOrderingHeading).toBeVisible({ timeout: 2_000 });
    await expect(this.rowDeliveryToggle).toBeVisible({ timeout: 2_000 });
    await expect(this.rowPickupToggle).toBeVisible({ timeout: 2_000 });
  }

  async verifyCreatedProductInListing({
    name,
    category = "Quickadd",
    price = "20.00",
    upc,
    quantity,
  }) {
    const row = await this.searchCreatedProduct(name);
    await expect(row.locator("[data-prod-title]")).toHaveText(name);
    await expect(row).toContainText(category);
    if (upc) {
      await expect(row).toContainText(upc);
    }
    await expect(row.locator("[data-prod-price]")).toContainText(
      this.formatPrice(price),
    );
    await expect(row.getByLabel(/Delivery on/i)).toBeVisible();
    await expect(row.getByLabel(/Pickup on/i)).toBeVisible();
    const stockPattern = quantity
      ? new RegExp(
          `Low\\s*·\\s*${quantity}|${quantity} in stock|\\d+ in stock`,
          "i",
        )
      : /Low\s*·\s*0|0 in stock|Out of stock|\d+ in stock/i;
    await expect(row.getByText(stockPattern)).toBeVisible();
    await expect(this.getRowActionsToggle(row)).toBeVisible();

    await expect(async () => {
      await this.openRowActionsMenu(row);
      await this.expectRowActionsMenuVisible();
    }).toPass({ timeout: 20_000 });
    await this.page.keyboard.press("Escape");
  }

  getProductDetailsPanel() {
    return this.productDetailsHeading.locator(
      "xpath=ancestor::*[.//button[normalize-space()='Close']][1]",
    );
  }

  async verifyCreatedProductViewDetails({
    name,
    category = "Quickadd",
    cost = "10.00",
    price = "20.00",
    upc,
    description,
    customCode,
    quantity,
    reorderPoint,
    reorderQty,
  }) {
    await this.openRowActions(name);
    await this.viewDetailsAction.first().click();
    await expect(this.productDetailsHeading).toBeVisible({ timeout: 10_000 });
    await expect(this.page).toHaveURL(PRODUCTS_PAGE_URL);

    const details = this.getProductDetailsPanel();
    await expect(details.getByText(name, { exact: true })).toBeVisible();
    await expect(details.getByText("Approved", { exact: true })).toBeVisible();
    await expect(details.getByText("No images")).toBeVisible();
    await expect(details.getByText("Category", { exact: true })).toBeVisible();
    await expect(details.getByText(category, { exact: true })).toBeVisible();
    await expect(details.getByText("Type", { exact: true })).toBeVisible();
    await expect(details.getByText("Single product", { exact: true })).toBeVisible();
    await expect(details.getByText("Price", { exact: true })).toBeVisible();
    await expect(details.getByText(this.formatPrice(price))).toBeVisible();
    await expect(details.getByText("Cost / margin", { exact: true })).toBeVisible();
    await expect(details.getByText(this.formatPrice(cost))).toBeVisible();
    await expect(
      details.getByText(
        new RegExp(
          `${this.expectedMargin(price, cost).toFixed(2)}%\\s*margin`,
          "i",
        ),
      ),
    ).toBeVisible();
    await expect(details.getByText("In stock", { exact: true })).toBeVisible();
    if (quantity) {
      await expect(
        details.getByText(String(Number(quantity)), { exact: true }),
      ).toBeVisible();
    }
    if (upc) {
      await expect(details.getByText("UPC", { exact: true })).toBeVisible();
      await expect(details.getByText(upc, { exact: true })).toBeVisible();
    }
    if (customCode) {
      await expect(details.getByText("Custom code", { exact: true })).toBeVisible();
      await expect(details.getByText(customCode, { exact: true })).toBeVisible();
    }
    if (reorderPoint && reorderQty) {
      await expect(details.getByText(`${reorderPoint} / ${reorderQty}`)).toBeVisible();
    }
    if (description) {
      await expect(details.getByText("Description", { exact: true })).toBeVisible();
      await expect(details.getByText(description)).toBeVisible();
    }
    await expect(details.getByText("Online delivery")).toBeVisible();
    await expect(details.getByText("Online pickup")).toBeVisible();
    await expect(details.getByText("Sell when out of stock")).toBeVisible();
    await expect(details.getByText("Food stampable (EBT)")).toBeVisible();
    await details.getByRole("button", { name: "Close" }).click();
    await expect(this.productDetailsHeading).toBeHidden({ timeout: 10_000 });
  }

  async verifyCreatedProductEditForm({
    name,
    category = "Quickadd",
    cost = "10.00",
    price = "20.00",
    upc,
    brand,
    tag,
    taxes,
    description,
    customCode,
    quantity,
    reorderPoint,
    reorderQty,
    compareAt,
  }) {
    await this.openRowActions(name);
    const productDataPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.getProductDataById),
      { timeout: 20_000 },
    );
    await this.editProductAction.first().click();
    const productDataResponse = await productDataPromise;
    expect(productDataResponse.status()).toBe(200);
    await expect(this.page).toHaveURL(
      /\/merchants\/inventory\/new-products\/edit\/\d+/,
    );

    await expect(this.backBtn).toBeVisible();
    await expect(this.page.getByText(`Edit ${name}`)).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.singleProductBadge).toBeVisible();
    await expect(this.discardChangesBtn).toBeVisible();
    await expect(this.saveChangesBtn).toBeVisible();
    await expect(this.newProductTitle).toHaveCount(0);
    await expect(this.saveProductBtn).toHaveCount(0);

    await expect(this.productNameInput).toHaveValue(name, { timeout: 15_000 });
    await expect(this.formBody.getByText(category, { exact: true })).toBeVisible();
    if (brand) {
      await expect(this.formBody.getByText(brand, { exact: true })).toBeVisible();
    }
    if (tag) {
      await expect(this.formBody.getByText(tag, { exact: true })).toBeVisible();
    }
    if (upc) {
      await expect(this.upcInput).toHaveValue(upc);
    }
    await expect(this.costInput).toHaveValue(String(Number(cost).toFixed(2)));
    await expect(this.priceInput).toHaveValue(String(Number(price).toFixed(2)));
    if (compareAt) {
      await expect(this.compareAtInput).toHaveValue(
        String(Number(compareAt).toFixed(2)),
      );
    }
    await this.verifyMarginAndProfitComputed(cost, price);
    if (quantity) {
      await expect(this.availableToSellInput).toHaveValue(String(quantity));
    }
    if (reorderPoint) {
      await expect(this.reorderPointInput).toHaveValue(String(reorderPoint));
    }
    if (reorderQty) {
      await expect(this.reorderQtyInput).toHaveValue(String(reorderQty));
    }
    if (customCode) {
      await expect(this.customCodeInput).toHaveValue(String(customCode));
    }
    if (description) {
      await expect(this.formBody.getByText(description)).toBeVisible();
    }
    if (Array.isArray(taxes)) {
      for (const tax of taxes) {
        await expect(
          this.formBody.getByText(tax, { exact: true }).first(),
        ).toBeVisible();
      }
    }
    if (taxes?.length > 1) {
      await expect(this.formBody.getByRole("button", { name: /Remove tax/i })).toHaveCount(
        taxes.length,
      );
    }

    await expect(this.copyToStoresHeading).toBeHidden();
    await expect(this.vendorInfoHeading).toBeVisible();
    await expect(this.vendorAssignAfterCreate).toHaveCount(0);

    await expect(this.sellingChannelsHeading).toBeVisible();
    await expect(this.posChannelBtn).toBeVisible();
    await expect(this.deliveryChannelBtn).toBeVisible();
    await expect(this.pickupChannelBtn).toBeVisible();
    await this.expectToggleChecked(this.posChannelBtn, true);
    await this.expectToggleChecked(this.deliveryChannelBtn, true);
    await this.expectToggleChecked(this.pickupChannelBtn, true);
    await this.expectToggleChecked(this.activeOption, true);
    if (customCode || description) {
      await this.expectToggleChecked(this.foodStampableOption, true);
    }

    await this.returnToProductsList();
  }

  async fillUpc(value) {
    await this.upcInput.fill(String(value));
  }

  async generateUpc() {
    await expect(this.generateUpcBtn).toBeVisible();
    await this.generateUpcBtn.click();
    await expect
      .poll(async () => (await this.upcInput.inputValue()).trim(), {
        timeout: 10_000,
        message: "Generate should populate a 12-digit UPC",
      })
      .toMatch(/^\d{12}$/);
    return (await this.upcInput.inputValue()).trim();
  }

  async selectCategory(categoryName) {
    const [categoryListResponse] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.formCategoryList_URL),
        { timeout: 15_000 },
      ),
      this.categoriesInput.click(),
    ]);
    expect(categoryListResponse.status()).toBe(200);
    const categoryBody = await categoryListResponse.json();
    expect(categoryBody.status).toBeTruthy();
    expect(categoryBody.msg).toBe("Category Found Successfully.");
    expect(
      Array.isArray(categoryBody.result),
      "Form category list should be an array",
    ).toBeTruthy();
    expect(
      categoryBody.result.length,
      "Form category list should not be empty",
    ).toBeGreaterThan(0);

    await this.categoriesInput.fill(categoryName);
    const option = this.page.getByRole("button", {
      name: categoryName,
      exact: true,
    });
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click();
  }

  async saveProductClick() {
    await this.saveProductBtn.click();
  }

  async verifyNameRequiredError() {
    await expect(this.nameRequiredError.first()).toBeVisible({
      timeout: 10_000,
    });
  }

  async verifyProductNotSaved() {
    await this.verifyAddSingleProductUrl();
    await expect(this.productNameInput).toHaveValue("");
    await expect(this.newProductTitle).toBeVisible();
  }

  async returnToProductsList() {
    const pathname = new URL(this.page.url()).pathname.replace(/\/$/, "");
    const alreadyOnList = pathname.endsWith(
      "/merchants/inventory/new-products",
    );
    if (alreadyOnList) {
      await expect(this.productsHeading).toBeVisible();
      await expect(this.searchBar).toBeVisible();
      return;
    }

    const [productListResponse] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.productList_URL),
        { timeout: 15_000 },
      ),
      this.productsMenuLink.click(),
    ]);
    expect(productListResponse.status()).toBe(200);
    await expect(this.page).not.toHaveURL(/\/add/);
    await expect(this.productsHeading).toBeVisible({ timeout: 15_000 });
    await expect(this.searchBar).toBeVisible();
  }

  async reopenAddSingleProductForm() {
    await this.addProductBtnClick();
    await this.selectSingleProductType();
    await this.continueAddProductType();
    await this.verifyAddSingleProductUrl();
    await this.discardRestoredDraft();
  }

  async discardRestoredDraft() {
    const appeared = await this.startFreshBtn
      .waitFor({ state: "visible", timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    if (!appeared) return;
    await this.startFreshBtn.click();
    await expect(this.resetDraftConfirmBtn).toBeVisible({ timeout: 10_000 });
    await this.resetDraftConfirmBtn.click();
    await expect(this.resetDraftConfirmBtn).toBeHidden({ timeout: 10_000 });
    await expect(this.draftRestoredBanner).toBeHidden({ timeout: 10_000 });
    await expect(this.startFreshBtn).toBeHidden();
    await expect(this.compareAtInput).toHaveValue("");
    await expect(this.compareAtLessThanPriceError).toHaveCount(0);
  }

  async verifyProductNotCreatedInListing(searchText) {
    await this.returnToProductsList();
    const listResponse = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.productList_URL),
      { timeout: 10_000 },
    );
    await this.searchBar.fill(searchText);
    await listResponse.catch(() => { });
    await expect(
      this.productRows.filter({ hasText: searchText }),
      `Product "${searchText}" should not be created in the listing after invalid save`,
    ).toHaveCount(0);
    await this.searchBar.clear();
  }

  async verifyPriceRequiredError() {
    await expect(this.priceRequiredError.first()).toBeVisible({
      timeout: 10_000,
    });
  }

  async verifyRequiredAllEmptyValidation() {
    await this.verifyAddSingleProductUrl();
    await expect(this.productNameInput).toHaveValue("");
    await expect(this.categoriesInput).toHaveValue("");
    await expect(this.priceInput).toHaveValue("");
    await this.saveProductClick();
    await this.verifyNameRequiredError();
    await this.verifyCategoriesRequiredError();
    await this.verifyPriceRequiredError();
    await this.verifyAddSingleProductUrl();
    await expect(this.newProductTitle).toBeVisible();
    await expect(this.productNameInput).toHaveValue("");
    await expect(this.categoriesInput).toHaveValue("");
    await expect(this.priceInput).toHaveValue("");
  }

  async verifyRequiredNameEmptyValidation() {
    const upc = `8${Date.now().toString().slice(-11)}`;
    await this.productNameInput.fill("");
    await expect(this.productNameInput).toHaveValue("");
    await this.fillPrice("9.99");
    await this.selectCategory("Quickadd");
    await this.fillUpc(upc);
    await this.saveProductClick();
    await this.verifyNameRequiredError();
    await this.verifyProductNotSaved();
    await this.verifyProductNotCreatedInListing(upc);
  }

  async verifyCategoriesRequiredError() {
    await expect(this.categoriesRequiredError.first()).toBeVisible({
      timeout: 10_000,
    });
  }

  async verifyRequiredCategoriesEmptyValidation() {
    const name = `Auto Cat Empty ${Date.now()}`;
    const upc = `8${Date.now().toString().slice(-11)}`;
    await this.verifyAddSingleProductUrl();
    await expect(this.categoriesInput).toHaveValue("");
    await this.fillProductName(name);
    await this.fillPrice("9.99");
    await this.fillUpc(upc);
    await this.saveProductClick();
    await this.verifyAddSingleProductUrl();
    await this.verifyCategoriesRequiredError();
    await expect(this.newProductTitle).toBeVisible();
    await expect(this.categoriesInput).toHaveValue("");
    await expect(this.nameRequiredError).toHaveCount(0);
    await this.verifyProductNotCreatedInListing(name);
    await this.verifyProductNotCreatedInListing(upc);
    await this.reopenAddSingleProductForm();
  }

  async verifyRequiredPriceEmptyValidation() {
    const name = `Auto Price Empty ${Date.now()}`;
    const upc = `8${Date.now().toString().slice(-11)}`;
    await this.verifyAddSingleProductUrl();
    await this.fillProductName(name);
    await this.priceInput.fill("");
    await expect(this.priceInput).toHaveValue("");
    await this.selectCategory("Quickadd");
    await this.fillUpc(upc);
    await this.saveProductClick();
    await this.verifyAddSingleProductUrl();
    await this.verifyPriceRequiredError();
    await expect(this.newProductTitle).toBeVisible();
    await expect(this.priceInput).toHaveValue("");
    await expect(this.nameRequiredError).toHaveCount(0);
    await expect(this.categoriesRequiredError).toHaveCount(0);
    await this.verifyProductNotCreatedInListing(name);
    await this.verifyProductNotCreatedInListing(upc);
    await this.reopenAddSingleProductForm();
  }

  async verifyPriceRejectsNegative() {
    await this.priceInput.fill("-5.00");
    const filledValue = await this.priceInput.inputValue();
    expect(
      filledValue,
      "Price should not keep a negative value after fill",
    ).not.toMatch(/-/);
    expect(Number(filledValue) || 0).toBeGreaterThanOrEqual(0);

    await this.priceInput.fill("");
    await this.priceInput.pressSequentially("-9.99");
    const typedValue = await this.priceInput.inputValue();
    expect(
      typedValue,
      "Price should not accept a minus sign while typing",
    ).not.toMatch(/-/);
    expect(Number(typedValue) || 0).toBeGreaterThanOrEqual(0);
  }

  async verifyPriceZeroValidation() {
    const name = `Auto Price Zero ${Date.now()}`;
    const upc = `8${Date.now().toString().slice(-11)}`;
    await this.verifyAddSingleProductUrl();
    await this.fillProductName(name);
    await this.selectCategory("Quickadd");
    await this.fillUpc(upc);
    await this.fillPrice("0.00");
    await expect(this.priceInput).toHaveValue("0.00");
    await this.saveProductClick();
    await expect(this.priceGreaterThanZeroError.first()).toBeVisible({
      timeout: 10_000,
    });
    await this.verifyAddSingleProductUrl();
    await expect(this.newProductTitle).toBeVisible();
    await expect(this.nameRequiredError).toHaveCount(0);
    await expect(this.categoriesRequiredError).toHaveCount(0);
    await this.verifyProductNotCreatedInListing(name);
    await this.verifyProductNotCreatedInListing(upc);
    await this.reopenAddSingleProductForm();
  }

  async assertInputRejectsNegative(input, fieldName) {
    await input.fill("-8");
    const filledValue = await input.inputValue();
    expect(
      filledValue,
      `${fieldName} should not keep a negative value after fill`,
    ).not.toMatch(/-/);
    expect(Number(filledValue) || 0).toBeGreaterThanOrEqual(0);

    await input.fill("");
    await input.pressSequentially("-12");
    const typedValue = await input.inputValue();
    expect(
      typedValue,
      `${fieldName} should not accept a minus sign while typing`,
    ).not.toMatch(/-/);
    expect(Number(typedValue) || 0).toBeGreaterThanOrEqual(0);
  }

  async verifyQuantityRejectsNegative() {
    await this.assertInputRejectsNegative(
      this.availableToSellInput,
      "Available to sell",
    );
    await this.assertInputRejectsNegative(
      this.reorderPointInput,
      "Reorder point",
    );
    await this.assertInputRejectsNegative(
      this.reorderQtyInput,
      "Reorder quantity",
    );
  }

  async verifyCompareAtLessThanPriceValidation() {
    const name = `Auto CompareAt ${Date.now()}`;
    const upc = `8${Date.now().toString().slice(-11)}`;
    await this.verifyAddSingleProductUrl();
    await this.fillProductName(name);
    await this.selectCategory("Quickadd");
    await this.fillUpc(upc);
    await this.fillPrice("10.00");
    await this.compareAtInput.fill("5.00");
    await this.saveProductClick();
    await expect(this.compareAtLessThanPriceError.first()).toBeVisible({
      timeout: 10_000,
    });
    await this.verifyAddSingleProductUrl();
    await expect(this.newProductTitle).toBeVisible();
    await this.verifyProductNotCreatedInListing(name);
    await this.verifyProductNotCreatedInListing(upc);
    await this.reopenAddSingleProductForm();
  }

  async collectVisibleTexts(locator) {
    return locator.evaluateAll((els) =>
      els
        .filter((el) => el.offsetParent !== null)
        .map((el) => (el.innerText || "").replace(/\s+/g, " ").trim())
        .filter(Boolean),
    );
  }

  assertExactList(actual, expected, label) {
    const extra = actual.filter((item) => !expected.includes(item));
    const missing = expected.filter((item) => !actual.includes(item));
    expect(
      extra,
      `${label} has unexpected extra item(s): ${JSON.stringify(extra)}`,
    ).toEqual([]);
    expect(
      missing,
      `${label} is missing item(s): ${JSON.stringify(missing)}`,
    ).toEqual([]);
    expect(actual, `${label} count should match exactly`).toHaveLength(
      expected.length,
    );
  }

  async verifyNoExtraAddSingleFormElements() {
    const actualHeadings = await this.collectVisibleTexts(
      this.formBody.getByRole("heading"),
    );
    const storeCount = Number(sessionDataStorage.get("storeCount") ?? 0);
    const expectedHeadings =
      storeCount > 1
        ? ADD_SINGLE_HEADINGS.concat(OPTIONAL_ADD_SINGLE_HEADINGS)
        : ADD_SINGLE_HEADINGS;
    this.assertExactList(
      actualHeadings,
      expectedHeadings,
      "Add single form headings",
    );

    const actualLabels = await this.collectVisibleTexts(
      this.formBody.locator("label"),
    );
    this.assertExactList(
      actualLabels,
      ADD_SINGLE_LABELS,
      "Add single form labels",
    );

    const actualPlaceholders = await this.formBody
      .locator("input, textarea")
      .evaluateAll((els) =>
        els
          .filter((el) => el.offsetParent !== null)
          .map((el) => el.getAttribute("placeholder") ?? ""),
      );
    this.assertExactList(
      actualPlaceholders,
      ADD_SINGLE_PLACEHOLDERS,
      "Add single form placeholders",
    );

    const actualHeaderButtons = await this.collectVisibleTexts(
      this.formHead.getByRole("button"),
    );
    this.assertExactList(
      actualHeaderButtons,
      ADD_SINGLE_HEADER_BUTTONS,
      "Add single form header buttons",
    );
  }

  async verifyAddSingleProductFormUI() {
    await this.verifyAddSingleProductHeader();
    await this.verifyProductInformationSection();
    await this.verifyPhotosSection();
    await this.verifyDescriptionSection();
    await this.verifyPricingInventorySection();
    await this.verifyCopyToStoresSection();
    await this.verifySellingChannelsSection();
    await this.verifyProductOptionsSection();
    await this.verifySkuCodesSection();
    await this.verifyVendorInformationSection();
    await this.verifyTaxInformationSection();
    await this.verifyRelatedProductsSection();
    await this.verifyNoExtraAddSingleFormElements();
  }

  async verifyAddVariantsProductUrl() {
    await expect(this.page).toHaveURL(
      /\/merchants\/inventory\/new-products\/add\?type=variants/,
    );
  }

  async cancelAddProductTypeDialog() {
    await this.cancelTypeDialogBtn.click();
    await expect(this.addProductTypeDialog).toBeHidden({ timeout: 10_000 });
  }

  async columnHeadersDisplay() {
    await expect(this.productColumn).toBeVisible();
    await expect(this.availabilityColumn).toBeVisible();
    await expect(this.priceColumn).toBeVisible();
  }

  async verifyEmptyCatalogState() {
    await expect(this.emptyStateTitle).toBeVisible();
    await expect(this.emptyStateBody).toBeVisible();
    await expect(this.addFirstProductBtn).toBeVisible();
    await expect(this.productRows).toHaveCount(0);
  }

  async verifyProductListOrEmptyState() {
    const apiCount = sessionDataStorage.get("product_APIcount") ?? 0;
    if (apiCount === 0) {
      await this.verifyEmptyCatalogState();
      return;
    }
    await this.productRowsDisplay();
  }

  async productRowsDisplay() {
    await expect(this.productRows.first()).toBeVisible({ timeout: 15_000 });
    const rowCount = await this.productRows.count();
    expect(rowCount).toBeGreaterThan(0);
    await expect(this.showActionsBtns.first()).toBeVisible();
  }

  async verifyProductsPageUIElements() {
    await this.productsHeadingDisplay();
    await this.loadedCountDisplay();
    await this.searchBarDisplay();
    await this.addProductBtnDisplay();
    await this.filtersDisplay();
    await this.onlineOrderingDisplay();
    await this.sortBtnDisplay();
    await this.columnHeadersDisplay();
    await this.verifyProductListOrEmptyState();
  }
}

module.exports = { Products };
