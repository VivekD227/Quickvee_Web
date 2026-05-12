const { expect } = require("@playwright/test");

class LoginPage {
  constructor(page) {
    this.page = page;

    this.logo = page.getByRole("img", { name: "Quickvee" });

    this.storeName = page.getByLabel("Store Name");

    this.username = page.getByLabel("Username");

    this.password = page.getByLabel("Password");

    this.loginBtn = page.getByRole("button", { name: "Login" });

    this.forgotPassword = page.locator(".forgot-password");

    this.storeError = page.getByText("Store Name is required");

    this.userError = page.getByText("Username is required");

    this.pwdError = page.getByText("Password is required");

    this.incorrectMessage = page.locator(".MuiAlert-message");

  }

  async login(store, user, pwd) {
    await this.storeName.fill(store);

    await this.username.fill(user);

    await this.password.fill(pwd);

    await this.loginBtn.click();
  }

  async fillStoreName(store) {
    await this.storeName.fill(store);
  }

  async fillUsername(user) {
    await this.username.fill(user);
  }

  async fillPassword(pwd) {
    await this.password.fill(pwd);
  }

  async clearStoreName() {
    await this.storeName.fill("");
  }

  async clearUsername() {
    await this.username.fill("");
  }

  async clearPassword() {
    await this.password.fill("");
  }

  async clickLogin() {
    await this.loginBtn.click();
  }

  async LogoDisplayed() {
    await this.logo.isVisible();
  }

  async inputMessageDisplay() {
    await this.incorrectMessage.isVisible();
  }

  async inputMessageText(error) {
    await expect(this.incorrectMessage).toContainText(error);
  }

  async storeErrorDisplay() {
    await expect(this.storeError).toBeVisible();
  }

  async userErrorDisplay() {
    await expect(this.userError).toBeVisible();
  }

  async pwdErrorDisplay() {
    await expect(this.pwdError).toBeVisible();
  }

  async forgotPasswordBtnClick(){
    await this.forgotPassword.click();
  }

}

module.exports = { LoginPage };
