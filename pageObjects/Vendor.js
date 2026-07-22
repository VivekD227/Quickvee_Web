import { expect } from "@playwright/test";
import routes from "../utilities/routes.js";
import sessionDataStorage from "../utilities/helper/sessionDataStorage";

const VENDORS_PAGE_URL = /\/merchants\/inventory\/vendors/;
const VENDORS_INFO_BANNER_TITLE =
    "Vendors are your suppliers and distributors";
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
        this.productsSuppliedCount = page.getByText(
            /\d+\s+products?\s+supplied/i,
        ).first();
        this.allVendorsTab = page.getByRole("button", { name: /^All \(\d+\)$/ });
        this.noProductsTab = page.getByRole("button", {
            name: /^No products \(\d+\)$/,
        });
        this.addVendorPageBtn = page.getByRole("button", { name: /Add vendor/i }).first();
        this.searchBar = page.getByRole("textbox", { name: "Search vendors" });
        this.infoDescriptionBannerTitle = page.getByText(VENDORS_INFO_BANNER_TITLE, {
            exact: true,
        });
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
        this.vendorAddedSuccessMessage = page.getByText(/Vendor added successfully/i);
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
        this.editPhoneNumberField = page.locator(
            'input[name="edit-vendor-phone"]',
        );
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

    getVendorListRows() {
        return this.page.getByRole("button").filter({ hasText: VENDOR_ROW_PATTERN });
    }

    getFirstVendorListRow() {
        return this.getVendorListRows().first();
    }

    getVendorRowContainer(index = 0) {
        const dataRow = this.page.locator('[data-vendor-row="true"]').nth(index);
        return dataRow;
    }

    getVendorListRow(vendorName) {
        const normalized = this.normalizeVendorDisplayName(vendorName);
        return this.getVendorListRows().filter({
            hasText: new RegExp(normalized, "i"),
        }).first();
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

    formatPhoneForDisplay(phone) {
        const digits = phone.replace(/\D/g, "");
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        return phone;
    }

    async fillVendorForm({ vendorName = "", phone = "", contactName = "", email = "", paymentTerms } = {}) {
        await this.vendorNameField.fill(vendorName);
        await this.contactNameField.fill(contactName);
        await this.phoneNumberField.fill(phone);
        await this.emailField.fill(email);
        if (paymentTerms) {
            await this.paymentTermsDropdown.selectOption(paymentTerms);
        }
    }

    async clearVendorSearch() {
        await this.searchBar.clear();
        await this.page.waitForTimeout(1000);
    }

    getVendorSearchTerm(vendorName) {
        return vendorName.replace(/_/g, "");
    }

    async searchVendor(searchText) {
        const searchTerm = this.getVendorSearchTerm(searchText);
        await Promise.all([
            this.page
                .waitForResponse(
                    (res) =>
                        res.request().method() === "POST" &&
                        res.url().includes(routes.API_URL.vendorList_URL),
                    { timeout: 15_000 },
                )
                .catch(() => null),
            this.searchBar.fill(searchTerm),
        ]);
        await this.page.waitForTimeout(1500);
    }

    async verifySearchByText(searchText, expectedVendorName) {
        await this.clearVendorSearch();
        await this.searchVendor(searchText);
        await expect(this.noVendorsMatchMessage).toHaveCount(0);
        const vendorRow = this.getVendorListRow(expectedVendorName);
        await expect(vendorRow).toBeVisible({ timeout: 15_000 });
    }

    async verifySearchWithNoResults(
        searchText = `ZZZNoVendorMatch${Date.now()}`,
    ) {
        await this.clearVendorSearch();
        await this.searchVendor(searchText);
        await expect(this.noVendorsMatchMessage).toBeVisible({ timeout: 15_000 });
        await expect(this.getVendorListRows()).toHaveCount(0);
        await this.clearVendorSearch();
    }

    async refreshVendorsPage() {
        const vendorsUrl = `${routes.webBaseUrl}/merchants/inventory/vendors`;
        const [response] = await Promise.all([
            this.page.waitForResponse(
                (res) =>
                    res.request().method() === "POST" &&
                    res.url().includes(routes.API_URL.vendorList_URL),
            ),
            this.page.goto(vendorsUrl, { waitUntil: "domcontentloaded" }),
        ]);
        const body = await response.json();
        sessionDataStorage.set("vendor_APIcount", Number(body.total_vendors));
        await expect(this.vendorsHeading).toBeVisible({ timeout: 15_000 });
    }

    async findVendorRow(vendorName, retries = 4) {
        for (let attempt = 0; attempt < retries; attempt += 1) {
            if (attempt > 0) {
                await this.refreshVendorsPage();
            }

            await this.searchVendor(vendorName);
            const vendorRow = this.getVendorListRow(vendorName);
            if ((await vendorRow.count()) > 0) {
                await expect(vendorRow).toBeVisible({ timeout: 5000 });
                return vendorRow;
            }

            await this.page.waitForTimeout(2000);
        }

        const vendorRow = this.getVendorListRow(vendorName);
        await expect(vendorRow).toBeVisible({ timeout: 15_000 });
        return vendorRow;
    }

    async verifyVendorAddedSuccessMessage() {
        await expect(this.vendorAddedSuccessMessage).toBeVisible({
            timeout: 15_000,
        });
    }

    async addVendorBtnAPI() {
        const previousCount = sessionDataStorage.get("vendor_APIcount");
        const createPromise = this.page.waitForResponse(
            (res) =>
                res.request().method() === "POST" &&
                res.url().includes(routes.API_URL.addVendor_URL),
        );
        const listPromise = this.page
            .waitForResponse(
                (res) =>
                    res.request().method() === "POST" &&
                    res.url().includes(routes.API_URL.vendorList_URL),
                { timeout: 15_000 },
            )
            .catch(() => null);

        await this.submitAddVendorModal();

        const [createResponse, listResponse] = await Promise.all([
            createPromise,
            listPromise,
        ]);

        expect(createResponse.status()).toBe(200);
        const createBody = await createResponse.json();
        expect(createBody.status).toBeTruthy();
        expect(createBody.message).toBe("Vendor Added Successfully.");

        await this.verifyVendorAddedSuccessMessage();
        await expect(this.addVendorModal).toBeHidden({ timeout: 15_000 });

        if (listResponse) {
            const listBody = await listResponse.json();
            const newApiCount = Number(listBody.total_vendors);
            sessionDataStorage.set("vendor_APIcount", newApiCount);
            console.log(`Previous vendor count (before add): ${previousCount}`);
            console.log(`New vendor count from list API (after add): ${newApiCount}`);
            expect(
                newApiCount,
                `Vendor list API count should increase by 1 after add (was ${previousCount}, now ${newApiCount})`,
            ).toBe(previousCount + 1);
        } else {
            const uiCount = await this.getDisplayedVendorCount();
            sessionDataStorage.set("vendor_APIcount", uiCount);
            expect(
                uiCount,
                `UI vendor count should increase by 1 after add (was ${previousCount}, now ${uiCount})`,
            ).toBe(previousCount + 1);
        }

        await this.verifyVendorCountMatchesList();
    }

    normalizeVendorDisplayName(name) {
        return name.replace(/[_\s-]/g, "").toLowerCase();
    }

    async verifyVendorListedAtTop(vendorName) {
        await this.clearVendorSearch();
        const firstRow = this.getFirstVendorListRow();
        await expect(firstRow).toBeVisible({ timeout: 15_000 });
        const rowText = this.normalizeVendorDisplayName(
            (await firstRow.innerText()) ?? "",
        );
        expect(rowText).toContain(this.normalizeVendorDisplayName(vendorName));
    }

    async createVendorWithRequiredFieldsOnly(vendorName, phone = "5551234567") {
        await this.addVendorBtnClick();
        await this.fillVendorForm({ vendorName, phone });
        await this.addVendorBtnAPI();
        await this.verifyVendorListedAtTop(vendorName);
    }

    async createVendor({
        vendorName,
        phone = "5551234567",
        contactName = "",
        email = "",
        paymentTerms,
    } = {}) {
        await this.addVendorBtnClick();
        await this.fillVendorForm({
            vendorName,
            phone,
            contactName,
            email,
            paymentTerms,
        });
        await this.addVendorBtnAPI();
    }

    async createVendorWithAllFields(vendorName, options = {}) {
        const vendorData = {
            vendorName,
            phone: options.phone ?? "5559876543",
            contactName: options.contactName ?? this.generateUniqueContactName(),
            email: options.email ?? this.generateUniqueVendorEmail(),
            paymentTerms: options.paymentTerms ?? DEFAULT_PAYMENT_TERM,
        };

        await this.createVendor(vendorData);
        await this.verifyVendorListedAtTop(vendorName);
        return vendorData;
    }

    async createVendorWithPaymentTerms(paymentTerms) {
        const vendorName = this.generateUniqueVendorName();
        await this.createVendor({
            vendorName,
            phone: "5551112233",
            paymentTerms,
        });
        await this.verifyVendorPaymentTermsAtTop(vendorName, paymentTerms);
        return vendorName;
    }

    async verifyVendorPaymentTermsAtTop(vendorName, paymentTerms) {
        await this.clearVendorSearch();
        const firstRow = this.getFirstVendorListRow();
        await expect(firstRow).toBeVisible({ timeout: 15_000 });
        await expect(firstRow).toContainText(paymentTerms);
        await this.verifyVendorListedAtTop(vendorName);
    }

    async createVendorAndVerifyCountUpdate(vendorName, phone = "5554445566") {
        const previousCount = sessionDataStorage.get("vendor_APIcount");
        await this.addVendorBtnClick();
        await this.fillVendorForm({ vendorName, phone });
        await this.addVendorBtnAPI();
        const newCount = sessionDataStorage.get("vendor_APIcount");
        expect(newCount).toBe(previousCount + 1);
        await this.verifyVendorCountMatchesList();
    }

    async createVendorAndVerifySuccessMessage(vendorName, phone = "5553334455") {
        const createPromise = this.page.waitForResponse(
            (res) =>
                res.request().method() === "POST" &&
                res.url().includes(routes.API_URL.addVendor_URL),
        );

        await this.addVendorBtnClick();
        await this.fillVendorForm({ vendorName, phone });
        await this.submitAddVendorModal();

        const createResponse = await createPromise;
        expect(createResponse.status()).toBe(200);
        const createBody = await createResponse.json();
        expect(createBody.status).toBeTruthy();
        expect(createBody.message).toBe("Vendor Added Successfully.");
        await this.verifyVendorAddedSuccessMessage();
        await expect(this.addVendorModal).toBeHidden({ timeout: 15_000 });

        await this.page
            .waitForResponse(
                (res) =>
                    res.request().method() === "POST" &&
                    res.url().includes(routes.API_URL.vendorList_URL),
                { timeout: 15_000 },
            )
            .then(async (listResponse) => {
                const listBody = await listResponse.json();
                sessionDataStorage.set("vendor_APIcount", Number(listBody.total_vendors));
            })
            .catch(() => null);
    }

    async verifyVendorNameInVendorColumn(vendorName) {
        await expect(this.vendorColumn).toBeVisible();
        const vendorRow = await this.findVendorRow(vendorName);
        const rowText = this.normalizeVendorDisplayName(
            (await vendorRow.innerText()) ?? "",
        );
        expect(rowText).toContain(this.normalizeVendorDisplayName(vendorName));
    }

    async verifyContactInfoInContactColumn({
        vendorName,
        contactName,
        phone,
        email,
    } = {}) {
        await expect(this.contactColumn).toBeVisible();
        const vendorRow = await this.findVendorRow(vendorName);
        const rowText = (await vendorRow.innerText()) ?? "";

        if (contactName) {
            expect(rowText).toContain(contactName);
        }
        if (phone) {
            expect(rowText).toContain(this.formatPhoneForDisplay(phone));
        }
        if (email) {
            expect(rowText).toContain(email);
        }
    }

    getViewVendorReportBtn(vendorRow) {
        return vendorRow.getByRole("button", { name: "View Vendor Report" });
    }

    async verifyViewVendorReportIcon(vendorName) {
        const vendorRow = await this.findVendorRow(vendorName);
        await expect(this.getViewVendorReportBtn(vendorRow)).toBeVisible({
            timeout: 15_000,
        });
    }

    async verifyActionsColumnIcons(vendorName) {
        await expect(this.actionsColumn).toBeVisible();
        const vendorRow = await this.findVendorRow(vendorName);

        await expect(this.getViewVendorReportBtn(vendorRow)).toBeVisible();
        await expect(vendorRow.getByRole("button", { name: "Edit" })).toBeVisible();
        await expect(
            vendorRow.getByRole("button", { name: "Delete vendor" }),
        ).toBeVisible();
        await expect(
            vendorRow.getByRole("button", { name: /Expand|Collapse/i }),
        ).toBeVisible();
    }

    getContactDetailsPanel() {
        return this.page
            .locator("div")
            .filter({ has: this.editDetailsBtn })
            .filter({ hasText: /Contact name/i })
            .filter({ hasText: /Payment terms/i })
            .first();
    }

    async clickVendorRowToViewDetails(vendorName) {
        const vendorRow = await this.findVendorRow(vendorName);

        if (await this.collapseVendorRowBtn.isVisible().catch(() => false)) {
            return;
        }

        await vendorRow.click({ position: { x: 40, y: 20 } });
        await expect(this.collapseVendorRowBtn).toBeVisible({ timeout: 10_000 });
    }

    async verifyContactDetailsPanelOpen() {
        const panel = this.getContactDetailsPanel();
        await expect(panel).toBeVisible({ timeout: 10_000 });
        await expect(this.contactDetailsContactNameLabel).toBeVisible();
        await expect(this.contactDetailsEmailLabel).toBeVisible();
        await expect(this.contactDetailsPhoneLabel).toBeVisible();
        await expect(this.contactDetailsPaymentTermsLabel).toBeVisible();
        await expect(this.editDetailsBtn).toBeVisible();
        await expect(this.collapseVendorRowBtn).toBeVisible();
    }

    async verifyContactDetailsPhone(phone) {
        const panel = this.getContactDetailsPanel();
        await expect(panel).toBeVisible({ timeout: 10_000 });
        await expect(panel).toContainText(this.formatPhoneForDisplay(phone));
    }

    async verifyContactDetailsEmail(email) {
        const panel = this.getContactDetailsPanel();
        await expect(panel).toBeVisible({ timeout: 10_000 });
        await expect(panel).toContainText(email);
    }

    async verifyContactDetailsPaymentTerms(paymentTerms) {
        const panel = this.getContactDetailsPanel();
        await expect(panel).toBeVisible({ timeout: 10_000 });
        await expect(this.contactDetailsPaymentTermsLabel).toBeVisible();
        await expect(panel).toContainText(paymentTerms);
    }

    async collapseVendorDetails() {
        if (await this.collapseVendorRowBtn.isVisible().catch(() => false)) {
            await this.collapseVendorRowBtn.click();
            await expect(this.collapseVendorRowBtn).toBeHidden({
                timeout: 10_000,
            });
        }
    }

    async verifyVendorsPageLoaded() {
        await expect(this.vendorsHeading).toBeVisible({ timeout: 15_000 });
        await expect(this.vendorCount).toBeVisible();
        await expect(this.productsSuppliedCount).toBeVisible();
    }

    async verifyPageUrl() {
        await expect(this.page).toHaveURL(VENDORS_PAGE_URL);
    }

    async verifyListApiOnPageLoad() {
        const apiCount = sessionDataStorage.get("vendor_APIcount");
        expect(
            apiCount,
            "Vendor list API count should be stored on page load",
        ).toBeDefined();
        expect(typeof apiCount).toBe("number");
        expect(apiCount).toBeGreaterThanOrEqual(0);

        const apiProductsSupplied = sessionDataStorage.get(
            "vendor_productsSupplied_APIcount",
        );
        expect(
            apiProductsSupplied,
            "Products supplied API count should be stored on page load",
        ).toBeDefined();
        expect(typeof apiProductsSupplied).toBe("number");
        expect(apiProductsSupplied).toBeGreaterThanOrEqual(0);
    }

    async vendorsHeadingDisplay() {
        await expect(this.vendorsHeading).toBeVisible();
        await expect(this.vendorsHeading).toHaveText("Vendors");
    }

    async vendorCountSubtitleDisplay() {
        await expect(this.vendorCount).toBeVisible();
        await expect(this.vendorCount).toHaveText(/\d+\s+vendors?/i);
        await expect(this.productsSuppliedCount).toBeVisible();
        await expect(this.productsSuppliedCount).toHaveText(
            /\d+\s+products?\s+supplied/i,
        );
    }

    async getDisplayedProductsSuppliedCount() {
        await expect(this.productsSuppliedCount).toBeVisible();
        const countText =
            (await this.productsSuppliedCount.textContent())?.trim() ?? "";
        return parseInt(
            countText.match(/(\d+)\s+products?\s+supplied/i)?.[1] ?? "0",
            10,
        );
    }

    async verifyProductsSuppliedMatchesAPI() {
        const uiCount = await this.getDisplayedProductsSuppliedCount();
        const apiCount = sessionDataStorage.get("vendor_productsSupplied_APIcount");

        console.log(`UI products supplied count: ${uiCount}`);
        console.log(`API total_assigned_products: ${apiCount}`);

        expect(
            uiCount,
            `UI products supplied count (${uiCount}) should match API total_assigned_products (${apiCount})`,
        ).toBe(apiCount);
    }

    async getDisplayedVendorCount() {
        await expect(this.vendorCount).toBeVisible();
        const countText = (await this.vendorCount.textContent())?.trim() ?? "";
        return parseInt(countText.match(/\d+/)?.[0] ?? "0", 10);
    }

    async getAllTabVendorCount() {
        await expect(this.allVendorsTab).toBeVisible();
        const tabText = (await this.allVendorsTab.textContent())?.trim() ?? "";
        return parseInt(tabText.match(/\d+/)?.[0] ?? "0", 10);
    }

    async verifyVendorCountMatchesList() {
        const uiCount = await this.getDisplayedVendorCount();
        const allTabCount = await this.getAllTabVendorCount();
        const apiCount = sessionDataStorage.get("vendor_APIcount");

        console.log(`UI vendor count: ${uiCount}`);
        console.log(`All tab vendor count: ${allTabCount}`);
        console.log(`API total_vendors: ${apiCount}`);

        expect(
            uiCount,
            `UI vendor count (${uiCount}) should match API total_vendors (${apiCount})`,
        ).toBe(apiCount);
        expect(
            allTabCount,
            `All tab count (${allTabCount}) should match UI vendor count (${uiCount})`,
        ).toBe(uiCount);
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

    async clickEditVendor(vendorName) {
        const vendorRow = await this.findVendorRow(vendorName);
        await vendorRow.getByRole("button", { name: "Edit" }).click();
        await expect(this.editVendorNameField).toBeVisible({ timeout: 10_000 });
        await expect(this.saveEditVendorBtn).toBeVisible();
    }

    async fillEditVendorForm({
        vendorName,
        contactName,
        phone,
        email,
        paymentTerms,
    } = {}) {
        if (vendorName !== undefined) {
            await this.editVendorNameField.fill(vendorName);
        }
        if (contactName !== undefined) {
            await this.editContactNameField.fill(contactName);
        }
        if (phone !== undefined) {
            await this.editPhoneNumberField.fill(phone);
        }
        if (email !== undefined) {
            await this.editEmailField.fill(email);
        }
        if (paymentTerms !== undefined) {
            await this.editPaymentTermsDropdown.selectOption(paymentTerms);
        }
    }

    async cancelEditVendor() {
        await this.cancelEditVendorBtn.click();
        await expect(this.editVendorNameField).toBeHidden({ timeout: 10_000 });
    }

    async saveEditVendorAPI() {
        const updatePromise = this.page.waitForResponse(
            (res) =>
                res.request().method() === "POST" &&
                res.url().includes(routes.API_URL.updateVendor_URL),
        );
        const listPromise = this.page
            .waitForResponse(
                (res) =>
                    res.request().method() === "POST" &&
                    res.url().includes(routes.API_URL.vendorList_URL),
                { timeout: 15_000 },
            )
            .catch(() => null);

        await this.saveEditVendorBtn.click();

        const [updateResponse, listResponse] = await Promise.all([
            updatePromise,
            listPromise,
        ]);

        expect(updateResponse.status()).toBe(200);
        const updateBody = await updateResponse.json();
        expect(updateBody.status).toBeTruthy();
        expect(updateBody.message).toBe("Vendor Data Updated Successfully.");

        await expect(this.vendorUpdatedSuccessMessage).toBeVisible({
            timeout: 15_000,
        });
        await expect(this.editVendorNameField).toBeHidden({ timeout: 15_000 });

        if (listResponse) {
            const listBody = await listResponse.json();
            sessionDataStorage.set(
                "vendor_APIcount",
                Number(listBody.total_vendors),
            );
        }
    }

    async updateVendorFieldAndVerify({
        currentVendorName,
        updates = {},
        verifyInList = {},
    } = {}) {
        await this.clickEditVendor(currentVendorName);
        await this.fillEditVendorForm(updates);
        await this.saveEditVendorAPI();

        const searchName = updates.vendorName ?? currentVendorName;
        if (verifyInList.vendorName || updates.vendorName) {
            await this.verifyVendorNameInVendorColumn(
                verifyInList.vendorName ?? updates.vendorName ?? searchName,
            );
        }
        if (
            verifyInList.contactName ||
            verifyInList.email ||
            verifyInList.phone ||
            updates.contactName ||
            updates.email ||
            updates.phone
        ) {
            await this.verifyContactInfoInContactColumn({
                vendorName: searchName,
                contactName: verifyInList.contactName ?? updates.contactName,
                email: verifyInList.email ?? updates.email,
                phone: verifyInList.phone ?? updates.phone,
            });
        }
        if (verifyInList.paymentTerms || updates.paymentTerms) {
            const vendorRow = await this.findVendorRow(searchName);
            await expect(vendorRow).toContainText(
                verifyInList.paymentTerms ?? updates.paymentTerms,
            );
        }

        return {
            vendorName: searchName,
            ...updates,
        };
    }

    async verifyCancelEditDiscardsChanges(vendorData) {
        const originalName = vendorData.vendorName;
        const tempName = `${originalName}Temp`;

        await this.clickEditVendor(originalName);
        await this.fillEditVendorForm({
            vendorName: tempName,
            contactName: "Temp Contact Cancel",
            phone: "5550001111",
            email: "temp.cancel@example.com",
            paymentTerms: "Net 60",
        });
        await this.cancelEditVendor();

        await this.verifyVendorNameInVendorColumn(originalName);
        await this.verifyContactInfoInContactColumn({
            vendorName: originalName,
            contactName: vendorData.contactName,
            email: vendorData.email,
        });
        await expect(this.getVendorListRow(tempName)).toHaveCount(0);
        await this.clearVendorSearch();
    }

    async verifyInvalidEmailOnEdit(vendorName) {
        await this.clickEditVendor(vendorName);
        await this.fillEditVendorForm({ email: "bad-email" });
        await this.saveEditVendorBtn.click();
        await expect(this.editInvalidEmailError).toBeVisible({ timeout: 10_000 });
        await expect(this.vendorUpdatedSuccessMessage).not.toBeVisible();
        await expect(this.editVendorNameField).toBeVisible();
        await this.cancelEditVendor();
        await this.clearVendorSearch();
    }

    async verifyClearVendorNameOnEdit(vendorName) {
        await this.clickEditVendor(vendorName);
        await this.editVendorNameField.fill("");
        await this.saveEditVendorBtn.click();
        await expect(this.editVendorNameRequiredError).toBeVisible({
            timeout: 10_000,
        });
        await expect(this.vendorUpdatedSuccessMessage).not.toBeVisible();
        await expect(this.editVendorNameField).toBeVisible();
        await this.cancelEditVendor();
        await this.clearVendorSearch();
    }

    async verifyClearPhoneOnEdit(vendorName) {
        await this.clickEditVendor(vendorName);
        await this.editPhoneNumberField.fill("");
        await this.saveEditVendorBtn.click();
        await expect(this.editPhoneRequiredError).toBeVisible({
            timeout: 10_000,
        });
        await expect(this.vendorUpdatedSuccessMessage).not.toBeVisible();
        await expect(this.editVendorNameField).toBeVisible();
        await this.cancelEditVendor();
        await this.clearVendorSearch();
    }

    async verifyUpdateSuccessMessage(vendorName) {
        const updatedName = `${vendorName}Msg`;
        await this.clickEditVendor(vendorName);
        await this.fillEditVendorForm({ vendorName: updatedName });

        const updatePromise = this.page.waitForResponse(
            (res) =>
                res.request().method() === "POST" &&
                res.url().includes(routes.API_URL.updateVendor_URL),
        );
        await this.saveEditVendorBtn.click();
        const updateResponse = await updatePromise;
        expect(updateResponse.status()).toBe(200);
        const updateBody = await updateResponse.json();
        expect(updateBody.message).toBe("Vendor Data Updated Successfully.");
        await expect(this.vendorUpdatedSuccessMessage).toBeVisible({
            timeout: 15_000,
        });
        await expect(this.editVendorNameField).toBeHidden({ timeout: 15_000 });
        return updatedName;
    }

    async clickDeleteVendor(vendorName) {
        const vendorRow = await this.findVendorRow(vendorName);
        await vendorRow.getByRole("button", { name: "Delete vendor" }).click();
        await expect(this.deleteVendorDialog).toBeVisible({ timeout: 10_000 });
        await expect(this.deleteVendorDialog).toContainText(
            new RegExp(`Delete\\s+"?${vendorName}"?`, "i"),
        );
    }

    async cancelDeleteVendor() {
        await this.deleteVendorDialog
            .getByRole("button", { name: "Cancel", exact: true })
            .click();
        await expect(this.deleteVendorDialog).toBeHidden({ timeout: 10_000 });
    }

    async confirmDeleteVendor() {
        await this.deleteVendorDialog
            .getByRole("button", { name: "Delete vendor", exact: true })
            .click();
    }

    async deleteVendorAPI() {
        const previousCount = sessionDataStorage.get("vendor_APIcount");

        const deletePromise = this.page.waitForResponse(
            (res) =>
                res.request().method() === "POST" &&
                res.url().includes(routes.API_URL.deleteVendor_URL),
        );
        const listPromise = this.page
            .waitForResponse(
                (res) =>
                    res.request().method() === "POST" &&
                    res.url().includes(routes.API_URL.vendorList_URL),
                { timeout: 15_000 },
            )
            .catch(() => null);

        await this.confirmDeleteVendor();

        const [deleteResponse, listResponse] = await Promise.all([
            deletePromise,
            listPromise,
        ]);

        expect(deleteResponse.status()).toBe(200);
        const deleteBody = await deleteResponse.json();
        expect(deleteBody.status).toBeTruthy();
        expect(deleteBody.message).toBe("Vendor Deleted Successfully.");

        await expect(this.vendorDeletedSuccessMessage).toBeVisible({
            timeout: 15_000,
        });
        await expect(this.deleteVendorDialog).toBeHidden({ timeout: 15_000 });

        if (listResponse) {
            const listBody = await listResponse.json();
            const newApiCount = Number(listBody.total_vendors);
            sessionDataStorage.set("vendor_APIcount", newApiCount);
            expect(
                newApiCount,
                `Vendor list API count should decrease by 1 after delete (was ${previousCount}, now ${newApiCount})`,
            ).toBe(previousCount - 1);
        } else {
            const uiCount = await this.getDisplayedVendorCount();
            sessionDataStorage.set("vendor_APIcount", uiCount);
            expect(uiCount).toBe(previousCount - 1);
        }

        return previousCount;
    }

    async verifyCancelDeleteKeepsVendor(vendorName) {
        await this.clickDeleteVendor(vendorName);
        await this.cancelDeleteVendor();
        await this.verifyVendorNameInVendorColumn(vendorName);
        await this.clearVendorSearch();
    }

    async deleteVendorAndVerifyRemoved(vendorName) {
        const previousCount = sessionDataStorage.get("vendor_APIcount");
        await this.clickDeleteVendor(vendorName);
        await this.deleteVendorAPI();
        await this.verifyVendorCountMatchesList();
        const newCount = sessionDataStorage.get("vendor_APIcount");
        expect(newCount).toBe(previousCount - 1);
        await this.verifyDeletedVendorNotInSearch(vendorName);
    }

    async verifyDeletedVendorNotInSearch(vendorName) {
        await this.clearVendorSearch();
        await this.searchVendor(vendorName);
        await expect(this.noVendorsMatchMessage).toBeVisible({ timeout: 15_000 });
        await expect(this.getVendorListRow(vendorName)).toHaveCount(0);
        await this.clearVendorSearch();
    }

    async verifyDeleteSuccessMessage(vendorName) {
        await this.clickDeleteVendor(vendorName);

        const deletePromise = this.page.waitForResponse(
            (res) =>
                res.request().method() === "POST" &&
                res.url().includes(routes.API_URL.deleteVendor_URL),
        );
        await this.confirmDeleteVendor();
        const deleteResponse = await deletePromise;
        expect(deleteResponse.status()).toBe(200);
        const deleteBody = await deleteResponse.json();
        expect(deleteBody.message).toBe("Vendor Deleted Successfully.");
        await expect(this.vendorDeletedSuccessMessage).toBeVisible({
            timeout: 15_000,
        });

        await this.page
            .waitForResponse(
                (res) =>
                    res.request().method() === "POST" &&
                    res.url().includes(routes.API_URL.vendorList_URL),
                { timeout: 15_000 },
            )
            .then(async (listResponse) => {
                const listBody = await listResponse.json();
                sessionDataStorage.set(
                    "vendor_APIcount",
                    Number(listBody.total_vendors),
                );
            })
            .catch(() => null);
    }
}

module.exports = { Vendor };
