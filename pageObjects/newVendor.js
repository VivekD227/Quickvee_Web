import { expect } from "@playwright/test";
import routes from "../utilities/routes.js";
import sessionDataStorage from "../utilities/helper/sessionDataStorage";

const VENDORS_PAGE_URL = /\/merchants\/inventory\/vendors/;
const VENDORS_INFO_BANNER_TITLE = "Vendors are your suppliers and distributors";
const VENDORS_INFO_BANNER_BODY =
  "Set up vendors here, then assign them to products with cost and vendor SKU on the product page.";
const VENDOR_ROW_CLICK_HINT = "Tap or click a row to view contact details";
const ADD_VENDOR_MODAL_HELPER_TEXT =
  "Vendors can be assigned to products with cost and vendor SKU on the product page.";
const PAYMENT_TERMS_OPTIONS = [
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "Due on receipt",
  "Prepaid",
];
const DEFAULT_PAYMENT_TERM = "Net 30";
const VENDOR_ROW_PATTERN = /Updated|Net \d+|Due on receipt|Prepaid/i;

class Vendor {
  constructor(page) {
    this.page = page;

    this.vendorsHeading = page.getByText("Vendors", { exact: true }).nth(1);
    this.vendorColumn = page.getByText("Vendor", { exact: true });
    this.contactColumn = page.getByText("Contact", { exact: true });
    this.actionsColumn = page.getByText("Actions", { exact: true });
    this.vendorCount = page.getByText(/\d+\s+vendors?/i).first();
    this.productsSuppliedCount = page
      .getByText(/\d+\s+products?\s+supplied/i)
      .first();
    this.allVendorsTab = page.getByRole("button", { name: /^All \(\d+\)$/ });
    this.noProductsTab = page.getByRole("button", {
      name: /^No products \(\d+\)$/,
    });
    this.addVendorPageBtn = page
      .getByRole("button", { name: /Add vendor/i })
      .first();
    this.searchBar = page.getByRole("textbox", { name: "Search vendors" });
    this.infoDescriptionBannerTitle = page.getByText(
      VENDORS_INFO_BANNER_TITLE,
      {
        exact: true,
      },
    );
    this.infoDescriptionBannerBody = page.getByText(VENDORS_INFO_BANNER_BODY, {
      exact: true,
    });
    this.rowClickHint = page.getByText(VENDOR_ROW_CLICK_HINT, { exact: true });

    this.addVendorModal = page.getByRole("dialog");
    this.modalHelperText = page.getByText(ADD_VENDOR_MODAL_HELPER_TEXT, {
      exact: true,
    });
    this.vendorNameField = page.locator('input[name="new-vendor-name"]');
    this.contactNameField = page.locator('input[name="new-vendor-contact"]');
    this.phoneNumberField = page.locator('input[name="new-vendor-phone"]');
    this.emailField = page.locator('input[name="new-vendor-email"]');
    this.paymentTermsDropdown = page.locator(
      'select[name="new-vendor-payment-terms"]',
    );
    this.cancelModalBtn = this.addVendorModal.getByRole("button", {
      name: "Cancel",
    });
    this.addVendorModalBtn = this.addVendorModal.getByRole("button", {
      name: "Add vendor",
    });
    this.vendorNameRequiredError = this.addVendorModal.getByText(
      /Vendor Name is required/i,
    );
    this.phoneNumberRequiredError = this.addVendorModal.getByText(
      /Phone number is required/i,
    );
    this.invalidEmailError = this.addVendorModal.getByText(
      /Invalid email address/i,
    );
    this.invalidPhoneError = this.addVendorModal.getByText(
      /Phone number must be 10 digits/i,
    );
    this.vendorAddedSuccessMessage = page.getByText(
      /Vendor added successfully/i,
    );
    this.noVendorsMatchMessage = page.getByText(/No vendors match/i);
    this.contactDetailsContactNameLabel = page.getByText("Contact name", {
      exact: true,
    });
    this.contactDetailsEmailLabel = page.getByText("Email", { exact: true });
    this.contactDetailsPhoneLabel = page.getByText("Phone", { exact: true });
    this.contactDetailsPaymentTermsLabel = page.getByText("Payment terms", {
      exact: true,
    });
    this.editDetailsBtn = page.getByRole("button", { name: "Edit details" });
    this.collapseVendorRowBtn = page.getByRole("button", { name: "Collapse" });

    this.editVendorNameField = page.locator('input[name="edit-vendor-name"]');
    this.editContactNameField = page.locator(
      'input[name="edit-vendor-contact"]',
    );
    this.editPhoneNumberField = page.locator('input[name="edit-vendor-phone"]');
    this.editEmailField = page.locator('input[name="edit-vendor-email"]');
    this.editPaymentTermsDropdown = page.locator(
      'select[name="edit-vendor-payment-terms"]',
    );
    this.saveEditVendorBtn = page.getByRole("button", {
      name: "Save changes",
      exact: true,
    });
    this.cancelEditVendorBtn = page
      .locator("div")
      .filter({ has: page.locator('input[name="edit-vendor-name"]') })
      .getByRole("button", { name: "Cancel", exact: true })
      .first();
    this.vendorUpdatedSuccessMessage = page.getByText(
      /Vendor updated successfully/i,
    );
    this.vendorDeletedSuccessMessage = page.getByText(
      /Vendor deleted successfully/i,
    );
    this.deleteVendorDialog = page.getByRole("dialog");
    this.editVendorNameRequiredError = page.getByText(
      /Vendor Name is required/i,
    );
    this.editPhoneRequiredError = page.getByText(/Phone number is required/i);
    this.editInvalidEmailError = page.getByText(/Invalid email address/i);
  }

  generateUniqueVendorName() {
    return `AutoVendor${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }

  generateUniqueVendorEmail() {
    return `vendor.${Date.now()}@example.com`;
  }

  generateUniqueContactName() {
    return `AutoContact${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }

  async verifyVendorsPageLoaded() {
    await expect(this.vendorsHeading).toBeVisible({ timeout: 15_000 });
    await expect(this.vendorCount).toBeVisible();
    await expect(this.productsSuppliedCount).toBeVisible();
  }

  async verifyPageUrl() {
    await expect(this.page).toHaveURL(VENDORS_PAGE_URL);
  }

  async verifyVendorsPageLoaded() {
    await expect(this.vendorsHeading).toBeVisible({ timeout: 15_000 });

    await expect(this.vendorCount).toBeVisible();
    const text = await this.vendorCount.textContent();

    const numbers = text.match(/\d+/g);

    const vendorCount = Number(numbers[0]);
    const productCount = Number(numbers[1]);

    console.log("Vendor Count:", vendorCount);
    console.log("Product Count:", productCount);

    const apiVendorCount = sessionDataStorage.get("vendor_APIcount");
    expect(vendorCount).toBe(apiVendorCount);
    const productSupplied = sessionDataStorage.get(
      "vendor_productsSupplied_APIcount",
    );
    expect(productCount).toBe(productSupplied);
  }

  async vendorsHeadingDisplay() {
    await expect(this.vendorsHeading).toBeVisible();
    await expect(this.vendorsHeading).toHaveText("Vendors");
  }

  async addVendorBtnDisplay() {
    await expect(this.addVendorPageBtn).toBeVisible();
  }

  async searchBarDisplay() {
    await expect(this.searchBar).toBeVisible();
  }

  async verifyInfoDescriptionBanner() {
    await expect(this.infoDescriptionBannerTitle).toBeVisible();
    await expect(this.infoDescriptionBannerTitle).toHaveText(
      VENDORS_INFO_BANNER_TITLE,
    );
    await expect(this.infoDescriptionBannerBody).toBeVisible();
    await expect(this.infoDescriptionBannerBody).toHaveText(
      VENDORS_INFO_BANNER_BODY,
    );
  }

  async getAllTabVendorCount() {
    await expect(this.allVendorsTab).toBeVisible();
    const tabText = (await this.allVendorsTab.textContent())?.trim() ?? "";
    return parseInt(tabText.match(/\d+/)?.[0] ?? "0", 10);
  }

  async getNoProductsTabCount() {
    await expect(this.noProductsTab).toBeVisible();
    const tabText = (await this.noProductsTab.textContent())?.trim() ?? "";
    return parseInt(tabText.match(/\d+/)?.[0] ?? "0", 10);
  }

  async verifyAllFilterTab() {
    await expect(this.allVendorsTab).toBeVisible();
    const allTabCount = await this.getAllTabVendorCount();
    const apiCount = sessionDataStorage.get("vendor_APIcount");

    console.log(`All tab vendor count: ${allTabCount}`);
    console.log(`API total_vendors: ${apiCount}`);

    expect(
      allTabCount,
      `All tab count (${allTabCount}) should match API total_vendors (${apiCount})`,
    ).toBe(apiCount);
  }

  async verifyNoProductsFilterTab() {
    await expect(this.noProductsTab).toBeVisible();
    const noProductsTabCount = await this.getNoProductsTabCount();
    const apiCount = sessionDataStorage.get("vendor_noProducts_APIcount");

    console.log(`No products tab count: ${noProductsTabCount}`);
    console.log(`API total_vendors_with_no_product: ${apiCount}`);

    expect(
      noProductsTabCount,
      `No products tab count (${noProductsTabCount}) should match API total_vendors_with_no_product (${apiCount})`,
    ).toBe(apiCount);
  }

  async verifyRowClickHintText() {
    await expect(this.rowClickHint).toBeVisible();
    await expect(this.rowClickHint).toHaveText(VENDOR_ROW_CLICK_HINT);
  }

  async addVendorBtnClick() {
    await this.addVendorPageBtn.click();
    await expect(this.addVendorModal).toBeVisible({ timeout: 10_000 });
  }

  async verifyAddVendorModalOpen() {
    await expect(this.addVendorModal).toBeVisible();
    await expect(this.addVendorModal).toContainText("Add vendor");
  }

  async verifyModalHelperText() {
    await expect(this.modalHelperText).toBeVisible();
    await expect(this.modalHelperText).toHaveText(ADD_VENDOR_MODAL_HELPER_TEXT);
  }

  async verifyVendorNameFieldVisible() {
    await expect(this.vendorNameField).toBeVisible();
    await expect(this.addVendorModal).toContainText(/Vendor name/i);
  }

  async verifyContactNameFieldVisible() {
    await expect(this.contactNameField).toBeVisible();
    await expect(this.addVendorModal).toContainText(/Contact name/i);
  }

  async verifyPhoneNumberFieldVisible() {
    await expect(this.phoneNumberField).toBeVisible();
    await expect(this.addVendorModal).toContainText(/Phone Number/i);
  }

  async verifyEmailFieldVisible() {
    await expect(this.emailField).toBeVisible();
    await expect(this.addVendorModal).toContainText(/Email/i);
  }

  async verifyPaymentTermsDropdownVisible() {
    await expect(this.paymentTermsDropdown).toBeVisible();
    await expect(this.addVendorModal).toContainText(/Payment terms/i);
  }

  async verifyPaymentTermsOptions() {
    const options = await this.paymentTermsDropdown
      .locator("option")
      .allTextContents();
    expect(options).toEqual(PAYMENT_TERMS_OPTIONS);
  }

  async verifyDefaultPaymentTerms() {
    await expect(this.paymentTermsDropdown).toHaveValue(DEFAULT_PAYMENT_TERM);
  }

  async verifyCancelButtonVisible() {
    await expect(this.cancelModalBtn).toBeVisible();
  }

  async verifyAddVendorModalButtonVisible() {
    await expect(this.addVendorModalBtn).toBeVisible();
  }

  async verifyAddVendorModalBtnDisabledWhenEmpty() {
    await expect(this.vendorNameField).toHaveValue("");
    await expect(this.phoneNumberField).toHaveValue("");

    if (await this.addVendorModalBtn.isDisabled()) {
      await expect(this.addVendorModalBtn).toBeDisabled();
      return;
    }

    await this.addVendorModalBtn.click();
    await expect(
      this.addVendorModal.getByText(/Vendor Name is required/i),
    ).toBeVisible();
    await expect(this.addVendorModal).toBeVisible();
  }

  async cancelAddVendorModal() {
    await this.cancelModalBtn.click();
    await expect(this.addVendorModal).toBeHidden();
  }

  async ensureAddVendorModalOpen() {
    if (!(await this.addVendorModal.isVisible())) {
      await this.addVendorBtnClick();
    }
  }

  async clearVendorFormFields() {
    await this.vendorNameField.fill("");
    await this.contactNameField.fill("");
    await this.phoneNumberField.fill("");
    await this.emailField.fill("");
  }

  async submitAddVendorModal() {
    await this.addVendorModalBtn.click();
  }

  async verifyVendorNotAdded() {
    await expect(this.addVendorModal).toBeVisible();
    await expect(this.vendorAddedSuccessMessage).not.toBeVisible();
  }

  async verifySubmitWithEmptyVendorName() {
    await this.ensureAddVendorModalOpen();
    await this.clearVendorFormFields();
    await this.phoneNumberField.fill("5551234567");
    await this.submitAddVendorModal();
    await expect(this.vendorNameRequiredError).toBeVisible({
      timeout: 10_000,
    });
    await this.verifyVendorNotAdded();
  }

  async verifySubmitWithEmptyPhoneNumber() {
    await this.ensureAddVendorModalOpen();
    await this.clearVendorFormFields();
    await this.vendorNameField.fill("Test Vendor");
    await this.submitAddVendorModal();
    await expect(this.phoneNumberRequiredError).toBeVisible({
      timeout: 10_000,
    });
    await this.verifyVendorNotAdded();
  }

  async verifySubmitWithBothRequiredFieldsEmpty() {
    await this.ensureAddVendorModalOpen();
    await this.clearVendorFormFields();
    await this.submitAddVendorModal();
    await expect(this.vendorNameRequiredError).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.phoneNumberRequiredError).toBeVisible({
      timeout: 10_000,
    });
    await this.verifyVendorNotAdded();
  }

  async verifyInvalidEmailFormat() {
    await this.ensureAddVendorModalOpen();
    await this.clearVendorFormFields();
    await this.vendorNameField.fill("Test Vendor Email");
    await this.phoneNumberField.fill("5551234567");
    await this.emailField.fill("bad-email");
    await this.submitAddVendorModal();
    await expect(this.invalidEmailError).toBeVisible({ timeout: 10_000 });
    await this.verifyVendorNotAdded();
  }

  async verifyInvalidPhoneFormat() {
    await this.ensureAddVendorModalOpen();
    await this.clearVendorFormFields();
    await this.vendorNameField.fill("Test Vendor Phone");
    await this.phoneNumberField.fill("123");
    await this.submitAddVendorModal();
    await expect(this.invalidPhoneError).toBeVisible({ timeout: 10_000 });
    await this.verifyVendorNotAdded();
  }
}
