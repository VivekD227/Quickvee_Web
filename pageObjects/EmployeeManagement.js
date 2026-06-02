class EmployeeManagement {
  constructor(page) {
    this.page = page;
    this.manage_role = page.getByText("Manage Roles");
    this.addEmployee = page.getByText("Add Employee");
  }

  async manageRoleClick() {
    await this.manage_role.click();
  }

  async addEmployeeClick() {
    await this.addEmployee.click();
  }
}

module.exports = { EmployeeManagement };
