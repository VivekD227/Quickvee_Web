const { expect } = require("@playwright/test");

class ForgotPassword {
    constructor(page) {
        this.page = page;
        this.forgotText = page.getByRole('heading', { name: 'Reset your password' });
        this.resetText = page.getByText(/Enter the email linked to your account/);
        this.emailField = page.getByRole('textbox', { name: 'Email address' });
        this.submitBtn = page.getByRole('button', { name: 'Send Reset Link' });
        this.successMsg = page.getByRole('alert');
        this.closeBox = page.getByRole('button', { name: 'Dismiss message' });
        this.error = page.locator(".MuiFormHelperText-root.Mui-error");

    }

    async getforgotText(text) {
        await expect(this.forgotText).toHaveText(text);
    }

    async resetTextContain(text) {
        await expect(this.resetText).toHaveText(text);
    }

    async setemailField(text) {
        await this.emailField.fill(text);
    }

    async submitBtnClick(){
        await this.submitBtn.click();
    }

    async successMsgDisplay(){
        await expect(this.successMsg).toBeVisible();
    }

    async successMsgText(text){
        await expect(this.successMsg).toHaveText(text);
    }

    async closeBoxClick(){
        await this.closeBox.click();
    }

    async errorDisplay(){
        await expect(this.error).toBeVisible();
    }

    async errorText(text){
        await expect(this.error).toHaveText(text);
    }
}

module.exports = { ForgotPassword };