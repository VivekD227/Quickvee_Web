import { expect } from "@playwright/test";
const route = require("../routes.js");

async function waitForStoreApi(page, apiUrl) {
  const response = await page.waitForResponse(
    (res) =>
      res.request().method() === "POST" && res.url().includes(apiUrl),
  );

  expect(response.status()).toBe(200);
  return response.json();
}

export async function merchantStoreAndCategoryAPI(page) {
  return waitForStoreApi(page, route.API_URL.merchantStoreAndCategory);
}

export async function activeBogoListAPI(page) {
  return waitForStoreApi(page, route.API_URL.activeBogoList);
}

export async function mixMatchPricingListAPI(page) {
  return waitForStoreApi(page, route.API_URL.mixMatchPricingList);
}

export async function getStateListAPI(page) {
  return waitForStoreApi(page, route.API_URL.getStateList);
}

export async function merchantProductsAPI(page) {
  return waitForStoreApi(page, route.API_URL.merchantProducts);
}

export async function waitForStorefrontApis(page) {
  const [storeAndCategory, bogoList, mixMatch, stateList, products] =
    await Promise.all([
      merchantStoreAndCategoryAPI(page),
      activeBogoListAPI(page),
      mixMatchPricingListAPI(page),
      getStateListAPI(page),
      merchantProductsAPI(page),
    ]);

  return { storeAndCategory, bogoList, mixMatch, stateList, products };
}
