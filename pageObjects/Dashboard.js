const { expect } = require("@playwright/test");
import routes from "../utilities/routes.json";
import { APIClients } from "../api/clients/APIClients";
import { employeeListPayload } from "../api/payloads/employeeListPayload";
const sessionDataStorage = require("../utilities/helper/sessionDataStorage");
import { merchants } from "../api/testData/merchants.json";

class Dashboard {
  constructor(page) {
    this.page = page;

    this.store = page.locator(".admin_medium").first();

    this.profileBtn = page.locator("#basic-button:visible");

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
    await this.page.waitForTimeout(10000);
    await expect(this.quickveeLogo).toBeVisible();
  }

  async viewStoreDisplay() {
    await expect(this.viewStore).toBeVisible();
  }

  async viewStoreText(text) {
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
    const [
      presetResponse,
      employeeListResponse,
      managerStoreResponse,
      deleteEmployeeResponse,
    ] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.main_preset_URL),
      ),
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.employeeList_URL),
      ),
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.managerStore_URL),
      ),
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.deleteEmployee_URL),
      ),
      await this.manage_emp.click(),
      await this.getEmployeeListAPI(),
    ]);

    expect(presetResponse.status()).toBe(200);
    expect(employeeListResponse.status()).toBe(200);
    expect(managerStoreResponse.status()).toBe(200);
    expect(deleteEmployeeResponse.status()).toBe(200);
    const deleteEmployeeResponseBody = await deleteEmployeeResponse.json();
    // console.log("Delete Employee Response:", deleteEmployeeResponseBody);
    return deleteEmployeeResponseBody;
  }

  async getEmployeeListAPI() {
    const apiClients = new APIClients(this.page.request);
    const payload = employeeListPayload(
      sessionDataStorage.get("merchantId"),
      sessionDataStorage.get("email"),
      // merchants.employee_id,
      0,
      sessionDataStorage.get("loginType"),
      sessionDataStorage.get("tokenId"),
      sessionDataStorage.get("loginType"),
    );

    const url = routes.API_URL.employeeList_URL;
    const responseAPI = await apiClients.post(url, payload);
    const responseBody = await responseAPI.json();
    //console.log(responseBody);
    //const response = await this.getEmployeeListAPI();

    const activeEmployees = responseBody.result.filter(
      (employee) => employee.is_deleted === "0",
    );

    const name = activeEmployees.map((employee) => employee.f_name);
    const count = name.length;
    console.log(count);

    //console.log(activeEmployees);
    return count;
  }
}

module.exports = { Dashboard };
