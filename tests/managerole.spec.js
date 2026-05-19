import { test, expect } from "@playwright/test";
import { EmployeeManagement } from "../pageObjects/EmployeeManagement";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { ManageRole } from "../pageObjects/ManageRole";
import merchants from "../api/testData/merchants.json";
import { loginResponse } from "../utilities/apiHelper/loginHelper";
import { setMerchantID } from "../utilities/helper/sessionData";
import { getMerchantID } from "../utilities/helper/loginAndStoreMerchantID";
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
     const responseBody = await loginResponse(
          page,
          loginpage,
          sName,
          uName,
          pwd,
        );
    
        expect(responseBody.login_type).toBe("merchant");
        const mid = responseBody.data.merchant_id;
        setMerchantID(mid);
        console.log(mid);
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
    await managerole.clickEditForRole();
    await managerole.verifyEditRoleDisplayed();
  });

  
});
