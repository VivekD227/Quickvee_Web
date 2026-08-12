import { expect } from "@playwright/test";
const route = require("../routes.js");


function matchesApiUrl(responseUrl, apiUrl) {
  try {
    const actual = new URL(responseUrl);
    const expected = new URL(apiUrl);
    return (
      actual.origin === expected.origin && actual.pathname === expected.pathname
    );
  } catch {
    return responseUrl.split("?")[0] === apiUrl.split("?")[0];
  }
}

async function waitResponse(page, APIUrl) {
  const response = await page.waitForResponse(
    (res) =>
      res.request().method() === "POST" && matchesApiUrl(res.url(), APIUrl),
  );

  expect(response.status()).toBe(200);
  return response.json();
}

export async function purchaseOrderList(page) {
  return waitResponse(page, route.API_URL.purchaseOrderList);
}

export async function purchaseOrderKPICount(page) {
  return waitResponse(page, route.API_URL.purchaseOrderKPICount);
}

export async function purchaseOrderListCount(page) {
  return waitResponse(page, route.API_URL.purchaseOrderListCount);
}

export async function generatePONumber(page) {
  return waitResponse(page, route.API_URL.generatePONumberAPI);
}
