import { expect } from "@playwright/test";
const route = require("../routes.js");

async function waitForReportApi(page, apiUrl, { postDataIncludes } = {}) {
  const response = await page.waitForResponse((res) => {
    if (res.request().method() !== "POST" || !res.url().includes(apiUrl)) {
      return false;
    }
    if (postDataIncludes) {
      const data = res.request().postData() || "";
      return data.includes(postDataIncludes);
    }
    return true;
  });
  expect(response.status()).toBe(200);
  return response.json();
}

export async function revenueAPI(page) {
  return waitForReportApi(page, route.API_URL.revenueDataAPI);
}

export async function totalTransaction(page) {
  return waitForReportApi(page, route.API_URL.totalTransaction);
}

export async function customerCountAPI(page) {
  return waitForReportApi(page, route.API_URL.customerCountAPI);
}

export async function grossProfitAPI(page) {
  return waitForReportApi(page, route.API_URL.grossProfitAPI);
}

export async function avgSalesValueAPI(page) {
  return waitForReportApi(page, route.API_URL.avgSalesValueAPI);
}

export async function avgItemSaleAPI(page) {
  return waitForReportApi(page, route.API_URL.avgItemSaleAPI);
}

export async function discountAmountAPI(page) {
  return waitForReportApi(page, route.API_URL.discountAmountAPI);
}

export async function discountPercentAPI(page) {
  return waitForReportApi(page, route.API_URL.discountPercentAPI);
}

export async function topProductSold(page, options) {
  return waitForReportApi(page, route.API_URL.topProductSoldAPI, options);
}
