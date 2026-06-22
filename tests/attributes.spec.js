import { test } from "@playwright/test";
import { Attributes } from "../pageObjects/Attributes";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { navigateToQALoginPage } from "../utilities/helper/navigationHelper";
import merchants from "../api/testData/merchants.json";
import routes from "../utilities/routes.json";

test.describe("Attributes Module", () => {
    test.describe.configure({ mode: "serial", timeout: 120_000 });

    let context;
    let page;
    let loginpage;
    let dashboard;
    let attributes;
    let sName;
    let uName;
    let pwd;

    test.beforeAll(
        async ({ browser }) => {
            test.setTimeout(90_000);
            context = await browser.newContext();
            page = await context.newPage();

            loginpage = new LoginPage(page);
            dashboard = new Dashboard(page);
            attributes = new Attributes(page);
            sName = merchants.merchantLogin.storename;
            uName = merchants.merchantLogin.username;
            pwd = merchants.merchantLogin.password;

            await navigateToQALoginPage(page);
            const [loginApiResponse] = await Promise.all([
                page.waitForResponse(
                    (res) =>
                        res.request().method() === "POST" &&
                        res.url().includes(routes.QA_URL.login),
                ),
                loginpage.login(sName, uName, pwd),
            ]);
            await loginApiResponse.json();
            await dashboard.logoDisplayed();
            await dashboard.menuClick();
            await dashboard.inventoryClick();
            await dashboard.attributesClick();
        },
        { timeout: 90_000 },
    );

    test.afterAll(async () => {
        await context?.close();
    });

    test("Login and open Attributes page", async () => {
        await attributes.verifyAttributesPageLoaded();
    });

    test("Verify page URL", async () => {
        await attributes.verifyPageUrl();
    });

    test("List API on page load", async () => {
        await attributes.verifyListApiOnPageLoad();
    });

    test("Verify Attributes page UI elements are displayed", async () => {
        await attributes.verifyAttributesPageUIElements();
    });

    test("Verify Attributes page description text", async () => {
        await attributes.verifyAttributesDescriptionText();
    });
});
