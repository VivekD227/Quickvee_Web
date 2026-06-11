import { expect } from "@playwright/test";
import { AddEmployee } from "./AddEmployee";

class EmployeeManagement {
  constructor(page) {
    this.page = page;
    this.addEmployeeModal = new AddEmployee(page);
    this.manage_role = page.getByText("Manage Roles");
    this.addEmployee = page.getByText("Add Employee");
    this.empmanagement = page.getByText("Employee Management");
    this.employeeText = page.getByText(
      "Manage your team members and their store assignments",
    );
    this.searchBar = page.getByPlaceholder("Search by name or email..");
    this.filters = page.getByText("Filters");
    this.sortName = page.getByText("Name");
    this.sortUpdate = page.getByText("Updated");
    this.allStore = page.getByText("All Stores");
    this.allRoles = page.getByText("All Roles");
    this.selectAll = page.getByText("Select all");
    this.employeeCount = page.locator(
      ".MuiGrid-root.MuiGrid-container.css-2b8xie",
    );
    this.defaultStoreName = "Test Automation";
  }

  getEmployeeCard(email) {
    return this.employeeCount.filter({ hasText: email });
  }

  formatPhoneForCard(phone) {
    const digits = phone.replace(/\D/g, "");
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  async verifyEmployeeExists(email) {
    await this.search(email);
    const employeeCard = this.getEmployeeCard(email);
    await expect(employeeCard).toHaveCount(1);
    await expect(employeeCard).toBeVisible();
    await expect(employeeCard.getByText(email)).toBeVisible();
  }

  async verifyEmployeeCardDetails(
    email,
    { fullName, phone, role, storeName = this.defaultStoreName },
  ) {
    const employeeCard = this.getEmployeeCard(email);
    await expect(employeeCard).toBeVisible();
    await expect(employeeCard.getByText(fullName, { exact: true })).toBeVisible();
    await expect(employeeCard.getByText(email)).toBeVisible();
    await expect(
      employeeCard.getByText(this.formatPhoneForCard(phone)),
    ).toBeVisible();
    await expect(employeeCard.getByText(role)).toBeVisible();
    await expect(employeeCard.getByText("Assigned Stores (1)")).toBeVisible();
    await expect(employeeCard.getByText(storeName)).toBeVisible();
  }

  async clickEditEmployee(email) {
    const employeeCard = this.getEmployeeCard(email);
    await expect(employeeCard).toBeVisible();
    await employeeCard.getByRole("button", { name: /Edit/i }).click();
    await expect(this.addEmployeeModal.modal).toBeVisible({ timeout: 15_000 });
  }

  async selectRoleInEditModal(roleName) {
    const roleCombobox = this.addEmployeeModal.modal
      .locator("div")
      .filter({ has: this.page.getByText("Role *", { exact: true }) })
      .getByRole("combobox");
    await roleCombobox.click();
    await this.page
      .getByRole("option", { name: roleName, exact: true })
      .click();
  }

  async updateEmployeeDetails({ firstName, lastName, phone, role }) {
    if (firstName) {
      await this.addEmployeeModal.setFirstNameValue(firstName);
    }
    if (lastName) {
      await this.addEmployeeModal.setLastNameValue(lastName);
    }
    if (phone) {
      await this.addEmployeeModal.setPhoneValue(phone);
    }
    if (role) {
      await this.selectRoleInEditModal(role);
    }
  }

  async saveEmployeeEdit() {
    const saveButton = this.addEmployeeModal.modal.getByRole("button", {
      name: /Save Changes|Update Employee|Save Employee|Add Employee/i,
    });
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes("Store_setting_react_api/addEdit_employee"),
        { timeout: 30_000 },
      ),
      saveButton.click(),
    ]);

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBeTruthy();
    await expect(this.addEmployeeModal.modal).toBeHidden({ timeout: 15_000 });
    return body;
  }

  async editEmployeeAndSave(email, updates) {
    await this.search(email);
    await this.clickEditEmployee(email);
    await this.updateEmployeeDetails(updates);
    return this.saveEmployeeEdit();
  }

  async verifyDefaultEmployeeAssignedStoreNotChangeable(email) {
    await this.search(email);
    await this.clickEditEmployee(email);
    await expect(this.addEmployeeModal.assignedStore).toBeVisible();
    await expect(this.addEmployeeModal.setEmail).toHaveValue(email);

    const addStoreVisible = await this.addEmployeeModal.addStore.isVisible();
    if (addStoreVisible) {
      await expect(this.addEmployeeModal.addStore).toBeDisabled();
    } else {
      await expect(this.addEmployeeModal.addStore).toBeHidden();
    }

    await expect(
      this.addEmployeeModal.modal.getByRole("img", { name: "delete" }),
    ).toHaveCount(0);
    await expect(this.addEmployeeModal.noAssignStore).toBeHidden();
    await this.addEmployeeModal.cancel();
  }

  async filtersDisplay() {
    await expect(this.filters).toBeVisible();
  }

  async sortNameDisplay() {
    await expect(this.sortName).toBeVisible();
  }

  async sortUpdateDisplay() {
    await expect(this.sortUpdate).toBeVisible();
  }

  async allStoreDisplay() {
    await expect(this.allStore).toBeVisible();
  }

  async allRolesDisplay() {
    await expect(this.allRoles).toBeVisible();
  }

  async selectAllDisplay() {
    await expect(this.selectAll).toBeVisible();
  }

  async manageRoleVisible() {
    await expect(this.manage_role).toBeVisible();
  }

  async manageRoleClick() {
    await this.manage_role.click();
  }

  async addEmployeeVisible() {
    await expect(this.addEmployee).toBeVisible();
  }

  async addEmployeeClick() {
    await this.addEmployee.click();
  }

  async empmanagementDisplay() {
    await expect(this.empmanagement).toBeVisible();
  }

  async employeeTextDisplay() {
    await expect(this.employeeText).toBeVisible();
  }

  async searchBarDisplay() {
    await expect(this.searchBar).toBeVisible();
  }

  async search(text) {
    await this.searchBar.fill(text);
  }

  async getemployeeCount() {
    const count = await this.employeeCount.count();
    console.log(count);

    return count;
  }
}

module.exports = { EmployeeManagement };
