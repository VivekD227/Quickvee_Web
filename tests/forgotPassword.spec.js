const { test, expect } = require("@playwright/test");
import { LoginPage } from "../pageObjects/LoginPage";
import { ForgotPassword } from "../pageObjects/ForgotPassword";
//import { forgotPasswordAPI } from "../utilities/apiHelper/forgotPasswordHelper";



test.describe("Forgot Password", () => {
    test.describe.configure({ mode: "serial", timeout: 60_000 });
    let loginpage;
    let forgotpassword;

    test.beforeEach(async ({ page }) => {
        await page.goto("https://quickvee.com/merchants/login");
        loginpage = new LoginPage(page);
        forgotpassword = new ForgotPassword(page);
        await loginpage.forgotPasswordBtnClick();
        expect(page).toHaveURL("https://quickvee.com/merchants/forgot-password");
    })

    test("Invalid Email Format Forgot Password Test", async ({ page }) => {

        const fText = "Forgot Password";
        const reset_Text = "To reset your password, please enter your Email ID & follow the instructions.";
        await loginpage.LogoDisplayed();
        await forgotpassword.getforgotText(fText);
        await forgotpassword.resetTextContain(reset_Text);

        await forgotpassword.setemailField("vivek");
        await forgotpassword.submitBtnClick();
        await forgotpassword.errorDisplay();
        let error = "Enter a valid email";
        await forgotpassword.errorText(error);
    })

    test("Invalid Email Id", async ({ page }) => {
        await loginpage.LogoDisplayed();
        let invalidMsg = "User does not exist";
        await forgotpassword.setemailField("vivek776552@gmail.com");
        await forgotpassword.submitBtnClick();
        await forgotpassword.successMsgDisplay();
        await forgotpassword.successMsgText(invalidMsg);
        await forgotpassword.closeBoxClick();
    })

    test("Valid Email Forgot Password", async ({ page }) => {


        await loginpage.LogoDisplayed();
        let success = "Please check your email for the password reset instructions.";
        await forgotpassword.setemailField("vivek.dubey521@gmail.com");
        await forgotpassword.submitBtnClick();
        await forgotpassword.successMsgDisplay();
        await forgotpassword.successMsgText(success);
        await forgotpassword.closeBoxClick();
    });

})