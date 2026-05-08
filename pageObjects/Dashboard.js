class Dashboard {
  constructor(page) {
    this.page = page;
    this.store = page.locator(".admin_medium");
    this.profileBtn = page.locator('img[src*="Down"]').nth(1);
    this.logoutBtn = page.getByText("Logout");
  }

  async storenameDisplay() {
    await this.store.isVisible();
  }

  async profileBtnClick() {
    await this.profileBtn.click();
  }

  async logoutBtnClick() {
    await this.logoutBtn.click();
  }
}

module.exports = { Dashboard };
