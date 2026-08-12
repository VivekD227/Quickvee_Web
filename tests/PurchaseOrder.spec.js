import { test } from "@playwright/test";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import merchants from "../api/testData/merchants.json";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import { PurchaseOrder } from "../pageObjects/PurchaseOrder";
import { getStores } from "../utilities/apiHelper/getStoresAPI.js";

test.describe("Purchase Order Module", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });
  let context;
  let page;
  let loginpage;
  let dashboard;
  let sName;
  let uName;
  let pwd;
  let purchaseOrder;
  let getStoreAPI;
  let store_Count;
  let currentStoreName;

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      getStoreAPI = getStores(page);
      purchaseOrder = new PurchaseOrder(page);
      sName = merchants.merchantLogin.storename;
      uName = merchants.merchantLogin.username;
      pwd = merchants.merchantLogin.password;

      await navigateToLoginPage(page);
      await loginpage.login(sName, uName, pwd);
      const getStoreResponse = await getStoreAPI;
      store_Count = getStoreResponse.data.length;
      // Display name on PO store dropdown (e.g. "Gang Smoker")
      currentStoreName =
        getStoreResponse.data.find((s) =>
          (s.name || "").toLowerCase().includes(sName.toLowerCase()),
        )?.name || getStoreResponse.data[0]?.name;
      console.log(store_Count);
      await dashboard.logoDisplayed();
      await dashboard.menuClick();
      await dashboard.poClick();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    await context?.close();
  });

  test("Navigating to Purchase Order Page", async () => {
    await purchaseOrder.poTextVisible();
    await purchaseOrder.newPOBtnVisible();
    await purchaseOrder.trackVisible();
    await purchaseOrder.closeDialogBtnClick();
    // Yellow-highlighted store dropdown next to New Purchase Order
    if (store_Count >= 2) {
      await purchaseOrder.expectPOSwitchStoreVisible(currentStoreName);
    } else {
      await purchaseOrder.expectPOSwitchStoreHidden(currentStoreName);
    }
  });

  test("Verify Purchase Order page URL", async () => {
    await purchaseOrder.verifyPageUrl();
  });

  test("Verify Purchase Orders heading", async () => {
    await purchaseOrder.poTextVisible();
  });

  test("Verify New Purchase Order button visible", async () => {
    await purchaseOrder.newPOBtnVisible();
  });

  test("Verify KPI cards visible", async () => {
    await purchaseOrder.verifyKPICardsVisible();
  });

  test("Verify search bar visible", async () => {
    await purchaseOrder.verifySearchBarVisible();
  });

  test("Verify status filter tabs visible", async () => {
    await purchaseOrder.verifyStatusFilterTabsVisible();
  });

  test("Verify All vendors filter visible", async () => {
    await purchaseOrder.verifyAllVendorsFilterVisible();
  });

  test("Verify list column headers visible", async () => {
    await purchaseOrder.verifyListColumnHeadersVisible();
  });

  test("Verify PO list rows render", async () => {
    await purchaseOrder.verifyPOListRowsVisible();
  });

  test("Verify showing purchase orders count", async () => {
    await purchaseOrder.verifyShowingCountVisible();
  });

  test("Open Create Purchase Order form", async () => {
    await purchaseOrder.openCreatePOForm();
  });

  test("Verify Create PO page URL", async () => {
    await purchaseOrder.verifyCreatePageUrl();
  });

  test("Verify Create PO page title", async () => {
    await purchaseOrder.verifyCreatePageTitleVisible();
  });

  test("Verify Create PO header actions", async () => {
    await purchaseOrder.verifyCreateHeaderActionsVisible();
  });

  test("Verify Create PO form fields visible", async () => {
    await purchaseOrder.verifyCreateFormFieldsVisible();
  });

  test("Verify Order number is prefilled", async () => {
    await purchaseOrder.verifyOrderNumberPrefilled();
  });

  test("Verify product table headers visible", async () => {
    await purchaseOrder.verifyProductTableHeadersVisible();
  });

  test("Verify empty products state on Create form", async () => {
    await purchaseOrder.verifyEmptyProductsStateVisible();
  });

  test("Verify order totals on empty Create form", async () => {
    await purchaseOrder.verifyOrderTotalsVisible();
  });

  test("Save as draft and Create PO disabled when empty", async () => {
    await purchaseOrder.verifySaveAndCreateDisabledWhenEmpty();
  });

  test("Cancel Create PO returns to list", async () => {
    await purchaseOrder.cancelCreateForm();
  });
});
