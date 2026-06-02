import { test, expect } from "@playwright/test";
import { EmployeeManagement } from "../pageObjects/EmployeeManagement";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { AddEmployee } from "../pageObjects/AddEmployee";
import { ManageRole } from "../pageObjects/ManageRole";
import { getMerchantID } from "../utilities/helper/loginAndStoreMerchantID";

const STORE_NAME = "Test Automation";

function randomAlpha(length = 8) {
  return Array.from({ length }, () =>
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
  ).join("");
}

test.describe("Add Employee Module", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let employeemanagement;
  let addemployee;
  let managerole;

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      employeemanagement = new EmployeeManagement(page);
      addemployee = new AddEmployee(page);
      managerole = new ManageRole(page);

      await page.goto("https://quickvee.com/merchants/login");
      await getMerchantID(page, loginpage);
      await dashboard.logoDisplayed();
      await dashboard.menuClick();
      await dashboard.employeeClick();
      await dashboard.manage_employeeClick();
      await employeemanagement.addEmployeeClick();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    await context?.close();
  });

  test("Verify all Add Employee fields are visible", async () => {
    await addemployee.addEmployeeTextDisplay();

    await addemployee.verifyAllRequiredFieldsDisplayed();

    await addemployee.noAssignStoreDisplay();
    await addemployee.enableBackendDisplay();
    await addemployee.posAccessDisplay();

    await addemployee.verifyBackendAccessDisabledByDefault();
    await addemployee.verifyPOSAccessEnabledByDefault();
    await addemployee.verifyStoreDropdownContents();
  });

  test("Password field displays only when Backend or POS access is enabled", async () => {
    await addemployee.verifyPasswordFieldVisible();

    await addemployee.disablePOSAccess();
    await addemployee.verifyPasswordFieldHidden();

    await addemployee.enableBackendAccess();
    await addemployee.verifyPasswordFieldVisible();

    await addemployee.disableBackendAccess();
    await addemployee.verifyPasswordFieldHidden();

    await addemployee.enablePOSAccess();
    await addemployee.verifyPasswordFieldVisible();
  });

  test("Select Role options match Manage Role list by name and count", async () => {
    await addemployee.cancel();

    await employeemanagement.manageRoleClick();
    const manageRoleNames = await managerole.getAllRoleNames();
    await managerole.closeRolesModule();

    await employeemanagement.addEmployeeClick();
    const addEmployeeRoleOptions = await addemployee.getRoleOptions();

    expect(addEmployeeRoleOptions.length).toBe(manageRoleNames.length);
    expect(addEmployeeRoleOptions.sort()).toEqual(manageRoleNames.sort());
    // console.log(addEmployeeRoleOptions.length);
    // console.log(manageRoleNames.length);
    console.log(addEmployeeRoleOptions.sort());
    console.log(manageRoleNames.sort());
  });

  test("Selecting a store hides the empty-state text and shows store with delete", async () => {
    await addemployee.selectStore(STORE_NAME);

    await addemployee.verifySelectedStoreDisplayed(STORE_NAME);
    await addemployee.verifySelectedStoreHasDeleteOption(STORE_NAME);

    // Restore state for any subsequent runs
    await addemployee.removeSelectedStore(STORE_NAME);
    await addemployee.noAssignStoreDisplay();
  });

  test("Email field triggers check_admin_employee_email API", async () => {
    await addemployee.verifyEmailValidationApiCalled("testuser@example.com");
    await addemployee.setEmail.clear();
  });

  test.only("Employee PIN field triggers check_emp_pin API", async () => {
    await addemployee.verifyPinSuggestionDisplayed("1111");
    await addemployee.setEmpPin.clear();
  });

  test("Add employee with all mandatory fields calls addEdit_employee API", async () => {
    const uniqueSuffix = Date.now();
    const employeeData = {
      firstName: randomAlpha(),
      lastName: "Employee",
      email: `autoemp${uniqueSuffix}@test.com`,
      pin: String(Math.floor(1000 + Math.random() * 9000)),
      role: "Manager",
      store: STORE_NAME,
      password: "Vivek@123",
    };

    await addemployee.addEmployeeWithMandatoryFields(employeeData);

    await expect(
      page.getByText(`${employeeData.firstName} ${employeeData.lastName}`, {
        exact: true,
      }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
