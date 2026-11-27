import { test, expect } from "@playwright/test";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import merchants from "../api/testData/merchants.json";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import { getStores } from "../utilities/apiHelper/getStoresAPI";
import {
  dashboardData,
  outletReportAPI,
  storeSalesCountAPI,
  customerCountStoreReportAPI,
  storeGrossProfitAPI,
  avgSaleValueReportAPI,
  avgItemSaleReportAPI,
  discountPercentAPI,
  storeDiscountedReportAPI,
} from "../utilities/apiHelper/dashboardAPI";

/** Local YYYY-MM-DD (the dashboard sends the browser's local date), `offset` days from today. */
function localDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
  let storeResponse;
  let dayResponse;
  let monthResponse;

  /** Compare the 8 KPI tiles with the dashboard API's `kpis`, and the period's trend entry. */
  async function verifyKpis(data, mode) {
    expect(data.status).toBeTruthy();
    expect(data.activeType).toBe(mode);
    const { kpis, headline } = data;
    console.log(mode, JSON.stringify(headline), JSON.stringify(kpis));

    const tiles = [
      ["Total Sales Revenue", () => dashboard.UIRevenue(), kpis.revenue.value],
      ["Total Transactions", () => dashboard.UITransaction(), kpis.transactions.value],
      ["Unique Customers", () => dashboard.UIUniqueCustomers(), kpis.customers.value],
      ["Profit Generated", () => dashboard.UIProfit(), kpis.profit.value],
      ["Average Order Value", () => dashboard.UIAvgOrderValue(), kpis.aov.value],
      ["Items per Transaction", () => dashboard.UIItemsPerTransaction(), kpis.items_per_txn.value],
      ["Discounts Given %", () => dashboard.UIDiscountPercent(), kpis.discount_pct.value],
      ["Discounts Given $", () => dashboard.UIDiscountAmount(), kpis.discount_amt.value],
    ];
    // Web-first: the tiles render shortly after the response arrives.
    for (const [name, readUi, apiValue] of tiles) {
      await expect
        .poll(async () => normalizeMetric(await readUi()), { message: `${name} tile should match the API` })
        .toBe(normalizeMetric(apiValue));
    }

    // Average Order Value = Total Sales Revenue / Total Transactions.
    const txns = Number(kpis.transactions.value);
    const expectedAov = txns === 0 ? 0 : Number(kpis.revenue.value) / txns;
    expect(
      normalizeMetric(kpis.aov.value),
      `Average Order Value should be ${kpis.revenue.value} / ${txns}`,
    ).toBe(normalizeMetric(expectedAov));

    // The chart's last period is the one on the tiles.
    const current = data.trend.at(-1);
    expect(current.start).toBe(headline.start);
    expect(current.end).toBe(headline.end);
    expect(normalizeMetric(current.revenue)).toBe(normalizeMetric(kpis.revenue.value));
    expect(Number(current.transactions)).toBe(txns);
  }

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      const { storename, username, password } = merchants.merchantLogin;

      await navigateToLoginPage(page);
      const storesPromise = getStores(page);
      const dashboardPromise = dashboardData(page);

      await loginpage.login(storename, username, password);

      [storeResponse, dayResponse] = await Promise.all([storesPromise, dashboardPromise]);

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

  test("Checking Day filter Dashboard value", async () => {
    const today = localDate();
    expect(dayResponse.headline).toEqual({ start: today, end: today });
    expect(dayResponse.trend).toHaveLength(7);
    await verifyKpis(dayResponse, "Day");
  });

  test("Checking Yesterday Dashboard value", async () => {
    const responsePromise = dashboardData(page);
    await dashboard.previousBtn.first().click();
    const response = await responsePromise;

    const yesterday = localDate(-1);
    expect(response.headline).toEqual({ start: yesterday, end: yesterday });
    await verifyKpis(response, "Day");
  });

  test("Checking Week filter Dashboard value", async () => {
    const responsePromise = dashboardData(page);
    await dashboard.weekView.first().click();
    const response = await responsePromise;

    const { start, end } = response.headline;
    console.log(`${start} - ${end}`);
    expect(daysBetween(start, end)).toBe(6);
    const today = localDate();
    expect(start <= today && today <= end, `${today} should be in ${start} – ${end}`).toBeTruthy();
    await verifyKpis(response, "Week");
  });

  test("Checking Month filter Dashboard value", async () => {
    const responsePromise = dashboardData(page);
    await dashboard.monthView.first().click();
    monthResponse = await responsePromise;

    const { start, end } = monthResponse.headline;
    const today = localDate();
    expect(start).toBe(`${today.slice(0, 7)}-01`);
    expect(end.slice(0, 7)).toBe(today.slice(0, 7));
    expect(today <= end).toBeTruthy();
    await verifyKpis(monthResponse, "Month");
  });

  test("Top Product sold", async () => {
    // Month view is still open from the previous test.
    const items = monthResponse.top_products ?? [];
    console.log(items);
    await expect(dashboard.topProductsHeading).toBeVisible();
    if (items.length === 0) {
      await expect(page.getByText("No Data Found.").first()).toBeVisible();
      return;
    }
    expect(items.length).toBeLessThanOrEqual(10);
    for (let i = 0; i < items.length - 1; i++) {
      expect(Number(items[i].unit_sold)).toBeGreaterThanOrEqual(Number(items[i + 1].unit_sold));
    }
    for (const item of items) await expect(page.getByText(item.name, { exact: true }).first()).toBeVisible();
  });

  test("Recent Order Activity", async () => {
    const responsePromise = dashboardData(page);
    await dashboard.dayView.first().click();
    const response = await responsePromise;
    const orders = response.recent_activity ?? [];
    console.log(orders);
    if (orders.length === 0) {
      await expect(dashboard.recentOrderTitles).toHaveCount(0);
      return;
    }

    const APIOrderIds = orders.map(getApiOrderId);
    console.log(APIOrderIds);

    await expect(dashboard.recentOrderTitles.first()).toContainText(APIOrderIds[0]);
    const UIOrderIds = await dashboard.UIRecentOrderIds();
    expect(UIOrderIds.length).toBeGreaterThan(0);
    // The card renders the API list in the same order.
    expect(UIOrderIds).toEqual(APIOrderIds.slice(0, UIOrderIds.length));
  });

  test("Validate report outlet API", async () => {
    test.setTimeout(180_000);

    const outletReports = [
      { name: "Total Sales Revenue", link: /View Total Sales Revenue report/i, wait: outletReportAPI },
      { name: "Total Transactions", link: /View Total Transactions report/i, wait: storeSalesCountAPI },
      { name: "Unique Customers", link: /View Unique Customers report/i, wait: customerCountStoreReportAPI },
      { name: "Profit Generated", link: /View Profit Generated report/i, wait: storeGrossProfitAPI },
      { name: "Average Order Value", link: /View Average Order Value report/i, wait: avgSaleValueReportAPI },
      { name: "Items per Transaction", link: /View Items per Transaction report/i, wait: avgItemSaleReportAPI },
      { name: "Discounts Given %", link: /View Discounts Given % report/i, wait: discountPercentAPI },
      { name: "Discounts Given $", link: /View Discounts Given \$ report/i, wait: storeDiscountedReportAPI },
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
    test.skip(storeCount < 2, "Single-store merchant — All Locations re-run not applicable");

    // Open the picker first — that alone can refetch and must NOT
    // satisfy the waiter meant for the All Locations Done refetch.
    await dashboard.locationClick();
    await dashboard.AllLocationsClick();

    const responsePromise = dashboardData(page);
    await dashboard.doneBtnClick();
    const response = await responsePromise;

    await expect(
      page.getByRole("button", { name: new RegExp(`All Locations\\s*\\(${storeCount}\\)`, "i") }),
    ).toBeVisible();
    expect(response.merchant_ids.length).toBe(storeCount);
    const today = localDate();
    expect(response.headline).toEqual({ start: today, end: today });
    await verifyKpis(response, "Day");
  });
});
