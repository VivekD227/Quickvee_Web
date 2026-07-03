import { test } from "@playwright/test";
import { EmployeeManagement } from "../pageObjects/EmployeeManagement";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { ManageRole } from "../pageObjects/ManageRole";
import { AddEmployee } from "../pageObjects/AddEmployee";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import merchants from "../api/testData/merchants.json";
import routes from "../utilities/routes.js";
import sessionDataStorage from "../utilities/helper/sessionDataStorage";

const DEFAULT_EMPLOYEE_EMAIL = "vivekdemp@gmail.com";
const STORE_NAME = "Test Automation";
function randomAlpha(length = 8) {
  return Array.from({ length }, () =>
    String.fromCharCode(97 + Math.floor(Math.random() * 26)),
  ).join("");
}

function buildValidEmployeeData() {
  const uniqueSuffix = Date.now() + Math.floor(Math.random() * 1000);
  return {
    firstName: randomAlpha(),
    lastName: "Employee",
    email: `autoemp${uniqueSuffix}@test.com`,
    phone: "9876543210",
    pin: String(1000 + (uniqueSuffix % 9000)),
    role: "Cashier",
    store: STORE_NAME,
    password: "Vivek@123",
  };
}

test.describe("Add Employee Module", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let employeemanagement;
  let managerole;
  let addemployee;
  let sName;
  let uName;
  let pwd;
  let createdEmployee;
  let searchEmployee;

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      employeemanagement = new EmployeeManagement(page);
      managerole = new ManageRole(page);
      addemployee = new AddEmployee(page);
      sName = merchants.merchantLogin.storename;
      uName = merchants.merchantLogin.username;
      pwd = merchants.merchantLogin.password;
      await navigateToLoginPage(page);
      const [loginApiResponse] = await Promise.all([
        page.waitForResponse(
          (res) =>
            res.request().method() === "POST" &&
            res.url().includes(routes.API_URL.login),
        ),
        loginpage.login(sName, uName, pwd),
      ]);
      await loginApiResponse.json();
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

  test("Default employee vivekdemp@gmail.com should exist in store", async () => {
    await employeemanagement.verifyEmployeeExists(DEFAULT_EMPLOYEE_EMAIL);
  });

  test("Default employee assigned store should not be changeable on edit", async () => {
    await employeemanagement.verifyDefaultEmployeeAssignedStoreNotChangeable(
      DEFAULT_EMPLOYEE_EMAIL,
    );
  });

  test("Employee card shows full name, email, phone, role and assigned store count", async () => {
    createdEmployee = buildValidEmployeeData();
    await employeemanagement.clearSearch();

    await employeemanagement.addEmployeeClick();
    await addemployee.addEmployeeTextDisplay();
    await addemployee.fillAllRequiredFields(createdEmployee);
    const response = await addemployee.submitAndWaitForAddEmployeeApi();
    await addemployee.expectAddEmployeeApiSuccess(response);

    await employeemanagement.search(createdEmployee.email);
    await employeemanagement.verifyEmployeeCardDetails(createdEmployee.email, {
      fullName: `${createdEmployee.firstName} ${createdEmployee.lastName}`,
      phone: createdEmployee.phone,
      role: createdEmployee.role,
    });
  });

  test("Edit newly created employee, save and validate updated card", async () => {
    const updatedEmployee = {
      firstName: randomAlpha(),
      lastName: "Edited",
      phone: "5551234567",
      role: "Manager",
    };

    await employeemanagement.editEmployeeAndSave(
      createdEmployee.email,
      updatedEmployee,
    );
    await employeemanagement.clearSearch();

    await employeemanagement.search(createdEmployee.email);
    await employeemanagement.verifyEmployeeCardDetails(createdEmployee.email, {
      fullName: `${updatedEmployee.firstName} ${updatedEmployee.lastName}`,
      phone: updatedEmployee.phone,
      role: updatedEmployee.role,
    });

    searchEmployee = {
      firstName: updatedEmployee.firstName,
      lastName: updatedEmployee.lastName,
      fullName: `${updatedEmployee.firstName} ${updatedEmployee.lastName}`,
      email: createdEmployee.email,
    };
  });

  test("Search by first name", async () => {
    await employeemanagement.clearSearch();
    await employeemanagement.verifySearchByText(
      searchEmployee.firstName,
      searchEmployee.email,
    );
    await employeemanagement.clearSearch();
  });

  test("Search by last name", async () => {
    await employeemanagement.clearSearch();
    await employeemanagement.verifySearchByText(
      searchEmployee.lastName,
      searchEmployee.email,
    );
    await employeemanagement.clearSearch();
  });

  test("Search by full name", async () => {
    await employeemanagement.clearSearch();
    await employeemanagement.verifySearchByText(
      searchEmployee.fullName,
      searchEmployee.email,
    );
    await employeemanagement.clearSearch();
  });

  test("Search by email", async () => {
    await employeemanagement.clearSearch();
    await employeemanagement.verifySearchByText(
      searchEmployee.email,
      searchEmployee.email,
    );
    await employeemanagement.clearSearch();
  });

  test("Delete confirmation dialog", async () => {
    await employeemanagement.clearSearch();
    await employeemanagement.search(searchEmployee.email);
    await employeemanagement.clickDeleteEmployee(searchEmployee.email);
    await employeemanagement.verifyDeleteConfirmationDialog();
    await employeemanagement.cancelDeleteEmployee();
    await employeemanagement.clearSearch();
  });

  test("Delete employee from card", async () => {
    await employeemanagement.clearSearch();
    await employeemanagement.deleteEmployeeFromCard(searchEmployee.email);
  });

  test("Restore Employee", async () => {
    const permanentDelete = sessionDataStorage.get("isDeleted");

    if (permanentDelete === true) {
      await employeemanagement.visibleviewDeleted();

      await employeemanagement.restoreDeletedEmployee(searchEmployee.email);
      await employeemanagement.restoreClick();
      await employeemanagement.verifyRestoredEmployeeInActiveList(
        searchEmployee.email,
      );
      await employeemanagement.verifyRestoredEmployeePinIsEmpty(
        searchEmployee.email,
      );
    } else {
      await employeemanagement.hiddenviewDeleted();
    }
  });

  test("Permanent Delete Employee", async () => {
    const permanentDelete = sessionDataStorage.get("isDeleted");

    if (permanentDelete === true) {
      await employeemanagement.deleteEmployeeFromCard(searchEmployee.email);
      await employeemanagement.visibleviewDeleted();

      await employeemanagement.permanentDeleteDeletedEmployee(
        searchEmployee.email,
      );
      await employeemanagement.deleteForeverClick();
      await employeemanagement.yesDeleteBtnClick();
    } else {
      await employeemanagement.hiddenviewDeleted();
    }
  });
});
