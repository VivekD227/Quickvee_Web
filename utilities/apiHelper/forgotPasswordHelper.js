import { expect } from "@playwright/test";

export async function forgotPasswordAPI(page, forgotpassword, email) {
  const [responseBody] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res
          .url()
          .includes(
            "https://api-ci.quickvee.us/LoginApiReact/reset_password_send",
          ),
    ),
    forgotpassword.setemailField(email),
    forgotpassword.submitBtnClick(),
  ]);

  expect(responseBody.status()).toBe(200);
  expect(responseBody.ok()).toBeTruthy();
  const response = responseBody.json();
  return response;
}
