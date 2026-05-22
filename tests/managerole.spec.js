import { test, expect } from "@playwright/test";
import { EmployeeManagement } from "../pageObjects/EmployeeManagement";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { ManageRole } from "../pageObjects/ManageRole";
import { getMerchantID } from "../utilities/helper/loginAndStoreMerchantID";
import { getPreset } from "../utilities/apiHelper/getPermissionPreset";

const ROLES = ["Manager", "Cashier", "Driver", "Time Clock Only"];
const TOTAL_PERMISSIONS = 160;

test.describe("Manage Role Module", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let employeemanagement;
  let managerole;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    loginpage = new LoginPage(page);
    dashboard = new Dashboard(page);
    employeemanagement = new EmployeeManagement(page);
    managerole = new ManageRole(page);

    await page.goto("https://quickvee.com/merchants/login");
    await getMerchantID(page, loginpage);
    await dashboard.logoDisplayed();
    await dashboard.menuClick();
    await dashboard.employeeClick();
    await dashboard.manage_employeeClick();
    await employeemanagement.manageRoleClick();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test("Verify Manage Role page layout", async () => {
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

  for (const roleName of ROLES) {
    test(`Verify and update permissions for ${roleName}`, async () => {
      let responseBody;
      let permissionsArray;
      let apiPermissionCount;
      let uiPermissionCount;
      let checkper;
      let checkedPermissions;
      let allPermissionCount;
      let updatedCheckedCount;
      let finalPerCount;

      responseBody = await getPreset(page, managerole, roleName);
      permissionsArray = responseBody.data[0].permissions.split(",");

      apiPermissionCount = permissionsArray.length;
      console.log(`${roleName} API permission count:`, apiPermissionCount);
      uiPermissionCount = await managerole.permissionValue();

      expect(uiPermissionCount).toBe(apiPermissionCount);
      checkper = await managerole.checkedPermissionsCount();
      expect(uiPermissionCount).toBe(checkper);

      await managerole.verifyEditRoleDisplayed();
      await managerole.verifySearchBoxDisplayed();
      checkedPermissions = await managerole.allCheckedValue();
      expect(permissionsArray.sort()).toEqual(checkedPermissions.sort());

      allPermissionCount = await managerole.allPermissionCount();
      expect(allPermissionCount).toBe(TOTAL_PERMISSIONS);

      await managerole.checkEmployeeDeleteForever();
      updatedCheckedCount = await managerole.checkedPermissionsCount();
      expect(updatedCheckedCount).toBe(uiPermissionCount + 1);

      await managerole.saveBtnClick();
      await page.waitForTimeout(3000);
      await managerole.updateDialogDisplay();
      finalPerCount = await managerole.mainPagePermissionCount(roleName);
      expect(finalPerCount).toBe(updatedCheckedCount);

      responseBody = await getPreset(page, managerole, roleName);
      permissionsArray = responseBody.data[0].permissions.split(",");

      apiPermissionCount = permissionsArray.length;
      console.log(
        `${roleName} API permission count after save:`,
        apiPermissionCount,
      );
      uiPermissionCount = await managerole.permissionValue();

      expect(uiPermissionCount).toBe(apiPermissionCount);
      checkper = await managerole.checkedPermissionsCount();
      expect(uiPermissionCount).toBe(checkper);

      await managerole.verifyEditRoleDisplayed();
      await managerole.verifySearchBoxDisplayed();
      checkedPermissions = await managerole.allCheckedValue();
      expect(permissionsArray.sort()).toEqual(checkedPermissions.sort());

      allPermissionCount = await managerole.allPermissionCount();
      expect(allPermissionCount).toBe(TOTAL_PERMISSIONS);

      await managerole.uncheckEmployeeDeleteForever();
      updatedCheckedCount = await managerole.checkedPermissionsCount();
      expect(updatedCheckedCount).toBe(uiPermissionCount - 1);

      await managerole.saveBtnClick();
      await page.waitForTimeout(3000);
      await managerole.updateDialogDisplay();
      finalPerCount = await managerole.mainPagePermissionCount(roleName);
      expect(finalPerCount).toBe(updatedCheckedCount);
    });
  }
});
