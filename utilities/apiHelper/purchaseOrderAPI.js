import { expect } from "@playwright/test";
const route = require("../routes.js");

async function waitResponse(page, APIUrl) {
  const response = await page.waitForResponse(
    (res) => res.request().method() === "POST" && res.url().includes(APIUrl),
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
