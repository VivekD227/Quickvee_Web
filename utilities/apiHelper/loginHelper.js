import { expect } from "@playwright/test";
const route = require("../routes.js");

export async function loginResponse(page) {
  const url = route.API_URL.login;
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url().includes(url),
    ),
  ]);

  expect(response.status()).toBe(200);
  expect(response.ok()).toBeTruthy();
  const responseBody = await response.json();

  return responseBody;
}
