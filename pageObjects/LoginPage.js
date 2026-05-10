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

    this.errorMessage = page.locator(".input-error");

    this.incorrectMessage = page.locator(".MuiAlert-message");

    /** Visibility toggle next to password (Material / common patterns) */
    this.passwordVisibilityToggle = page.getByRole("button", {
      name: /toggle password visibility|show password|hide password/i,
    });
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

  /** Current `<input>` type for the password field (`password` or `text`). */
  async getPasswordInputType() {
    return await this.password.evaluate((el) => el.type);
  }

  /**
   * Clicks the show/hide password control beside the password field.
   */
  async togglePasswordVisibility() {
    const namedToggle = this.passwordVisibilityToggle;
    if ((await namedToggle.count()) > 0) {
      await namedToggle.first().click();
      return;
    }
    await this.password
      .locator("xpath=ancestor::div[position()<=5]")
      .getByRole("button")
      .first()
      .click();
  }
  
  async inputMessageDisplay(){
    await this.incorrectMessage.isVisible();
  }

  async inputMessageText(error) {
    await expect(this.incorrectMessage).toContainText(error);
  }
}

module.exports = { LoginPage };
