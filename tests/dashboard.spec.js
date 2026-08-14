import { test, expect } from "@playwright/test";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import merchants from "../api/testData/merchants.json";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import { getStores } from "../utilities/apiHelper/getStoresAPI";
import sessionDataStorage from "../utilities/helper/sessionDataStorage";
import {
  revenueAPI,
  totalTransaction,
  customerCountAPI,
  grossProfitAPI,
  avgSalesValueAPI,
  avgItemSaleAPI,
  discountAmountAPI,
  discountPercentAPI,
  topProductSold,
  recentOrders,
  outletReportAPI,
  storeSalesCountAPI,
  customerCountStoreReportAPI,
  storeGrossProfitAPI,
  avgSaleValueReportAPI,
  avgItemSaleReportAPI,
  storeDiscountedReportAPI,
} from "../utilities/apiHelper/dashboardAPI";
import {
  merchantStoreAndCategoryAPI,
  activeBogoListAPI,
  mixMatchPricingListAPI,
  getStateListAPI,
  merchantProductsAPI,
} from "../utilities/apiHelper/onlineOrderingAPI";

function getDate() {
  return new Date().toISOString().split("T")[0];
}

function yesterdayDate() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

/** Whole days covered by an inclusive YYYY-MM-DD range. */
function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return (end - start) / 86_400_000;
}

function normalizeMetric(value) {
  if (value == null || String(value).trim() === "") return "0.00";
  const n = Number(String(value).replace(/[$,%]/g, "").trim());
  // The UI displays metrics rounded to 2 decimals while APIs return raw precision.
  return Number.isFinite(n) ? n.toFixed(2) : String(value).trim();
}

/** Read the order id off a recent-activity API record, whichever key it uses. */
function getApiOrderId(order) {
  const key = ["order_id", "orderId", "id", "order_number"].find(
    (candidate) =>
      order?.[candidate] != null && String(order[candidate]).trim() !== "",
  );
  expect(
    key,
    `No order id on recent order record. Available keys: ${Object.keys(order ?? {}).join(", ")}`,
  ).toBeTruthy();
  return String(order[key]).trim();
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
      const loginData = await loginpage.createSessionAPIMerchant();
      const merchantiD = loginData.data.merchant_id;
      console.log(merchantiD);
      sessionDataStorage.set("merchantId", merchantiD);
      [
        storeResponse,
        revenueResponses,
        transactionResponses,
        customerCountResponses,
        grossProfitResponses,
        avgSalesValueResponses,
        avgItemSaleResponses,
        discountAmountResponses,
        discountPercentResponses,
      ] = await Promise.all([
        storesPromise,
        revenuePromise,
        transactionPromise,
        customerCountPromise,
        grossProfitPromise,
        avgSalesValuePromise,
        avgItemSalePromise,
        discountAmountPromise,
        discountPercentPromise,
      ]);

      await dashboard.logoDisplayed();
    },
    { timeout: 90_000 },
  );

  function getStoreCount() {
    return storeResponse.data.length;
  }

  test.afterAll(async () => {
    await context?.close();
  });

  test("Check UI", async () => {
    const storeLength = getStoreCount();
    console.log(storeLength);

    expect(storeResponse.status).toBeTruthy();
    expect(storeResponse.message).toBe("Record found Successfully.");
    expect(storeLength).toBeGreaterThan(0);

    await dashboard.verifyDashboardUI(storeResponse);
  });

  test("Store Day dashboard data", async () => {
    const dayData = await dashboard.storeDayDashboardData();
    expect(dayData).toBeDefined();
    expect(sessionDataStorage.get("dayDashboardData")).toEqual(dayData);
    console.log("Merchant ID:", sessionDataStorage.get("merchantId"));
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

    const saleCount = Number(APITransaction);
    const expectedAov = saleCount === 0 ? 0 : Number(revenue) / saleCount;
    console.log(expectedAov);
    expect(
      normalizeMetric(UIAov),
      `Average Order Value should be ${revenue} / ${APITransaction}`,
    ).toBe(normalizeMetric(expectedAov));

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

  test("Checking Yesterday Dashboard value", async () => {
    const revenuePromise = revenueAPI(page);
    const transactionPromise = totalTransaction(page);
    const customerCountPromise = customerCountAPI(page);
    const grossProfitPromise = grossProfitAPI(page);
    const avgSalesValuePromise = avgSalesValueAPI(page);
    const avgItemSalePromise = avgItemSaleAPI(page);
    const discountAmountPromise = discountAmountAPI(page);
    const discountPercentPromise = discountPercentAPI(page);

    await dashboard.previousBtn.first().click();

    const revenueResponse = await revenuePromise;
    const transactionResponse = await transactionPromise;
    const customerCountResponse = await customerCountPromise;
    const grossProfitResponse = await grossProfitPromise;
    const avgSalesValueResponse = await avgSalesValuePromise;
    const avgItemSaleResponse = await avgItemSalePromise;
    const discountAmountResponse = await discountAmountPromise;
    const discountPercentResponse = await discountPercentPromise;

    expect(revenueResponse.mode).toBe("Day");
    const startDate = revenueResponse.start_date;
    const endDate = revenueResponse.end_date;
    expect(startDate).toBe(endDate);
    const yesterday = yesterdayDate();
    expect(startDate).toBe(yesterday);
    expect(endDate).toBe(yesterday);
    expect(revenueResponse.status).toBeTruthy();
    const revenue = revenueResponse.total_revenue_data;
    console.log(revenue);
    const UIrevenue = await dashboard.UIRevenue();
    expect(normalizeMetric(UIrevenue)).toBe(normalizeMetric(revenue));

    expect(transactionResponse.status).toBeTruthy();
    expect(transactionResponse.message).toMatch(/Sales count computed/i);
    const APITransaction = transactionResponse.total_sale_count;
    console.log(APITransaction);
    const totalTransactionUI = await dashboard.UITransaction();
    expect(normalizeMetric(APITransaction)).toBe(
      normalizeMetric(totalTransactionUI),
    );

    expect(customerCountResponse.status).toBeTruthy();
    const APICustomers = customerCountResponse.total_customer_count;
    console.log(APICustomers);
    const UICustomers = await dashboard.UIUniqueCustomers();
    expect(normalizeMetric(APICustomers)).toBe(normalizeMetric(UICustomers));

    expect(grossProfitResponse.status).toBeTruthy();
    expect(grossProfitResponse.message).toMatch(/Gross profit summed/i);
    const APIProfit = grossProfitResponse.total_gross_profit;
    console.log(APIProfit);
    const UIProfit = await dashboard.UIProfit();
    expect(normalizeMetric(APIProfit)).toBe(normalizeMetric(UIProfit));

    expect(avgSalesValueResponse.status).toBeTruthy();
    const APIAov = avgSalesValueResponse.total_revenue_data;
    console.log(APIAov);
    const UIAov = await dashboard.UIAvgOrderValue();
    expect(normalizeMetric(APIAov)).toBe(normalizeMetric(UIAov));

    // Average Order Value = Total Sales Revenue / Total Transactions.
    const saleCount = Number(APITransaction);
    const expectedAov = saleCount === 0 ? 0 : Number(revenue) / saleCount;
    console.log(expectedAov);
    expect(
      normalizeMetric(UIAov),
      `Average Order Value should be ${revenue} / ${APITransaction}`,
    ).toBe(normalizeMetric(expectedAov));

    expect(avgItemSaleResponse.status).toBeTruthy();
    const APIItems = avgItemSaleResponse.total_revenue_data;
    console.log(APIItems);
    const UIItems = await dashboard.UIItemsPerTransaction();
    expect(normalizeMetric(APIItems)).toBe(normalizeMetric(UIItems));

    expect(discountPercentResponse.status).toBeTruthy();
    expect(discountPercentResponse.msg).toMatch(/Discount percentage/i);
    const APIDiscountPercent = discountPercentResponse.total_discount_per;
    console.log(APIDiscountPercent);
    const UIDiscountPercent = await dashboard.UIDiscountPercent();
    expect(normalizeMetric(APIDiscountPercent)).toBe(
      normalizeMetric(UIDiscountPercent),
    );

    expect(discountAmountResponse.status).toBeTruthy();
    expect(discountAmountResponse.msg).toMatch(/Discount data fetched/i);
    const APIDiscountAmount = discountAmountResponse.total_discount_data;
    console.log(APIDiscountAmount);
    const UIDiscountAmount = await dashboard.UIDiscountAmount();
    expect(normalizeMetric(APIDiscountAmount)).toBe(
      normalizeMetric(UIDiscountAmount),
    );
  });

  test("Checking Week filter Dashboard value", async () => {
    const revenuePromise = revenueAPI(page);
    const transactionPromise = totalTransaction(page);
    const customerCountPromise = customerCountAPI(page);
    const grossProfitPromise = grossProfitAPI(page);
    const avgSalesValuePromise = avgSalesValueAPI(page);
    const avgItemSalePromise = avgItemSaleAPI(page);
    const discountAmountPromise = discountAmountAPI(page);
    const discountPercentPromise = discountPercentAPI(page);

    await dashboard.weekView.first().click();

    const revenueResponse = await revenuePromise;
    const transactionResponse = await transactionPromise;
    const customerCountResponse = await customerCountPromise;
    const grossProfitResponse = await grossProfitPromise;
    const avgSalesValueResponse = await avgSalesValuePromise;
    const avgItemSaleResponse = await avgItemSalePromise;
    const discountAmountResponse = await discountAmountPromise;
    const discountPercentResponse = await discountPercentPromise;

    expect(revenueResponse.mode).toBe("Week");
    const startDate = revenueResponse.start_date;
    const endDate = revenueResponse.end_date;
    console.log(`${startDate} - ${endDate}`);
    const spanDays = daysBetween(startDate, endDate);
    expect(spanDays).toBeGreaterThanOrEqual(0);
    expect(spanDays).toBeLessThanOrEqual(6);
    expect(revenueResponse.status).toBeTruthy();
    const revenue = revenueResponse.total_revenue_data;
    console.log(revenue);
    const UIrevenue = await dashboard.UIRevenue();
    expect(normalizeMetric(UIrevenue)).toBe(normalizeMetric(revenue));

    expect(transactionResponse.status).toBeTruthy();
    expect(transactionResponse.message).toMatch(/Sales count computed/i);
    const APITransaction = transactionResponse.total_sale_count;
    console.log(APITransaction);
    const totalTransactionUI = await dashboard.UITransaction();
    expect(normalizeMetric(APITransaction)).toBe(
      normalizeMetric(totalTransactionUI),
    );

    expect(customerCountResponse.status).toBeTruthy();
    const APICustomers = customerCountResponse.total_customer_count;
    console.log(APICustomers);
    const UICustomers = await dashboard.UIUniqueCustomers();
    expect(normalizeMetric(APICustomers)).toBe(normalizeMetric(UICustomers));

    expect(grossProfitResponse.status).toBeTruthy();
    expect(grossProfitResponse.message).toMatch(/Gross profit summed/i);
    const weekAPIProfit = grossProfitResponse.gross_profit_data;
    //console.log("GF: ", weekAPIProfit);
    let totalProfit = 0;
    for (const profit of weekAPIProfit) {
      const APIProfit = profit.gross_profit;
      totalProfit += Number(APIProfit);
    }
    console.log("totalProfit: ", totalProfit);
    //const APIProfit = grossProfitResponse.total_gross_profit;
    // console.log(APIProfit);
    const UIProfit = await dashboard.UIProfit();
    expect(normalizeMetric(totalProfit)).toBe(normalizeMetric(UIProfit));

    expect(avgSalesValueResponse.status).toBeTruthy();
    const APIAov = avgSalesValueResponse.total_revenue_data;
    console.log(APIAov);
    const UIAov = await dashboard.UIAvgOrderValue();
    expect(normalizeMetric(APIAov)).toBe(normalizeMetric(UIAov));

    // Average Order Value = Total Sales Revenue / Total Transactions.
    const saleCount = Number(APITransaction);
    const expectedAov = saleCount === 0 ? 0 : Number(revenue) / saleCount;
    console.log(expectedAov);
    expect(
      normalizeMetric(UIAov),
      `Average Order Value should be ${revenue} / ${APITransaction}`,
    ).toBe(normalizeMetric(expectedAov));

    expect(avgItemSaleResponse.status).toBeTruthy();
    const APIItems = avgItemSaleResponse.total_revenue_data;
    console.log(APIItems);
    const UIItems = await dashboard.UIItemsPerTransaction();
    expect(normalizeMetric(APIItems)).toBe(normalizeMetric(UIItems));

    expect(discountPercentResponse.status).toBeTruthy();
    expect(discountPercentResponse.msg).toMatch(/Discount percentage/i);
    const APIDiscountPercent = discountPercentResponse.total_discount_per;
    console.log(APIDiscountPercent);
    const UIDiscountPercent = await dashboard.UIDiscountPercent();
    expect(normalizeMetric(APIDiscountPercent)).toBe(
      normalizeMetric(UIDiscountPercent),
    );

    expect(discountAmountResponse.status).toBeTruthy();
    expect(discountAmountResponse.msg).toMatch(/Discount data fetched/i);
    const getDiscount = discountAmountResponse.filter_discount_data;
    let totalDiscount = 0;
    for (const discount of getDiscount) {
      const APIDiscount = Number(discount.total_discount);
      totalDiscount += APIDiscount;
    }
    console.log(totalDiscount);
    // const APIDiscountAmount = discountAmountResponse.total_discount_data;
    // console.log(APIDiscountAmount);
    const UIDiscountAmount = await dashboard.UIDiscountAmount();
    expect(normalizeMetric(totalDiscount)).toBe(
      normalizeMetric(UIDiscountAmount),
    );
  });

  test("Checking Month filter Dashboard value", async () => {
    const revenuePromise = revenueAPI(page);
    const transactionPromise = totalTransaction(page);
    const customerCountPromise = customerCountAPI(page);
    const grossProfitPromise = grossProfitAPI(page);
    const avgSalesValuePromise = avgSalesValueAPI(page);
    const avgItemSalePromise = avgItemSaleAPI(page);
    const discountAmountPromise = discountAmountAPI(page);
    const discountPercentPromise = discountPercentAPI(page);

    await dashboard.monthView.first().click();

    const revenueResponse = await revenuePromise;
    const transactionResponse = await transactionPromise;
    const customerCountResponse = await customerCountPromise;
    const grossProfitResponse = await grossProfitPromise;
    const avgSalesValueResponse = await avgSalesValuePromise;
    const avgItemSaleResponse = await avgItemSalePromise;
    const discountAmountResponse = await discountAmountPromise;
    const discountPercentResponse = await discountPercentPromise;

    expect(revenueResponse.mode).toBe("Month");
    // const startDate = revenueResponse.start_date;
    // const endDate = revenueResponse.end_date;
    // console.log(`${startDate} - ${endDate}`);
    // expect(startDate.endsWith("-01")).toBeTruthy();
    // expect(startDate.slice(0, 7)).toBe(endDate.slice(0, 7));
    // expect(daysBetween(startDate, endDate)).toBeGreaterThanOrEqual(0);
    expect(revenueResponse.status).toBeTruthy();
    const revenue = revenueResponse.total_revenue_data;
    console.log(revenue);
    const UIrevenue = await dashboard.UIRevenue();
    expect(normalizeMetric(UIrevenue)).toBe(normalizeMetric(revenue));

    expect(transactionResponse.status).toBeTruthy();
    expect(transactionResponse.message).toMatch(/Sales count computed/i);
    const APITransaction = transactionResponse.total_sale_count;
    console.log(APITransaction);
    const totalTransactionUI = await dashboard.UITransaction();
    expect(normalizeMetric(APITransaction)).toBe(
      normalizeMetric(totalTransactionUI),
    );

    expect(customerCountResponse.status).toBeTruthy();
    const APICustomers = customerCountResponse.total_customer_count;
    console.log(APICustomers);
    const UICustomers = await dashboard.UIUniqueCustomers();
    expect(normalizeMetric(APICustomers)).toBe(normalizeMetric(UICustomers));

    expect(grossProfitResponse.status).toBeTruthy();
    expect(grossProfitResponse.message).toMatch(/Gross profit summed/i);
    const APIProfit = grossProfitResponse.total_gross_profit;
    console.log(APIProfit);
    const UIProfit = await dashboard.UIProfit();
    expect(normalizeMetric(APIProfit)).toBe(normalizeMetric(UIProfit));

    expect(avgSalesValueResponse.status).toBeTruthy();
    const APIAov = avgSalesValueResponse.total_revenue_data;
    console.log(APIAov);
    const UIAov = await dashboard.UIAvgOrderValue();
    expect(normalizeMetric(APIAov)).toBe(normalizeMetric(UIAov));

    // Average Order Value = Total Sales Revenue / Total Transactions.
    const saleCount = Number(APITransaction);
    const expectedAov = saleCount === 0 ? 0 : Number(revenue) / saleCount;
    console.log(expectedAov);
    expect(
      normalizeMetric(UIAov),
      `Average Order Value should be ${revenue} / ${APITransaction}`,
    ).toBe(normalizeMetric(expectedAov));

    expect(avgItemSaleResponse.status).toBeTruthy();
    const APIItems = avgItemSaleResponse.total_revenue_data;
    console.log(APIItems);
    const UIItems = await dashboard.UIItemsPerTransaction();
    expect(normalizeMetric(APIItems)).toBe(normalizeMetric(UIItems));

    expect(discountPercentResponse.status).toBeTruthy();
    expect(discountPercentResponse.msg).toMatch(/Discount percentage/i);
    const APIDiscountPercent = discountPercentResponse.total_discount_per;
    console.log(APIDiscountPercent);
    const UIDiscountPercent = await dashboard.UIDiscountPercent();
    expect(normalizeMetric(APIDiscountPercent)).toBe(
      normalizeMetric(UIDiscountPercent),
    );

    expect(discountAmountResponse.status).toBeTruthy();
    expect(discountAmountResponse.msg).toMatch(/Discount data fetched/i);
    const APIDiscountAmount = discountAmountResponse.total_discount_data;
    console.log(APIDiscountAmount);
    const UIDiscountAmount = await dashboard.UIDiscountAmount();
    expect(normalizeMetric(APIDiscountAmount)).toBe(
      normalizeMetric(UIDiscountAmount),
    );
  });

  test("Top Product sold", async () => {
    const topProductSoldPromise = topProductSold(page);
    await dashboard.monthView.first().click();

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
    const item_data = topProductSoldResponses.item_data;
    console.log(item_data);
    for (let i = 0; i < item_data.length - 1; i++) {
      const currentUnitSold = Number(item_data[i].unit_sold);
      const nextUnitSold = Number(item_data[i + 1].unit_sold);

      expect(currentUnitSold).toBeGreaterThanOrEqual(nextUnitSold);
    }
  });

  test("Recent Order Activity", async () => {
    const recentOrderPromise = recentOrders(page);
    await dashboard.dayView.first().click();
    let recentOrderResponses = await recentOrderPromise;
    const orderDetails = recentOrderResponses.data;
    console.log(orderDetails);
    if (orderDetails.length === 0) {
      expect(recentOrderResponses.count).toBe(0);
      console.log("Order count: 0");
      await expect(dashboard.recentOrderTitles).toHaveCount(0);
      return;
    }

    expect(recentOrderResponses.count).toBeGreaterThan(0);
    console.log("Order count present");

    const APIOrderIds = orderDetails.map(getApiOrderId);
    console.log(APIOrderIds);

    await expect(dashboard.recentOrderTitles.first()).toContainText(
      APIOrderIds[0],
    );
    const UIOrderIds = await dashboard.UIRecentOrderIds();
    expect(UIOrderIds.length).toBeGreaterThan(0);
    // The card renders only the first slice of the API list, in the same order.
    expect(UIOrderIds).toEqual(APIOrderIds.slice(0, UIOrderIds.length));
  });

  test("Validate report outlet API", async () => {
    test.setTimeout(180_000);

    const outletReports = [
      {
        name: "Total Sales Revenue",
        link: /View Total Sales Revenue report/i,
        wait: outletReportAPI,
      },
      {
        name: "Total Transactions",
        link: /View Total Transactions report/i,
        wait: storeSalesCountAPI,
      },
      {
        name: "Unique Customers",
        link: /View Unique Customers report/i,
        wait: customerCountStoreReportAPI,
      },
      {
        name: "Profit Generated",
        link: /View Profit Generated report/i,
        wait: storeGrossProfitAPI,
      },
      {
        name: "Average Order Value",
        link: /View Average Order Value report/i,
        wait: avgSaleValueReportAPI,
      },
      {
        name: "Items per Transaction",
        link: /View Items per Transaction report/i,
        wait: avgItemSaleReportAPI,
      },
      {
        name: "Discounts Given %",
        link: /View Discounts Given % report/i,
        wait: discountPercentAPI,
      },
      {
        name: "Discounts Given $",
        link: /View Discounts Given \$ report/i,
        wait: storeDiscountedReportAPI,
      },
    ];

    for (const report of outletReports) {
      await dashboard.navDashboard.click();
      await expect(dashboard.dashboardHeading).toBeVisible();

      const responsePromise = report.wait(page);
      await page.getByRole("link", { name: report.link }).first().click();
      const response = await responsePromise;
      console.log(report.name, response);

      expect(response.status, `${report.name} API should succeed`).toBeTruthy();
    }
    await dashboard.backBtnClick();
  });

  test("Test Dashboard for multiple store if available", async () => {
    const storeCount = getStoreCount();
    test.skip(
      storeCount < 2,
      "Single-store merchant — All Locations re-run not applicable",
    );

    // Open the picker first — that alone can fire KPI APIs and must NOT
    // satisfy the waiters meant for the All Locations Done refetch.
    await dashboard.locationClick();
    await dashboard.AllLocationsClick();

    const revenuePromise = revenueAPI(page);
    const transactionPromise = totalTransaction(page);
    const customerCountPromise = customerCountAPI(page);
    const grossProfitPromise = grossProfitAPI(page);
    const avgSalesValuePromise = avgSalesValueAPI(page);
    const avgItemSalePromise = avgItemSaleAPI(page);
    const discountAmountPromise = discountAmountAPI(page);
    const discountPercentPromise = discountPercentAPI(page);

    await dashboard.doneBtnClick();

    const revenueResponse = await revenuePromise;
    const transactionResponse = await transactionPromise;
    const customerCountResponse = await customerCountPromise;
    const grossProfitResponse = await grossProfitPromise;
    const avgSalesValueResponse = await avgSalesValuePromise;
    const avgItemSaleResponse = await avgItemSalePromise;
    const discountAmountResponse = await discountAmountPromise;
    const discountPercentResponse = await discountPercentPromise;

    await expect(
      page.getByRole("button", {
        name: new RegExp(`All Locations\\s*\\(${storeCount}\\)`, "i"),
      }),
    ).toBeVisible();

    // Wait for dashboard sections to finish loading before reading KPI text.
    await expect(page.getByLabel(/Loading top products/i)).toHaveCount(0);
    await expect(page.getByLabel(/Loading recent orders/i)).toHaveCount(0);

    expect(revenueResponse.mode).toBe("Day");
    const startDate = revenueResponse.start_date;
    const endDate = revenueResponse.end_date;
    expect(startDate).toBe(endDate);
    const today = getDate();
    expect(startDate).toBe(today);
    expect(endDate).toBe(today);
    expect(revenueResponse.message).toBe("Revenue from snapshot");
    expect(revenueResponse.status).toBeTruthy();
    const revenue = revenueResponse.total_revenue_data;
    console.log(revenue);

    // Web-first: retry until the tile matches the Done-click API payload.
    await expect
      .poll(async () => normalizeMetric(await dashboard.UIRevenue()), {
        message: "UI revenue should match All Locations revenue API",
      })
      .toBe(normalizeMetric(revenue));

    expect(transactionResponse.status).toBeTruthy();
    expect(transactionResponse.message).toMatch(/Sales count computed/i);
    const APITransaction = transactionResponse.total_sale_count;
    console.log(APITransaction);
    const totalTransactionUI = await dashboard.UITransaction();
    expect(normalizeMetric(totalTransactionUI)).toBe(
      normalizeMetric(APITransaction),
    );

    expect(customerCountResponse.status).toBeTruthy();
    const APICustomers = customerCountResponse.total_customer_count;
    console.log(APICustomers);
    const UICustomers = await dashboard.UIUniqueCustomers();
    expect(normalizeMetric(UICustomers)).toBe(normalizeMetric(APICustomers));

    expect(grossProfitResponse.status).toBeTruthy();
    expect(grossProfitResponse.message).toMatch(/Gross profit summed/i);
    const APIProfit = grossProfitResponse.total_gross_profit;
    console.log(APIProfit);
    const UIProfit = await dashboard.UIProfit();
    expect(normalizeMetric(UIProfit)).toBe(normalizeMetric(APIProfit));

    expect(avgSalesValueResponse.status).toBeTruthy();
    const APIAov = avgSalesValueResponse.total_revenue_data;
    console.log(APIAov);
    const UIAov = await dashboard.UIAvgOrderValue();
    expect(normalizeMetric(UIAov)).toBe(normalizeMetric(APIAov));

    const saleCount = Number(APITransaction);
    const expectedAov = saleCount === 0 ? 0 : Number(revenue) / saleCount;
    console.log(expectedAov);
    expect(
      normalizeMetric(UIAov),
      `Average Order Value should be ${revenue} / ${APITransaction}`,
    ).toBe(normalizeMetric(expectedAov));

    expect(avgItemSaleResponse.status).toBeTruthy();
    const APIItems = avgItemSaleResponse.total_revenue_data;
    console.log(APIItems);
    const UIItems = await dashboard.UIItemsPerTransaction();
    expect(normalizeMetric(UIItems)).toBe(normalizeMetric(APIItems));

    expect(discountPercentResponse.status).toBeTruthy();
    expect(discountPercentResponse.msg).toMatch(/Discount percentage/i);
    const APIDiscountPercent = discountPercentResponse.total_discount_per;
    console.log(APIDiscountPercent);
    const UIDiscountPercent = await dashboard.UIDiscountPercent();
    expect(normalizeMetric(UIDiscountPercent)).toBe(
      normalizeMetric(APIDiscountPercent),
    );

    expect(discountAmountResponse.status).toBeTruthy();
    expect(discountAmountResponse.msg).toMatch(/Discount data fetched/i);
    const APIDiscountAmount = discountAmountResponse.total_discount_data;
    console.log(APIDiscountAmount);
    const UIDiscountAmount = await dashboard.UIDiscountAmount();
    expect(normalizeMetric(UIDiscountAmount)).toBe(
      normalizeMetric(APIDiscountAmount),
    );
  });

  test("View Online Store APIs return 200", async () => {
    const popupPromise = page.waitForEvent("popup");
    await dashboard.viewStore.click();
    const storePage = await popupPromise;

    const [
      storeAndCategory,
      bogoList,
      mixMatch,
      stateList,
      products,
    ] = await Promise.all([
      merchantStoreAndCategoryAPI(storePage),
      activeBogoListAPI(storePage),
      mixMatchPricingListAPI(storePage),
      getStateListAPI(storePage),
      merchantProductsAPI(storePage),
    ]);

    expect(storeAndCategory.status).toBe(200);
    expect(bogoList).toBeDefined();
    expect(mixMatch).toBeDefined();
    expect(stateList).toBeDefined();
    expect(products).toBeDefined();
  });
});
