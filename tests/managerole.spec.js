import { test, expect } from "@playwright/test";
import { EmployeeManagement } from "../pageObjects/EmployeeManagement";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { ManageRole } from "../pageObjects/ManageRole";

test.describe("Manage Role Module", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });
  let loginpage;
  let dashboard;
  let employeemanagement;
  let managerole;
  test.beforeEach(async ({ page }) => {
    loginpage = new LoginPage(page);
    dashboard = new Dashboard(page);
    employeemanagement = new EmployeeManagement(page);
    managerole = new ManageRole(page);

    await page.goto("https://quickvee.com/merchants/login");
    await loginpage.login("chain", "vivek.dubey521@gmail.com", "Quickvee123!");
    await dashboard.logoDisplayed();
  });

  test("Manage", async ({ page }) => {
    await dashboard.menuClick();
    await dashboard.employeeClick();
    await dashboard.manage_employeeClick();
    await employeemanagement.manageRoleClick();
    await managerole.getmanageemptext("Manage Employee Roles");
    await managerole.getcreateText(
      "Create and customize roles with specific permissions",
    );
    await managerole.getselectRole_text("Select a role to edit");
    await managerole.getchooseRole_text(
      "Choose a role from the list or create a new one",
    );

    await managerole.getRoleCount();
  });
});
