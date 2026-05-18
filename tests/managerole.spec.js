import { test, expect } from "@playwright/test";
import { EmployeeManagement } from "../pageObjects/EmployeeManagement";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { ManageRole } from "../pageObjects/ManageRole";
import merchants from "../api/testData/merchants.json";

const DEFAULT_ROLE_PERMISSIONS = [
  { role: "Manager", count: 133 },
  { role: "Cashier", count: 17 },
  { role: "Driver", count: 2 },
  { role: "Time Clock Only", count: 1 },
];

test.describe("Manage Role Module", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });
  let loginpage;
  let dashboard;
  let employeemanagement;
  let managerole;
  let sName;
  let uName;
  let pwd;

  test.beforeEach(async ({ page }) => {
    loginpage = new LoginPage(page);
    dashboard = new Dashboard(page);
    employeemanagement = new EmployeeManagement(page);
    managerole = new ManageRole(page);
    sName = merchants.validUser.storename;
    uName = merchants.validUser.username;
    pwd = merchants.validUser.password;

    await page.goto("https://quickvee.com/merchants/login");
    await loginpage.login(sName, uName, pwd);
    await dashboard.logoDisplayed();
    await dashboard.menuClick();
    await dashboard.employeeClick();
    await dashboard.manage_employeeClick();
    await employeemanagement.manageRoleClick();
  });

  test("Manage", async ({ page }) => {
    await managerole.getmanageemptext("Manage Employee Roles");
    await managerole.getcreateText(
      "Create and customize roles with specific permissions",
    );
    await managerole.getselectRole_text("Select a role to edit");
    await managerole.getchooseRole_text(
      "Choose a role from the list or create a new one",
    );

    await managerole.matchRow();
    await page.waitForTimeout(3000);
    await managerole.verifyDefaultName();
    await managerole.defaultCheck();
    await managerole.editBtnCountCheck();
  });

  test("Compare default role permission counts in list", async () => {
    for (const { role, count } of DEFAULT_ROLE_PERMISSIONS) {
      const actualCount = await managerole.compareListPermissionCount(
        role,
        count,
      );
      expect(actualCount).toBe(count);
    }
  });

  for (const { role, count } of DEFAULT_ROLE_PERMISSIONS) {
    test(`Compare ${role} list vs edit panel permission count (${count})`, async () => {
      const { listCount, panelCount, expectedCount } =
        await managerole.verifyRolePermissionCountsMatch(role);

      expect(listCount).toBe(expectedCount);
      expect(panelCount).toBe(expectedCount);
      expect(listCount).toBe(panelCount);
    });
  }

  test("Edit Manager Role - panel UI", async () => {
    await managerole.verifyRolePermissionCountsMatch("Manager");
    await managerole.verifyEditingManagerDisplayed();
    await managerole.verifyRoleNameIsManagerAndNotEditable();
    await managerole.verifySearchBoxDisplayed();
    await managerole.verifyEditingRoleDisplayed("Manager");
  });
});
