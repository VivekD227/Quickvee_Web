const { expect } = require("@playwright/test");

class ForgotPassword {
    constructor(page) {
        this.page = page;
        this.forgotText = page.getByText('Forgot Password');
        this.resetText = page.locator(".sub-heading-from");
        this.emailField = page.getByRole('textbox', { name: 'Email' });
        this.submitBtn = page.getByRole('button', { name: 'submit' });
        this.successMsg = page.locator(".MuiAlert-message");
        this.closeBox = page.getByTestId('CloseIcon');
        this.error = page.locator(".input-error");

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