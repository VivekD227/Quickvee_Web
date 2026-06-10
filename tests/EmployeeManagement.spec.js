import { test, expect } from "@playwright/test";
import { EmployeeManagement } from "../pageObjects/EmployeeManagement";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import merchants from "../api/testData/merchants.json";

test.describe("Add Employee Module", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let employeemanagement;
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
      employeemanagement = new EmployeeManagement(page);
      sName = merchants.merchantLogin.storename;
      uName = merchants.merchantLogin.username;
      pwd = merchants.merchantLogin.password;
      await navigateToLoginPage(page);
      await loginpage.login(sName, uName, pwd);
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
