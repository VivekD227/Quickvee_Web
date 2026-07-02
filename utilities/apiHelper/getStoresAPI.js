import { expect } from "@playwright/test";
const route = require("../routes.js");

export async function getStores(page) {
    const response = await page.waitForResponse((res) => res.request().method() === "POST" && res.url().includes(route.API_URL.getStoresManagement));
    const responseBody = await response.json();
    expect(response.status()).toBe(200);

    return responseBody;
}
