import { test } from "@playwright/test";
import { Vendor } from "../pageObjects/Vendor";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import merchants from "../api/testData/merchants.json";
import routes from "../utilities/routes.js";

test.describe("Vendors Module", () => {
    test.describe.configure({ mode: "serial", timeout: 120_000 });

    let context;
    let page;
    let loginpage;
    let dashboard;
    let vendor;
    let sName;
    let uName;
    let pwd;
    let createdVendor;

    test.beforeAll(
        async ({ browser }) => {
            test.setTimeout(90_000);
            context = await browser.newContext();
            page = await context.newPage();

            loginpage = new LoginPage(page);
            dashboard = new Dashboard(page);
            vendor = new Vendor(page);
            sName = merchants.merchantLogin.storename;
            uName = merchants.merchantLogin.username;
            pwd = merchants.merchantLogin.password;

            await navigateToLoginPage(page);
            const [loginApiResponse] = await Promise.all([
                page.waitForResponse(
                    (res) =>
                        res.request().method() === "POST" &&
                        res.url().includes(routes.API_URL.login),
                ),
                loginpage.login(sName, uName, pwd),
            ]);
            await loginApiResponse.json();
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

    test("Navigate to Vendors page", async () => {
        await vendor.verifyVendorsPageLoaded();
    });

    test("Verify Vendors page URL", async () => {
        await vendor.verifyPageUrl();
    });

    test("Vendor list API on page load", async () => {
        await vendor.verifyListApiOnPageLoad();
    });

    test("Verify Vendors page heading", async () => {
        await vendor.vendorsHeadingDisplay();
    });

    test("Verify vendor count subtitle", async () => {
        await vendor.vendorCountSubtitleDisplay();
    });

    test("Verify vendor count matches list", async () => {
        await vendor.verifyVendorCountMatchesList();
        await vendor.verifyProductsSuppliedMatchesAPI();
    });

    test("Verify Add vendor button visible", async () => {
        await vendor.addVendorBtnDisplay();
    });

    test("Verify search bar visible", async () => {
        await vendor.searchBarDisplay();
    });

    test("Verify info description banner", async () => {
        await vendor.verifyInfoDescriptionBanner();
    });

    test("Verify All filter tab", async () => {
        await vendor.verifyAllFilterTab();
    });

    test("Verify No products filter tab", async () => {
        await vendor.verifyNoProductsFilterTab();
    });

    test("Verify row click hint text", async () => {
        await vendor.verifyRowClickHintText();
    });

    test("Click Add vendor opens modal", async () => {
        await vendor.addVendorBtnClick();
        await vendor.verifyAddVendorModalOpen();
    });

    test("Verify modal helper text", async () => {
        await vendor.verifyModalHelperText();
    });

    test("Verify Vendor Name field visible", async () => {
        await vendor.verifyVendorNameFieldVisible();
    });

    test("Verify Contact Name field visible", async () => {
        await vendor.verifyContactNameFieldVisible();
    });

    test("Verify Phone Number field visible", async () => {
        await vendor.verifyPhoneNumberFieldVisible();
    });

    test("Verify Email field visible", async () => {
        await vendor.verifyEmailFieldVisible();
    });

    test("Verify Payment Terms dropdown", async () => {
        await vendor.verifyPaymentTermsDropdownVisible();
    });

    test("Verify Payment Terms options", async () => {
        await vendor.verifyPaymentTermsOptions();
    });

    test("Verify default Payment Terms", async () => {
        await vendor.verifyDefaultPaymentTerms();
    });

    test("Verify Cancel button visible", async () => {
        await vendor.verifyCancelButtonVisible();
    });

    test("Verify Add vendor button in modal", async () => {
        await vendor.verifyAddVendorModalButtonVisible();
    });

    test("Add vendor button disabled when required fields empty", async () => {
        await vendor.verifyAddVendorModalBtnDisabledWhenEmpty();
        await vendor.cancelAddVendorModal();
    });

    test("Submit with empty Vendor Name", async () => {
        await vendor.verifySubmitWithEmptyVendorName();
    });

    test("Submit with empty Phone Number", async () => {
        await vendor.verifySubmitWithEmptyPhoneNumber();
    });

    test("Submit with both required fields empty", async () => {
        await vendor.verifySubmitWithBothRequiredFieldsEmpty();
    });

    test("Invalid email format", async () => {
        await vendor.verifyInvalidEmailFormat();
    });

    test("Invalid phone format", async () => {
        await vendor.verifyInvalidPhoneFormat();
        await vendor.cancelAddVendorModal();
    });

    test("Happy path - create vendor with required fields only", async () => {
        const vendorName = vendor.generateUniqueVendorName();
        await vendor.createVendorWithRequiredFieldsOnly(
            vendorName,
            "5551234567",
        );
    });

    test("Happy path - create vendor with all fields", async () => {
        const vendorName = vendor.generateUniqueVendorName();
        createdVendor = await vendor.createVendorWithAllFields(vendorName);
    });

    test("Create vendor with Payment Terms Net 15", async () => {
        await vendor.createVendorWithPaymentTerms("Net 15");
    });

    test("Create vendor with Payment Terms Net 30", async () => {
        await vendor.createVendorWithPaymentTerms("Net 30");
    });

    test("Create vendor with Payment Terms Net 45", async () => {
        await vendor.createVendorWithPaymentTerms("Net 45");
    });

    test("Create vendor with Payment Terms Net 60", async () => {
        await vendor.createVendorWithPaymentTerms("Net 60");
    });

    test("Create vendor with Payment Terms Due on receipt", async () => {
        await vendor.createVendorWithPaymentTerms("Due on receipt");
    });

    test("Create vendor with Payment Terms Prepaid", async () => {
        await vendor.createVendorWithPaymentTerms("Prepaid");
    });

    test("Vendor count updates after create", async () => {
        const vendorName = vendor.generateUniqueVendorName();
        await vendor.createVendorAndVerifyCountUpdate(vendorName);
    });

    test("Success message after create", async () => {
        const vendorName = vendor.generateUniqueVendorName();
        await vendor.createVendorAndVerifySuccessMessage(vendorName);
    });

    test("Verify vendor name in VENDOR column", async () => {
        await vendor.verifyVendorNameInVendorColumn(createdVendor.vendorName);
    });

    test("Verify contact info in CONTACT column", async () => {
        await vendor.verifyContactInfoInContactColumn({
            vendorName: createdVendor.vendorName,
            contactName: createdVendor.contactName,
            email: createdVendor.email,
        });
    });

    test("Verify Actions column icons", async () => {
        await vendor.verifyActionsColumnIcons(createdVendor.vendorName);
        await vendor.clearVendorSearch();
    });
});
