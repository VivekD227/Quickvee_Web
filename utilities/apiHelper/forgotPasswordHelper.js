import { expect } from "@playwright/test";
import routes from "../routes.js";

export async function forgotPasswordAPI(page, forgotpassword, email) {
  const [responseBody] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url() === routes.API_URL.resetPasswordSend_URL,
    ),
    forgotpassword.setemailField(email),
    forgotpassword.submitBtnClick(),
  ]);

  expect(responseBody.status()).toBe(200);
  expect(responseBody.ok()).toBeTruthy();
  const response = responseBody.json();
  return response;
}
