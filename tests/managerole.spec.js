import {test, expect} from "@playwright/test";
import { EmployeeManagement } from "../pageObjects/EmployeeManagement";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";

test.describe("Manage Role Module", () =>{
    test.describe.configure({ mode: "serial", timeout: 60_000 });
    let loginpage;
    let dashboard;
    let employeemanagement;
test.beforeEach(async ({page})=>{
    loginpage = new LoginPage(page);
    dashboard = new Dashboard(page);
    employeemanagement = new EmployeeManagement(page);

    await page.goto("https://quickvee.com/merchants/login");
    await loginpage.login("chain", "vivek.dubey521@gmail.com", "Quickvee123!");
    await dashboard.logoDisplayed();
});

    test("Manage", async ({page}) => {
        await dashboard.menuClick();
        await dashboard.employeeClick();
       await dashboard.manage_employeeClick();
       await employeemanagement.manageRoleClick();
    })
})