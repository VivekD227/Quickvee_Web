import { test, expect } from "@playwright/test";
import { EmployeeManagement } from "../pageObjects/EmployeeManagement";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { getMerchantID } from "../utilities/helper/loginAndStoreMerchantID";

test.describe("Add Employee Module", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let employeemanagement;

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      employeemanagement = new EmployeeManagement(page);

      await page.goto("https://quickvee.com/merchants/login");
      await getMerchantID(page, loginpage);
      await dashboard.logoDisplayed();
      await dashboard.menuClick();
      await dashboard.employeeClick();
      await dashboard.manage_employeeClick();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    await context?.close();
  });

  test("Check UI", async () => {
    await employeemanagement.manageRoleVisible();
    await employeemanagement.addEmployeeVisible();
    await employeemanagement.empmanagementDisplay();
    await employeemanagement.employeeTextDisplay();
    await employeemanagement.searchBarDisplay();
    await employeemanagement.filtersDisplay();
    await employeemanagement.sortNameDisplay();
    await employeemanagement.sortUpdateDisplay();
    await employeemanagement.allStoreDisplay();
    await employeemanagement.allRolesDisplay();
    await employeemanagement.selectAllDisplay();
  });
});
