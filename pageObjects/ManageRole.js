const { expect } = require("@playwright/test");

class ManageRole {
  constructor(page) {
    this.page = page;
    this.manageemptext = page.getByText("Manage Employee Roles");
    this.createText = page.getByText(
      "Create and customize roles with specific permissions",
    );
    this.closeModuleBtn = page.locator(".quic-btn-cancle");
    this.createRoleBtn = page.getByRole("button", {
      name: /Create Role/i,
    });
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
    this.permissionCountText = page.getByText(/Permissions \(\d+\)/);
    this.perCount = page.locator('input[name="permission[]"]:checked');

    this.allPermission = page.locator('input[name="permission[]"]');

    this.saveBtn = page.getByRole("button", {
      name: "Save All Changes",
    });

    this.updateDialog = page.getByText(
      /Updated Successfully|Saved Successfully/i,
    );
    this.selectAllBtn = page.locator(
      ".MuiTypography-root.MuiTypography-body1.css-43f6m2",
    );
    this.clearAllBtn = page.getByRole("button", { name: "Clear All" });
    this.createRoleSubmitBtn = page.getByRole("button", {
      name: "Create New Role",
    });
    this.createdDialog = page.getByText(/Created Successfully/i);
    this.deleteConfirmText = page.getByText(
      /Are you sure you want to\s*delete this Role\s*\?/i,
    );
    this.deletedDialog = page.getByText(/Role deleted successfully/i);
    this.duplicateRoleError = page.getByText(
      /role name already exists|preset name already exists/i,
    );
    this.errorMsg = page.getByText("Role name is required");
    this.closeDialogBtn = page.locator(".Toastify__close-button");
  }

  generateUniqueRoleName() {
    const letters = "abcdefghijklmnopqrstuvwxyz";
    const seed = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const suffix = seed
      .split("")
      .map((char) => letters[Number(char) % letters.length])
      .join("");
    return `Role${suffix}`.slice(0, 30);
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
    const roleNames = ["Manager", "Cashier", "Driver", "Time Clock Only"];

    // Wait for roles to load
    await expect(this.page.getByText(/Roles \(\d+\)/)).not.toHaveText(
      "Roles (0)",
    );

    // Better locator
    const actualRoles = await this.page
      .locator(".css-dl8xe1")
      .allTextContents();

    console.log(actualRoles);

    for (const role of roleNames) {
      expect(actualRoles).toContain(role);
    }
  }
  async defaultCheck() {
    const count = await this.defaultText.count();
    await expect(count).toBe(4);
  }

  async getAllRoleNames() {
    await expect(this.page.getByText(/Roles \(\d+\)/)).not.toHaveText(
      "Roles (0)",
    );
    const names = await this.rolesModal
      .locator(".css-dl8xe1")
      .allTextContents();
    return names.map((name) => name.trim()).filter(Boolean);
  }

  async closeRolesModule() {
    await this.page.keyboard.press("Escape");
    await expect(this.manageemptext).toBeHidden();
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
    const nameBox = roleList
      .locator(".css-dl8xe1")
      .filter({ hasText: roleName });
    return nameBox.locator(
      'xpath=ancestor::*[.//img[@alt="edit-role-icon"]][1]',
    );
  }

  async clickEditForRole(roleName) {
    await this.getRoleRow(roleName)
      .getByRole("img", { name: "edit-role-icon" })
      .click();
  }

  getCustomRoleRow(roleName) {
    return this.rolesModal.locator("div.MuiBox-root.css-b38j4r").filter({
      has: this.page.locator(".css-dl8xe1").filter({ hasText: roleName }),
    });
  }

  async clickDeleteForRole(roleName) {
    await this.getCustomRoleRow(roleName)
      .getByRole("img", { name: "delete-role-icon" })
      .click();
  }

  async verifyDeleteButtonNotDisplayedForRole(roleName) {
    const roleRow = this.getRoleRow(roleName);
    await expect(
      roleRow.getByRole("img", { name: "delete-role-icon" }),
    ).toHaveCount(0);
  }

  async confirmDeleteRole() {
    await expect(this.deleteConfirmText).toBeVisible();

    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes("delete_permission_preset"),
        { timeout: 30_000 },
      ),
      this.page.getByRole("button", { name: "Delete", exact: true }).click(),
    ]);

    expect(response.ok()).toBeTruthy();
  }

  async cancelDeleteRole() {
    await expect(this.deleteConfirmText).toBeVisible();
    await this.page
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await expect(this.deleteConfirmText).not.toBeVisible();
  }

  async verifyRoleListed(roleName) {
    await expect(this.page.getByText(roleName, { exact: true })).toBeVisible();
  }

  async deletedDialogDisplay() {
    await expect(this.deletedDialog).toBeVisible({ timeout: 15_000 });
  }

  async verifyRoleNotListed(roleName) {
    await expect(
      this.page.getByText(roleName, { exact: true }),
    ).not.toBeVisible();
  }

  async assertSaveBlockedWithNoPermissions() {
    const saveBtn = this.page
      .locator('button:has-text("Save All Changes")')
      .last();

    await saveBtn.scrollIntoViewIfNeeded();

    const responsePromise = this.page
      .waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes("update_permission_preset"),
        { timeout: 5_000 },
      )
      .then((res) => ({ url: res.url(), status: res.status() }))
      .catch(() => null);

    await saveBtn.click();
    const updateResponse = await responsePromise;

    expect(updateResponse).toBeNull();
    expect(await this.permissionValue()).toBe(0);
    expect(await this.checkedPermissionsCount()).toBe(0);
    await expect(this.editRole).toBeVisible();
  }

  async verifyEditRoleDisplayed() {
    await expect(this.editRole).toBeVisible();
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

  async searchText(text) {
    await this.searchbar.fill(text);
  }

  async permissionValue() {
    const text = await this.page.getByText(/Permissions \(\d+\)/).textContent();

    const count = text.match(/\d+/)?.[0];
    console.log(count);
    return Number(count);
  }

  async checkedPermissionsCount() {
    return await this.perCount.count();
  }

  async allCheckedValue() {
    const checkedPermissions = this.perCount;

    const values = await checkedPermissions.evaluateAll((elements) =>
      elements.map((el) => el.value),
    );
    return values;

    console.log(values);
  }

  async allPermissionCount() {
    return await this.allPermission.count();
  }

  async checkEmployeeDeleteForever() {
    const permission = this.page.getByText("Employee Delete Forever", {
      exact: true,
    });

    await permission.scrollIntoViewIfNeeded();
    await permission.click();

    await this.page.waitForTimeout(2000);
  }

  async uncheckEmployeeDeleteForever() {
    const permission = this.page.getByText("Employee Delete Forever", {
      exact: true,
    });

    const checkbox = this.page.getByRole("checkbox", {
      name: "Employee Delete Forever",
    });

    await permission.scrollIntoViewIfNeeded();

    // uncheck only if already checked
    if (await checkbox.isChecked()) {
      await permission.click();
    }

    await expect(checkbox).not.toBeChecked();
  }

  async saveBtnClick() {
    const saveBtn = this.page
      .locator('button:has-text("Save All Changes")')
      .last();

    await saveBtn.scrollIntoViewIfNeeded();

    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes("update_permission_preset"),
        { timeout: 30_000 },
      ),
      saveBtn.click(),
    ]);

    expect(response.ok()).toBeTruthy();
  }

  async mainPagePermissionCount(RoleName) {
    const managerPermissions = this.page
      .locator("div.MuiBox-root.css-1jt8yge")
      .filter({
        has: this.page.getByText(RoleName),
      })
      .getByText(/\d+\s+Permissions?/);

    const text = await managerPermissions.textContent();
    const count = text.match(/\d+/)?.[0];
    console.log(count);
    return Number(count);
  }

  async updateDialogDisplay() {
    await expect(this.updateDialog).toBeVisible({ timeout: 15_000 });
  }

  async openCreateRoleForm() {
    // const [response] = await Promise.all([
    //   this.page.waitForResponse(
    //     (res) =>
    //       res.request().method() === "POST" &&
    //       res.url().includes("/Store_setting_react_api/permission_list"),
    //   ),
    //   await this.createRoleBtn.click()

    // ]);
    await this.createRoleBtn.click();

    await expect(this.permissionText).toBeVisible();
    await expect(this.roleNameFieldText).toBeVisible();
  }

  async fillNewRoleName(roleName) {
    await this.roleNameFieldText.clear();
    await this.roleNameFieldText.fill(roleName);
    const actualValue = await this.roleNameFieldText.inputValue();
    return actualValue;
  }

  async selectAllPermissionsClick() {
    await this.selectAllBtn.scrollIntoViewIfNeeded();
    await expect(this.selectAllBtn).toBeVisible();
    await this.selectAllBtn.click();
  }

  async clearAllPermissionsClick() {
    await this.clearAllBtn.scrollIntoViewIfNeeded();
    await expect(this.clearAllBtn).toBeVisible();
    await this.clearAllBtn.click();
  }
  async submitNewRoleAPICheck() {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes("/permission/create_permission_preset"),
        { timeout: 30_000 },
      ),
      this.createRoleSubmitBtn.click(),
    ]);

    expect(response.ok()).toBeTruthy();
  }

  async submitNewRoleClick() {
    await this.createRoleSubmitBtn.click();
  }

  async createdDialogDisplay() {
    await expect(this.createdDialog).toBeVisible();
  }

  async verifyRoleListedWithPermissionCount(roleName, expectedCount) {
    await expect(this.page.getByText(roleName, { exact: true })).toBeVisible();
    const permissionCount = await this.mainPagePermissionCount(roleName);
    expect(permissionCount).toBe(expectedCount);
  }

  async countRoleRowsByName(roleName) {
    return this.roleCount
      .filter({
        has: this.page.locator(".css-dl8xe1", { hasText: roleName }),
      })
      .count();
  }

  async assertDuplicateRoleNotCreated(roleName) {
    await this.openCreateRoleForm();

    // const roleRowsBeforeSubmit = await this.getRoleCount();
    // const duplicateCountBeforeSubmit = await this.countRoleRowsByName(roleName);
    // expect(duplicateCountBeforeSubmit).toBeGreaterThan(0);

    await this.fillNewRoleName(roleName);
    await this.selectAllPermissionsClick();
    await this.submitNewRoleClick();

    await expect(this.duplicateRoleError).toBeVisible({ timeout: 10_000 });
    await this.closeDialogBtn.click();
    await expect(this.createdDialog).not.toBeVisible();

    await expect(this.permissionText).toBeVisible();
    await expect(this.roleNameFieldText).toHaveValue(roleName);
  }

  async errorMsgDisplay() {
    await expect(this.errorMsg).toBeVisible();
  }

  async errorMsgText(text) {
    await expect(this.errorMsg).toHaveText(text);
  }
}

module.exports = { ManageRole };
