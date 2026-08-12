const { expect } = require("@playwright/test");
import { getStores } from "../utilities/apiHelper/getStoresAPI.js";
import {
  generatePONumber,
  purchaseOrderList,
  purchaseOrderKPICount,
  purchaseOrderListCount,
} from "../utilities/apiHelper/purchaseOrderAPI.js"

const PO_LIST_URL = /\/merchants\/purchase-order\/?$/;
const PO_CREATE_URL = /\/merchants\/purchase-order\/add/;

const INFO_BANNER_TITLE = "Track inbound stock from your vendors";
const INFO_BANNER_BODY =
  "Draft a purchase order, notify your vendor, then receive units as they arrive — partial deliveries are tracked per line item and stock is added to your on-hand counts on receive.";

const EMPTY_PRODUCTS_TEXT =
  "No products yet. Use the search below or pick from your catalog.";

const STATUS_FILTERS = [
  "All",
  "Draft",
  "Active",
  "Partial",
  "Received",
  "Cancelled",
];

const LIST_COLUMNS = ["PO #", "Vendor", "Status", "Items", "Expected", "Total"];

class PurchaseOrder {
  constructor(page) {
    this.page = page;
    this.genratePOResponse = generatePONumber(page);
    this.getStoreResponse = getStores(page);
    this.purchaseOrderListResponse = purchaseOrderList(page);
    this.poText = page.getByRole("heading", {
      name: "Purchase Orders",
      level: 1,
    });

    this.newPOBtn = page.getByRole("button", {
      name: "New Purchase Order",
    });

    this.trackText = page.getByText(INFO_BANNER_TITLE, { exact: true });
    this.draftText = page.getByText(INFO_BANNER_BODY, { exact: true });
    this.closeDialogBtn = page.getByRole("button", { name: "Dismiss" });

    this.searchBar = page.getByRole("textbox", {
      name: "Search purchase orders",
    });

    this.allVendorsFilter = page.getByRole("button", { name: /All vendors/i });

    this.openValueLabel = page.getByText("Open value", { exact: true });
    this.unitsIncomingLabel = page.getByText("Units incoming", { exact: true });
    this.overdueLabel = page.getByText("Overdue", { exact: true });
    this.awaitingReceiptText = page.getByText("Awaiting receipt", {
      exact: true,
    });
    this.pastExpectedDateText = page.getByText("Past expected date", {
      exact: true,
    });

    this.showingCountText = page.getByText(/Showing\s+\d+\s+purchase orders?/i);

    // Create PO form
    this.createPageTitle = page.getByText("New Purchase Order", { exact: true });
    this.cancelBtn = page.getByRole("button", { name: "Cancel", exact: true });
    this.saveAsDraftBtn = page.getByRole("button", {
      name: "Save as draft",
      exact: true,
    });
    this.createPOBtn = page.getByRole("button", {
      name: "Create PO",
      exact: true,
    });
    this.goBackBtn = page.getByRole("button", { name: "Go back" });

    this.locationLabel = page.getByText("Location*", { exact: true });
    this.supplierLabel = page.getByText("Supplier", { exact: true });
    this.stockDueLabel = page.getByText("Stock Due", { exact: true });
    this.orderNumberLabel = page.getByText("Order number*", { exact: true });
    this.supplierInvoiceLabel = page.getByText("Supplier Invoice Number", {
      exact: true,
    });
    this.noteLabel = page.getByText("Note", { exact: true });

    this.stockDueInput = page.getByPlaceholder("MM/DD/YYYY");
    this.orderNumberInput = page.locator('input[value^="PO"]').first();
    this.supplierInvoiceInput = page.getByPlaceholder(
      "Enter a Supplier Invoice Number",
    );
    this.noteInput = page.getByPlaceholder("Enter a note for this order");
    this.noVendorBtn = page.getByRole("button", { name: /No Vendor/i });
    this.addProductSearchBtn = page.getByRole("button", {
      name: /Search or scan to add a product/i,
    });
    this.emptyProductsText = page.getByText(EMPTY_PRODUCTS_TEXT, {
      exact: true,
    });
    this.subtotalLabel = page.getByText("Subtotal of Products", {
      exact: true,
    });
    this.orderTotalLabel = page.getByText("Order total", { exact: true });
    this.productColumn = page.getByText("Product", { exact: true }).first();
    this.quantityColumn = page.getByText("Quantity", { exact: true }).first();
    this.costPriceColumn = page.getByText(/Cost price/i).first();
    this.totalCostColumn = page.getByText(/Total cost/i).first();
  }

  /** Store switcher next to New Purchase Order — name comes from stores API */
  poStoreSwitcher(storeName) {
    return this.page.getByRole("button", { name: storeName, exact: true });
  }

  statusFilterTab(statusName) {
    return this.page.getByRole("button", {
      name: new RegExp(`^${statusName}\\s*\\d+$`, "i"),
    });
  }

  listColumnHeader(columnName) {
    if (columnName === "Status" || columnName === "Items") {
      return this.page.getByText(columnName, { exact: true }).first();
    }
    return this.page.getByRole("button", { name: columnName, exact: true });
  }

  poListRows() {
    return this.page.getByRole("button", {
      name: /Open purchase order\s+PO/i,
    });
  }

  async poTextVisible() {
    await expect(this.poText).toBeVisible();
  }

  async verifyPageUrl() {
    await expect(this.page).toHaveURL(PO_LIST_URL);
  }

  async expectPOSwitchStoreVisible(storeName) {
    await expect(this.poStoreSwitcher(storeName)).toBeVisible();
  }

  async expectPOSwitchStoreHidden(storeName) {
    await expect(this.poStoreSwitcher(storeName)).toBeHidden();
  }

  async newPOBtnVisible() {
    await expect(this.newPOBtn).toBeVisible();
  }

  async newPOBtnClick() {
    await this.newPOBtn.click();
    await this.genratePOResponse;
    await this.getStoreResponse;
  }

  async checkPOData() {
    const APIMessageData = await this.purchaseOrderListResponse;
    console.log(APIMessageData.message);
    if (APIMessageData.message === "No purchase orders found") {
      await this.notverifyPOListRowsVisible();
      await this.notverifyShowingCountVisible();
      console.log("Not Visible");

    }
    else {
      await purchaseOrder.verifyPOListRowsVisible();
      await purchaseOrder.verifyShowingCountVisible();
      console.log("Visible");
    }
  }

  async trackVisible() {
    await expect(this.trackText).toBeVisible();
    await expect(this.draftText).toBeVisible();
    await expect(this.closeDialogBtn).toBeVisible();
  }

  async closeDialogBtnClick() {
    await this.closeDialogBtn.click();
    await expect(this.trackText).not.toBeVisible();
    await expect(this.draftText).not.toBeVisible();
  }

  async dismissInfoBannerIfVisible() {
    if (await this.closeDialogBtn.isVisible().catch(() => false)) {
      await this.closeDialogBtnClick();
    }
  }

  async verifyInfoBanner() {
    await expect(this.trackText).toBeVisible();
    await expect(this.trackText).toHaveText(INFO_BANNER_TITLE);
    await expect(this.draftText).toBeVisible();
    await expect(this.draftText).toHaveText(INFO_BANNER_BODY);
  }

  async verifyKPICardsVisible() {
    await expect(this.openValueLabel).toBeVisible();
    await expect(this.unitsIncomingLabel).toBeVisible();
    await expect(this.overdueLabel).toBeVisible();
    await expect(this.awaitingReceiptText).toBeVisible();
    await expect(this.pastExpectedDateText).toBeVisible();
    await expect(
      this.page.getByText(/Across\s+\d+\s+purchase orders?/i),
    ).toBeVisible();
  }

  async verifySearchBarVisible() {
    await expect(this.searchBar).toBeVisible();
    await expect(this.searchBar).toHaveAttribute(
      "placeholder",
      "Search PO #, reference, vendors",
    );
  }

  async verifyStatusFilterTabsVisible() {
    for (const status of STATUS_FILTERS) {
      await expect(this.statusFilterTab(status)).toBeVisible();
    }
  }

  async verifyAllVendorsFilterVisible() {
    await expect(this.allVendorsFilter).toBeVisible();
  }

  async verifyListColumnHeadersVisible() {
    for (const column of LIST_COLUMNS) {
      await expect(this.listColumnHeader(column)).toBeVisible();
    }
  }

  async verifyPOListRowsVisible() {
    await expect(this.poListRows().first()).toBeVisible();
    const rowCount = await this.poListRows().count();
    expect(rowCount).toBeGreaterThan(0);
  }

  async notverifyPOListRowsVisible() {
    await expect(this.poListRows().first()).not.toBeVisible();
  }

  async verifyShowingCountVisible() {
    await expect(this.showingCountText).toBeVisible();
  }

  async notverifyShowingCountVisible() {
    await expect(this.showingCountText).not.toBeVisible();
  }

  async verifyListPageChrome() {
    await this.poTextVisible();
    await this.newPOBtnVisible();
    await this.verifyKPICardsVisible();
    await this.verifySearchBarVisible();
    await this.verifyStatusFilterTabsVisible();
    await this.verifyAllVendorsFilterVisible();
    await this.verifyListColumnHeadersVisible();
    await this.verifyPOListRowsVisible();
    await this.verifyShowingCountVisible();
  }

  async openCreatePOForm() {
    await this.newPOBtnClick();
    await expect(this.page).toHaveURL(PO_CREATE_URL);
  }

  async verifyCreatePageUrl() {
    await expect(this.page).toHaveURL(PO_CREATE_URL);
  }

  async verifyCreatePageTitleVisible() {
    await expect(this.createPageTitle).toBeVisible();
  }

  async verifyCreateHeaderActionsVisible() {
    await expect(this.cancelBtn).toBeVisible();
    await expect(this.saveAsDraftBtn).toBeVisible();
    await expect(this.createPOBtn).toBeVisible();
    await expect(this.goBackBtn).toBeVisible();
  }

  async verifyCreateFormFieldsVisible() {
    await expect(this.locationLabel).toBeVisible();
    await expect(this.supplierLabel).toBeVisible();
    await expect(this.stockDueLabel).toBeVisible();
    await expect(this.orderNumberLabel).toBeVisible();
    await expect(this.supplierInvoiceLabel).toBeVisible();
    await expect(this.noteLabel).toBeVisible();

    await expect(this.stockDueInput).toBeVisible();
    await expect(this.supplierInvoiceInput).toBeVisible();
    await expect(this.noteInput).toBeVisible();
    await expect(this.noVendorBtn).toBeVisible();
  }

  async verifyOrderNumberPrefilled() {
    const poInput = this.page.locator('input[value^="PO"]').first();
    await expect(poInput).toBeVisible();
    const value = await poInput.inputValue();
    expect(value).toMatch(/^PO/i);
  }

  async verifyProductTableHeadersVisible() {
    await expect(this.productColumn).toBeVisible();
    await expect(this.quantityColumn).toBeVisible();
    await expect(this.costPriceColumn).toBeVisible();
    await expect(this.totalCostColumn).toBeVisible();
  }

  async verifyEmptyProductsStateVisible() {
    await expect(this.emptyProductsText).toBeVisible();
    await expect(this.addProductSearchBtn).toBeVisible();
    await expect(
      this.page.getByText("Add products to this purchase order.", {
        exact: true,
      }),
    ).toBeVisible();
  }

  async verifyOrderTotalsVisible() {
    await expect(this.subtotalLabel).toBeVisible();
    await expect(this.orderTotalLabel).toBeVisible();
    await expect(this.page.getByText("$0.00").first()).toBeVisible();
    await expect(this.page.getByText("0 units", { exact: true })).toBeVisible();
  }

  async verifySaveAndCreateDisabledWhenEmpty() {
    await expect(this.saveAsDraftBtn).toBeDisabled();
    await expect(this.createPOBtn).toBeDisabled();
  }

  async cancelCreateForm() {
    await this.cancelBtn.click();
    await expect(this.page).toHaveURL(PO_LIST_URL);
    await expect(this.poText).toBeVisible();
  }
}

module.exports = { PurchaseOrder };
