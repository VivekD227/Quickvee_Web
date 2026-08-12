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
    await purchaseOrder.verifyPageUrl();
    await purchaseOrder.checkPOData();

    await purchaseOrder.poTextVisible();
    await purchaseOrder.newPOBtnVisible();
    await purchaseOrder.verifyKPICardsVisible();
    await purchaseOrder.verifySearchBarVisible();
    await purchaseOrder.verifyStatusFilterTabsVisible();
    await purchaseOrder.verifyAllVendorsFilterVisible();
    await purchaseOrder.verifyListColumnHeadersVisible();
    await purchaseOrder.trackVisible();
    await purchaseOrder.closeDialogBtnClick();
    // Yellow-highlighted store dropdown next to New Purchase Order
    if (store_Count >= 2) {
      await purchaseOrder.expectPOSwitchStoreVisible(currentStoreName);
    } else {
      await purchaseOrder.expectPOSwitchStoreHidden(currentStoreName);
    }
  });



  // test("Verify PO list rows render", async () => {
  //   await purchaseOrder.verifyPOListRowsVisible();
  //      await purchaseOrder.verifyShowingCountVisible();

  // });


  test("Open Create Purchase Order form", async () => {
    await purchaseOrder.openCreatePOForm();
    await purchaseOrder.verifyCreatePageUrl();
    await purchaseOrder.verifyCreatePageTitleVisible();
    await purchaseOrder.verifyCreateHeaderActionsVisible();
    await purchaseOrder.verifyCreateFormFieldsVisible();
    await purchaseOrder.verifyOrderNumberPrefilled();
    await purchaseOrder.verifyProductTableHeadersVisible();
    await purchaseOrder.verifyEmptyProductsStateVisible();
    await purchaseOrder.verifyOrderTotalsVisible();
    await purchaseOrder.verifySaveAndCreateDisabledWhenEmpty();
    await purchaseOrder.cancelCreateForm();


  });



});
