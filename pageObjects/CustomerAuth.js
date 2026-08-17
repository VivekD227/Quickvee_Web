const { expect } = require("@playwright/test");
import {
  customerLoginAPI,
  waitForCustomerLoginResponse,
} from "../utilities/apiHelper/onlineOrderingAPI";

class CustomerAuth {
  constructor(page) {
    this.page = page;

    this.headerLogIn = page.getByText("Log In", { exact: true }).first();
    this.account = page.getByText("Account", { exact: true }).first();

    this.signInHeading = page.getByRole("heading", {
      name: /Sign in to Quickvee/i,
    });
    this.signUpHeading = page.getByRole("heading", {
      name: /Create your account/i,
    });
    this.accountAction = page.getByLabel("Choose account action");
    this.signInTab = this.accountAction.getByRole("button", {
      name: "Sign in",
      exact: true,
    });
    this.signUpTab = this.accountAction.getByRole("button", {
      name: "Sign up",
      exact: true,
    });
    this.email = page.getByRole("textbox", { name: /email address/i });
    this.password = page.getByRole("textbox", { name: /^password$/i });
    this.signInSubmit = page.locator('button[name="Login"]');
    this.forgotPassword = page.getByText("Forgot password?");
    this.googleLogin = page.getByRole("button", {
      name: /Continue with Google/i,
    });
    this.loginError = page.locator(
      "#login-submit-error, #login-email-error, #login-password-error, .MuiAlert-message",
    );

    this.firstName = page.getByRole("textbox", { name: /first name/i });
    this.lastName = page.getByRole("textbox", { name: /last name/i });
    this.phone = page.locator('input[type="tel"], input[name="phone"]').first();
    this.confirmPassword = page.locator('input[type="password"]').nth(1);
    this.createAccountBtn = page.getByRole("button", {
      name: /Create account/i,
    });
    this.captchaFrame = page.locator(
      'iframe[title*="reCAPTCHA" i], iframe[src*="recaptcha"]',
    );
  }

  async openSignInFromStorefront() {
    await expect(this.headerLogIn).toBeVisible();
    await this.headerLogIn.click();
    await expect(this.page).toHaveURL(/customer-login/);
    await this.verifySignInForm();
  }

  async verifySignInForm() {
    await expect(this.signInHeading).toBeVisible();
    await expect(this.signInTab).toBeVisible();
    await expect(this.signUpTab).toBeVisible();
    await expect(this.email).toBeVisible();
    await expect(this.password).toBeVisible();
    await expect(this.signInSubmit).toBeVisible();
    await expect(this.forgotPassword).toBeVisible();
  }

  async verifySignUpForm() {
    await expect(this.page).toHaveURL(/register/);
    await expect(this.signUpHeading).toBeVisible();
    await expect(this.firstName).toBeVisible();
    await expect(this.lastName).toBeVisible();
    await expect(this.phone).toBeVisible();
    await expect(this.email).toBeVisible();
    await expect(this.password).toBeVisible();
    await expect(this.confirmPassword).toBeVisible();
    await expect(this.createAccountBtn).toBeVisible();
    await expect(this.captchaFrame.first()).toBeVisible({ timeout: 15_000 });
  }

  async openSignUp() {
    await expect(this.signUpTab).toBeVisible();
    await this.signUpTab.click();
    await this.verifySignUpForm();
  }

  async signIn(email, password) {
    await this.email.fill(email);
    await this.password.fill(password);
    const body = await customerLoginAPI(this.page, () =>
      this.signInSubmit.click(),
    );
    expect(body.status).toBe(200);
    expect(String(body.message || "")).toMatch(/login successfully/i);
    expect(body.record?.email).toBe(email);
    await this.page.waitForURL(/\/merchant\//, { timeout: 20_000 });
    return body;
  }

  async signInExpectError(email, password) {
    await this.email.fill(email);
    await this.password.fill(password);
    const result = await waitForCustomerLoginResponse(this.page, () =>
      this.signInSubmit.click(),
    );
    const message = String(
      result.body?.message || result.body?.msg || "",
    );
    expect(message).toMatch(/invalid|incorrect|password|email/i);
    await expect(this.page).toHaveURL(/customer-login/);
    await expect(this.headerLogIn.or(this.signInHeading)).toBeVisible();
    return result.body;
  }

  async submitEmptySignIn() {
    await this.signInSubmit.click();
    await expect(this.page).toHaveURL(/customer-login/);
    await expect(this.signInHeading).toBeVisible();
  }

  async verifyLoggedInAccount() {
    await expect(this.account).toBeVisible();
    await expect(this.headerLogIn).toHaveCount(0);
  }
}

module.exports = { CustomerAuth };
