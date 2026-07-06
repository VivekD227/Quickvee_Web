const { expect } = require("@playwright/test");
import routes from "../utilities/routes.js";
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

    this.inventory = page.getByText("Inventory", { exact: true });

    this.brands = page.getByText("Brands", { exact: true });

    this.attributes = page.getByText("Attributes", { exact: true });

    this.vendors = page.getByText("Vendors", { exact: true });
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
          res.url().includes(routes.API_URL.deleteEmployeeList_URL),
      ),
      await this.manage_emp.click(),
    ]);

    expect(presetResponse.status()).toBe(200);
    expect(employeeListResponse.status()).toBe(200);
    expect(managerStoreResponse.status()).toBe(200);
    expect(deleteEmployeeResponse.status()).toBe(200);
    const activeEmp = await employeeListResponse.json();
    const activeEmployees = activeEmp.result.filter(
      (employee) => employee.is_deleted === "0",
    );
    const name = activeEmployees.map((employee) => employee.f_name);
    const count = name.length;
    sessionDataStorage.set("APICounts", count);

    const deleteEmployeeResponseBody = await deleteEmployeeResponse.json();
    // console.log("Delete Employee Response:", deleteEmployeeResponseBody);
    sessionDataStorage.set("isDeleted", deleteEmployeeResponseBody.status);
  }

  async inventoryClick() {
    await this.inventory.click();
  }

  async brandsClick() {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.brand_URL),
      ),

      this.brands.click(),
    ]);
    expect(response.status()).toBe(200);
    const brandResponse = await response.json();
    const brand_APIcount = brandResponse.total_count.brand;
    sessionDataStorage.set("brand_APIcount", brand_APIcount);
    console.log(`Brand API count (on navigation): ${brand_APIcount}`);
  }

  async attributesClick() {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.attributeList_URL),
      ),
      this.attributes.click(),
    ]);
    expect(response.status()).toBe(200);
    const attributeResponse = await response.json();
    expect(attributeResponse.status).toBeTruthy();
    const attribute_APIcount = attributeResponse.total_count;
    sessionDataStorage.set("attribute_APIcount", attribute_APIcount);
    console.log(`Attribute API count (on navigation): ${attribute_APIcount}`);
  }

  async vendorsClick() {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.vendorList_URL),
      ),
      this.vendors.click(),
    ]);
    expect(response.status()).toBe(200);
    const vendorResponse = await response.json();
    expect(vendorResponse.status).toBeTruthy();
    const vendor_APIcount = Number(vendorResponse.total_vendors);
    sessionDataStorage.set("vendor_APIcount", vendor_APIcount);
    sessionDataStorage.set(
      "vendor_productsSupplied_APIcount",
      Number(vendorResponse.total_assigned_products),
    );
    sessionDataStorage.set(
      "vendor_noProducts_APIcount",
      Number(vendorResponse.total_vendors_with_no_product),
    );
    console.log(`Vendor API count (on navigation): ${vendor_APIcount}`);
    console.log(
      `Products supplied API count (on navigation): ${vendorResponse.total_assigned_products}`,
    );
    console.log(
      `No products vendor API count (on navigation): ${vendorResponse.total_vendors_with_no_product}`,
    );
  }
}

module.exports = { Dashboard };
