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
    this.presentRole = page.locator(".css-dl8xe1");
    this.defaultText = page.getByText("Default");
    this.editBtnCount = page.getByRole('img', { name: 'edit-role-icon' });

    //Create Role:
    this.createRoleText = page.getByText("Create New Role").first();
    this.permissionText = page.getByText("Define a new role with custom permissions");
    this.roleNameText = page.getByText("Role Name");
    this.roleNamePlaceHolder = page.getByPlaceholder("e.g., Store Manager, Assistance");
    this.serachPlaceholder = page.getByPlaceholder("Search permissions by name or category...");
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

 async checkRole() {
    const rolec = await this.role_count.textContent();
    const count = rolec.match(/\d+/)?.[0];
    return Number(count);
}
  async matchRow(){
      const uiCount = await this.checkRole();

    const rowCount = await this.getRoleCount();

    return uiCount === rowCount;
  }

  async verifyDefaultName(){
    const roleName = ["Manager", "Cashier", "Driver", "Time Clock Only"];
    const actualRoles = await this.presentRole.allTextContents();
    console.log(actualRoles);
    for (const role of roleName) {
        expect(actualRoles).toContain(role);
    }
  }

  async defaultCheck(){
    const count = await this.defaultText.count();
    await expect(count).toBe(4);
  }

  async editBtnCountCheck(){
      const edit_count = await this.editBtnCount.count();
      //console.log(edit_count);
      const rowCount = await this.getRoleCount();
      return edit_count === rowCount;
  }
}

module.exports = { ManageRole };
