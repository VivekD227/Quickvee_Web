import { test, expect } from "@playwright/test";
import { EmployeeManagement } from "../pageObjects/EmployeeManagement";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { ManageRole } from "../pageObjects/ManageRole";
import merchants from "../api/testData/merchants.json";
import { getMerchantID } from "../utilities/helper/loginAndStoreMerchantID";
import { getPreset } from "../utilities/apiHelper/getPermissionPreset";

test.describe("Manage Role Module", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });
  let loginpage;
  let dashboard;
  let employeemanagement;
  let managerole;
  let m_id;
  let preset_id;
  let email;

  test.beforeEach(async ({ page }) => {
    loginpage = new LoginPage(page);
    dashboard = new Dashboard(page);
    employeemanagement = new EmployeeManagement(page);
    managerole = new ManageRole(page);

    await page.goto("https://quickvee.us/merchants/login");
    await getMerchantID(page, loginpage);
    await dashboard.logoDisplayed();
    await dashboard.menuClick();
    await dashboard.employeeClick();
    await dashboard.manage_employeeClick();
    await employeemanagement.manageRoleClick();
  });

  test("Manage", async ({ page }) => {
    // preset_id = "303";
    // email = merchants.validUser.username;
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
    const responseBody = await getPreset(
      page,
      managerole,
      "Manager",
      m_id,
      preset_id,
      email,
    );
    const status = responseBody.status;
    const permissionsArray = responseBody.data[0].permissions.split(",");

    const apiPermissionCount = permissionsArray.length;
    console.log(apiPermissionCount);
    const uiPermissionCount = await managerole.permissionValue();

    expect(uiPermissionCount).toBe(apiPermissionCount);
    //console.log(permissionCount);
    await managerole.verifyEditRoleDisplayed();
    await managerole.verifySearchBoxDisplayed();
  });
});
