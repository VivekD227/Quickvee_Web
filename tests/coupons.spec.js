import { test } from "@playwright/test";
import { Coupons } from "../pageObjects/Coupons";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import { getStores } from "../utilities/apiHelper/getStoresAPI";
import sessionDataStorage from "../utilities/helper/sessionDataStorage";
import merchants from "../api/testData/merchants.json";
import routes from "../utilities/routes.js";

test.describe("Coupons Module", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let amountCode;
  let percentCode;
  let coupons;

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      coupons = new Coupons(page);

      await navigateToLoginPage(page);
      const storesPromise = getStores(page);
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
      await loginApiResponse.json();
      const storeResponse = await storesPromise;
      sessionDataStorage.set("storeCount", (storeResponse?.data ?? []).length);
      await dashboard.logoDisplayed();
      await dashboard.menuClick();
      await dashboard.promotionsClick();
      await dashboard.couponsClick();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    await context?.close();
  });

  test("Verify Coupons page UI elements are displayed", async () => {
    await coupons.verifyCouponsPageUI();
  });

  test("Switch Order Coupon and Item Coupon tabs", async () => {
    await coupons.openItemCouponTab();
    await coupons.openOrderCouponTab();
  });

  test("Verify Add Order Coupon form UI", async () => {
    await coupons.openAddOrderCouponForm();
    await coupons.verifyAddOrderCouponFormUI();
  });

  test("Empty Add shows required field errors", async () => {
    await coupons.submitEmptyAddForm();
    await coupons.cancelAddForm();
  });

  test("Discount amount 0.00 is required", async () => {
    await coupons.openAddOrderCouponForm();
    await coupons.verifyDiscountAmountRequired();
    await coupons.cancelAddForm();
  });

  test("Min order must be greater than discount amount", async () => {
    await coupons.openAddOrderCouponForm();
    await coupons.verifyMinOrderGreaterThanDiscount();
    await coupons.cancelAddForm();
  });

  test("Adding a new amount order coupon", async () => {
    amountCode = coupons.generateUniqueCouponCode();
    await coupons.openAddOrderCouponForm();
    await coupons.addOrderCoupon(amountCode);
  });

  test("Adding a new percentage order coupon", async () => {
    percentCode = coupons.generateUniqueCouponCode();
    await coupons.openAddOrderCouponForm();
    await coupons.addPercentOrderCoupon(percentCode);
  });

  test("List Online coupon cannot be created with duplicate name", async () => {
    const code = coupons.generateUniqueCouponCode();
    await coupons.openAddOrderCouponForm();
    await coupons.addOrderCouponWithListOnline(code);
    await coupons.openAddOrderCouponForm();
    await coupons.verifyDuplicateCouponNameNotAllowed(code);
  });

  test("Same start and end date coupon adds without Expire Date on list", async () => {
    const code = coupons.generateUniqueCouponCode();
    await coupons.openAddOrderCouponForm();
    await coupons.addOrderCouponWithSameDates(code);
  });

  test("Edit amount coupon; code is not editable", async () => {
    await coupons.editAmountCoupon(amountCode, {
      description: "Edited amount coupon",
      discount: "2.00",
    });
  });

  test("Edit percentage coupon; code is not editable", async () => {
    await coupons.editPercentCoupon(percentCode, {
      description: "Edited percent coupon",
      discount: "25",
      maxDiscount: "8.00",
    });
  });

  test("Cancel delete keeps the amount coupon", async () => {
    await coupons.cancelDeleteCoupon(amountCode);
  });

  test("Delete amount coupon with confirmation", async () => {
    await coupons.deleteOrderCoupon(amountCode);
  });

  test("Delete percentage coupon with confirmation", async () => {
    await coupons.deleteOrderCoupon(percentCode);
  });
});
