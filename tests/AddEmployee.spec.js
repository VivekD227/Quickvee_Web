import { test, expect } from "@playwright/test";
import { EmployeeManagement } from "../pageObjects/EmployeeManagement";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { AddEmployee } from "../pageObjects/AddEmployee";
import { ManageRole } from "../pageObjects/ManageRole";
import { getMerchantID } from "../utilities/helper/loginAndStoreMerchantID";

const STORE_NAME = "Test Automation";
const EXISTING_EMPLOYEE_EMAIL = "vivekdemp@gmail.com";

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
    pin: String(1000 + (uniqueSuffix % 9000)),
    role: "Cashier",
    store: STORE_NAME,
    password: "Vivek@123",
  };
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

  async function ensureFreshAddEmployeeModal() {
    const isModalOpen = await addemployee.addEmployeeText
      .isVisible()
      .catch(() => false);
    if (isModalOpen) {
      await addemployee.cancel();
    }
    await page
      .locator("#manage-employee-main")
      .getByRole("button", { name: "Add Employee" })
      .click();
    await addemployee.addEmployeeTextDisplay();
  }

  async function assertSubmitBlocked(expectedMessages) {
    const apiResponsePromise = page
      .waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes("Store_setting_react_api/addEdit_employee"),
        { timeout: 5_000 },
      )
      .catch(() => null);

    await addemployee.submitAddEmployeeButton.click();
    const apiResponse = await apiResponsePromise;

    expect(apiResponse).toBeNull();
    await addemployee.addEmployeeTextDisplay();

    for (const message of expectedMessages) {
      await expect(addemployee.modal.getByText(message)).toBeVisible();
    }
  }

  async function fillRequiredFieldsExcept(skip = {}) {
    const data = buildValidEmployeeData();

    if (!skip.firstName) {
      await addemployee.setFirstNameValue(data.firstName);
    }
    if (!skip.lastName) {
      await addemployee.setLastNameValue(data.lastName);
    }
    if (!skip.email) {
      await addemployee.setEmailValue(data.email);
    }
    if (!skip.pin) {
      await addemployee.setEmpPinValue(data.pin);
    }
    if (!skip.role) {
      await addemployee.selectRoleByName(data.role);
    }
    if (!skip.store) {
      await addemployee.selectStore(data.store);
    }
    if (!skip.password) {
      await addemployee.setPasswordValue(data.password);
    }

    return data;
  }

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

  test("Employee PIN field triggers check_emp_pin API", async () => {
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

    // await expect(
    //   page.getByText(`${employeeData.firstName} ${employeeData.lastName}`, {
    //     exact: true,
    //   }),
    // ).toBeVisible({ timeout: 15_000 });
  });

  test("Create employee with all fields including optional", async () => {
    const isModalOpen = await addemployee.addEmployeeText
      .isVisible()
      .catch(() => false);
    if (!isModalOpen) {
      await page
        .locator("#manage-employee-main")
        .getByRole("button", { name: "Add Employee" })
        .click();
    }
    await addemployee.addEmployeeTextDisplay();

    const uniqueSuffix = Date.now();
    const employeeData = {
      firstName: randomAlpha(),
      lastName: "Employee",
      email: `fullauto${uniqueSuffix}@test.com`,
      phone: "9998887777",
      pin: String(Math.floor(1000 + Math.random() * 9000)),
      wages: "25",
      address: "123 Test Automation Street",
      role: "Cashier",
      store: STORE_NAME,
      password: "Vivek@123",
    };

    await addemployee.setFirstNameValue(employeeData.firstName);
    await addemployee.setLastNameValue(employeeData.lastName);
    await addemployee.setPhoneValue(employeeData.phone);
    await addemployee.setWagesValue(employeeData.wages);
    await addemployee.setAddressValue(employeeData.address);

    await addemployee.setEmail.clear();

    (await addemployee.setEmail.fill(employeeData.email),
      await addemployee.setEmpPin.clear());
    (await addemployee.setEmpPin.fill(employeeData.pin),
      await addemployee.selectRoleByName(employeeData.role));
    await addemployee.selectStore(employeeData.store);
    await addemployee.setPasswordValue(employeeData.password);

    await addemployee.submitbuttonClick();
    await addemployee.submitAddEmployeeAndVerifyApi();

    await expect(addemployee.addEmployeeText).toBeHidden({ timeout: 15_000 });
    // await expect(
    //   page.getByText(`${employeeData.firstName} ${employeeData.lastName}`, {
    //     exact: true,
    //   }),
    // ).toBeVisible({ timeout: 15_000 });
  });

  test.describe("Form validation on submit", () => {
    test.beforeEach(async () => {
      await ensureFreshAddEmployeeModal();
    });

    test("Submit empty form does not create employee", async () => {
      await assertSubmitBlocked([
        "First Name is required",
        "Email Address is required",
        "Pin is required",
        "Role is required",
        "Minimum 1 store is required",
        "Password is required",
      ]);
    });

    test("Submit with missing First Name does not create employee", async () => {
      await fillRequiredFieldsExcept({ firstName: true });
      await assertSubmitBlocked(["First Name is required"]);
    });

    test("Submit with missing Email does not create employee", async () => {
      await fillRequiredFieldsExcept({ email: true });
      await assertSubmitBlocked(["Email Address is required"]);
    });

    test("Submit with missing Employee PIN does not create employee", async () => {
      await fillRequiredFieldsExcept({ pin: true });
      await assertSubmitBlocked(["Pin is required"]);
    });

    test("Submit with missing Role does not create employee", async () => {
      await fillRequiredFieldsExcept({ role: true });
      await assertSubmitBlocked(["Role is required"]);
    });

    test("Submit with missing assigned store does not create employee", async () => {
      await fillRequiredFieldsExcept({ store: true });
      await assertSubmitBlocked(["Minimum 1 store is required"]);
    });

    test("Submit with missing Password does not create employee", async () => {
      await fillRequiredFieldsExcept({ password: true });
      await assertSubmitBlocked(["Password is required"]);
    });
  });

  test.describe("Add Employee field validation", () => {
    test.beforeEach(async () => {
      await ensureFreshAddEmployeeModal();
    });

    test("Cancel with unsaved data closes modal and clears form on reopen", async () => {
      const data = buildValidEmployeeData();
      await addemployee.setFirstNameValue(data.firstName);
      await addemployee.setLastNameValue(data.lastName);
      await addemployee.setEmailValue(data.email);
      await addemployee.setPhoneValue("9876543210");

      await addemployee.cancel();
      await expect(addemployee.addEmployeeText).toBeHidden();

      await employeemanagement.addEmployeeClick();
      await addemployee.addEmployeeTextDisplay();
      await addemployee.verifyFormFieldsAreEmpty();
    });

    test("Valid alphabetic first name is accepted without alphabet validation error", async () => {
      const data = buildValidEmployeeData();
      data.firstName = randomAlpha();

      await addemployee.setFirstNameValue(data.firstName);
      await addemployee.blurFirstName();
      await addemployee.expectFirstNameAlphabetErrorHidden();

      await addemployee.fillAllRequiredFields(data);
      const response = await addemployee.submitAndWaitForAddEmployeeApi();
      await addemployee.expectAddEmployeeApiSuccess(response);
    });

    test("First Name with hyphen shows only-alphabet validation", async () => {
      await addemployee.setFirstNameValue("mary-jane");
      await addemployee.blurFirstName();
      await addemployee.expectFirstNameAlphabetErrorVisible();
    });

    test("First Name with apostrophe shows only-alphabet validation", async () => {
      await addemployee.setFirstName.clear();
      await addemployee.setFirstName.fill("o'brien");
      await addemployee.blurFirstName();
      await addemployee.expectFirstNameAlphabetErrorVisible();
    });

    test("First Name alphabet error clears after entering valid alphabetic name", async () => {
      await addemployee.setFirstNameValue("mary-jane");
      await addemployee.blurFirstName();
      await addemployee.expectFirstNameAlphabetErrorVisible();

      await addemployee.setFirstNameValue(randomAlpha());
      await addemployee.blurFirstName();
      await addemployee.expectFirstNameAlphabetErrorHidden();
    });

    test("Duplicate full name is allowed when email and PIN are unique", async () => {
      const firstName = randomAlpha();
      const lastName = "DupAllowed";
      const baseSuffix = Date.now();

      const firstEmployee = {
        firstName,
        lastName,
        email: `dupallow1${baseSuffix}@test.com`,
        pin: String(1000 + (baseSuffix % 9000)),
        role: "Cashier",
        store: STORE_NAME,
        password: addemployee.validPasswordSample,
      };

      await addemployee.fillAllRequiredFields(firstEmployee);
      const firstResponse = await addemployee.submitAndWaitForAddEmployeeApi();
      await addemployee.expectAddEmployeeApiSuccess(firstResponse);

      await ensureFreshAddEmployeeModal();

      const secondEmployee = {
        ...firstEmployee,
        email: `dupallow2${baseSuffix}@test.com`,
        pin: String(2000 + (baseSuffix % 8000)),
      };

      await addemployee.fillAllRequiredFields(secondEmployee);
      const secondResponse = await addemployee.submitAndWaitForAddEmployeeApi();
      await addemployee.expectAddEmployeeApiSuccess(secondResponse);
    });

    test("Valid email format is accepted without validation error", async () => {
      const data = buildValidEmployeeData();
      const body = await addemployee.fillEmailAndGetValidationBody(data.email);
      expect(body.status).toBeFalsy();
      await addemployee.blurEmail();
      await addemployee.expectInvalidEmailErrorHidden();
      await expect(addemployee.duplicateEmailError).toBeHidden();
    });

    test("Invalid email formats show validation error", async () => {
      const invalidEmails = ["vivek", "test@", "@nodomain.com"];

      for (const email of invalidEmails) {
        await addemployee.setEmailValue(email);
        await addemployee.blurEmail();
        await addemployee.expectInvalidEmailErrorVisible();
        await addemployee.setEmail.clear();
        await addemployee.expectInvalidEmailErrorHidden();
      }
    });

    test("Duplicate email is not allowed", async () => {
      const data = buildValidEmployeeData();
      data.email = EXISTING_EMPLOYEE_EMAIL;

      const body = await addemployee.fillEmailAndGetValidationBody(data.email);
      expect(body.status).toBeTruthy();

      await addemployee.expectDuplicateEmailErrorVisible();

      await addemployee.setEmpPinValue(data.pin);
      await addemployee.selectRoleByName(data.role);
      await addemployee.selectStore(data.store);
      await addemployee.setPasswordValue(data.password);
      await addemployee.setFirstNameValue(data.firstName);

      const apiResponse = await page
        .waitForResponse(
          (res) =>
            res.request().method() === "POST" &&
            res.url().includes("Store_setting_react_api/addEdit_employee"),
          { timeout: 5_000 },
        )
        .catch(() => null);

      await addemployee.submitAddEmployeeButton.click();
      const response = await apiResponse;

      expect(response).toBeNull();
      await addemployee.addEmployeeTextDisplay();
      await addemployee.expectDuplicateEmailErrorVisible();
    });

    test("Phone number must be exactly 10 digits", async () => {
      await addemployee.setPhone.clear();
      await addemployee.setPhone.pressSequentially("12345678901", {
        delay: 50,
      });
      expect(
        (await addemployee.setPhone.inputValue()).replace(/\D/g, ""),
      ).toHaveLength(10);

      await addemployee.setPhone.clear();
      await addemployee.setPhone.pressSequentially("9876543210", { delay: 50 });
      expect(
        (await addemployee.setPhone.inputValue()).replace(/\D/g, ""),
      ).toHaveLength(10);

      await addemployee.setPhone.clear();
      await addemployee.setPhone.pressSequentially("12345", { delay: 50 });
      const shortPhoneDigits = (
        await addemployee.setPhone.inputValue()
      ).replace(/\D/g, "");
      expect(shortPhoneDigits.length).toBeLessThan(10);
    });

    test("Valid password per policy is accepted", async () => {
      const data = buildValidEmployeeData();
      data.password = addemployee.validPasswordSample;

      await addemployee.fillAllRequiredFields(data);
      await addemployee.blurPassword();
      await addemployee.expectPasswordPolicyErrorHidden();

      const response = await addemployee.submitAndWaitForAddEmployeeApi();
      await addemployee.expectAddEmployeeApiSuccess(response);
    });

    test("Invalid password shows password policy validation", async () => {
      const data = buildValidEmployeeData();
      data.password = "abc";

      await addemployee.fillAllRequiredFields(data);
      await addemployee.blurPassword();
      await addemployee.submitAddEmployeeButton.click();
      await addemployee.expectPasswordPolicyErrorVisible();
    });
  });
});
