import { expect } from "@playwright/test";

class AddEmployee {
  constructor(page) {
    this.page = page;

    // Scope all label locators to the Add Employee modal so background
    // page text (e.g. "Manage Roles", header "Add Employee" button) does
    // not cause strict-mode violations. Anchored on the always-present PIN
    // field + Cancel button so the modal stays resolvable even when the
    // password field is conditionally hidden.
    this.modal = page
      .locator("div")
      .filter({ has: page.getByRole("textbox", { name: "Pin" }) })
      .filter({ has: page.getByRole("button", { name: "Cancel" }) })
      .last();

    this.addEmployeeText = this.modal.getByText("Add Employee").first();
    this.firstName = this.modal.getByText("First Name");
    this.lastname = this.modal.getByText("Last Name");
    this.email = this.modal.getByText("Email Address");
    this.phone = this.modal.getByText("Phone Number");
    this.empPin = this.modal.getByText("Employee PIN");
    this.wages = this.modal.getByText("Wages per Hour");
    this.address = this.modal.getByText("Address", { exact: true });
    this.role = this.modal.getByText("Role *", { exact: true });
    this.assignedStore = this.modal.getByText("Assigned Stores");
    this.password = this.modal.getByText("Password for Employee");
    this.noAssignStore = this.modal.getByText(
      "No stores assigned yet. Select from the dropdown above.",
    );
    this.enableBackend = this.modal.getByText("Enable Backend Access");
    this.allowbackendaccess = this.modal.getByText(
      "Allow access to backend management systems",
    );
    this.POSaccesss = this.modal.getByText("Enable POS Access");
    this.allowPOSaccess = this.modal.getByText(
      "Allow access to Point of Sale systems",
    );

    this.backendAccessCheckbox = this.modal
      .locator("div")
      .filter({ hasText: "Enable Backend Access" })
      .filter({ hasNot: page.getByText("Enable POS Access") })
      .getByRole("checkbox");
    this.posAccessCheckbox = this.modal
      .locator("div")
      .filter({ hasText: "Enable POS Access" })
      .filter({ hasNot: page.getByText("Enable Backend Access") })
      .getByRole("checkbox");

    this.setFirstName = this.modal.getByPlaceholder("First Name");
    this.setLastName = this.modal.getByPlaceholder("Last Name");
    this.setEmail = this.modal.getByPlaceholder("Email");
    this.setPhone = this.modal.getByPlaceholder("Phone");
    this.setEmpPin = this.modal.getByPlaceholder("Pin");
    this.setWages = this.modal.getByPlaceholder("Wages Per Hour");
    this.setAddress = this.modal.getByPlaceholder("Address Line 1");
    this.setPassword = this.modal.getByPlaceholder("Password for Employee");
    this.selectRole = this.modal.getByRole("combobox", {
      name: "Select a role",
    });
    this.addStore = this.modal.getByPlaceholder("Add a store +");
    this.submitAddEmployeeButton = this.modal.getByRole("button", {
      name: "Add Employee",
    });

    // Store dropdown popover content (rendered in a portal at body level,
    // outside the modal): a search box + "menuitem" options.
    this.storeSearchInput = page.getByPlaceholder("Search store...");
    this.selectAllStoreOption = page.getByRole("menuitem", {
      name: "Select All Stores",
    });
    this.testAutomationStoreOption = page.getByRole("menuitem", {
      name: "Test Automation",
    });
  }

  async addEmployeeTextDisplay() {
    await expect(this.addEmployeeText).toBeVisible();
  }

  async firstNameDisplay() {
    await expect(this.firstName).toBeVisible();
    await expect(this.setFirstName).toBeVisible();
  }

  async lastNameDisplay() {
    await expect(this.lastname).toBeVisible();
    await expect(this.setLastName).toBeVisible();
  }

  async emailDisplay() {
    await expect(this.email).toBeVisible();
    await expect(this.setEmail).toBeVisible();
  }

  async phoneDisplay() {
    await expect(this.phone).toBeVisible();
    await expect(this.setPhone).toBeVisible();
  }

  async empPinDisplay() {
    await expect(this.empPin).toBeVisible();
    await expect(this.setEmpPin).toBeVisible();
  }

  async wagesDisplay() {
    await expect(this.wages).toBeVisible();
    await expect(this.setWages).toBeVisible();
  }

  async addressDisplay() {
    await expect(this.address).toBeVisible();
    await expect(this.setAddress).toBeVisible();
  }

  async roleDisplay() {
    await expect(this.role).toBeVisible();
    await expect(this.selectRole).toBeVisible();
  }

  async assignedStoreDisplay() {
    await expect(this.assignedStore).toBeVisible();
    await expect(this.noAssignStore).toBeVisible();
  }

  async passwordDisplay() {
    await expect(this.password).toBeVisible();
    await expect(this.setPassword).toBeVisible();
  }

  async noAssignStoreDisplay() {
    await expect(this.noAssignStore).toBeVisible();
  }

  async enableBackendDisplay() {
    await expect(this.enableBackend).toBeVisible();
    await expect(this.allowbackendaccess).toBeVisible();
  }

  async posAccessDisplay() {
    await expect(this.POSaccesss).toBeVisible();
    await expect(this.allowPOSaccess).toBeVisible();
  }

  async verifyBackendAccessDisabledByDefault() {
    await expect(this.backendAccessCheckbox).not.toBeChecked();
  }

  async verifyPOSAccessEnabledByDefault() {
    await expect(this.posAccessCheckbox).toBeChecked();
  }

  // ---- Password visibility depends on access toggles ----
  async enableBackendAccess() {
    await this.backendAccessCheckbox.check();
  }

  async disableBackendAccess() {
    await this.backendAccessCheckbox.uncheck();
  }

  async enablePOSAccess() {
    await this.posAccessCheckbox.check();
  }

  async disablePOSAccess() {
    await this.posAccessCheckbox.uncheck();
  }

  async verifyPasswordFieldVisible() {
    await expect(this.password).toBeVisible();
    await expect(this.setPassword).toBeVisible();
  }

  async verifyPasswordFieldHidden() {
    await expect(this.setPassword).toBeHidden();
    await expect(this.password).toBeHidden();
  }

  // ---- Store dropdown ----
  async isStoreDropdownOpen() {
    return this.storeSearchInput.isVisible().catch(() => false);
  }

  async openStoreDropdown() {
    if (await this.isStoreDropdownOpen()) return;
    await this.addStore.click();
    await expect(this.storeSearchInput).toBeVisible();
  }

  async closeStoreDropdown() {
    if (await this.isStoreDropdownOpen()) {
      await this.page.keyboard.press("Escape");
      await expect(this.storeSearchInput).toBeHidden();
    }
  }

  async verifyStoreDropdownContents() {
    await this.openStoreDropdown();
    await expect(this.storeSearchInput).toBeVisible();
    await expect(this.selectAllStoreOption).toBeVisible();
    await expect(this.testAutomationStoreOption).toBeVisible();
    await this.closeStoreDropdown();
  }

  async selectStore(storeName) {
    await this.openStoreDropdown();
    await this.page.getByRole("menuitem", { name: storeName }).click();
    await this.page.waitForTimeout(500);
    await this.closeStoreDropdown();
  }

  getSelectedStoreChip(storeName) {
    // Once a store is selected the "Add a store +" input is replaced by a
    // chip containing the store name and a "delete" icon.
    return this.modal
      .locator("div")
      .filter({ has: this.page.getByText(storeName, { exact: true }) })
      .filter({ has: this.page.getByRole("img", { name: "delete" }) })
      .last();
  }

  async verifySelectedStoreDisplayed(storeName) {
    await expect(
      this.modal.getByText(storeName, { exact: true }),
    ).toBeVisible();
    await expect(this.noAssignStore).toBeHidden();
  }

  async verifySelectedStoreHasDeleteOption(storeName) {
    const chip = this.getSelectedStoreChip(storeName);
    await expect(chip.getByRole("img", { name: "delete" })).toBeVisible();
  }

  async removeSelectedStore(storeName) {
    const chip = this.getSelectedStoreChip(storeName);
    await chip.getByRole("img", { name: "delete" }).click();
    await this.page.waitForTimeout(500);
  }

  // ---- Select Role dropdown ----
  async getRoleOptions() {
    await this.selectRole.click();
    await this.page.waitForTimeout(500);
    const options = await this.page.getByRole("option").allTextContents();
    await this.page.keyboard.press("Escape");
    await this.page.waitForTimeout(300);
    return options.map((option) => option.trim()).filter(Boolean);
  }

  async selectRoleByName(roleName) {
    await this.selectRole.click();
    await this.page
      .getByRole("option", { name: roleName, exact: true })
      .click();
  }

  async fillMandatoryEmployeeFields({
    firstName,
    lastName,
    email,
    pin,
    role,
    store,
    password,
  }) {
    await this.setFirstNameValue(firstName);
    if (lastName) {
      await this.setLastNameValue(lastName);
    }

    await this.setEmail.clear();
    const emailValidationPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes("UserController/check_admin_employee_email"),
      { timeout: 10_000 },
    );
    await this.setEmail.fill(email);
    await emailValidationPromise;

    await this.setEmpPin.clear();
    const pinValidationPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes("UserController/check_emp_pin"),
      { timeout: 10_000 },
    );
    await this.setEmpPin.fill(pin);
    await pinValidationPromise;

    await this.selectRoleByName(role);
    await this.selectStore(store);
    await this.setPasswordValue(password);
  }

  async submitAddEmployeeAndVerifyApi() {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes("Store_setting_react_api/addEdit_employee"),
        { timeout: 30_000 },
      ),
      this.submitAddEmployeeButton.click(),
    ]);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body.status).toBeTruthy();

    await expect(this.addEmployeeText).toBeHidden({ timeout: 15_000 });
    return body;
  }

  async addEmployeeWithMandatoryFields(employeeData) {
    await this.fillMandatoryEmployeeFields(employeeData);
    return this.submitAddEmployeeAndVerifyApi();
  }

  async cancel() {
    await this.modal.getByRole("button", { name: "Cancel" }).click();
    await expect(this.addEmployeeText).toBeHidden();
  }

  async verifyAllRequiredFieldsDisplayed() {
    await this.firstNameDisplay();
    await this.lastNameDisplay();
    await this.emailDisplay();
    await this.phoneDisplay();
    await this.empPinDisplay();
    await this.wagesDisplay();
    await this.addressDisplay();
    await this.roleDisplay();
    await this.assignedStoreDisplay();
    await this.passwordDisplay();
  }

  async setFirstNameValue(value) {
    await this.setFirstName.clear();
    await this.setFirstName.fill(value);
    return this.setFirstName.inputValue();
  }

  async setLastNameValue(value) {
    await this.setLastName.clear();
    await this.setLastName.fill(value);
    return this.setLastName.inputValue();
  }

  async setEmailValue(value) {
    await this.setEmail.clear();
    await this.setEmail.fill(value);
    return this.setEmail.inputValue();
  }

  async setPhoneValue(value) {
    await this.setPhone.clear();
    await this.setPhone.fill(value);
    return this.setPhone.inputValue();
  }

  async setEmpPinValue(value) {
    await this.setEmpPin.clear();
    await this.setEmpPin.fill(value);
    return this.setEmpPin.inputValue();
  }

  async setWagesValue(value) {
    await this.setWages.clear();
    await this.setWages.fill(value);
    return this.setWages.inputValue();
  }

  async setAddressValue(value) {
    await this.setAddress.clear();
    await this.setAddress.fill(value);
    return this.setAddress.inputValue();
  }

  async setPasswordValue(value) {
    await this.setPassword.clear();
    await this.setPassword.fill(value);
    return this.setPassword.inputValue();
  }

  async verifyEmailValidationApiCalled(email) {
    await this.setEmail.clear();

    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes("UserController/check_admin_employee_email"),
        { timeout: 10_000 },
      ),
      this.setEmail.fill(email),
    ]);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("status");
  }

  async verifyPinValidationApiCalled(pin) {
    await this.setEmpPin.clear();

    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes("UserController/check_emp_pin"),
        { timeout: 10_000 },
      ),
      this.setEmpPin.fill(pin),
    ]);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("status");
    return body;
  }

  async verifyPinSuggestionDisplayed(pin) {
    const body = await this.verifyPinValidationApiCalled(pin);

    expect(body.suggested_pins?.length).toBeGreaterThan(0);

    await expect(this.modal.getByText("Suggested Pin")).toBeVisible();
    await expect(this.modal.getByText("Pin already exist")).toBeVisible();

    for (const suggestedPin of body.suggested_pins) {
      await expect(
        this.modal.getByText(suggestedPin, { exact: true }),
      ).toBeVisible();
    }
  }
}

export { AddEmployee };
