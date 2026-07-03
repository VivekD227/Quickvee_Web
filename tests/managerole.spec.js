import { test, expect } from "@playwright/test";
import { EmployeeManagement } from "../pageObjects/EmployeeManagement";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { ManageRole } from "../pageObjects/ManageRole";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import { getPreset } from "../utilities/apiHelper/getPermissionPreset.js";
import merchants from "../api/testData/merchants.json";
import routes from "../utilities/routes.js";

const ROLES = ["Manager", "Cashier", "Driver", "Time Clock Only"];
const TOTAL_PERMISSIONS = 163;

test.describe("Manage Role Module", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let employeemanagement;
  let managerole;
  let storename = merchants.merchantLogin.storename;
  let username = merchants.merchantLogin.username;
  let password = merchants.merchantLogin.password;

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      employeemanagement = new EmployeeManagement(page);
      managerole = new ManageRole(page);

      storename = merchants.merchantLogin.storename;
      username = merchants.merchantLogin.username;
      password = merchants.merchantLogin.password;

      await navigateToLoginPage(page);
      const [loginApiResponse] = await Promise.all([
        page.waitForResponse(
          (res) =>
            res.request().method() === "POST" &&
            res.url().includes(routes.API_URL.login),
        ),
        loginpage.login(storename, username, password),
      ]);
      await loginApiResponse.json();
      await dashboard.logoDisplayed();
      await dashboard.menuClick();
      await dashboard.employeeClick();
      await dashboard.manage_employeeClick();
      await employeemanagement.manageRoleClick();
    },
    { timeout: 90_000 },
  );

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

      //await managerole.clickEditForRole(roleName);
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

  test("Should not create duplicate role named Manager", async () => {
    test.setTimeout(120_000);
    await managerole.assertDuplicateRoleNotCreated("Manager");
    await managerole.fillNewRoleName("  ");
    await managerole.submitNewRoleClick();
    await managerole.errorMsgDisplay();
    const error = "Role name is required";
    await managerole.errorMsgText(error);
  });

  test("Edit custom role name, save, and cancel delete", async () => {
    test.setTimeout(120_000);
    const initialRoleName = managerole.generateUniqueRoleName();
    const updatedRoleName = managerole.generateUniqueRoleName();

    await managerole.openCreateRoleForm();
    const actualRoleName = await managerole.fillNewRoleName(initialRoleName);
    await managerole.searchText("Employee Delete Forever");
    await managerole.checkEmployeeDeleteForever();

    await managerole.submitNewRoleAPICheck();
    await managerole.createdDialogDisplay();
    await managerole.verifyRoleListed(actualRoleName);

    await managerole.clickEditForRole(actualRoleName);
    await managerole.verifyEditRoleDisplayed();
    const renamedRole = await managerole.fillNewRoleName(updatedRoleName);

    await managerole.saveBtnClick();
    await managerole.updateDialogDisplay();
    await managerole.verifyRoleListed(renamedRole);
    await expect(
      page.getByText(actualRoleName, { exact: true }),
    ).not.toBeVisible();

    await managerole.clickDeleteForRole(renamedRole);
    await managerole.cancelDeleteRole();
    await managerole.verifyRoleListed(renamedRole);

    await managerole.clickDeleteForRole(renamedRole);
    await managerole.confirmDeleteRole();
    await managerole.deletedDialogDisplay();
    await managerole.verifyRoleNotListed(renamedRole);
  });

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

    await managerole.submitNewRoleAPICheck();
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
    await page.waitForTimeout(1000);
    await managerole.updateDialogDisplay();
    const finalPerCount =
      await managerole.mainPagePermissionCount(actualRoleName);
    await page.waitForTimeout(1000);
    expect(finalPerCount).toBe(1);
    await managerole.clickDeleteForRole(actualRoleName);
    await managerole.confirmDeleteRole();
    await managerole.deletedDialogDisplay();
    await managerole.verifyRoleNotListed(actualRoleName);
  });

  test("Default roles should not display delete button", async () => {
    for (const roleName of ROLES) {
      await managerole.verifyDeleteButtonNotDisplayedForRole(roleName);
    }
  });
});
