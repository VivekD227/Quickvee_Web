const { expect } = require("@playwright/test");

class Dashboard {
  constructor(page) {
    this.page = page;

    this.store = page.locator(".admin_medium").first();

    this.profileBtn = page.locator('img[src*="Down"]').nth(1);

    this.logoutBtn = page.getByText("Logout");

    this.quickveeLogo = page.getByRole("img", { name: "Logo" });

    this.viewStore = page.getByText("View Online Store");

    this.sidebar = page.locator(
      "//div[@class='flex items-center justify-between md:px-4 mx-2']//*[name()='svg']",
    );

    this.sideBarDisplay = page.locator(".flex-1");

    this.employee = page.getByText("Employees");

    this.manage_emp = page.getByText("Manage Employees");
  }

  async storenameDisplay() {
    await expect(this.store).toBeVisible();
  }

  async storeNameText(text) {
    await expect(this.store).toHaveText(text);
  }

  async logoDisplayed() {
  await this.page.waitForLoadState("networkidle");
  await expect(this.quickveeLogo).toBeVisible();
}

  async viewStoreDisplay(){
    await expect(this.viewStore).toBeVisible();
  }

  async viewStoreText(text){
    await expect(this.viewStore).toHaveText(text);
  }

  async profileBtnClick() {
    await this.profileBtn.click();
  }

  async logoutBtnClick() {
    await this.logoutBtn.click();
  }

  async sidebarClick() {
    await this.sidebar.click();
  }

  async sideBarDisplayVisible() {
    await expect(this.sideBarDisplay).toBeVisible();
  }

  async menuClick() {
    const isVisible = await this.sideBarDisplay.isVisible();

    if (!isVisible) {
      await this.sidebarClick();
    }
  }

  async employeeClick() {
    await this.employee.click();
  }

  async manage_employeeClick() {
    await this.manage_emp.click();
  }
}

module.exports = { Dashboard };
