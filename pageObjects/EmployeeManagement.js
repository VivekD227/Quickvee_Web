import { expect } from "@playwright/test";
import { AddEmployee } from "./AddEmployee";
import { Dashboard } from "./Dashboard";
import { APIClients } from "../api/clients/APIClients";
import { deleteEmployeePayload } from "../api/payloads/deleteEmployeePayload";
import sessionDataStorage from "../utilities/helper/sessionDataStorage";
const routes = require("../utilities/routes.json");

class EmployeeManagement {
  constructor(page) {
    this.page = page;
    this.addEmployeeModal = new AddEmployee(page);
    this.dashboard = new Dashboard(page);
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
    this.deleteConfirmHeading = page.getByRole("heading", {
      name: "Delete Employee",
    });
    this.deleteConfirmText = page.getByText(/Are you sure you want to delete/i);
    this.deletedDialog = page.getByText(/Employee deleted successfully/i);
    this.cancelBtn = page.getByText("Cancel");
    this.viewDeleted = page.getByText("View Deleted");
  }

  async cancelBtnClick() {
    await this.cancelBtn.click();
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
    await expect(
      employeeCard.getByText(fullName, { exact: true }),
    ).toBeVisible();
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

  async clickDeleteEmployee(email) {
    const employeeCard = this.getEmployeeCard(email);
    await expect(employeeCard).toBeVisible();
    await employeeCard.getByRole("button", { name: /Delete/i }).click();
  }

  async verifyDeleteConfirmationDialog() {
    await expect(this.deleteConfirmHeading).toBeVisible();
    await expect(this.deleteConfirmText).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Delete Employee" }),
    ).toBeVisible();
  }

  async cancelDeleteEmployee() {
    await this.page
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await expect(this.deleteConfirmHeading).not.toBeVisible();
  }

  async confirmDeleteEmployee() {
    await expect(this.deleteConfirmHeading).toBeVisible();

    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes("Store_setting_react_api") &&
          /delete/i.test(res.url()) &&
          /employee/i.test(res.url()),
        { timeout: 30_000 },
      ),
      this.page.getByRole("button", { name: "Delete Employee" }).click(),
    ]);

    expect(response.ok()).toBeTruthy();
    await expect(this.deleteConfirmHeading).not.toBeVisible();
    await expect(this.deletedDialog).toBeVisible({ timeout: 15_000 });
  }

  async verifyEmployeeNotExists(email) {
    await expect(this.getEmployeeCard(email)).toHaveCount(0);
  }

  async deleteEmployeeFromCard(email) {
    await this.search(email);
    await this.clickDeleteEmployee(email);
    await this.confirmDeleteEmployee();
    await this.verifyEmployeeNotExists(email);
    await this.clearSearch();
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
    await this.clearSearch();
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

  async clearSearch() {
    await this.searchBar.clear();
  }

  async getVisibleEmployeeCountFromFooter() {
    const footer = this.page.getByText(/Showing \d+ of \d+ employees/i);
    await expect(footer).toBeVisible();
    const footerText = await footer.textContent();
    const match = footerText.match(/Showing (\d+) of \d+ employees/i);
    return match ? Number(match[1]) : 0;
  }

  async verifySearchByText(searchText, expectedEmail) {
    await this.search(searchText);
    const employeeCard = this.getEmployeeCard(expectedEmail);
    await expect(employeeCard).toHaveCount(1);
    await expect(employeeCard).toBeVisible();
  }

  async getemployeeCount() {
    const footer = this.page.getByText(/Showing \d+ of \d+ employees/i);
    await expect(footer).toBeVisible();
    const footerText = await footer.textContent();
    const totalMatch = footerText.match(/of (\d+) employees/i);
    const count = totalMatch ? Number(totalMatch[1]) : 0;
    console.log(count);

    return count;
  }

  async employeeCountCheck() {
    const UICount = await this.getemployeeCount();
    const APICount = await this.dashboard.getEmployeeListAPI();
    expect(UICount).toBe(APICount);
  }

  async deleteAPICall() {
    const apiClients = new APIClients(this.page.request);
    const payload = deleteEmployeePayload(
      // sessionDataStorage.get("merchantId"),
      // sessionDataStorage.get("email"),
      // sessionDataStorage.get("tokenID"),
      // sessionDataStorage.get("loginType"),
      // sessionDataStorage.get("token"),
      sessionDataStorage.get("VIV1458857AE"),
      sessionDataStorage.get("vivekd@gmail.com"),
      sessionDataStorage.get("974993"),
      sessionDataStorage.get("manager"),
      sessionDataStorage.get(
        "567cda8e29306cf332f1b5ba74771160c82c9edaa5e3e42f3749c0b2a8b5",
      ),
    );
    const url = routes.API_URL.deleteEmployeeList_URL;
    const response = await apiClients.post(url, payload);
    expect(response.status()).toBe(200);
    const deleteResponseBody = await response.json();
    return deleteResponseBody.status;
  }

  async visibleviewDeleted() {
    return await expect(this.viewDeleted).toBeVisible;
  }

  async hiddenviewDeleted() {
    return await expect(this.viewDeleted).toBeDisabled;
  }
}

module.exports = { EmployeeManagement };
