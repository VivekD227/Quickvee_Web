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
  }

  async login(store, user, pwd) {
    await this.storeName.fill(store);

    await this.username.fill(user);

    await this.password.fill(pwd);

    await this.loginBtn.click();
  }

  async LogoDisplayed() {
    await this.logo.isVisible();
  }
}

module.exports = { LoginPage };
