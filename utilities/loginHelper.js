import { expect } from "@playwright/test";

export async function loginResponse(page, loginpage, storename, username, password) {

    const [response] = await Promise.all([
        page.waitForResponse((res) =>
            res.request().method() === "POST" && res.url().includes("LoginApiReact/create_session")

        ),
        loginpage.login(storename,username, password)
    ]);

    expect(response.status()).toBe(200);
    expect(response.ok()).toBeTruthy();
    const responseBody = await response.json();

    return responseBody;
}