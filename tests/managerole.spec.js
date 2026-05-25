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
    test.setTimeout(90_000);
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
  }, { timeout: 90_000 });

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

  test("Create new role with Select All permissions", async () => {
    test.setTimeout(120_000);
    const roleName = managerole.generateUniqueRoleName();
    let actualRoleName;
    let allPermissionCount;
    let checkedCount;

    await managerole.openCreateRoleForm();
    actualRoleName = await managerole.fillNewRoleName(roleName);
    await managerole.selectAllPermissionsClick();

    allPermissionCount = await managerole.allPermissionCount();
    expect(allPermissionCount).toBe(TOTAL_PERMISSIONS);

    checkedCount = await managerole.checkedPermissionsCount();
    expect(checkedCount).toBe(TOTAL_PERMISSIONS);

    await managerole.submitNewRoleClick();
    await page.waitForTimeout(3000);
    await managerole.createdDialogDisplay();
    await managerole.verifyRoleListedWithPermissionCount(
      actualRoleName,
      TOTAL_PERMISSIONS,
    );

    await managerole.clickEditForRole(actualRoleName);
    await managerole.verifyEditRoleDisplayed();
    await managerole.clearAllPermissionsClick();

    expect(await managerole.permissionValue()).toBe(0);
    checkedCount = await managerole.checkedPermissionsCount();
    expect(checkedCount).toBe(0);

    await managerole.assertSaveBlockedWithNoPermissions();
    await managerole.searchText("Employee Delete Forever");
    await managerole.checkEmployeeDeleteForever();
    checkedCount = await managerole.checkedPermissionsCount();
    expect(checkedCount).toBe(1);

    await managerole.saveBtnClick();
    await page.waitForTimeout(3000);
    await managerole.updateDialogDisplay();
    const finalPerCount = await managerole.mainPagePermissionCount(actualRoleName);
    expect(finalPerCount).toBe(1);
  });

  test("Delete newly created role", async () => {
    test.setTimeout(120_000);
    const roleName = managerole.generateUniqueRoleName();
    let actualRoleName;

    await managerole.openCreateRoleForm();
    actualRoleName = await managerole.fillNewRoleName(roleName);
    await managerole.selectAllPermissionsClick();
    await managerole.submitNewRoleClick();
    await page.waitForTimeout(3000);
    await managerole.createdDialogDisplay();
    await managerole.verifyRoleListedWithPermissionCount(
      actualRoleName,
      TOTAL_PERMISSIONS,
    );

    await managerole.clickDeleteForRole(actualRoleName);
    await managerole.confirmDeleteRole();
    await managerole.deletedDialogDisplay();
    await managerole.verifyRoleNotListed(actualRoleName);
  });
});
