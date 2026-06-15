import { expect } from "@playwright/test";
const route = require("../routes.json");

export async function loginResponse(
  page,
  loginpage,
  storename,
  username,
  password,
) {
  const url = route.QA_URL.login;
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url().includes(url),
    ),
    loginpage.login(storename, username, password),
    loginpage.successAPILoginMerchant(),
  ]);

  expect(response.status()).toBe(200);
  expect(response.ok()).toBeTruthy();
  const responseBody = await response.json();

  return responseBody;
}
