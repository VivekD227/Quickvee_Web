import { expect } from require("@playwright/test");

export async function forgotPasswordAPI(page, forgotpassword, email) {

    const [responseBody] = await Promise.all([
        page.waitForResponse((res) =>
            res.request().method() === "POST" && res.url().includes("https://api-ci.quickvee.us/LoginApiReact/reset_password_send")

        ),
        forgotpassword.setemailField(email)
    ])

    expect(responseBody.ok()).toBeTruthy();
    expect(responseBody.status()).tobe(200);
    const response = responseBody.json();
    return response;
}

