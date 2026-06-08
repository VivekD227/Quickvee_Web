import { expect } from "@playwright/test";

class EmployeeManagement {
  constructor(page) {
    this.page = page;
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
}

module.exports = { EmployeeManagement };
