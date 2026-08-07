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
    this.rolesList = page.locator(".custom-scroll-permissions-modal");
    this.roleCount = this.rolesList.locator("> .MuiBox-root");
    this.selectRole_text = page.getByText("Select a role to edit");
    this.chooseRole_text = page.getByText(
      "Choose a role from the list or create a new one",
    );
    this.createNewRoleBtn = page.getByText("Create New Role");
    this.role_count = page.getByText(/Roles \(\d+\)/);
    this.presentRole = this.rolesList.locator("p").filter({
      hasNotText: /Default|Permission/i,
    });
    this.defaultText = page.getByText("Default", { exact: true });
    this.editBtnCount = this.rolesList.getByRole("img", {
      name: "edit-role-icon",
    });
    this.rolesModal = page
      .getByText("Manage Employee Roles")
      .locator("xpath=ancestor::*[.//img[@alt='edit-role-icon']][1]");

    this.createRoleText = page.getByText("Create New Role").first();
    this.permissionText = page.getByText(
      "Define a new role with custom permissions",
    );
    this.roleNameText = page.getByText("Role Name");
    this.roleNamePlaceHolder = page.getByPlaceholder(
      "e.g., Store Manager, Assistant",
    );
    this.serachPlaceholder = page.getByPlaceholder(
      "Search permissions by name or category...",
    );

    this.editRole = page.getByText("Edit Role", { exact: true });
    this.editing = page.getByText(/^Editing:\s*/i);
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
    this.selectAllBtn = page.getByRole("button", {
      name: "Select All",
      exact: true,
    });
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

    await expect(this.role_count).not.toHaveText("Roles (0)");

    for (const role of roleNames) {
      await expect(
        this.rolesList.getByText(role, { exact: true }),
      ).toBeVisible();
    }
  }
  async defaultCheck() {
    const count = await this.rolesList
      .getByText("Default", { exact: true })
      .count();
    expect(count).toBe(4);
  }

  async getAllRoleNames() {
    await expect(this.role_count).not.toHaveText("Roles (0)");
    const names = [];
    const rows = this.roleCount;
    const rowTotal = await rows.count();
    for (let i = 0; i < rowTotal; i++) {
      const name = await rows
        .nth(i)
        .locator("p")
        .first()
        .textContent();
      if (name?.trim()) names.push(name.trim());
    }
    return names;
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
    return this.rolesList.locator("> .MuiBox-root").filter({
      has: this.page.getByText(roleName, { exact: true }),
    });
  }

  async clickEditForRole(roleName) {
    await this.getRoleRow(roleName)
      .getByRole("img", { name: "edit-role-icon" })
      .click();
  }

  getCustomRoleRow(roleName) {
    return this.getRoleRow(roleName);
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
    await expect
      .poll(
        async () =>
          this.rolesList.getByText(roleName, { exact: true }).isVisible(),
        { timeout: 20_000 },
      )
      .toBeTruthy();
  }

  async deletedDialogDisplay() {
    await expect(this.deletedDialog).toBeVisible({ timeout: 15_000 });
  }

  async verifyRoleNotListed(roleName) {
    await expect
      .poll(
        async () =>
          this.rolesList.getByText(roleName, { exact: true }).isVisible(),
        { timeout: 20_000 },
      )
      .toBeFalsy();
  }

  async cleanupLeftoverCustomRoles() {
    const customRoles = (await this.getAllRoleNames()).filter((name) =>
      /^Role[a-z]+$/i.test(name),
    );

    for (const roleName of customRoles) {
      try {
        const deleteIcon = this.getRoleRow(roleName).getByRole("img", {
          name: "delete-role-icon",
        });
        if ((await deleteIcon.count()) === 0) continue;
        await deleteIcon.click();
        await this.confirmDeleteRole();
        await this.deletedDialogDisplay();
        await this.dismissToasts();
      } catch {
        // Best-effort cleanup; continue with remaining roles.
        await this.page.keyboard.press("Escape").catch(() => {});
      }
    }
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
    await this.searchText("Permanently Delete Employee");
    const permission = this.page.getByText("Permanently Delete Employee", {
      exact: true,
    });
    const checkbox = this.page.getByRole("checkbox", {
      name: "Permanently Delete Employee",
    });

    await permission.scrollIntoViewIfNeeded();
    if (!(await checkbox.isChecked())) {
      await permission.click();
    }
    await expect(checkbox).toBeChecked();
    await this.searchbar.clear();
    await expect(this.page.getByText(/Permissions \(\d+\)/)).toBeVisible();
  }

  async uncheckEmployeeDeleteForever() {
    await this.searchText("Permanently Delete Employee");
    const permission = this.page.getByText("Permanently Delete Employee", {
      exact: true,
    });
    const checkbox = this.page.getByRole("checkbox", {
      name: "Permanently Delete Employee",
    });

    await permission.scrollIntoViewIfNeeded();
    if (await checkbox.isChecked()) {
      await permission.click();
    }
    await expect(checkbox).not.toBeChecked();
    await this.searchbar.clear();
    await expect(this.page.getByText(/Permissions \(\d+\)/)).toBeVisible();
  }

  async dismissToasts() {
    for (let attempt = 0; attempt < 5; attempt++) {
      const closeButtons = this.page.locator(".Toastify__close-button");
      const count = await closeButtons.count();
      if (count === 0) return;
      await closeButtons.first().click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(200);
    }
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
    const managerPermissions = this.getRoleRow(RoleName).getByText(
      /\d+\s+Permissions?/,
    );

    const text = await managerPermissions.textContent();
    const count = text.match(/\d+/)?.[0];
    console.log(count);
    return Number(count);
  }

  async expectMainPagePermissionCount(roleName, expectedCount) {
    await expect
      .poll(async () => this.mainPagePermissionCount(roleName), {
        timeout: 20_000,
      })
      .toBe(expectedCount);
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
    const field = this.page
      .getByPlaceholder("e.g., Store Manager, Assistant")
      .filter({ visible: true })
      .last();
    await expect(field).toBeVisible();
    await field.fill(roleName);
    await expect(field).toHaveValue(roleName);
    return roleName;
  }

  async selectAllPermissionsClick() {
    const selectAll = this.selectAllBtn.first();
    await selectAll.scrollIntoViewIfNeeded();
    await expect(selectAll).toBeVisible();
    await selectAll.click();
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
    return this.getRoleRow(roleName).count();
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
    await this.dismissToasts();
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
