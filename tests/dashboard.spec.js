import { test, expect } from "@playwright/test";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";

test.describe("DashBoard Module", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  let loginpage;
  let dashboard;

  test.beforeEach(async ({ page }) => {
    await page.goto("https://quickvee.com/merchants/login");
    loginpage = new LoginPage(page);
    dashboard = new Dashboard(page);

    await loginpage.login("chain", "vivek.dubey521@gmail.com", "Quickvee123!");
    await dashboard.logoDisplayed();
  });

  test("Check UI", async ({ page }) => {
    let sName = "Chain Smoker";
    await dashboard.storenameDisplay();
    await dashboard.storeNameText(sName);
    await dashboard.menuClick();
    await page.pause();
  });
});
