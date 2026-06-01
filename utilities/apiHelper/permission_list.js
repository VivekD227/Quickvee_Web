import { expect } from "@playwright/test";

export async function getPermission(page, managerole) {
    const [response] = await Promise.all([
        page.waitForResponse(
            (res) =>
                res.request().method() === "POST" &&
                res.url().includes("/Store_setting_react_api/permission_list"),
        ),
    ]);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    const responseBody = await response.json();
    return responseBody;
}
