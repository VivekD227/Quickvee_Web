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

export async function customerLoginAPI(page, submitFn) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(route.API_URL.customerLogin),
    ),
    submitFn(),
  ]);

  expect(response.status()).toBe(200);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function waitForCustomerLoginResponse(page, submitFn) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(route.API_URL.customerLogin),
    ),
    submitFn(),
  ]);
  return { httpStatus: response.status(), body: await response.json() };
}

export async function buyItAgainAPI(page, clickFn) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(route.API_URL.buyItAgain),
    ),
    clickFn(),
  ]);

  expect(response.status()).toBe(200);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function buyNowProductAPI(page, clickFn) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(route.API_URL.getProductById),
    ),
    clickFn(),
  ]);

  expect(response.status()).toBe(200);
  expect(response.ok()).toBeTruthy();
  return response.json();
}
