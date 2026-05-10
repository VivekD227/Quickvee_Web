const { test, expect } = require("@playwright/test");
import { loginPayload } from "../payloads/merchantLoginPayload";
import { APIClients } from "../clients/APIClients";
const merchants = require("../testData/merchants.json");


test("Login API test", async ({ request }) => {
    const apiClients = new APIClients(request);
    const payload = loginPayload(
        merchants.validUser.username,

        merchants.validUser.password,

        merchants.validUser.storename,

        merchants.validUser.otp

    );

    const url = 'https://api-ci.quickvee.us/LoginApiReact/create_session';
    const response = await apiClients.post(url, payload);
    const responseBody = await response.json();
    //console.log(responseBody);

    // Basic response validation
    expect(response.ok()).toBeTruthy();
    expect(responseBody).toBeTruthy();
    expect(responseBody.status).toBe(true);
    expect(responseBody.login_type).toBe("merchant");
    // expect(responseBody.token).toBe(
    //     "78e2e1b93e0bf5232152631c1a83115d13a69c6cf30fd0b347044b7b4ec3"
    // );
    // expect(responseBody.token_id).toBe(894308);
    expect(responseBody.permissions).toEqual([]);
    expect(responseBody.final_login).toBe(1);
 //   expect(responseBody.otp_required).toBe(0);

    // Merchant data validation: Chain Smoker
    const data = responseBody?.data;
    expect(data).toBeTruthy();
    expect(data.zoho_enable).toBe("");
    expect(data.id).toBe("102927");
    expect(data.owner_name).toBe("Chain Smoker");
    expect(data.name).toBe("Chain Smoker");
    expect(data.email).toBe(merchants.validUser.username);
    expect(data.merchant_id).toBe("VIV102927MA");
    expect(data.user_type).toBe("merchant");
   
    expect(data.group_id).toBe("2675");

    // Store test case: Chain Smoker
    const stores = responseBody?.data2?.stores;
    expect(Array.isArray(stores)).toBe(true);

    const chainSmokerStore = stores.find((s) => s?.name === "Chain Smoker");
    expect(chainSmokerStore).toBeTruthy();

    expect(chainSmokerStore.id).toBe("102927");
    expect(chainSmokerStore.name).toBe("Chain Smoker");
    expect(chainSmokerStore.login_store_name).toBe("chain");
    expect(chainSmokerStore.phone).toBe("8928185552");
    expect(chainSmokerStore.merchant_id).toBe("VIV102927MA");
    expect(chainSmokerStore.user_type).toBe("merchant");
    expect(chainSmokerStore.status).toBe("2");
    expect(chainSmokerStore.group_id).toBe("2675");

})