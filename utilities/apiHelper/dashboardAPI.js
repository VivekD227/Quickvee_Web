import { expect } from "@playwright/test";
const route = require("../routes.js");

async function waitForReportApi(page, apiUrl) {
  const response = await page.waitForResponse(
    (res) =>
      res.request().method() === "POST" && res.url().includes(apiUrl),
  );

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

export async function topProductSold(page) {
  return waitForReportApi(page, route.API_URL.topProductSoldAPI);
}

export async function recentOrders(page) {
  return waitForReportApi(page, route.API_URL.recentOrder);
}

export async function outletReportAPI(page) {
  return waitForReportApi(page, route.API_URL.outletReportAPI);
}

export async function storeSalesCountAPI(page) {
  return waitForReportApi(page, route.API_URL.storeSalesCountAPI);
}

export async function customerCountStoreReportAPI(page) {
  return waitForReportApi(page, route.API_URL.customerCountStoreReportAPI);
}

export async function storeGrossProfitAPI(page) {
  return waitForReportApi(page, route.API_URL.storeGrossProfitAPI);
}

export async function avgSaleValueReportAPI(page) {
  return waitForReportApi(page, route.API_URL.avgSaleValueReportAPI);
}

export async function avgItemSaleReportAPI(page) {
  return waitForReportApi(page, route.API_URL.avgItemSaleReportAPI);
}

export async function storeDiscountedReportAPI(page) {
  return waitForReportApi(page, route.API_URL.storeDiscountedReportAPI);
}
