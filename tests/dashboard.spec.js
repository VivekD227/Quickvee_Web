import { test, expect } from "@playwright/test";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import merchants from "../api/testData/merchants.json";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import { getStores } from "../utilities/apiHelper/getStoresAPI";
import {
  revenueAPI,
  totalTransaction,
  customerCountAPI,
  grossProfitAPI,
  avgSalesValueAPI,
  avgItemSaleAPI,
  discountAmountAPI,
  discountPercentAPI,
  topProductSold
} from "../utilities/apiHelper/dashboardAPI";

function getDate() {
  return new Date().toISOString().split("T")[0];
}

function yesterdayDate() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

/** Normalize API/UI metric strings for comparison (e.g. "1.00" vs "1", "$1.77" vs "1.77"). */
function normalizeMetric(value) {
  const n = Number(String(value).replace(/[$,%]/g, "").trim());
  return Number.isFinite(n) ? String(n) : String(value).trim();
}

test.describe("DashBoard Module", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let sName;
  let uName;
  let pwd;
  let storeResponse;
  let revenueResponses;
  let transactionResponses;
  let customerCountResponses;
  let grossProfitResponses;
  let avgSalesValueResponses;
  let avgItemSaleResponses;
  let discountAmountResponses;
  let discountPercentResponses;
  let topProductSoldResponses;

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      sName = merchants.merchantLogin.storename;
      uName = merchants.merchantLogin.username;
      pwd = merchants.merchantLogin.password;

      await navigateToLoginPage(page);
      const storesPromise = getStores(page);
      const revenuePromise = revenueAPI(page);
      const transactionPromise = totalTransaction(page);
      const customerCountPromise = customerCountAPI(page);
      const grossProfitPromise = grossProfitAPI(page);
      const avgSalesValuePromise = avgSalesValueAPI(page);
      const avgItemSalePromise = avgItemSaleAPI(page);
      const discountAmountPromise = discountAmountAPI(page);
      const discountPercentPromise = discountPercentAPI(page);

      await loginpage.login(sName, uName, pwd);

      storeResponse = await storesPromise;
      revenueResponses = await revenuePromise;
      transactionResponses = await transactionPromise;
      customerCountResponses = await customerCountPromise;
      grossProfitResponses = await grossProfitPromise;
      avgSalesValueResponses = await avgSalesValuePromise;
      avgItemSaleResponses = await avgItemSalePromise;
      discountAmountResponses = await discountAmountPromise;
      discountPercentResponses = await discountPercentPromise;

      await dashboard.logoDisplayed();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    await context?.close();
  });

  test("Check UI", async () => {
    const storeLength = storeResponse.data.length;
    console.log(storeLength);

    expect(storeResponse.status).toBeTruthy();
    expect(storeResponse.message).toBe("Record found Successfully.");
    expect(storeLength).toBeGreaterThan(0);

    await dashboard.verifyDashboardUI(storeResponse);
  });

  test("Checking Day filter Dashboard value", async () => {
    expect(revenueResponses.mode).toBe("Day");
    const startDate = revenueResponses.start_date;
    const endDate = revenueResponses.end_date;
    expect(startDate).toBe(endDate);
    const today = getDate();
    expect(startDate).toBe(today);
    expect(endDate).toBe(today);
    expect(revenueResponses.message).toBe("Revenue from snapshot");
    expect(revenueResponses.status).toBeTruthy();
    const revenue = revenueResponses.total_revenue_data;
    console.log(revenue);
    const UIrevenue = await dashboard.UIRevenue();
    expect(normalizeMetric(UIrevenue)).toBe(normalizeMetric(revenue));

    expect(transactionResponses.status).toBeTruthy();
    expect(transactionResponses.message).toBe(
      "Sales count computed for 7 periods (week) from database for merchant.",
    );
    const APITransaction = transactionResponses.total_sale_count;
    console.log(APITransaction);
    const totalTransactionUI = await dashboard.UITransaction();
    expect(normalizeMetric(APITransaction)).toBe(
      normalizeMetric(totalTransactionUI),
    );

    expect(customerCountResponses.status).toBeTruthy();
    const APICustomers = customerCountResponses.total_customer_count;
    console.log(APICustomers);
    const UICustomers = await dashboard.UIUniqueCustomers();
    expect(normalizeMetric(APICustomers)).toBe(normalizeMetric(UICustomers));

    expect(grossProfitResponses.status).toBeTruthy();
    expect(grossProfitResponses.message).toMatch(/Gross profit summed/i);
    const APIProfit = grossProfitResponses.total_gross_profit;
    console.log(APIProfit);
    const UIProfit = await dashboard.UIProfit();
    expect(normalizeMetric(APIProfit)).toBe(normalizeMetric(UIProfit));

    expect(avgSalesValueResponses.status).toBeTruthy();
    const APIAov = avgSalesValueResponses.total_revenue_data;
    console.log(APIAov);
    const UIAov = await dashboard.UIAvgOrderValue();
    expect(normalizeMetric(APIAov)).toBe(normalizeMetric(UIAov));

    expect(avgItemSaleResponses.status).toBeTruthy();
    const APIItems = avgItemSaleResponses.total_revenue_data;
    console.log(APIItems);
    const UIItems = await dashboard.UIItemsPerTransaction();
    expect(normalizeMetric(APIItems)).toBe(normalizeMetric(UIItems));

    expect(discountPercentResponses.status).toBeTruthy();
    expect(discountPercentResponses.msg).toMatch(/Discount percentage/i);
    const APIDiscountPercent = discountPercentResponses.total_discount_per;
    console.log(APIDiscountPercent);
    const UIDiscountPercent = await dashboard.UIDiscountPercent();
    expect(normalizeMetric(APIDiscountPercent)).toBe(
      normalizeMetric(UIDiscountPercent),
    );

    expect(discountAmountResponses.status).toBeTruthy();
    expect(discountAmountResponses.msg).toMatch(/Discount data fetched/i);
    const APIDiscountAmount = discountAmountResponses.total_discount_data;
    console.log(APIDiscountAmount);
    const UIDiscountAmount = await dashboard.UIDiscountAmount();
    expect(normalizeMetric(APIDiscountAmount)).toBe(
      normalizeMetric(UIDiscountAmount),
    );
  });

  test("Top Product sold", async () => {
    const topProductSoldPromise = topProductSold(page);
    await dashboard.monthViewClick();
    topProductSoldResponses = await topProductSoldPromise;

    expect(topProductSoldResponses.status).toBeTruthy();
    const itemData = topProductSoldResponses.item_data ?? [];
    if (itemData.length === 0) {
      expect(topProductSoldResponses.message).toBe("No data found");
      console.log("No data found");
    } else {
      expect(topProductSoldResponses.message).toBe("Success");
      console.log("Success");
    }
    console.log(topProductSoldResponses.item_data);
  });
});
