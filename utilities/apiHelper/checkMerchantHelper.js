import { expect } from "@playwright/test";
const route = require("../routes.js");

export async function chkMerchantHelper(request, setPayload) {
    const url = route.API_URL.chkMerchant;
    const response = await request.post(url, {
        form: setPayload,
    });

    expect(response.status()).toBe(200);
    expect(response.ok()).toBeTruthy();
    const responseBody = await response.json();

    return responseBody;
}
