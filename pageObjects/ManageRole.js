const { expect } = require("@playwright/test");

class ManageRole {
  constructor(page) {
    this.page = page;
    this.manageemptext = page.getByText("Manage Employee Roles");
    this.createText = page.getByText(
      "Create and customize roles with specific permissions",
    );
    this.closeModuleBtn = page.locator(".quic-btn-cancle");
    this.createRoleBtn = page.getByText("Create Role");
    this.roleCount = page.locator("div.MuiBox-root.css-1jt8yge");
    this.selectRole_text = page.getByText("Select a role to edit");
    this.chooseRole_text = page.getByText(
      "Choose a role from the list or create a new one",
    );
    this.createNewRoleBtn = page.getByText("Create New Role");
    this.role_count = page.locator(
      "span.MuiTypography-root.MuiTypography-label.css-1a3y088",
    );
  }

  async getmanageemptext(text) {
    await expect(this.manageemptext).toHaveText(text);
  }

  async getcreateText(text) {
    await expect(this.createText).toHaveText(text);
  }

  async closeModuleBtnClick() {
    await this.closeModuleBtn.click();
  }

  async createRoleBtnClick() {
    await this.createRoleBtn.click();
  }

  async getselectRole_text(text) {
    await expect(this.selectRole_text).toHaveText(text);
  }

  async getchooseRole_text(text) {
    await expect(this.chooseRole_text).toHaveText(text);
  }

  async createNewRoleBtnClick() {
    await this.createNewRoleBtn.click();
  }

  async getRoleCount() {
    const row_count = await this.roleCount.count();
    // console.log(row_count);
    return row_count;
  }

  async checkRole() {}
}

module.exports = { ManageRole };
