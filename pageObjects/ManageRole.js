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
    this.editBtnCount = page.getByRole("img", { name: "edit-role-icon" });
    this.rolesModal = page
      .getByText("Manage Employee Roles")
      .locator("xpath=ancestor::*[.//img[@alt='edit-role-icon']][1]");

    this.createRoleText = page.getByText("Create New Role").first();
    this.permissionText = page.getByText(
      "Define a new role with custom permissions",
    );
    this.roleNameText = page.getByText("Role Name");
    this.roleNamePlaceHolder = page.getByPlaceholder(
      "e.g., Store Manager, Assistance",
    );
    this.serachPlaceholder = page.getByPlaceholder(
      "Search permissions by name or category...",
    );

    this.editRole = page
      .getByRole("paragraph")
      .filter({ hasText: /^Edit Role$/ });
    this.editing = page.getByText(/^Editing:\s*Manager$/i);
    this.roleNameFieldText = page.getByPlaceholder(
      "e.g., Store Manager, Assistant",
    );
    this.searchbar = page.getByPlaceholder(
      "Search permissions by name or category...",
    );
    this.permissionsHeader = page.getByText(/^Permissions\s*\(\d+\)$/);

    this.DEFAULT_ROLE_PERMISSION_COUNTS = {
      Manager: 133,
      Cashier: 17,
      Driver: 2,
      "Time Clock Only": 1,
    };
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
    return this.roleCount.count();
  }

  async checkRole() {
    const rolec = await this.role_count.textContent();
    const count = rolec.match(/\d+/)?.[0];
    return Number(count);
  }

  async matchRow() {
    const uiCount = await this.checkRole();
    const rowCount = await this.getRoleCount();
    return uiCount === rowCount;
  }

  async verifyDefaultName() {
    const roleName = ["Manager", "Cashier", "Driver", "Time Clock Only"];
    const actualRoles = await this.presentRole.allTextContents();
    for (const role of roleName) {
      expect(actualRoles).toContain(role);
    }
  }

  async defaultCheck() {
    const count = await this.defaultText.count();
    await expect(count).toBe(4);
  }

  async editBtnCountCheck() {
    const edit_count = await this.editBtnCount.count();
    const rowCount = await this.getRoleCount();
    return edit_count === rowCount;
  }

  async editBtnClick() {
    await this.editBtnCount.click();
  }

  getRoleRow(roleName) {
    const roleList = this.rolesModal.locator("div.MuiBox-root.css-b38j4r");
    const nameBox = roleList.locator(".css-dl8xe1").filter({ hasText: roleName });
    return nameBox.locator(
      'xpath=ancestor::*[.//img[@alt="edit-role-icon"]][1]',
    );
  }

  async clickEditForRole(roleName = "Manager") {
    await this.getRoleRow(roleName)
      .getByRole("img", { name: "edit-role-icon" })
      .click();
  }

  async getListPermissionCount(roleName) {
    const row = this.getRoleRow(roleName);
    const permissionText = await row.getByText(/Permission/i).textContent();
    const match = permissionText?.match(/(\d+)\s+Permissions?/i);
    return match ? Number(match[1]) : null;
  }

  async compareListPermissionCount(roleName, expectedCount) {
    const actualCount = await this.getListPermissionCount(roleName);
    expect(actualCount).toBe(expectedCount);
    return actualCount;
  }

  async verifyPermissionsHeaderCount(expectedCount) {
    await expect(
      this.page.getByText(
        new RegExp(`^Permissions\\s*\\(${expectedCount}\\)$`, "i"),
      ),
    ).toBeVisible();
  }

  async getEditPanelPermissionCount() {
    const headerText = await this.permissionsHeader.textContent();
    const match = headerText?.match(/Permissions\s*\((\d+)\)/i);
    return match ? Number(match[1]) : null;
  }

  async compareEditPanelPermissionCount(expectedCount) {
    const actualCount = await this.getEditPanelPermissionCount();
    expect(actualCount).toBe(expectedCount);
    return actualCount;
  }

  async verifyRolePermissionCountsMatch(roleName) {
    const expectedCount = this.DEFAULT_ROLE_PERMISSION_COUNTS[roleName];
    if (expectedCount === undefined) {
      throw new Error(`Unknown default role: ${roleName}`);
    }

    const listCount = await this.compareListPermissionCount(
      roleName,
      expectedCount,
    );

    await this.clickEditForRole(roleName);
    await this.verifyEditRoleDisplayed();
    const panelCount = await this.compareEditPanelPermissionCount(expectedCount);

    expect(listCount).toBe(panelCount);
    return { listCount, panelCount, expectedCount };
  }

  async verifyEditRoleDisplayed() {
    await expect(this.editRole).toBeVisible();
  }

  async verifyEditingManagerDisplayed() {
    await expect(this.page.getByText(/Editing:\s*Manager/i)).toBeVisible();
  }

  async verifyRoleNameIsManagerAndNotEditable() {
    await expect(this.roleNameFieldText).toBeVisible();
    await expect(this.roleNameFieldText).toHaveValue("Manager");
    const isDisabled = await this.roleNameFieldText.isDisabled();
    const isReadOnly =
      (await this.roleNameFieldText.getAttribute("readonly")) !== null;
    expect(isDisabled || isReadOnly).toBeTruthy();
  }

  async verifySearchBoxDisplayed() {
    await expect(this.searchbar).toBeVisible();
  }

  async verifyEditingRoleDisplayed(roleName) {
    await expect(
      this.page.getByText(new RegExp(`^Editing:\\s*${roleName}$`, "i")),
    ).toBeVisible();
  }
}

module.exports = { ManageRole };
