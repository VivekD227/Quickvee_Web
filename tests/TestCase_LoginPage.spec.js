const { test, expect } = require("@playwright/test");
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";

test("Merchant Login", async ({ page }) => {
  await page.goto("https://quickvee.com/merchants/login");
  const loginpage = new LoginPage(page);
  await loginpage.LogoDisplayed();
  await loginpage.login("chain", "vivek.dubey521@gmail.com", "Quickvee123!");
  const dashboard = new Dashboard(page);
  await dashboard.storenameDisplay();
  await dashboard.profileBtnClick();
  await dashboard.logoutBtnClick();
});
