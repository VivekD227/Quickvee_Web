const { expect } = require("@playwright/test");
const path = require("path");
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
const LIST_CHROME_LABELS =
  /^(Open list|Close list|Load more|Add photos|Generate|Generate new|Keep current code|Back|Save product|Save changes|Discard changes|More actions|Duplicate Product|Duplicate|B|I|U|Bullet list|Numbered list|Add link|Add vendor|Remove tax|Remove photo)$/i;
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
const PRODUCT_COVER_PHOTO = path.join(
  __dirname,
  "..",
  "testData",
  "product-cover.png",
);
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
const EDIT_SINGLE_HEADER_BUTTONS = ["Back", "Discard changes", "Save changes"];

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
    this.noPhotoFilter = page.getByRole("button", {
      name: /no photo/i,
    });
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
    this.variantsMenuLink = page.getByRole("link", {
      name: "Variants",
      exact: true,
    });

    this.formHead = page.locator("[data-npf-formhead]");
    this.formBody = page.locator("[data-npf-body]");
    this.backBtn = page.getByRole("button", { name: "Back", exact: true });
    this.newProductTitle = page.getByText("New product", { exact: true });
    this.duplicateProductTitle = page.getByText("Duplicate product", {
      exact: true,
    });
    this.singleProductBadge = page.getByText("Single product", { exact: true });
    this.saveProductBtn = page.getByRole("button", {
      name: "Save product",
      exact: true,
    });
    this.duplicateSaveBtn = this.formHead.getByRole("button", {
      name: "Duplicate",
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
    this.discardAndLeaveBtn = page.getByRole("button", {
      name: "Discard & leave",
      exact: true,
    });
    this.keepEditingBtn = page.getByRole("button", {
      name: "Keep editing",
      exact: true,
    });
    this.discardChangesDialogTitle = page.getByText("Discard changes?", {
      exact: true,
    });
    this.moreActionsBtn = page.getByRole("button", {
      name: "More actions",
      exact: true,
    });
    this.duplicateProductAction = page
      .getByRole("menuitem", { name: /Duplicate Product/i })
      .or(page.getByRole("link", { name: /Duplicate Product/i }))
      .or(page.getByRole("button", { name: /Duplicate Product/i }));

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
    this.photoFileInput = this.formBody.locator('input[type="file"]');
    this.removePhotoBtn = this.formBody.getByRole("button", {
      name: "Remove photo",
    });
    this.newPhotoBadge = this.formBody.getByText("NEW", { exact: true });

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
    this.generateUpcBtn = page
      .getByRole("button", { name: "Generate a unique 12-digit UPC" })
      .or(page.getByRole("button", { name: "Generate", exact: true }));
    this.generateNewUpcBtn = page.getByRole("button", {
      name: "Generate new",
      exact: true,
    });
    this.keepCurrentUpcBtn = page.getByRole("button", {
      name: "Keep current code",
    });
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
    this.availableToSellLockedHelper = page.getByText(
      /Locked — adjust via Stocktake or receiving/i,
    );
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
    this.selectAllStoresBtn = page.getByRole("button", {
      name: "Select all",
      exact: true,
    });
    this.deselectAllStoresBtn = page.getByRole("button", {
      name: "Deselect all",
      exact: true,
    });

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
    this.vendorSearchInput = this.formBody.getByPlaceholder(
      /search vendors|choose a vendor|add a vendor/i,
    );
    this.addVendorBtn = this.formBody.getByRole("button", {
      name: /add vendor|assign vendor/i,
    });

    this.taxInfoHeading = page.getByRole("heading", {
      name: "Tax Information",
    });
    this.taxInfoHelper = page.getByText(/Extra taxes applied to this product/i);
    this.addAnotherTaxBtn = page.getByRole("button", {
      name: /Add another tax/i,
    });
    this.removeTaxBtn = this.formBody.getByRole("button", {
      name: /Remove tax/i,
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
    this.duplicateNameError = page.getByText(
      /title already exist|product name already exist|name already exist/i,
    );
    this.duplicateUpcError = page.getByText(
      /upc already exist|this upc is already|barcode already exist|this barcode is already used/i,
    );
    this.sameUpcCustomCodeError = page.getByText(
      /used as both UPC and Custom Code|they must be different|already used on this product|this barcode is already used|scan code already|duplicate (scan )?code|already used by another product/i,
    );
    this.duplicateCustomCodeError = page.getByText(
      /custom code already|this custom code is already|scan code already|already used by another product|this barcode is already used/i,
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

  isTaxListResponse(res) {
    return (
      res.request().method() === "POST" &&
      res.url().includes(routes.API_URL.taxList_URL)
    );
  }

  taxNameFromApiItem(item) {
    if (typeof item === "string") return item.trim();
    return String(
      item?.title ?? item?.tax_name ?? item?.name ?? item?.taxName ?? "",
    ).trim();
  }

  categoryNameFromApiItem(item) {
    if (typeof item === "string") return item.trim();
    if (!item || typeof item !== "object") return "";
    const direct =
      item.title ??
      item.name ??
      item.cat_name ??
      item.category_name ??
      item.category ??
      item.label ??
      item.catName ??
      item.Name ??
      item.Title;
    if (direct) return String(direct).trim();
    const skip = /id|count|merchant|is_|status|token|uuid|date|url|image/i;
    for (const [key, val] of Object.entries(item)) {
      if (
        typeof val === "string" &&
        val.trim() &&
        val.length < 80 &&
        !skip.test(key)
      ) {
        return val.trim();
      }
    }
    return "";
  }

  isDefaultTaxName(name) {
    return String(name).replace(/\s+/g, "").toLowerCase() === "defaulttax";
  }

  assertHttp200(response, apiName = "API") {
    expect(response, `${apiName} response should be received`).toBeTruthy();
    expect(response.status(), `${apiName} should return HTTP 200`).toBe(200);
  }

  async assertHttp200IfReceived(responsePromise, apiName = "API") {
    const response = await responsePromise.catch(() => null);
    if (response) this.assertHttp200(response, apiName);
    return response;
  }

  async assertTaxListApi(response) {
    this.assertHttp200(response, "tax_list");
    const taxBody = await response.json();
    expect(taxBody.status, "tax_list API should succeed").toBeTruthy();
    expect(
      Array.isArray(taxBody.result),
      "tax_list result should be an array",
    ).toBeTruthy();
    expect(
      taxBody.result.length,
      "tax_list should not be empty",
    ).toBeGreaterThan(0);
    const storeTaxes = taxBody.result
      .map((item) => this.taxNameFromApiItem(item))
      .filter(Boolean);
    sessionDataStorage.set("storeTaxes", storeTaxes);
    sessionDataStorage.set("tax_APIcount", taxBody.result.length);
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

  async expectCoverPhotoOnForm() {
    await expect(
      this.removePhotoBtn.first(),
      "Uploaded photo should show a Remove photo control",
    ).toBeVisible({ timeout: 15_000 });
  }

  async confirmPhotoCropIfShown() {
    const cropConfirm = this.page.getByRole("button", {
      name: /^(Apply|Done|Crop|Use (this )?photo)$/i,
    });
    const shown = await cropConfirm
      .first()
      .waitFor({ state: "visible", timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    if (!shown) return;
    await cropConfirm.first().click();
    await expect(cropConfirm.first()).toBeHidden({ timeout: 10_000 });
  }

  async addCoverPhoto(
    filePath = PRODUCT_COVER_PHOTO,
    { expectNewBadge = true } = {},
  ) {
    if ((await this.photoFileInput.count()) > 0) {
      await this.photoFileInput.first().setInputFiles(filePath);
    } else {
      const [chooser] = await Promise.all([
        this.page.waitForEvent("filechooser", { timeout: 10_000 }),
        this.addPhotosBtn.click(),
      ]);
      await chooser.setFiles(filePath);
    }

    await this.confirmPhotoCropIfShown();
    await this.expectCoverPhotoOnForm();
    if (expectNewBadge) {
      await expect(this.newPhotoBadge.first()).toBeVisible();
    }
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

  getStoreCount() {
    return Number(sessionDataStorage.get("storeCount") ?? 0);
  }

  setStoreCount(count) {
    sessionDataStorage.set("storeCount", Number(count) || 0);
  }

  getCopyToStoresPanel() {
    return this.copyToStoresHeading.locator(
      "xpath=ancestor::*[.//*[starts-with(normalize-space(), 'VIV')]][1]",
    );
  }

  copyToStoreIds() {
    return this.getCopyToStoresPanel().getByText(/^VIV[A-Z0-9]+$/);
  }

  async verifyCopyToStoresSection() {
    const storeCount = this.getStoreCount();
    if (storeCount > 1) {
      const otherStoreCount = storeCount - 1;
      await expect(this.copyToStoresHeading).toBeVisible();
      await expect(this.copyToStoresHelper).toBeVisible();
      await expect(this.selectAllStoresBtn).toBeVisible();
      await expect(this.deselectAllStoresBtn).toHaveCount(0);
      await expect(
        this.copyToStoreIds(),
        `Copy to stores should list ${otherStoreCount} other store(s) when store.length is ${storeCount}`,
      ).toHaveCount(otherStoreCount);
      return;
    }
    await expect(this.copyToStoresHeading).toBeHidden();
    await expect(this.copyToStoresHelper).toBeHidden();
    await expect(this.selectAllStoresBtn).toHaveCount(0);
    await expect(this.deselectAllStoresBtn).toHaveCount(0);
  }

  async selectAllCopyToStores() {
    const storeCount = this.getStoreCount();
    expect(storeCount, "Select all needs more than one store").toBeGreaterThan(
      1,
    );
    const otherStoreCount = storeCount - 1;
    await this.selectAllStoresBtn.click();
    await expect(this.deselectAllStoresBtn).toBeVisible();
    await expect(this.selectAllStoresBtn).toHaveCount(0);
    await expect(
      this.copyToStoreIds(),
      "All other linked stores should stay listed after Select all",
    ).toHaveCount(otherStoreCount);
  }

  async addProductWithCopyToStoresIfMultiStore(product) {
    await this.verifyAddSingleProductUrl();
    await this.verifyCopyToStoresSection();
    if (this.getStoreCount() <= 1) return false;

    await this.selectAllCopyToStores();
    const {
      name,
      category = "Quickadd",
      cost = "10.00",
      price = "20.00",
    } = product;
    await this.fillProductName(name);
    await this.selectCategory(category);
    const upc = await this.generateUpc();
    product.upc = upc;
    await this.fillCost(cost);
    await this.fillPrice(price);

    const addPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.addProduct),
      { timeout: 20_000 },
    );
    await this.saveProductClick();
    const addResponse = await addPromise;
    this.assertHttp200(addResponse, "add_product");

    await expect(this.page).not.toHaveURL(/\/new-products\/add/, {
      timeout: 15_000,
    });
    await this.searchListing(name);
    await expect(
      this.getProductRow(name),
      `Product "${name}" should appear in the listing after copy-to-stores save`,
    ).toBeVisible({ timeout: 15_000 });
    return true;
  }

  async expectToggleChecked(locator, shouldBeChecked) {
    const checkMark = locator.locator('svg path[d="M5 12l4 4 10-10"]');
    if (shouldBeChecked) {
      await expect(checkMark).toHaveCount(1);
    } else {
      await expect(checkMark).toHaveCount(0);
    }
  }

  async setToggle(locator, shouldBeChecked) {
    const checkMark = locator.locator('svg path[d="M5 12l4 4 10-10"]');
    const isChecked = (await checkMark.count()) === 1;
    if (isChecked !== shouldBeChecked) {
      await locator.click();
    }
    await this.expectToggleChecked(locator, shouldBeChecked);
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

  async fillProductName(name, { assertAvailable = true } = {}) {
    const [titleCheckResponse] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.checkProductTitle),
        { timeout: 15_000 },
      ),
      this.productNameInput.fill(String(name)),
    ]);
    this.assertHttp200(titleCheckResponse, "check_productTitle");
    const titleBody = await titleCheckResponse.json();
    if (assertAvailable) {
      expect(
        titleBody.status,
        "check_productTitle API should succeed when a title is entered",
      ).toBeTruthy();
      expect(titleBody.message).toBe("Success");
    }
    return titleBody;
  }

  async fillPrice(value) {
    await expect(this.priceInput).toBeEnabled({ timeout: 15_000 });
    await this.priceInput.fill(String(value));
  }

  async fillCost(value) {
    await expect(this.costInput).toBeEnabled({ timeout: 15_000 });
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
    this.assertHttp200(addResponse, "add_product");

    await expect(this.page).not.toHaveURL(/\/new-products\/add/, {
      timeout: 15_000,
    });
    await this.searchListing(name);
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

  async addProductWithSpecialNameAndUpc(product) {
    const {
      name,
      upc,
      category = "Quickadd",
      cost = "10.00",
      price = "20.00",
    } = product;
    expect(upc, "Special UPC is required").toBeTruthy();
    await this.verifyAddSingleProductUrl();
    await this.fillProductName(name);
    await expect(
      this.productNameInput,
      "Product name should keep accepted special characters",
    ).toHaveValue(name);
    await this.selectCategory(category);

    const upcCheckPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.checkUpc),
      { timeout: 15_000 },
    );
    await this.fillUpc(upc);
    await this.upcInput.blur();
    await expect(
      this.upcInput,
      "UPC should keep accepted special characters",
    ).toHaveValue(upc);
    await this.assertHttp200IfReceived(upcCheckPromise, "check_upc");

    await this.fillCost(cost);
    await this.fillPrice(price);

    const addPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.addProduct),
      { timeout: 20_000 },
    );
    await this.saveProductClick();
    const addResponse = await addPromise;
    this.assertHttp200(addResponse, "add_product");

    await expect(this.page).not.toHaveURL(/\/new-products\/add/, {
      timeout: 15_000,
    });
    await this.searchListing(name);
    await expect(
      this.getProductRow(name),
      `Product "${name}" should appear in the listing after save`,
    ).toBeVisible({ timeout: 15_000 });
  }

  async addProductWithCoverPhoto(product) {
    const {
      name,
      category = "Quickadd",
      cost = "10.00",
      price = "20.00",
    } = product;
    await this.verifyAddSingleProductUrl();
    await this.fillProductName(name);
    await this.selectCategory(category);
    await this.addCoverPhoto();
    product.hasPhoto = true;
    const upc = await this.generateUpc();
    product.upc = upc;
    await this.fillCost(cost);
    await this.fillPrice(price);

    const addPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.addProduct),
      { timeout: 20_000 },
    );
    await this.saveProductClick();
    const addResponse = await addPromise;
    this.assertHttp200(addResponse, "add_product");

    await expect(this.page).not.toHaveURL(/\/new-products\/add/, {
      timeout: 15_000,
    });
    await this.searchListing(name);
    await expect(
      this.getProductRow(name),
      `Product "${name}" should appear in the listing after save`,
    ).toBeVisible({ timeout: 15_000 });
  }

  async readUpcFromFrontend() {
    await expect
      .poll(
        async () => {
          const fromInput = (
            await this.upcInput.inputValue().catch(() => "")
          ).trim();
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
    await expect(this.page.getByText(new RegExp(`·\\s*${name}`))).toBeVisible();
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
    this.assertHttp200(addResponse, "add_product");

    await expect(this.missingUpcPrompt).toBeHidden({ timeout: 10_000 });
    await expect(this.page).not.toHaveURL(/\/new-products\/add/, {
      timeout: 15_000,
    });
    await this.searchListing(name);
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

  async pickFirstOpenListOption(section) {
    const noOptions = this.page.getByText(/^No options$/i);
    const option = section
      ? this.listOptionButtons(section).first()
      : this.page.getByRole("option").filter({ hasText: /\S/ }).first();
    await expect(option.or(noOptions.first())).toBeVisible({ timeout: 10_000 });
    if (await noOptions.first().isVisible()) {
      await this.closeOpenList();
      return "";
    }
    const label = (await option.innerText()).replace(/\s+/g, " ").trim();
    await option.click();
    return label;
  }

  listOptionButtons(section) {
    return section.getByRole("button").filter({ hasText: /\S/ }).filter({
      hasNotText: LIST_CHROME_LABELS,
    });
  }

  getBrandSection() {
    return this.brandLabel.locator("xpath=..");
  }

  getTagsSection() {
    return this.tagsLabel.locator("xpath=..");
  }

  getCategoriesSection() {
    return this.categoriesLabel.locator("xpath=..");
  }

  selectedBrandChip(name) {
    return this.getBrandSection().getByText(name, { exact: true });
  }

  selectedTagChip(name) {
    return this.getTagsSection().getByText(name, { exact: true });
  }

  async readAssignedChip(section) {
    const removeBtn = section.getByRole("button").filter({
      hasNotText: /^(Open list|Close list)$/i,
    });
    if ((await removeBtn.count()) === 0) return "";
    const label = (
      await removeBtn.first().locator("xpath=preceding-sibling::*[1]").innerText()
    )
      .replace(/\s+/g, " ")
      .trim();
    return label && !LIST_CHROME_LABELS.test(label) ? label : "";
  }

  async openComboboxList(section, fallbackInput) {
    await this.closeOpenList();
    const openList = section.getByRole("button", { name: "Open list" });
    if (await openList.isVisible()) {
      await openList.click();
    } else {
      await fallbackInput.click();
    }
    await expect(
      section.getByRole("button", { name: "Close list" }),
    ).toBeVisible({ timeout: 10_000 });
  }

  async openBrandList() {
    await this.openComboboxList(this.getBrandSection(), this.brandInput);
  }

  async openTagList() {
    await this.openComboboxList(this.getTagsSection(), this.tagsInput);
  }

  async selectFirstBrand() {
    const existing = await this.readAssignedChip(this.getBrandSection());
    if (existing) return existing;
    await this.openBrandList();
    const label = await this.pickFirstOpenListOption(this.getBrandSection());
    await this.closeOpenList();
    if (!label) return "";
    await expect(this.selectedBrandChip(label)).toBeVisible({ timeout: 8_000 });
    return label;
  }

  async pickBrandOptionNotNamed(excluded) {
    await this.openBrandList();
    return this.pickOpenListOptionNotNamed(excluded, this.getBrandSection());
  }

  async verifyOnlyOneBrandCanBeAssigned() {
    await this.verifyAddSingleProductUrl();
    await expect(this.brandHelper).toBeVisible();
    await expect(this.brandInput).toBeVisible();
    await expect(this.brandInput).toHaveValue("");

    const first = await this.selectFirstBrand();
    expect(
      first,
      "Store should have at least one brand to assign",
    ).toBeTruthy();
    await this.closeOpenList();
    await expect(this.selectedBrandChip(first)).toBeVisible({
      timeout: 10_000,
    });

    const canAssignAnother = await this.brandInput.isVisible();
    if (!canAssignAnother) {
      await expect(
        this.brandInput,
        "Brand field should not allow adding a second brand while one is assigned",
      ).toBeHidden();
      await expect(this.selectedBrandChip(first)).toBeVisible();
      await expect(this.brandHelper).toBeVisible();
      return;
    }

    const second = await this.pickBrandOptionNotNamed(first);
    await this.closeOpenList();

    if (!second) {
      await expect(this.selectedBrandChip(first)).toBeVisible();
      await expect(this.brandHelper).toBeVisible();
      return;
    }

    await expect(this.selectedBrandChip(second)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      this.selectedBrandChip(first),
      "A product can have only one brand; selecting another should replace the first",
    ).toHaveCount(0);
    await expect(this.brandHelper).toBeVisible();
  }

  async selectFirstTag() {
    const existing = await this.readAssignedChip(this.getTagsSection());
    if (existing) return existing;
    await this.openTagList();
    const label = await this.pickFirstOpenListOption(this.getTagsSection());
    await this.closeOpenList();
    if (!label) return "";
    await expect(this.selectedTagChip(label)).toBeVisible({ timeout: 8_000 });
    return label;
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

  async fillDescriptionWithRichText(text) {
    const editor = this.descriptionEditor.first();
    if (await editor.count()) {
      await editor.click();
    } else {
      await this.descriptionPlaceholder.click();
    }
    await this.page.keyboard.type(String(text));
    await this.page.keyboard.press("Control+A");
    await this.descriptionBoldBtn.click();
    await this.descriptionItalicBtn.click();
    await this.descriptionUnderlineBtn.click();
    const formatted = this.descriptionEditor.first();
    await expect(formatted.locator("b, strong").first()).toBeVisible();
    await expect(formatted.locator("i, em").first()).toBeVisible();
    await expect(formatted.locator("u").first()).toBeVisible();
  }

  async pickOpenListOptionNotNamed(excluded, section) {
    const excludedSet = new Set(
      (Array.isArray(excluded) ? excluded : [excluded]).filter(Boolean),
    );
    const isRealOption = (label) =>
      Boolean(label) &&
      !excludedSet.has(label) &&
      !LIST_CHROME_LABELS.test(label);

    const options = section
      ? this.listOptionButtons(section)
      : this.page.getByRole("option").filter({ hasText: /\S/ });
    await expect(options.first()).toBeVisible({ timeout: 10_000 });
    const count = await options.count();
    for (let i = 0; i < Math.min(count, 25); i++) {
      const option = options.nth(i);
      if (!(await option.isEnabled().catch(() => false))) continue;
      const label = (await option.innerText()).replace(/\s+/g, " ").trim();
      if (isRealOption(label)) {
        await option.click();
        return label;
      }
    }
    return "";
  }

  selectedCategoryChip(name) {
    return this.getCategoriesSection()
      .getByText(name, { exact: true })
      .locator(
        "xpath=self::*[not(self::input or ancestor::button or ancestor::*[@role='button'])]",
      );
  }

  async closeOpenList() {
    const closeList = this.page.getByRole("button", { name: "Close list" });
    for (let i = 0; i < 3; i++) {
      if (!(await closeList.first().isVisible())) break;
      await closeList.first().click();
    }
    await expect(closeList).toHaveCount(0);
  }

  async getFormCategoryNames() {
    const stored = sessionDataStorage.get("formCategoryNames");
    if (Array.isArray(stored) && stored.length) return stored;

    const listPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.formCategoryList_URL),
      { timeout: 15_000 },
    );
    await this.categoriesInput.click();
    const listResponse = await this.assertHttp200IfReceived(
      listPromise,
      "category_list",
    );
    await this.closeOpenList();
    if (!listResponse) return [];
    const body = await listResponse.json();
    const names = (Array.isArray(body?.result) ? body.result : [])
      .map((item) => this.categoryNameFromApiItem(item))
      .filter(Boolean);
    sessionDataStorage.set("formCategoryNames", names);
    return names;
  }

  async selectMultipleCategories(product) {
    const first = product.category || "Quickadd";
    await this.selectCategory(first);
    const names = await this.getFormCategoryNames();
    const second = names.find((name) => name !== first) || "";
    expect(
      second,
      "Store should have at least two categories to assign",
    ).toBeTruthy();
    await this.selectCategory(second);
    await this.closeOpenList();
    product.categories = [first, second];
    await expect(this.selectedCategoryChip(first)).toBeVisible();
    await expect(this.selectedCategoryChip(second)).toBeVisible();
  }

  async selectProductTaxes(product) {
    await expect(this.defaultTaxName).toBeVisible();
    const taxes = ["DefaultTax"];
    const taxCount = Number(sessionDataStorage.get("tax_APIcount") ?? 0);
    const storeTaxes = sessionDataStorage.get("storeTaxes") ?? [];

    if (taxCount <= 1) {
      product.taxes = taxes;
      return;
    }

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

    const extraTax = storeTaxes.find((name) => !this.isDefaultTaxName(name));
    if (extraTax) {
      await chooseTax.fill(extraTax);
    } else {
      await chooseTax.click();
    }

    const taxSection = chooseTax.locator("xpath=../..");
    const label = await this.pickFirstOpenListOption(taxSection);
    if (!label) {
      product.taxes = taxes;
      return;
    }
    const taxName = label.replace(/\s*[\d.]+%\s*$/, "").trim();
    if (
      taxName &&
      !taxes.includes(taxName) &&
      !this.isDefaultTaxName(taxName)
    ) {
      taxes.push(taxName);
      await expect(
        this.formBody.getByText(taxName, { exact: true }).first(),
      ).toBeVisible();
    }
    product.taxes = taxes;
  }

  async removeAllProductTaxes() {
    await expect(this.taxInfoHeading).toBeVisible();
    for (let i = 0; i < 10; i++) {
      if ((await this.removeTaxBtn.count()) === 0) break;
      await this.removeTaxBtn.first().click();
    }
    await expect(this.removeTaxBtn).toHaveCount(0);
    await expect(this.defaultTaxName).toHaveCount(0);
    await expect(this.addAnotherTaxBtn).toBeVisible();
  }

  async addProductWithoutTax(product) {
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
    await this.removeAllProductTaxes();
    product.taxes = [];

    const addPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.addProduct),
      { timeout: 20_000 },
    );
    await this.saveProductClick();
    const addResponse = await addPromise;
    this.assertHttp200(addResponse, "add_product");

    await expect(this.page).not.toHaveURL(/\/new-products\/add/, {
      timeout: 15_000,
    });
    await this.searchListing(name);
    await expect(
      this.getProductRow(name),
      `Product "${name}" should appear in the listing after save without tax`,
    ).toBeVisible({ timeout: 15_000 });
  }

  async verifyProductHasNoTaxOnEdit(product) {
    await this.openEditSingleProduct(product.name);
    await this.verifyEditSingleProductUrl();
    await expect(this.taxInfoHeading).toBeVisible();
    await expect(this.removeTaxBtn).toHaveCount(0);
    await expect(this.defaultTaxName).toHaveCount(0);
    await expect(this.addAnotherTaxBtn).toBeVisible();
    await this.returnToProductsList();
  }

  async selectFirstRelatedProduct() {
    const section = this.relatedProductsSearch.locator("xpath=../..");
    const existing = await this.readAssignedChip(section);
    if (existing) return existing;
    await this.relatedProductsSearch.click();
    const closeList = this.page.getByRole("button", { name: "Close list" });
    const opened = await closeList
      .first()
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (!opened) return "";
    const hasOption = await this.listOptionButtons(section)
      .first()
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (!hasOption) {
      await this.closeOpenList();
      return "";
    }
    const label = await this.pickFirstOpenListOption(section);
    await this.closeOpenList();
    if (!label) return "";
    const assigned = await section
      .getByText(label, { exact: true })
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    return assigned ? label : "";
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
    product.foodStampable = true;
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
    this.assertHttp200(addResponse, "add_product");

    await expect(this.page).not.toHaveURL(/\/new-products\/add/, {
      timeout: 15_000,
    });
    await this.searchListing(name);
    await expect(
      this.productRows.filter({ hasText: name }).first(),
      `Product "${name}" should appear in the listing after save`,
    ).toBeVisible({ timeout: 15_000 });
    sessionDataStorage.set("createdFullProduct", { ...product });
  }

  async fillUniqueCustomCodes(count = 10) {
    const stamp = Date.now().toString().slice(-8);
    const codes = Array.from(
      { length: count },
      (_, i) => `C${stamp}${String(i + 1).padStart(2, "0")}`,
    );
    expect(new Set(codes).size, "Custom codes must be unique").toBe(count);

    for (let i = 0; i < codes.length; i++) {
      if (i > 0) {
        await this.addAnotherCodeBtn.click();
      }
      const input = this.customCodeInput.nth(i);
      await expect(input).toBeVisible({ timeout: 10_000 });
      await input.fill(codes[i]);
      await expect(input).toHaveValue(codes[i]);
    }
    await expect(this.customCodeInput).toHaveCount(count);
    return codes;
  }

  async addSingleProductWithTenCustomCodes(product) {
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
    product.customCodes = await this.fillUniqueCustomCodes(10);
    expect(product.customCodes).toHaveLength(10);

    const addPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.addProduct),
      { timeout: 20_000 },
    );
    await this.saveProductClick();
    const addResponse = await addPromise;
    this.assertHttp200(addResponse, "add_product");

    await expect(this.page).not.toHaveURL(/\/new-products\/add/, {
      timeout: 15_000,
    });
    await this.searchListing(name);
    await expect(
      this.getProductRow(name),
      `Product "${name}" should appear in the listing after save`,
    ).toBeVisible({ timeout: 15_000 });
  }

  async verifyProductSearchableByEachCustomCode({ name, customCodes }) {
    expect(Array.isArray(customCodes), "customCodes should be an array").toBe(
      true,
    );
    expect(
      customCodes.length,
      "Need at least 10 custom codes",
    ).toBeGreaterThanOrEqual(10);

    for (const code of customCodes) {
      await this.searchListing(String(code));
      await expect(
        this.getProductRow(name),
        `Search by custom code "${code}" should find product "${name}"`,
      ).toBeVisible({ timeout: 15_000 });
      await this.waitForCatalogIdle();
    }
    await this.searchListing("");
  }

  async addInactiveProductWithCostGreaterThanPrice(product) {
    const {
      name,
      category = "Quickadd",
      cost = "20.00",
      price = "10.00",
    } = product;
    expect(
      Number(cost),
      "Cost must be greater than Price for negative margin/profit",
    ).toBeGreaterThan(Number(price));
    await this.verifyAddSingleProductUrl();
    await this.fillProductName(name);
    await this.selectCategory(category);
    const upc = await this.generateUpc();
    product.upc = upc;
    await this.fillCost(cost);
    await this.fillPrice(price);

    const expectedProfit = this.expectedProfit(price, cost);
    const expectedMargin = this.expectedMargin(price, cost);
    expect(
      expectedProfit,
      "Profit should be negative when cost > price",
    ).toBeLessThan(0);
    expect(
      expectedMargin,
      "Margin should be negative when cost > price",
    ).toBeLessThan(0);
    await this.verifyMarginAndProfitComputed(cost, price);

    await this.expectToggleChecked(this.activeOption, true);
    await this.activeOption.click();
    await this.expectToggleChecked(this.activeOption, false);

    const addPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.addProduct),
      { timeout: 20_000 },
    );
    await this.saveProductClick();
    const addResponse = await addPromise;
    this.assertHttp200(addResponse, "add_product");

    await expect(this.page).not.toHaveURL(/\/new-products\/add/, {
      timeout: 15_000,
    });
    await this.searchListing(name);
    await expect(
      this.getProductRow(name),
      `Product "${name}" should appear in the listing after save`,
    ).toBeVisible({ timeout: 15_000 });
  }

  async verifyInactiveProductInListing({ name }) {
    const row = await this.searchCreatedProduct(name);
    await expect(row.locator("[data-prod-title]")).toHaveText(name);
    await expect(
      row.getByText(/Inactive/i),
      `Product "${name}" should show Inactive on the listing when Active is unchecked`,
    ).toBeVisible();
  }

  async verifyInactiveProductViewDetails({
    name,
    cost = "20.00",
    price = "10.00",
  }) {
    await this.openRowActions(name);
    await this.viewDetailsAction.first().click();
    await expect(this.productDetailsHeading).toBeVisible({ timeout: 10_000 });
    await expect(this.page).toHaveURL(PRODUCTS_PAGE_URL);

    const details = this.getProductDetailsPanel();
    await expect(details.getByText(name, { exact: true })).toBeVisible();
    const disabledSelected = details
      .getByRole("radio", { name: /^Disabled$/i, checked: true })
      .or(details.getByRole("checkbox", { name: /^Disabled$/i, checked: true }))
      .or(details.getByRole("button", { name: /^Disabled$/i, pressed: true }))
      .or(details.getByText("Disabled", { exact: true }));
    await expect(
      disabledSelected.first(),
      "View details should show Disabled selected when Active is unchecked",
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      details.getByText(
        new RegExp(
          `${this.expectedMargin(price, cost).toFixed(2)}%\\s*margin`,
          "i",
        ),
      ),
    ).toBeVisible();

    await details.getByRole("button", { name: "Close" }).click();
    await expect(this.productDetailsHeading).toBeHidden({ timeout: 10_000 });
  }

  async addOutOfStockProductWithContinueSellingOff(product) {
    const {
      name,
      category = "Quickadd",
      cost = "10.00",
      price = "20.00",
      quantity = "0",
    } = product;
    await this.verifyAddSingleProductUrl();
    await this.fillProductName(name);
    await this.selectCategory(category);
    const upc = await this.generateUpc();
    product.upc = upc;
    await this.fillCost(cost);
    await this.fillPrice(price);
    await this.availableToSellInput.fill(String(quantity));
    await expect(this.availableToSellInput).toHaveValue(String(quantity));

    await this.expectToggleChecked(this.trackQuantityOption, true);
    await this.expectToggleChecked(this.continueSellingOption, true);
    await this.continueSellingOption.click();
    await this.expectToggleChecked(this.continueSellingOption, false);

    const addPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.addProduct),
      { timeout: 20_000 },
    );
    await this.saveProductClick();
    const addResponse = await addPromise;
    this.assertHttp200(addResponse, "add_product");

    await expect(this.page).not.toHaveURL(/\/new-products\/add/, {
      timeout: 15_000,
    });
    await this.searchListing(name);
    await expect(
      this.getProductRow(name),
      `Product "${name}" should appear in the listing after save`,
    ).toBeVisible({ timeout: 15_000 });
  }

  async verifyOutOfStockProductInListing({ name }) {
    const row = await this.searchCreatedProduct(name);
    await expect(row.locator("[data-prod-title]")).toHaveText(name);
    await expect(
      row.getByText(/Out of stock/i),
      `Product "${name}" should show Out of stock when quantity is 0 and Continue selling is off`,
    ).toBeVisible();
  }

  async addProductWithQuantity(product) {
    const {
      name,
      category = "Quickadd",
      cost = "10.00",
      price = "20.00",
      quantity = "10",
    } = product;
    await this.verifyAddSingleProductUrl();
    await this.fillProductName(name);
    await this.selectCategory(category);
    const upc = await this.generateUpc();
    product.upc = upc;
    await this.fillCost(cost);
    await this.fillPrice(price);
    await this.expectToggleChecked(this.trackQuantityOption, true);
    await this.availableToSellInput.fill(String(quantity));
    await expect(this.availableToSellInput).toHaveValue(String(quantity));

    const addPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.addProduct),
      { timeout: 20_000 },
    );
    await this.saveProductClick();
    const addResponse = await addPromise;
    this.assertHttp200(addResponse, "add_product");

    await expect(this.page).not.toHaveURL(/\/new-products\/add/, {
      timeout: 15_000,
    });
    await this.searchListing(name);
    await expect(
      this.getProductRow(name),
      `Product "${name}" should appear in the listing after save`,
    ).toBeVisible({ timeout: 15_000 });
  }

  async verifyInStockQuantityOnListing({ name, quantity = "10" }) {
    const row = await this.searchCreatedProduct(name);
    await expect(row.locator("[data-prod-title]")).toHaveText(name);
    await expect(
      row.getByText(`${quantity} in stock`, { exact: true }),
      `Product "${name}" should show ${quantity} in stock on the listing`,
    ).toBeVisible();
  }

  async addProductWithRichDescriptionAndMultipleCategories(product) {
    const {
      name,
      category = "Quickadd",
      cost = "10.00",
      price = "20.00",
      description = "Auto bold italic underline",
    } = product;
    await this.verifyAddSingleProductUrl();
    await this.fillProductName(name);
    await this.selectMultipleCategories(product);
    await this.fillDescriptionWithRichText(description);
    product.descriptionRichText = true;
    const upc = await this.generateUpc();
    product.upc = upc;
    await this.fillCost(cost);
    await this.fillPrice(price);

    const addPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.addProduct),
      { timeout: 20_000 },
    );
    await this.saveProductClick();
    const addResponse = await addPromise;
    this.assertHttp200(addResponse, "add_product");

    await expect(this.page).not.toHaveURL(/\/new-products\/add/, {
      timeout: 15_000,
    });
    await this.searchListing(name);
    await expect(
      this.getProductRow(name),
      `Product "${name}" should appear in the listing after save`,
    ).toBeVisible({ timeout: 15_000 });
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

  async searchListing(text) {
    const value = String(text);
    const current = await this.searchBar.inputValue();
    if (current === value) {
      await this.waitForCatalogIdle();
      return null;
    }
    const [listResponse] = await Promise.all([
      this.page.waitForResponse((res) => this.isProductListResponse(res), {
        timeout: 15_000,
      }),
      this.searchBar.fill(value),
    ]);
    expect(
      listResponse.status(),
      "Products_list (search) should return HTTP 200",
    ).toBe(200);
    return listResponse;
  }

  async searchCreatedProduct(name) {
    await this.returnToProductsList();
    await this.searchListing(name);
    await expect(this.getProductRow(name)).toBeVisible({ timeout: 15_000 });
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
    await expect(this.editProductAction.first()).toBeVisible({
      timeout: 2_000,
    });
    await expect(this.page.getByText("Open the full product form")).toBeVisible(
      {
        timeout: 2_000,
      },
    );
    await expect(this.viewDetailsAction.first()).toBeVisible({
      timeout: 2_000,
    });
    await expect(this.page.getByText("Quick look, no page change")).toBeVisible(
      {
        timeout: 2_000,
      },
    );
    await expect(this.salesHistoryAction.first()).toBeVisible({
      timeout: 2_000,
    });
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
    categories,
    price = "20.00",
    upc,
    quantity,
    hasPhoto = false,
    delivery = true,
    pickup = true,
  }) {
    const row = await this.searchCreatedProduct(name);
    await expect(row.locator("[data-prod-title]")).toHaveText(name);
    const cats =
      Array.isArray(categories) && categories.length ? categories : [category];
    for (const cat of cats) {
      await expect(row).toContainText(cat);
    }
    if (upc) {
      await expect(row).toContainText(upc);
    }
    if (hasPhoto) {
      await expect(
        row.locator("img").first(),
        `Product "${name}" should show a cover photo on the listing`,
      ).toBeVisible();
    }
    await expect(row.locator("[data-prod-price]")).toContainText(
      this.formatPrice(price),
    );
    await expect(
      row.getByLabel(delivery ? /Delivery on/i : /Delivery off/i),
    ).toBeVisible();
    await expect(
      row.getByLabel(pickup ? /Pickup on/i : /Pickup off/i),
    ).toBeVisible();
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
      "xpath=ancestor::*[.//*[normalize-space()='Category']][1]",
    );
  }

  async verifyCreatedProductViewDetails({
    name,
    category = "Quickadd",
    categories,
    cost = "10.00",
    price = "20.00",
    upc,
    description,
    customCode,
    quantity,
    reorderPoint,
    reorderQty,
    hasPhoto = false,
  }) {
    await this.waitForCatalogIdle();
    await expect(async () => {
      const categoryVisible = await this.page
        .getByText("Category", { exact: true })
        .isVisible()
        .catch(() => false);
      if (
        categoryVisible &&
        (await this.productDetailsHeading.isVisible().catch(() => false))
      ) {
        return;
      }
      if (
        !(await this.viewDetailsAction
          .first()
          .isVisible()
          .catch(() => false))
      ) {
        await this.openRowActions(name);
      }
      const productDataPromise = this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.getProductDataById),
        { timeout: 15_000 },
      );
      await this.viewDetailsAction.first().click();
      await this.assertHttp200IfReceived(
        productDataPromise,
        "get_productdata_ById",
      );
      await expect(this.productDetailsHeading).toBeVisible({ timeout: 8_000 });
      await expect(this.page.getByText("Category", { exact: true })).toBeVisible(
        { timeout: 8_000 },
      );
    }).toPass({ timeout: 25_000 });
    await expect(this.page).toHaveURL(PRODUCTS_PAGE_URL);

    const details = this.getProductDetailsPanel();
    await expect(details.getByText(name, { exact: true })).toBeVisible();
    await expect(details.getByText("Approved", { exact: true })).toBeVisible();
    if (hasPhoto) {
      await expect(details.getByText("No images")).toHaveCount(0);
      await expect(
        details.locator("img").first(),
        "View details should show the product photo",
      ).toBeVisible();
    } else {
      await expect(details.getByText("No images")).toBeVisible();
    }
    await expect(details.getByText("Category", { exact: true })).toBeVisible();
    const cats =
      Array.isArray(categories) && categories.length ? categories : [category];
    const categoryValue = details
      .getByText("Category", { exact: true })
      .locator("xpath=following-sibling::*[1]");
    for (const cat of cats) {
      await expect(categoryValue).toContainText(cat);
    }
    await expect(details.getByText("Type", { exact: true })).toBeVisible();
    await expect(
      details.getByText("Single product", { exact: true }),
    ).toBeVisible();
    await expect(details.getByText("Price", { exact: true })).toBeVisible();
    await expect(details.getByText(this.formatPrice(price))).toBeVisible();
    await expect(
      details.getByText("Cost / margin", { exact: true }),
    ).toBeVisible();
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
      await expect(
        details.getByText("Custom code", { exact: true }),
      ).toBeVisible();
      await expect(
        details.getByText(customCode, { exact: true }),
      ).toBeVisible();
    }
    if (reorderPoint && reorderQty) {
      await expect(
        details.getByText(`${reorderPoint} / ${reorderQty}`),
      ).toBeVisible();
    }
    if (description) {
      await expect(
        details.getByText("Description", { exact: true }),
      ).toBeVisible();
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
    categories,
    cost = "10.00",
    price = "20.00",
    upc,
    brand,
    tag,
    taxes,
    description,
    descriptionRichText,
    customCode,
    foodStampable = false,
    checkId = false,
    quantity,
    reorderPoint,
    reorderQty,
    compareAt,
    hasPhoto = false,
    delivery = true,
    pickup = true,
    relatedProduct,
    vendor,
  }) {
    if (
      !(await this.editProductAction
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      await this.openRowActions(name);
    }
    const productDataPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.getProductDataById),
      { timeout: 20_000 },
    );
    await this.editProductAction.first().click();
    const productDataResponse = await productDataPromise;
    this.assertHttp200(productDataResponse, "get_productdata_ById");
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
    const cats =
      Array.isArray(categories) && categories.length ? categories : [category];
    for (const cat of cats) {
      await expect(this.selectedCategoryChip(cat)).toBeVisible();
    }
    if (hasPhoto) {
      await this.expectCoverPhotoOnForm();
    } else {
      await expect(this.removePhotoBtn).toHaveCount(0);
    }
    if (brand) {
      await expect(this.selectedBrandChip(brand)).toBeVisible();
    }
    if (tag) {
      await expect(this.selectedTagChip(tag)).toBeVisible();
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
    if (descriptionRichText) {
      const editor = this.descriptionEditor.first();
      await expect(editor.locator("b, strong").first()).toBeVisible();
      await expect(editor.locator("i, em").first()).toBeVisible();
      await expect(editor.locator("u").first()).toBeVisible();
    }
    if (Array.isArray(taxes)) {
      const uniqueTaxes = [...new Set(taxes)];
      for (const tax of uniqueTaxes) {
        await expect(
          this.formBody.getByText(tax, { exact: true }).first(),
        ).toBeVisible();
      }
      if (uniqueTaxes.length > 1) {
        await expect(
          this.formBody.getByRole("button", { name: /Remove tax/i }),
        ).toHaveCount(uniqueTaxes.length);
      }
    }

    await expect(this.copyToStoresHeading).toBeHidden();
    await expect(this.vendorInfoHeading).toBeVisible();
    await expect(this.vendorAssignAfterCreate).toHaveCount(0);

    await expect(this.sellingChannelsHeading).toBeVisible();
    await expect(this.posChannelBtn).toBeVisible();
    await expect(this.deliveryChannelBtn).toBeVisible();
    await expect(this.pickupChannelBtn).toBeVisible();
    await this.expectToggleChecked(this.posChannelBtn, true);
    await this.expectToggleChecked(this.deliveryChannelBtn, Boolean(delivery));
    await this.expectToggleChecked(this.pickupChannelBtn, Boolean(pickup));
    await this.expectToggleChecked(this.activeOption, true);
    await this.expectToggleChecked(this.checkIdOption, Boolean(checkId));
    await this.expectToggleChecked(
      this.foodStampableOption,
      Boolean(foodStampable),
    );
    if (relatedProduct) {
      await expect(
        this.relatedProductsSearch
          .locator("xpath=../..")
          .getByText(relatedProduct, { exact: true }),
      ).toBeVisible();
    }
    if (vendor) {
      await expect(
        this.formBody.getByText(vendor, { exact: true }).first(),
      ).toBeVisible();
    }

    await this.returnToProductsList();
  }

  async fillUpc(value) {
    await this.upcInput.fill(String(value));
  }

  async generateUpc() {
    await expect(this.generateUpcBtn).toBeVisible();
    const previous = (await this.upcInput.inputValue()).trim();
    await this.generateUpcBtn.click();
    if (/^\d{12}$/.test(previous)) {
      await expect(this.generateNewUpcBtn).toBeVisible({ timeout: 5_000 });
      await this.generateNewUpcBtn.click();
      await expect(this.generateNewUpcBtn).toBeHidden();
    }
    await expect
      .poll(async () => (await this.upcInput.inputValue()).trim(), {
        timeout: 10_000,
        message: "Generate should populate a 12-digit UPC",
      })
      .toMatch(/^\d{12}$/);
    const upc = (await this.upcInput.inputValue()).trim();
    if (previous) {
      expect(upc, "Generated UPC should replace the current code").not.toBe(
        previous,
      );
    }
    return upc;
  }

  async selectCategory(categoryName) {
    const listPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.formCategoryList_URL),
      { timeout: 15_000 },
    );
    await this.categoriesInput.click();
    const categoryListResponse = await this.assertHttp200IfReceived(
      listPromise,
      "category_list",
    );
    if (categoryListResponse) {
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
      sessionDataStorage.set(
        "formCategoryNames",
        categoryBody.result
          .map((item) => this.categoryNameFromApiItem(item))
          .filter(Boolean),
      );
    }

    await this.categoriesInput.fill(categoryName);
    const option = this.page.getByRole("button", {
      name: categoryName,
      exact: true,
    });
    const optionVisible = await option
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (optionVisible) {
      await option.click();
    } else {
      await this.categoriesInput.press("Enter");
    }

    const chip = this.selectedCategoryChip(categoryName);
    const assigned = await chip
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (!assigned) {
      await this.categoriesInput.press("Enter");
      await expect(
        chip,
        `Category "${categoryName}" should be assigned as a chip`,
      ).toBeVisible({ timeout: 8_000 });
    }
    await expect(this.categoriesInput).toHaveValue("");
  }

  async saveProductClick() {
    if (/\/new-products\/duplicate\//.test(this.page.url())) {
      await this.duplicateSaveBtn.click();
      return;
    }
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

    const productListPromise = this.page.waitForResponse(
      (res) => this.isProductListResponse(res),
      { timeout: 25_000 },
    );
    await this.productsMenuLink.click();
    await this.confirmDiscardChangesIfAsked();
    if (/\/new-products\/(add|edit|duplicate)/.test(this.page.url())) {
      await this.productsMenuLink.click();
      await this.confirmDiscardChangesIfAsked();
    }
    const productListResponse = await productListPromise.catch(() => null);
    if (productListResponse) this.assertHttp200(productListResponse, "Products_list");
    await expect(this.page).not.toHaveURL(
      /\/new-products\/(add|edit|duplicate)/,
      { timeout: 15_000 },
    );
    await expect(this.productsHeading).toBeVisible({ timeout: 15_000 });
    await expect(this.searchBar).toBeVisible();
  }

  async reopenAddSingleProductForm({
    waitForTaxList = false,
    discardDraft = true,
  } = {}) {
    await this.returnToProductsList();
    const taxListPromise = waitForTaxList
      ? this.page.waitForResponse((res) => this.isTaxListResponse(res), {
          timeout: 20_000,
        })
      : null;
    await this.addProductBtnClick();
    await this.selectSingleProductType();
    await this.continueAddProductType();
    if (taxListPromise) {
      await this.assertTaxListApi(await taxListPromise);
    }
    await this.verifyAddSingleProductUrl();
    if (discardDraft) await this.discardRestoredDraft();
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

  async leaveAddFormWithoutSaving() {
    await this.page.keyboard.press("Escape");
    await this.variantsMenuLink.click();
    await expect(this.page).toHaveURL(/\/merchants\/inventory\/variants/, {
      timeout: 15_000,
    });
    await expect(this.page).not.toHaveURL(/\/add/);
  }

  async verifyUnsavedDraftRestoreAndStartFresh() {
    const name = `Auto Draft ${Date.now()}`;
    await this.verifyAddSingleProductUrl();
    await this.fillProductName(name);
    await this.selectCategory("Quickadd");
    await this.fillPrice("9.99");
    await expect(this.productNameInput).toHaveValue(name);
    await expect(this.priceInput).toHaveValue("9.99");

    await this.leaveAddFormWithoutSaving();
    await this.verifyProductNotCreatedInListing(name);

    await this.reopenAddSingleProductForm({ discardDraft: false });
    await expect(this.draftRestoredBanner).toBeVisible({ timeout: 10_000 });
    await expect(this.startFreshBtn).toBeVisible();
    await expect(this.productNameInput).toHaveValue(name);
    await expect(this.priceInput).toHaveValue("9.99");
    await expect(this.selectedCategoryChip("Quickadd")).toBeVisible();

    await this.discardRestoredDraft();
    await expect(this.productNameInput).toHaveValue("");
    await expect(this.selectedCategoryChip("Quickadd")).toHaveCount(0);

    await this.verifyProductNotCreatedInListing(name);
  }

  async verifyProductNotCreatedInListing(searchText) {
    await this.returnToProductsList();
    await this.searchListing(searchText);
    await expect(
      this.productRows.filter({ hasText: searchText }),
      `Product "${searchText}" should not be created in the listing after invalid save`,
    ).toHaveCount(0);
    await this.searchListing("");
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

  async assertInputStripsCharacters(
    input,
    fieldName,
    blocked,
    { prefix = "1", suffix = "2" } = {},
  ) {
    await expect(input).toBeVisible();
    const expected = `${prefix}${suffix}`;

    for (const ch of blocked) {
      await input.fill("");
      await input.fill(`${prefix}${ch}${suffix}`);
      expect(
        await input.inputValue(),
        `${fieldName} should strip ${JSON.stringify(ch)} after fill`,
      ).toBe(expected);

      await input.fill("");
      await input.click();
      await input.pressSequentially(`${prefix}${ch}${suffix}`);
      expect(
        await input.inputValue(),
        `${fieldName} should strip ${JSON.stringify(ch)} while typing`,
      ).toBe(expected);
    }

    await input.fill("");
    await input.fill(`${prefix}${blocked.join("")}${suffix}`);
    expect(
      await input.inputValue(),
      `${fieldName} should strip ${blocked
        .map((ch) => JSON.stringify(ch))
        .join(" ")} together`,
    ).toBe(expected);
  }

  async verifyProductNameRejectsSpecialCharacters() {
    await this.verifyAddSingleProductUrl();
    await this.assertInputStripsCharacters(
      this.productNameInput,
      "Product name",
      ["~", "-", "\\", ",", "/"],
      { prefix: "A", suffix: "B" },
    );
  }

  async verifyUpcRejectsSpecialCharacters() {
    await this.verifyAddSingleProductUrl();
    await this.assertInputStripsCharacters(this.upcInput, "UPC", [" "]);
  }

  async verifyCustomCodeRejectsSpecialCharacters() {
    await this.verifyAddSingleProductUrl();
    await this.assertInputStripsCharacters(
      this.customCodeInput.first(),
      "Custom code",
      [" ", "|"],
    );
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

  async verifyEditQuantityIsLocked() {
    const previous = await this.availableToSellInput.inputValue();
    await expect(
      this.availableToSellInput,
      "Edit Available to sell should stay locked after the product is created",
    ).toBeDisabled();
    await expect(this.availableToSellLockedHelper).toBeVisible();
    await expect(this.availableToSellInput).toHaveValue(previous);
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

  async expectAddProductRejected(errorLocator) {
    const addPromise = this.page
      .waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.addProduct),
        { timeout: 5_000 },
      )
      .catch(() => null);
    await this.saveProductClick();
    await expect(errorLocator).toBeVisible({ timeout: 10_000 });
    const addResponse = await addPromise;
    if (addResponse) this.assertHttp200(addResponse, "add_product");
    await this.verifyAddSingleProductUrl();
    await expect(this.newProductTitle).toBeVisible();
  }

  async verifySameUpcAndCustomCodeRejected() {
    const name = `Auto SameCode ${Date.now()}`;
    await this.verifyAddSingleProductUrl();
    await this.fillProductName(name);
    await this.selectCategory("Quickadd");
    await this.fillPrice("9.99");
    const sharedCode = await this.generateUpc();
    await this.customCodeInput.fill(sharedCode);
    await expect(this.upcInput).toHaveValue(sharedCode);
    await expect(this.customCodeInput).toHaveValue(sharedCode);
    await this.expectAddProductRejected(
      this.sameUpcCustomCodeError
        .or(this.duplicateUpcError)
        .or(this.page.getByRole("alert"))
        .first(),
    );
    await this.verifyProductNotCreatedInListing(name);
    await this.reopenAddSingleProductForm();
  }

  async verifyDuplicateProductNameRejected(existingName) {
    const upc = `8${Date.now().toString().slice(-11)}`;
    await this.verifyAddSingleProductUrl();
    await this.fillProductName(existingName, { assertAvailable: false });
    await this.selectCategory("Quickadd");
    await this.fillPrice("9.99");
    await this.fillUpc(upc);
    await this.expectAddProductRejected(
      this.duplicateNameError.or(this.page.getByRole("alert")).first(),
    );
    await this.verifyProductNotCreatedInListing(upc);
    await this.reopenAddSingleProductForm();
  }

  async verifyDuplicateUpcRejected(existingUpc) {
    const name = `Auto DupUpc ${Date.now()}`;
    await this.verifyAddSingleProductUrl();
    await this.fillProductName(name);
    await this.selectCategory("Quickadd");
    await this.fillPrice("9.99");
    const upcCheckPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.checkUpc),
      { timeout: 15_000 },
    );
    await this.fillUpc(existingUpc);
    await this.upcInput.blur();
    await this.assertHttp200IfReceived(upcCheckPromise, "check_upc");
    await this.expectAddProductRejected(
      this.duplicateUpcError.or(this.page.getByRole("alert")).first(),
    );
    await this.verifyProductNotCreatedInListing(name);
    await this.reopenAddSingleProductForm();
  }

  async verifyDuplicateCustomCodeRejected(existingCustomCode) {
    expect(
      existingCustomCode,
      "Need an existing product custom code to duplicate",
    ).toBeTruthy();
    const name = `Auto DupCustom ${Date.now()}`;
    const upc = `8${Date.now().toString().slice(-11)}`;
    await this.verifyAddSingleProductUrl();
    await this.fillProductName(name);
    await this.selectCategory("Quickadd");
    await this.fillPrice("9.99");
    await this.fillUpc(upc);
    await this.customCodeInput.first().fill(String(existingCustomCode));
    await this.expectAddProductRejected(
      this.duplicateCustomCodeError
        .or(this.sameUpcCustomCodeError)
        .or(this.page.getByRole("alert"))
        .first(),
    );
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

  async verifyEditSingleProductUrl() {
    await expect(this.page).toHaveURL(
      /\/merchants\/inventory\/new-products\/edit\/\d+/,
    );
  }

  async openEditSingleProduct(name) {
    const row = await this.searchCreatedProduct(name);
    const productDataPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.getProductDataById),
      { timeout: 20_000 },
    );
    await row.locator('a[href*="/new-products/edit/"]').first().click();
    await this.verifyEditSingleProductUrl();
    await this.assertHttp200IfReceived(
      productDataPromise,
      "get_productdata_ById",
    );
  }

  async verifyEditSingleProductHeader(name) {
    await expect(this.backBtn).toBeVisible();
    await expect(this.page.getByText(`Edit ${name}`)).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.singleProductBadge).toBeVisible();
    await expect(this.discardChangesBtn).toBeVisible();
    await expect(this.saveChangesBtn).toBeVisible();
    await expect(this.newProductTitle).toHaveCount(0);
    await expect(this.saveProductBtn).toHaveCount(0);
  }

  async verifyEditCannotChangeProductType() {
    await this.verifyEditSingleProductUrl();
    await expect(this.page).not.toHaveURL(/type=variants/);
    await expect(
      this.formHead.getByText("Single product", { exact: true }),
    ).toBeVisible();

    await expect(this.typeTitle).toHaveCount(0);
    await expect(this.typeCards).toHaveCount(0);
    await expect(this.singleProductCard).toHaveCount(0);
    await expect(this.variantsProductCard).toHaveCount(0);
    await expect(this.continueTypeDialogBtn).toHaveCount(0);
    await expect(
      this.formHead.getByRole("button", { name: /Product with variants/i }),
    ).toHaveCount(0);
    await expect(
      this.formHead.getByRole("link", { name: /Product with variants/i }),
    ).toHaveCount(0);
    await expect(
      this.formBody.getByRole("button", { name: /Product with variants/i }),
    ).toHaveCount(0);
    await expect(
      this.formBody.getByRole("link", { name: /Product with variants/i }),
    ).toHaveCount(0);

    await this.formHead.getByText("Single product", { exact: true }).click();
    await this.verifyEditSingleProductUrl();
    await expect(this.page).not.toHaveURL(/type=variants/);
    await expect(
      this.formHead.getByText("Single product", { exact: true }),
    ).toBeVisible();
    await expect(this.typeTitle).toHaveCount(0);
    await expect(this.variantsProductCard).toHaveCount(0);
  }

  async verifyEditDescriptionSection() {
    await expect(this.descriptionHeading).toBeVisible();
    await expect(this.onlineOnlyBadge).toBeVisible();
    await expect(this.descriptionHelper).toBeVisible();
    await expect(this.descriptionBoldBtn).toBeVisible();
    await expect(this.descriptionItalicBtn).toBeVisible();
    await expect(this.descriptionUnderlineBtn).toBeVisible();
    await expect(this.formBody.getByText(/\d+\s*\/\s*2,?000/)).toBeVisible();
  }

  async verifyEditSellingChannelsSection() {
    await expect(this.sellingChannelsHeading).toBeVisible();
    await expect(this.posChannelBtn).toBeVisible();
    await expect(this.deliveryChannelBtn).toBeVisible();
    await expect(this.pickupChannelBtn).toBeVisible();
    await expect(this.posChannelBtn).toBeDisabled();
    await expect(this.deliveryChannelBtn).toBeEnabled();
    await expect(this.pickupChannelBtn).toBeEnabled();
    await this.expectToggleChecked(this.posChannelBtn, true);
    await this.expectToggleChecked(this.deliveryChannelBtn, true);
    await this.expectToggleChecked(this.pickupChannelBtn, true);
  }

  async verifyEditVendorInformationSection() {
    await expect(this.vendorInfoHeading).toBeVisible();
    await expect(this.vendorInfoHelper).toBeVisible();
    await expect(this.vendorAssignAfterCreate).toHaveCount(0);
    const vendorField = this.vendorSearchInput
      .or(this.addVendorBtn)
      .or(
        this.vendorInfoHeading
          .locator("xpath=ancestor::*[.//input or .//button][1]")
          .getByRole("textbox"),
      );
    await expect(
      vendorField.first(),
      "Edit form should let you assign a vendor",
    ).toBeVisible({ timeout: 10_000 });
  }

  async verifyNoExtraEditSingleFormElements() {
    const actualHeadings = await this.collectVisibleTexts(
      this.formBody.getByRole("heading"),
    );
    this.assertExactList(
      actualHeadings,
      ADD_SINGLE_HEADINGS,
      "Edit single form headings",
    );

    const actualLabels = await this.collectVisibleTexts(
      this.formBody.locator("label"),
    );
    const missingLabels = ADD_SINGLE_LABELS.filter(
      (item) => !actualLabels.includes(item),
    );
    expect(
      missingLabels,
      `Edit single form labels missing: ${JSON.stringify(missingLabels)}`,
    ).toEqual([]);

    const actualHeaderButtons = await this.collectVisibleTexts(
      this.formHead.getByRole("button"),
    );
    const expectedHeaderButtons = actualHeaderButtons.includes("More actions")
      ? [...EDIT_SINGLE_HEADER_BUTTONS, "More actions"]
      : EDIT_SINGLE_HEADER_BUTTONS;
    this.assertExactList(
      actualHeaderButtons,
      expectedHeaderButtons,
      "Edit single form header buttons",
    );
  }

  async verifyEditSingleProductFormUI(product) {
    const { name } = product;
    await this.verifyEditSingleProductUrl();
    await this.verifyEditSingleProductHeader(name);
    await this.verifyProductInformationSection();
    await this.verifyPhotosSection();
    await this.verifyEditDescriptionSection();
    await this.verifyPricingInventorySection();
    await expect(this.copyToStoresHeading).toBeHidden();
    await this.verifyEditSellingChannelsSection();
    await this.verifyProductOptionsSection();
    await this.verifySkuCodesSection();
    await this.verifyEditVendorInformationSection();
    await this.verifyTaxInformationSection();
    await this.verifyRelatedProductsSection();
    await this.verifyNoExtraEditSingleFormElements();
    await this.returnToProductsList();
  }

  isProductWriteResponse(res) {
    const method = res.request().method();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      return false;
    }
    const url = res.url();
    return (
      url.includes(routes.API_URL.updateProduct) ||
      url.includes(routes.API_URL.addProduct) ||
      /add_product|update_product|edit_product|save_product|product_update|updateProduct/i.test(
        url,
      )
    );
  }

  async saveEditedProduct() {
    let saveResponse = null;
    const onResponse = (res) => {
      if (this.isProductWriteResponse(res)) saveResponse = res;
    };
    this.page.on("response", onResponse);
    try {
      await this.saveChangesBtn.click();
      await expect(
        this.page,
        "Save changes should leave the edit form",
      ).not.toHaveURL(/\/new-products\/edit\//, { timeout: 25_000 });
    } finally {
      this.page.off("response", onResponse);
    }
    if (saveResponse) this.assertHttp200(saveResponse, "update_product");
  }

  async addAnotherCategoryIfAvailable(product) {
    const assigned =
      Array.isArray(product.categories) && product.categories.length
        ? product.categories
        : [product.category || "Quickadd"];
    const section = this.getCategoriesSection();
    await this.openComboboxList(section, this.categoriesInput);
    const extra = await this.pickOpenListOptionNotNamed(assigned, section);
    if (!extra) {
      await this.closeOpenList();
      return;
    }
    const assignedChip = await this.selectedCategoryChip(extra)
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    await this.closeOpenList();
    if (!assignedChip) return;
    product.categories = [...assigned, extra];
  }

  async assignVendorIfAvailable(product) {
    if (
      await this.addVendorBtn
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await this.addVendorBtn.first().click();
    }
    const picker = this.vendorSearchInput;
    const visible = await picker
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (!visible) return;
    await picker.click();
    const vendorOption = picker.locator(
      "xpath=ancestor::*[1]/following-sibling::button[normalize-space(.) != ''][1]",
    );
    const appeared = await vendorOption
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!appeared) return;
    const label = (await vendorOption.innerText()).replace(/\s+/g, " ").trim();
    await vendorOption.click();
    await this.closeOpenList();
    if (label && !LIST_CHROME_LABELS.test(label)) product.vendor = label;
  }

  async editAndSaveSingleProductFields(product) {
    await this.verifyEditSingleProductUrl();
    const qtyBefore = await this.availableToSellInput.inputValue();
    const stamp = Date.now();
    product.previousName = product.name;
    product.name = `Auto Edited ${stamp}`;
    product.cost = "12.50";
    product.price = "24.99";
    product.compareAt = "29.99";
    product.reorderPoint = "3";
    product.reorderQty = "8";
    product.description = "Edited product description";
    product.descriptionRichText = false;
    product.customCode = `ED${String(stamp).slice(-8)}`;
    product.delivery = false;
    product.pickup = true;
    product.foodStampable = true;
    product.checkId = true;
    product.hasPhoto = true;
    if (qtyBefore) product.quantity = qtyBefore;

    await this.fillProductName(product.name);
    product.brand = await this.selectFirstBrand();
    await this.closeOpenList();
    product.tag = await this.selectFirstTag();
    await this.closeOpenList();
    await this.addAnotherCategoryIfAvailable(product);
    await this.addCoverPhoto(undefined, { expectNewBadge: true });
    await this.fillDescription(product.description);
    product.upc = await this.generateUpc();
    await expect(this.generateNewUpcBtn).toHaveCount(0);
    await expect(this.keepCurrentUpcBtn).toHaveCount(0);
    if (await this.costInput.isEnabled()) {
      await this.fillCost(product.cost);
    } else {
      product.cost =
        (await this.costInput.inputValue()).trim() || product.cost;
    }
    await this.fillPrice(product.price);
    await this.compareAtInput.fill(product.compareAt);
    await expect(this.compareAtLessThanPriceError).toHaveCount(0);
    await this.verifyMarginAndProfitComputed(product.cost, product.price);
    await this.reorderPointInput.fill(product.reorderPoint);
    await this.reorderQtyInput.fill(product.reorderQty);
    await this.customCodeInput.first().fill(product.customCode);
    await this.setToggle(this.deliveryChannelBtn, false);
    await this.setToggle(this.pickupChannelBtn, true);
    await this.setToggle(this.checkIdOption, true);
    await this.setToggle(this.foodStampableOption, true);
    await this.setToggle(this.activeOption, true);
    product.relatedProduct = await this.selectFirstRelatedProduct();
    await this.assignVendorIfAvailable(product);

    await expect(this.productNameInput).toHaveValue(product.name);
    await expect(this.priceInput).toHaveValue(product.price);
    await expect(this.costInput).toHaveValue(product.cost);
    await expect(this.upcInput).toHaveValue(product.upc);
    await expect(this.customCodeInput.first()).toHaveValue(product.customCode);
    await expect(
      this.availableToSellInput,
      "Available to sell / qty should not change in this edit",
    ).toHaveValue(qtyBefore);

    await this.saveEditedProduct();
    await this.searchListing(product.name);
    await expect(
      this.getProductRow(product.name),
      `Edited product "${product.name}" should appear in the listing after save`,
    ).toBeVisible({ timeout: 15_000 });
  }

  async expectEditProductRejected(errorLocator) {
    const savePromise = this.page.waitForResponse(
      (res) => this.isProductWriteResponse(res),
      { timeout: 8_000 },
    );
    await this.saveChangesBtn.click();
    await expect(errorLocator).toBeVisible({ timeout: 10_000 });
    const saveResponse = await this.assertHttp200IfReceived(
      savePromise,
      "update_product",
    );
    if (saveResponse) {
      const body = await saveResponse.json().catch(() => ({}));
      expect(
        body.status,
        "update_product should not succeed for invalid or duplicate data",
      ).toBeFalsy();
    }
    await this.verifyEditSingleProductUrl();
    await expect(this.saveChangesBtn).toBeVisible();
  }

  async verifyProductStillInListing({ name, price }) {
    const row = await this.searchCreatedProduct(name);
    await expect(row.locator("[data-prod-title]")).toHaveText(name);
    if (price) {
      await expect(row.locator("[data-prod-price]")).toContainText(
        this.formatPrice(price),
      );
    }
  }

  async clearAllCategoryChips() {
    const categoryField = this.categoriesLabel.locator("xpath=..");
    for (let i = 0; i < 2; i++) {
      const removeBtn = categoryField.getByRole("button").filter({
        hasNotText: /^(Open list|Close list)$/i,
      });
      if ((await removeBtn.count()) === 0) break;
      await removeBtn.first().click();
    }
  }

  async verifyEditRequiredAllEmptyValidation(product) {
    await this.verifyEditSingleProductUrl();
    await this.productNameInput.fill("");
    await expect(this.productNameInput).toHaveValue("");
    await this.clearAllCategoryChips();
    await this.priceInput.fill("");
    await expect(this.priceInput).toHaveValue("");
    await this.saveChangesBtn.click();
    await this.verifyNameRequiredError();
    await this.verifyCategoriesRequiredError();
    await this.verifyPriceRequiredError();
    await this.verifyEditSingleProductUrl();
    await this.verifyProductStillInListing(product);
  }

  async verifyEditRequiredNameEmptyValidation(product) {
    await this.verifyEditSingleProductUrl();
    await this.productNameInput.fill("");
    await expect(this.productNameInput).toHaveValue("");
    await this.saveChangesBtn.click();
    await this.verifyNameRequiredError();
    await this.verifyEditSingleProductUrl();
    await this.verifyProductStillInListing(product);
  }

  async verifyEditRequiredCategoriesEmptyValidation(product) {
    await this.verifyEditSingleProductUrl();
    await this.clearAllCategoryChips();
    await this.saveChangesBtn.click();
    await this.verifyEditSingleProductUrl();
    await this.verifyCategoriesRequiredError();
    await expect(this.nameRequiredError).toHaveCount(0);
    await this.verifyProductStillInListing(product);
  }

  async verifyEditRequiredPriceEmptyValidation(product) {
    await this.verifyEditSingleProductUrl();
    await this.priceInput.fill("");
    await expect(this.priceInput).toHaveValue("");
    await this.saveChangesBtn.click();
    await this.verifyEditSingleProductUrl();
    await this.verifyPriceRequiredError();
    await expect(this.nameRequiredError).toHaveCount(0);
    await this.verifyProductStillInListing(product);
  }

  async verifyEditPriceZeroValidation(product) {
    await this.verifyEditSingleProductUrl();
    await this.fillPrice("0.00");
    await expect(this.priceInput).toHaveValue("0.00");
    await this.saveChangesBtn.click();
    await expect(this.priceGreaterThanZeroError.first()).toBeVisible({
      timeout: 10_000,
    });
    await this.verifyEditSingleProductUrl();
    await expect(this.nameRequiredError).toHaveCount(0);
    await this.verifyProductStillInListing(product);
  }

  async verifyEditCompareAtLessThanPriceValidation(product) {
    await this.verifyEditSingleProductUrl();
    await this.fillPrice("10.00");
    await this.compareAtInput.fill("5.00");
    await this.saveChangesBtn.click();
    await expect(this.compareAtLessThanPriceError.first()).toBeVisible({
      timeout: 10_000,
    });
    await this.verifyEditSingleProductUrl();
    await this.verifyProductStillInListing(product);
  }

  async verifyEditProductNameRejectsSpecialCharacters() {
    await this.verifyEditSingleProductUrl();
    await this.assertInputStripsCharacters(
      this.productNameInput,
      "Product name",
      ["~", "-", "\\", ",", "/"],
      { prefix: "A", suffix: "B" },
    );
  }

  async verifyEditUpcRejectsSpecialCharacters() {
    await this.verifyEditSingleProductUrl();
    await this.assertInputStripsCharacters(this.upcInput, "UPC", [" "]);
  }

  async verifyEditCustomCodeRejectsSpecialCharacters() {
    await this.verifyEditSingleProductUrl();
    await this.assertInputStripsCharacters(
      this.customCodeInput.first(),
      "Custom code",
      [" ", "|"],
    );
  }

  async verifyEditOnlyOneBrandCanBeAssigned(product = {}) {
    await this.verifyEditSingleProductUrl();
    await expect(this.brandHelper).toBeVisible();
    const sectionText = (await this.getBrandSection().innerText())
      .replace(/\s+/g, " ")
      .trim();
    const currentBrand =
      product.brand ||
      sectionText
        .replace(/^Brand\s*/i, "")
        .replace(/\s*One brand per product\s*$/i, "")
        .trim();
    expect(currentBrand, "Edit form should already have a brand").toBeTruthy();

    const second = await this.pickBrandOptionNotNamed(currentBrand);
    await this.closeOpenList();
    if (second) {
      await expect(this.selectedBrandChip(second)).toBeVisible({
        timeout: 10_000,
      });
      await expect(
        this.selectedBrandChip(currentBrand),
        "A product can have only one brand; selecting another should replace the first",
      ).toHaveCount(0);
    } else {
      await expect(this.selectedBrandChip(currentBrand)).toBeVisible();
    }
    await expect(this.brandHelper).toBeVisible();
  }

  async verifyEditSameUpcAndCustomCodeRejected(product) {
    await this.verifyEditSingleProductUrl();
    const sharedCode = (await this.upcInput.inputValue()).trim() || product.upc;
    expect(
      sharedCode,
      "Edit form should have a UPC to collide with",
    ).toBeTruthy();
    await this.customCodeInput.first().fill(sharedCode);
    await expect(this.upcInput).toHaveValue(sharedCode);
    await expect(this.customCodeInput.first()).toHaveValue(sharedCode);
    await this.expectEditProductRejected(
      this.sameUpcCustomCodeError
        .or(this.duplicateUpcError)
        .or(this.page.getByRole("alert"))
        .first(),
    );
    await this.verifyProductStillInListing(product);
  }

  async verifyEditDuplicateProductNameRejected(product, existingName) {
    expect(
      existingName,
      "Need another product name to duplicate on edit",
    ).toBeTruthy();
    await this.verifyEditSingleProductUrl();
    await this.fillProductName(existingName, { assertAvailable: false });
    await this.expectEditProductRejected(
      this.duplicateNameError.or(this.page.getByRole("alert")).first(),
    );
    await this.verifyProductStillInListing(product);
  }

  async verifyEditDuplicateUpcRejected(product, existingUpc) {
    expect(
      existingUpc,
      "Need another product UPC to duplicate on edit",
    ).toBeTruthy();
    await this.verifyEditSingleProductUrl();
    const upcCheckPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.checkUpc),
      { timeout: 15_000 },
    );
    await this.fillUpc(existingUpc);
    await this.upcInput.blur();
    await this.assertHttp200IfReceived(upcCheckPromise, "check_upc");
    await this.expectEditProductRejected(
      this.duplicateUpcError.or(this.page.getByRole("alert")).first(),
    );
    await this.verifyProductStillInListing(product);
  }

  async verifyEditDuplicateCustomCodeRejected(product, existingCustomCode) {
    expect(
      existingCustomCode,
      "Need another product custom code to duplicate on edit",
    ).toBeTruthy();
    await this.verifyEditSingleProductUrl();
    await this.customCodeInput.first().fill(String(existingCustomCode));
    await this.expectEditProductRejected(
      this.duplicateCustomCodeError
        .or(this.sameUpcCustomCodeError)
        .or(this.page.getByRole("alert"))
        .first(),
    );
    await this.verifyProductStillInListing(product);
  }

  async confirmDiscardChangesIfAsked() {
    const shown = await this.discardChangesDialogTitle
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (!shown) return;
    await this.discardAndLeaveBtn.click();
    await expect(this.discardChangesDialogTitle).toBeHidden({
      timeout: 10_000,
    });
  }

  async reopenEditIfLeftForm(productName) {
    if (/\/new-products\/edit\//.test(this.page.url())) return;
    await this.openEditSingleProduct(productName);
  }

  async stayOnUnsavedLeaveDialog() {
    await expect(this.discardChangesDialogTitle).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.discardAndLeaveBtn).toBeVisible();
    await this.keepEditingBtn.click();
    await expect(this.discardChangesDialogTitle).toBeHidden({
      timeout: 10_000,
    });
  }

  async verifyEditDiscardChangesRestoresFields(product) {
    await this.verifyEditSingleProductUrl();
    const originalName = (await this.productNameInput.inputValue()).trim();
    const originalPrice = (await this.priceInput.inputValue()).trim();
    expect(originalName, "Edit form should load the current product name").toBe(
      product.name,
    );

    const dirtyName = `Temp Discard ${Date.now()}`;
    await this.fillProductName(dirtyName, { assertAvailable: false });
    await this.fillPrice("11.11");
    await expect(this.productNameInput).toHaveValue(dirtyName);
    await expect(this.priceInput).toHaveValue("11.11");

    await this.discardChangesBtn.click();
    await this.confirmDiscardChangesIfAsked();
    await this.reopenEditIfLeftForm(originalName);
    await expect(this.productNameInput).toHaveValue(originalName, {
      timeout: 10_000,
    });
    await expect(this.priceInput).toHaveValue(originalPrice);
    await this.verifyEditSingleProductUrl();
    await expect(this.page.getByText(`Edit ${originalName}`)).toBeVisible();
  }

  async verifyEditUnsavedLeaveStayThenDiscard(product) {
    await this.verifyEditSingleProductUrl();
    const originalName = product.name;
    const dirtyName = `Temp Leave ${Date.now()}`;
    await this.fillProductName(dirtyName, { assertAvailable: false });
    await this.fillPrice("12.12");
    await expect(this.productNameInput).toHaveValue(dirtyName);

    await this.backBtn.click();
    await this.stayOnUnsavedLeaveDialog();
    await this.verifyEditSingleProductUrl();
    await expect(this.productNameInput).toHaveValue(dirtyName);
    await expect(this.priceInput).toHaveValue("12.12");

    await this.productsMenuLink.click();
    const askedToLeave = await this.discardChangesDialogTitle
      .waitFor({ state: "visible", timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    if (askedToLeave) await this.discardAndLeaveBtn.click();
    await expect(this.page).not.toHaveURL(/\/new-products\/edit\//, {
      timeout: 15_000,
    });
    await expect(this.productsHeading).toBeVisible({ timeout: 15_000 });
    await this.searchListing(originalName);
    await expect(
      this.getProductRow(originalName),
      "Discard & leave should keep the original product in the listing",
    ).toBeVisible({ timeout: 15_000 });
    await expect(this.getProductRow(dirtyName)).toHaveCount(0);
  }

  async verifyEditGenerateUpcKeepThenReplace(product) {
    await this.verifyEditSingleProductUrl();
    const original = (await this.upcInput.inputValue()).trim();
    expect(original, "Edit form should already have a UPC").toMatch(/^\d{12}$/);

    await this.generateUpcBtn.click();
    await expect(this.keepCurrentUpcBtn).toBeVisible({ timeout: 5_000 });
    await expect(this.generateNewUpcBtn).toBeVisible();
    await this.keepCurrentUpcBtn.click();
    await expect(this.generateNewUpcBtn).toBeHidden();
    await expect(this.upcInput).toHaveValue(original);

    await this.generateUpcBtn.click();
    await expect(this.generateNewUpcBtn).toBeVisible({ timeout: 5_000 });
    await this.generateNewUpcBtn.click();
    await expect(this.generateNewUpcBtn).toBeHidden();
    await expect
      .poll(async () => (await this.upcInput.inputValue()).trim(), {
        timeout: 10_000,
        message: "Generate new should replace the current UPC",
      })
      .toMatch(/^\d{12}$/);
    const replaced = (await this.upcInput.inputValue()).trim();
    expect(replaced, "Generate new should not keep the previous UPC").not.toBe(
      original,
    );

    await this.discardChangesBtn.click();
    await this.confirmDiscardChangesIfAsked();
    await this.reopenEditIfLeftForm(product.name);
    await expect(this.upcInput).toHaveValue(original, { timeout: 10_000 });
    await this.verifyEditSingleProductUrl();
  }

  async verifyEditRemoveCoverPhotoPersists(product) {
    await this.verifyEditSingleProductUrl();
    const hasCover = await this.removePhotoBtn
      .first()
      .isVisible()
      .catch(() => false);
    if (!hasCover) {
      await this.addCoverPhoto(undefined, { expectNewBadge: true });
    }
    await this.expectCoverPhotoOnForm();
    await this.removePhotoBtn.first().click();
    await expect(this.removePhotoBtn).toHaveCount(0, { timeout: 10_000 });
    await expect(this.addPhotosBtn).toBeVisible();
    await this.saveEditedProduct();
    product.hasPhoto = false;
    await this.verifyCreatedProductInListing(product);
    await this.openRowActions(product.name);
    await this.verifyCreatedProductViewDetails(product);
    await this.openEditSingleProduct(product.name);
    await expect(this.removePhotoBtn).toHaveCount(0);
    await expect(this.addPhotosBtn).toBeVisible();
    await this.returnToProductsList();
  }

  async verifyEditActiveOffShowsInactiveOnListing(product) {
    await this.verifyEditSingleProductUrl();
    const checkMark = this.activeOption.locator(
      'svg path[d="M5 12l4 4 10-10"]',
    );
    const alreadyOff = (await checkMark.count()) === 0;
    if (!alreadyOff) {
      await this.activeOption.click({ force: true });
      await this.expectToggleChecked(this.activeOption, false);
      await this.saveEditedProduct();
    } else {
      await this.returnToProductsList();
    }

    await this.openEditSingleProduct(product.name);
    await this.expectToggleChecked(this.activeOption, false);
    await this.returnToProductsList();

    const row = await this.searchCreatedProduct(product.name);
    const listingStatus = row.getByText(/Inactive|Disabled/i);
    if (await listingStatus.count()) {
      await expect(listingStatus.first()).toBeVisible();
    }
    await this.openRowActions(product.name);
    await this.viewDetailsAction.first().click();
    await expect(this.productDetailsHeading).toBeVisible({ timeout: 10_000 });
    const details = this.getProductDetailsPanel();
    await expect(
      details
        .getByRole("radio", { name: /^Disabled$/i, checked: true })
        .or(details.getByText("Disabled", { exact: true }))
        .first(),
      "View details should show Disabled when Active is unchecked",
    ).toBeVisible({ timeout: 10_000 });
    await details.getByRole("button", { name: "Close" }).click();
    await expect(this.productDetailsHeading).toBeHidden({ timeout: 10_000 });
  }

  productIdFromUrl() {
    const match = this.page.url().match(/\/(?:edit|duplicate)\/(\d+)/);
    return match ? match[1] : "";
  }

  async verifyDuplicateProductUrl(sourceId) {
    const pattern = sourceId
      ? new RegExp(
          `/merchants/inventory/new-products/duplicate/${sourceId}(?:\\b|$)`,
        )
      : /\/merchants\/inventory\/new-products\/duplicate\/\d+/;
    await expect(this.page).toHaveURL(pattern);
  }

  async verifyDuplicateProductHeader() {
    await this.verifyDuplicateProductUrl();
    await expect(this.duplicateSaveBtn).toBeVisible({ timeout: 15_000 });
    await expect(this.duplicateProductTitle).toBeVisible();
    await expect(this.saveProductBtn).toHaveCount(0);
    await expect(this.saveChangesBtn).toHaveCount(0);
    await expect(this.singleProductBadge).toBeVisible();
    await expect(this.backBtn).toBeVisible();
  }

  async openMoreActionsMenu() {
    await this.verifyEditSingleProductUrl();
    const alreadyOpen = await this.duplicateProductAction
      .first()
      .isVisible()
      .catch(() => false);
    if (alreadyOpen) return;
    if (!(await this.moreActionsBtn.isVisible().catch(() => false))) {
      const currentPrice =
        (await this.priceInput.inputValue()).trim() || "24.99";
      await this.fillPrice((Number(currentPrice) + 0.01).toFixed(2));
      await expect(this.moreActionsBtn).toBeVisible({ timeout: 8_000 });
    }
    await this.moreActionsBtn.click();
  }

  async verifyDuplicateProductActionVisible() {
    await this.openMoreActionsMenu();
    await expect(this.duplicateProductAction.first()).toBeVisible({
      timeout: 10_000,
    });
    await this.page.keyboard.press("Escape");
    await this.returnToProductsList();
  }

  async openDuplicateFromEdit() {
    await this.verifyEditSingleProductUrl();
    const sourceId = this.productIdFromUrl();
    const productDataPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.getProductDataById),
      { timeout: 20_000 },
    );
    await this.openMoreActionsMenu();
    await expect(this.duplicateProductAction.first()).toBeVisible({
      timeout: 10_000,
    });
    await this.duplicateProductAction.first().click();
    await this.confirmDiscardChangesIfAsked();
    await this.verifyDuplicateProductUrl(sourceId);
    await this.assertHttp200IfReceived(
      productDataPromise,
      "get_productdata_ById",
    );
    await this.verifyDuplicateProductHeader();
    return sourceId;
  }

  async verifyDuplicateFormClearsUniqueFields(source) {
    const copyName = (await this.productNameInput.inputValue()).trim();
    expect(
      copyName,
      "Duplicate form should not keep the original product name",
    ).not.toBe(source.name);

    const copyUpc = (await this.upcInput.inputValue()).trim();
    if (source.upc) {
      expect(
        copyUpc,
        "Duplicate form should not reuse the original UPC",
      ).not.toBe(source.upc);
    }

    const copyCustom = (await this.customCodeInput.first().inputValue()).trim();
    if (source.customCode) {
      expect(
        copyCustom,
        "Duplicate form should not reuse the original custom code",
      ).not.toBe(source.customCode);
    }
  }

  async verifyDuplicateFormCopiesSourceFields(source) {
    const cats =
      Array.isArray(source.categories) && source.categories.length
        ? source.categories
        : [source.category || "Quickadd"];
    for (const cat of cats) {
      await expect(this.selectedCategoryChip(cat)).toBeVisible();
    }
    if (source.brand) {
      await expect(this.selectedBrandChip(source.brand)).toBeVisible();
    }
    if (source.tag) {
      await expect(this.selectedTagChip(source.tag)).toBeVisible();
    }
    if (source.price) {
      await expect(this.priceInput).toHaveValue(
        String(Number(source.price).toFixed(2)),
      );
    }
    if (source.cost) {
      await expect(this.costInput).toHaveValue(
        String(Number(source.cost).toFixed(2)),
      );
    }
    if (source.compareAt) {
      await expect(this.compareAtInput).toHaveValue(
        String(Number(source.compareAt).toFixed(2)),
      );
    }
    if (source.description) {
      await expect(this.formBody.getByText(source.description)).toBeVisible();
    }
    if (source.hasPhoto) {
      await this.expectCoverPhotoOnForm();
    }
    await expect(this.deliveryChannelBtn).toBeVisible();
    await expect(this.pickupChannelBtn).toBeVisible();
    await expect(this.deliveryChannelBtn).toBeDisabled();
    await expect(this.pickupChannelBtn).toBeDisabled();
    await this.expectToggleChecked(this.checkIdOption, Boolean(source.checkId));
    await this.expectToggleChecked(
      this.foodStampableOption,
      Boolean(source.foodStampable),
    );
    if (Array.isArray(source.taxes)) {
      if (source.taxes.length === 0) {
        await expect(this.removeTaxBtn).toHaveCount(0);
        await expect(this.defaultTaxName).toHaveCount(0);
      } else {
        for (const tax of [...new Set(source.taxes)]) {
          await expect(
            this.formBody.getByText(tax, { exact: true }).first(),
          ).toBeVisible();
        }
      }
    } else {
      await expect(
        this.defaultTaxName.or(this.removeTaxBtn).first(),
      ).toBeVisible();
    }
    await expect(this.vendorAssignAfterCreate).toBeVisible();
    if (source.relatedProduct) {
      await expect(
        this.relatedProductsSearch
          .locator("xpath=../..")
          .getByText(source.relatedProduct, { exact: true }),
      ).toBeVisible();
    }
  }

  async verifyDuplicateDoesNotChangeOriginal(source) {
    await this.returnToProductsList();
    await this.verifyCreatedProductInListing({
      name: source.name,
      category: source.category || "Quickadd",
      categories: source.categories,
      price: source.price,
      upc: source.upc,
      hasPhoto: source.hasPhoto,
      delivery: source.delivery,
      pickup: source.pickup,
    });
  }

  async expectDuplicateProductRejected(errorLocator) {
    const addPromise = this.page
      .waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.addProduct),
        { timeout: 5_000 },
      )
      .catch(() => null);
    await this.saveProductClick();
    await expect(errorLocator).toBeVisible({ timeout: 10_000 });
    const addResponse = await addPromise;
    if (addResponse) this.assertHttp200(addResponse, "add_product");
    await this.verifyDuplicateProductUrl();
    await expect(this.duplicateSaveBtn).toBeVisible();
  }

  async ensureUniqueCodesOnDuplicateForm(source) {
    const currentUpc = (await this.upcInput.inputValue()).trim();
    if (!currentUpc || currentUpc === source.upc) {
      await this.generateUpc();
    }
    const currentCustom = (
      await this.customCodeInput.first().inputValue()
    ).trim();
    if (!currentCustom || currentCustom === source.customCode) {
      await this.customCodeInput
        .first()
        .fill(`DP${Date.now().toString().slice(-8)}`);
    }
  }

  async captureSourceUniqueFields(product) {
    await this.verifyEditSingleProductUrl();
    const upc = (await this.upcInput.inputValue()).trim();
    const customCode = (await this.customCodeInput.first().inputValue()).trim();
    const name = (await this.productNameInput.inputValue()).trim();
    const price = (await this.priceInput.inputValue()).trim();
    if (upc) product.upc = upc;
    if (customCode) product.customCode = customCode;
    if (name) product.name = name;
    if (price) product.price = price;
  }

  async openDuplicateFromSource(product) {
    await this.openEditSingleProduct(product.name);
    await this.captureSourceUniqueFields(product);
    await this.openDuplicateFromEdit();
  }

  async assertDuplicateDidNotCreate(copySearch, source) {
    await this.verifyProductNotCreatedInListing(copySearch);
    await this.searchListing(source.name);
    await expect(
      this.getProductRow(source.name),
      "Original product should stay in the listing after a rejected duplicate save",
    ).toBeVisible({ timeout: 15_000 });
  }

  async verifyDuplicateCannotSaveWithOriginalName(source) {
    await this.openDuplicateFromSource(source);
    await this.fillProductName(source.name, { assertAvailable: false });
    await this.ensureUniqueCodesOnDuplicateForm(source);
    await this.expectDuplicateProductRejected(
      this.duplicateNameError.or(this.page.getByRole("alert")).first(),
    );
    await this.returnToProductsList();
    await this.searchListing(source.name);
    await expect(this.getProductRow(source.name)).toBeVisible({
      timeout: 15_000,
    });
  }

  async verifyDuplicateCannotSaveWithOriginalUpc(source) {
    await this.openDuplicateFromSource(source);
    expect(source.upc, "Need the source UPC to assert uniqueness").toBeTruthy();
    const copyName = `Auto DupUpc ${Date.now()}`;
    await this.fillProductName(copyName);
    const upcCheckPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.checkUpc),
      { timeout: 15_000 },
    );
    await this.fillUpc(source.upc);
    await this.upcInput.blur();
    await this.assertHttp200IfReceived(upcCheckPromise, "check_upc");
    const custom = `DP${Date.now().toString().slice(-8)}`;
    await this.customCodeInput
      .first()
      .fill(
        custom === source.upc ? `DX${Date.now().toString().slice(-8)}` : custom,
      );
    await this.expectDuplicateProductRejected(
      this.duplicateUpcError.or(this.page.getByRole("alert")).first(),
    );
    await this.assertDuplicateDidNotCreate(copyName, source);
  }

  async verifyDuplicateCannotSaveWithOriginalCustomCode(source) {
    await this.openDuplicateFromSource(source);
    expect(
      source.customCode,
      "Need the source custom code to assert uniqueness",
    ).toBeTruthy();
    const copyName = `Auto DupCc ${Date.now()}`;
    await this.fillProductName(copyName);
    await this.generateUpc();
    await this.customCodeInput.first().fill(String(source.customCode));
    await this.expectDuplicateProductRejected(
      this.duplicateCustomCodeError
        .or(this.sameUpcCustomCodeError)
        .or(this.page.getByRole("alert"))
        .first(),
    );
    await this.assertDuplicateDidNotCreate(copyName, source);
  }

  async verifyDuplicateSameUpcAndCustomCodeRejected(source) {
    await this.openDuplicateFromSource(source);
    const copyName = `Auto DupSame ${Date.now()}`;
    await this.fillProductName(copyName);
    const sharedCode = await this.generateUpc();
    await this.customCodeInput.first().fill(sharedCode);
    await expect(this.upcInput).toHaveValue(sharedCode);
    await expect(this.customCodeInput.first()).toHaveValue(sharedCode);
    await this.expectDuplicateProductRejected(
      this.sameUpcCustomCodeError
        .or(this.duplicateUpcError)
        .or(this.page.getByRole("alert"))
        .first(),
    );
    await this.assertDuplicateDidNotCreate(copyName, source);
  }

  async verifyDuplicateRequiredNameEmpty(source) {
    await this.openDuplicateFromSource(source);
    await this.productNameInput.fill("");
    await expect(this.productNameInput).toHaveValue("");
    await this.ensureUniqueCodesOnDuplicateForm(source);
    await this.saveProductClick();
    await this.verifyNameRequiredError();
    await this.verifyDuplicateProductUrl();
    await expect(this.duplicateSaveBtn).toBeVisible();
    await this.returnToProductsList();
    await this.searchListing(source.name);
    await expect(this.getProductRow(source.name)).toBeVisible({
      timeout: 15_000,
    });
  }

  async verifyDuplicatePriceZeroValidation(source) {
    await this.openDuplicateFromSource(source);
    const copyName = `Auto DupZero ${Date.now()}`;
    await this.fillProductName(copyName);
    await this.ensureUniqueCodesOnDuplicateForm(source);
    await this.fillPrice("0.00");
    await expect(this.priceInput).toHaveValue("0.00");
    await this.saveProductClick();
    await expect(this.priceGreaterThanZeroError.first()).toBeVisible({
      timeout: 10_000,
    });
    await this.verifyDuplicateProductUrl();
    await expect(this.duplicateSaveBtn).toBeVisible();
    await this.assertDuplicateDidNotCreate(copyName, source);
  }

  async verifyDuplicateIgnoresUnsavedEdits(source) {
    await this.openEditSingleProduct(source.name);
    const dirtyName = `Temp Dup Dirty ${Date.now()}`;
    await this.fillProductName(dirtyName, { assertAvailable: false });
    await this.fillPrice("99.99");
    await expect(this.productNameInput).toHaveValue(dirtyName);
    await this.openDuplicateFromEdit();
    const copyName = (await this.productNameInput.inputValue()).trim();
    expect(copyName, "Duplicate should not copy unsaved name edits").not.toBe(
      dirtyName,
    );
    await expect(this.priceInput).toHaveValue(
      String(Number(source.price).toFixed(2)),
    );
    await this.returnToProductsList();
    await this.searchListing(dirtyName);
    await expect(this.getProductRow(dirtyName)).toHaveCount(0);
    await this.searchListing(source.name);
    await expect(this.getProductRow(source.name)).toBeVisible({
      timeout: 15_000,
    });
  }

  async saveDuplicateAsNewProduct(source) {
    await this.openEditSingleProduct(source.name);
    await this.openDuplicateFromEdit();
    const stamp = Date.now();
    const copy = {
      name: `Auto Dup ${stamp}`,
      category: source.category || "Quickadd",
      categories: source.categories,
      cost: source.cost,
      price: source.price,
      hasPhoto: source.hasPhoto,
      delivery: true,
      pickup: true,
    };
    await this.fillProductName(copy.name);
    copy.hasPhoto = await this.removePhotoBtn
      .first()
      .isVisible()
      .catch(() => false);
    copy.upc = await this.generateUpc();
    copy.customCode = `DP${String(stamp).slice(-8)}`;
    await this.customCodeInput.first().fill(copy.customCode);
    const addPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.addProduct),
      { timeout: 20_000 },
    );
    await this.saveProductClick();
    const addResponse = await addPromise;
    this.assertHttp200(addResponse, "add_product");
    await expect(this.page).not.toHaveURL(/\/new-products\/duplicate\//, {
      timeout: 15_000,
    });
    await this.verifyCreatedProductInListing(copy);
    await this.verifyCreatedProductInListing(source);
    if (source.upc) {
      await this.searchListing(source.upc);
      await expect(this.getProductRow(source.name)).toBeVisible({
        timeout: 15_000,
      });
      await expect(this.getProductRow(copy.name)).toHaveCount(0);
    }
    return copy;
  }

  async verifyDuplicateNoTaxProduct() {
    await this.returnToProductsList();
    await this.searchListing("Auto NoTax");
    const row = this.getProductRow("Auto NoTax");
    const found = await row
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (!found) {
      const product = {
        name: `Auto NoTax ${Date.now()}`,
        category: "Quickadd",
        cost: "10.00",
        price: "20.00",
      };
      await this.reopenAddSingleProductForm({ waitForTaxList: true });
      await this.addProductWithoutTax(product);
      await this.openEditSingleProduct(product.name);
    } else {
      const name = (await row.locator("[data-prod-title]").innerText()).trim();
      await this.openEditSingleProduct(name);
    }
    await expect(this.removeTaxBtn).toHaveCount(0);
    await this.openDuplicateFromEdit();
    await expect(this.removeTaxBtn).toHaveCount(0);
    await expect(this.defaultTaxName).toHaveCount(0);
    await this.returnToProductsList();
  }

  async verifyDuplicateInactiveProduct(source) {
    await this.openEditSingleProduct(source.name);
    await this.expectToggleChecked(this.activeOption, false);
    await this.openDuplicateFromEdit();
    await this.expectToggleChecked(this.activeOption, false);
    await this.returnToProductsList();
    const row = await this.searchCreatedProduct(source.name);
    const listingStatus = row.getByText(/Inactive|Disabled/i);
    if (await listingStatus.count()) {
      await expect(listingStatus.first()).toBeVisible();
    }
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
