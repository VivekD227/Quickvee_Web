import { expect, test } from "@playwright/test";
const merchants = require("../api/testData/merchants.json")
import { chkMerchantHelper } from "../utilities/apiHelper/checkMerchantHelper";

test.describe("Check Merchant API Testing", () => {

    test("Valid Merchant Email Id", async ({ request }) => {
        const checkMerchantResponse = await chkMerchantHelper(request, {
            username: merchants.merchantLogin.username,
        });
        await expect(checkMerchantResponse).toBe(true);
        console.log(checkMerchantResponse);
    })

    test("Employee Email id", async ({ request }) => {
        const chkMerchantResponse = await chkMerchantHelper(request, {
            username: merchants.employeeLogin.username
        })

        await expect(chkMerchantResponse).toBe(true);
        console.log(chkMerchantResponse);

    })

    test("Invalid Email id", async ({ request }) => {
        const chkMerchantResponse = await chkMerchantHelper(request, {
            username: "vivek@"
        })

        await expect(chkMerchantResponse).toBe(false);
        console.log(chkMerchantResponse);

    })
})