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

    this.products = page.getByRole("link", { name: "Products", exact: true });

    this.brands = page.getByText("Brands", { exact: true });

    this.attributes = page.getByText("Attributes", { exact: true });

    this.vendors = page.getByText("Vendors", { exact: true });

    this.tags = page.getByText("Tags", { exact: true });

    // Dashboard page UI
    this.dashboardHeading = page.getByRole("heading", {
      name: "Merchant Dashboard",
    });
    this.dashboardSubtitle = page.getByText(
      /Sales, customers, and performance trends/i,
    );
    this.liveStorePulse = page.getByText("Live store pulse");
    this.locationsLabel = page.getByText("Locations", { exact: true });
    this.locationsBtn = page.getByRole("button", {
      name: /All Locations|locations/i,
    });
    this.viewByLabel = page.getByText("View by", { exact: true });
    this.dayView = page.getByText("Day", { exact: true });
    this.weekView = page.getByText("Week", { exact: true });
    this.monthView = page.getByText("Month", { exact: true });
    this.previousBtn = page.getByRole("button", {
      name: /View previous date range|Previous/i,
    });
    this.nextBtn = page.getByRole("button", {
      name: /View next date range|Next/i,
    });
    this.dayViewLabel = page.getByText("Day view", { exact: true });

    this.kpiLabels = [
      "Total Sales Revenue",
      "Total Transactions",
      "Unique Customers",
      "Profit Generated",
      "Average Order Value",
      "Items per Transaction",
      "Discounts Given %",
      "Discounts Given $",
    ];

    this.salesOverview = page.getByText(/Sales Overview/i);
    this.salesRevenueLegend = page.getByText("Sales Revenue", { exact: true });
    this.transactionsLegend = page.getByText("Transactions", { exact: true });
    this.topProductsHeading = page.getByRole("heading", {
      name: "Top Products",
    });
    this.recentOrdersHeading = page.getByRole("heading", {
      name: "Recent Orders Activity",
    });
    this.recentOrderTitles = page.locator("p").filter({ hasText: /Order\s*#/ });

    this.navDashboard = page.getByRole("link", { name: /Dashboard/i });
    this.navOrders = page.getByRole("link", { name: /Orders/i });
    this.navLoyalty = page.getByRole("link", { name: /Loyalty Program/i });
    this.navPurchaseOrder = page.getByRole("link", {
      name: /Purchase Order/i,
    });
    this.navStocktake = page.getByRole("link", { name: /Stocktake/i });
    this.navTaxes = page.getByRole("link", { name: /Taxes/i });
    this.navImportData = page.getByRole("link", { name: /Import Data/i });
    this.accountMenu = page.getByRole("generic", {
      name: "Open account menu",
    });

    this.revenueAmount = page
      .getByRole("link", { name: /View Total Sales Revenue report/i })
      .getByText(/^\$/);
    this.totalTransactionss = page
      .getByRole("link", { name: /View Total Transactions report/i })
      .locator("p")
      .nth(1);
    this.uniqueCustomersAmount = page
      .getByRole("link", { name: /View Unique Customers report/i })
      .locator("p")
      .nth(1);
    this.profitAmount = page
      .getByRole("link", { name: /View Profit Generated report/i })
      .getByText(/^\$/);
    this.avgOrderValueAmount = page
      .getByRole("link", { name: /View Average Order Value report/i })
      .getByText(/^\$/);
    this.itemsPerTransactionAmount = page
      .getByRole("link", { name: /View Items per Transaction report/i })
      .locator("p")
      .nth(1);
    this.discountPercentAmount = page
      .getByRole("link", { name: /View Discounts Given % report/i })
      .locator("p")
      .nth(1);
    this.discountDollarAmount = page
      .getByRole("link", { name: /View Discounts Given \$ report/i })
      .getByText(/^\$/);

    this.clickLocation = page.getByTestId('ExpandMoreIcon')
    this.AllLocations = page.getByText("All Locations");
    this.backBtn = page.getByText("Back");
    this.doneBtn = page.getByText("Done");
  }

  async locationClick() {
    await this.clickLocation.click();
  }

  async doneBtnClick() {
    await this.doneBtn.click();
  }

  async backBtnClick() {
    await this.backBtn.click();
  }

  async AllLocationsClick() {
    await this.AllLocations.click();
  }
  async logoDisplayed() {
    await expect(this.quickveeLogo).toBeVisible();
  }

  async viewStoreDisplay() {
    await expect(this.viewStore).toBeVisible();
  }

  async viewStoreText(text) {
    await expect(this.viewStore).toHaveText(text);
  }

  async verifyLocationsDisplay(storeResponse) {
    const stores = storeResponse?.data ?? [];
    const storeLength = stores.length;
    expect(storeLength).toBeGreaterThan(0);

    if (storeLength === 1) {
      await expect(
        this.page.getByRole("button", {
          name: new RegExp(`All Locations\\s*\\(${storeLength}\\)`, "i"),
        }),
      ).toBeVisible();
      return;
    }

    const storeNames = stores.map((store) => store?.name).filter(Boolean);
    expect(storeNames.length).toBeGreaterThan(0);

    const locationButtons = this.page.getByRole("button");
    let matched = false;
    const count = await locationButtons.count();
    for (let i = 0; i < count; i++) {
      const text = ((await locationButtons.nth(i).textContent()) || "").trim();
      if (storeNames.some((name) => text.includes(name))) {
        matched = true;
        break;
      }
    }
    expect(
      matched,
      `Expected one of store names [${storeNames.join(", ")}] on Locations control`,
    ).toBeTruthy();
  }

  async verifyDashboardUI(storeResponse) {
    await expect(this.quickveeLogo).toBeVisible();
    await this.viewStoreDisplay();
    await expect(this.dashboardHeading).toBeVisible();
    await expect(this.dashboardSubtitle).toBeVisible();
    await expect(this.liveStorePulse).toBeVisible();

    await expect(this.locationsLabel).toBeVisible();
    await this.verifyLocationsDisplay(storeResponse);

    await expect(this.viewByLabel).toBeVisible();
    await expect(this.dayView.first()).toBeVisible();
    await expect(this.weekView.first()).toBeVisible();
    await expect(this.monthView.first()).toBeVisible();
    await expect(this.previousBtn).toBeVisible();
    await expect(this.nextBtn).toBeVisible();
    await expect(this.dayViewLabel).toBeVisible();

    for (const label of this.kpiLabels) {
      await expect(
        this.page.getByText(label, { exact: true }).first(),
      ).toBeVisible();
      await expect(
        this.page.getByRole("link", {
          name: new RegExp(
            `View ${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} report`,
            "i",
          ),
        }),
      ).toBeVisible();
    }

    await expect(this.salesOverview).toBeVisible();
    await expect(this.salesRevenueLegend).toBeVisible();
    await expect(this.transactionsLegend).toBeVisible();
    await expect(this.topProductsHeading).toBeVisible();
    await expect(this.recentOrdersHeading).toBeVisible();

    await expect(this.navDashboard).toBeVisible();
    await expect(this.navOrders).toBeVisible();
    await expect(this.inventory).toBeVisible();
    await expect(this.employee).toBeVisible();
    await expect(this.navLoyalty).toBeVisible();
    await expect(this.navPurchaseOrder).toBeVisible();
    await expect(this.navStocktake).toBeVisible();
    await expect(this.navTaxes).toBeVisible();
    await expect(this.navImportData).toBeVisible();
  }

  async nextBtnClick() {
    await this.nextBtn.click();
  }

  async checkNextBtnDisable() {
    while (!(await this.nextBtn.isDisabled())) {
      await this.nextBtnClick();
    }
  }

  async dayViewClick() {
    await this.dayView.first().click();
  }

  async monthViewClick() {
    await this.monthView.first().click();
  }

  async UIRevenue() {
    const text = await this.revenueAmount.first().innerText();
    const revenueText = text.replace(/[$,]/g, "").trim();
    console.log(revenueText);
    return revenueText;
  }

  async UITransaction() {
    const text = await this.totalTransactionss.first().innerText();
    console.log(text);
    return text.replace(/[$,]/g, "").trim();
  }

  async UIUniqueCustomers() {
    const text = await this.uniqueCustomersAmount.first().innerText();
    console.log(text);
    return text.replace(/[$,]/g, "").trim();
  }

  async UIProfit() {
    const text = await this.profitAmount.first().innerText();
    const profitText = text.replace(/[$,]/g, "").trim();
    console.log(profitText);
    return profitText;
  }

  async UIAvgOrderValue() {
    const text = await this.avgOrderValueAmount.first().innerText();
    const aovText = text.replace(/[$,]/g, "").trim();
    console.log(aovText);
    return aovText;
  }

  async UIItemsPerTransaction() {
    const text = await this.itemsPerTransactionAmount.first().innerText();
    console.log(text);
    return text.replace(/[$,]/g, "").trim();
  }

  async UIDiscountPercent() {
    const text = await this.discountPercentAmount.first().innerText();
    console.log(text);
    return text.replace(/[$,%]/g, "").trim();
  }

  async UIDiscountAmount() {
    const text = await this.discountDollarAmount.first().innerText();
    const discountText = text.replace(/[$,]/g, "").trim();
    console.log(discountText);
    return discountText;
  }

  async UIRecentOrderIds() {
    const titles = await this.recentOrderTitles.allInnerTexts();
    const ids = titles
      .map((title) => title.match(/Order\s*#\s*([\w-]+)/)?.[1])
      .filter(Boolean);
    console.log(ids);
    return ids;
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
    const activeEmployees = activeEmp.data.filter(
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

  async productsClick() {
    const [productListResponse, categoryListResponse] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.productList_URL),
      ),
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.categoryList_URL),
      ),
      this.products.click(),
    ]);

    expect(productListResponse.status()).toBe(200);
    const productList = await productListResponse.json();
    const product_APIcount = Array.isArray(productList) ? productList.length : 0;
    if (product_APIcount === 0) {
      expect(
        Array.isArray(productList),
        "Products_list should return an empty array when there are 0 products",
      ).toBeTruthy();
    } else {
      expect(Array.isArray(productList)).toBeTruthy();
    }
    sessionDataStorage.set("product_APIcount", product_APIcount);
    console.log(`Product list API count (on navigation): ${product_APIcount}`);

    expect(categoryListResponse.status()).toBe(200);
    const categoryBody = await categoryListResponse.json();
    expect(categoryBody.status).toBeTruthy();
    expect(categoryBody.msg).toBe("Category Found Successfully.");
    expect(
      Array.isArray(categoryBody.result),
      "Category list should be an array",
    ).toBeTruthy();
    const category_APIcount = categoryBody.result.length;
    expect(
      category_APIcount,
      "Category list should never be empty",
    ).toBeGreaterThan(0);
    sessionDataStorage.set("category_APIcount", category_APIcount);
    console.log(`Category list API count (on navigation): ${category_APIcount}`);

    await expect(this.page).toHaveURL(/\/merchants\/inventory\/new-products/, {
      timeout: 30_000,
    });
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
    //expect(vendorResponse.status).toBeTruthy();
    const noData = vendorResponse.status;
    if (noData === false) {
      expect(vendorResponse.message).toBe("No Data Found");
    } else {
      expect(vendorResponse.message).toBe("Vendor List.");
    }
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

  async tagsClick() {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.brand_URL),
      ),
      this.tags.click(),
    ]);

    expect(response.status()).toBe(200);
    const responseBody = await response.json();
    if (responseBody.status === false) {
      expect(responseBody.message).toBe("0 Data Found");
      sessionDataStorage.set("tag_APIcount", 0);
      console.log(`Tag API count (on navigation): 0`);
      return;
    }
    expect(responseBody.status).toBe(true);
    const tag_APIcount = Number(responseBody.total_count?.tag ?? 0);
    sessionDataStorage.set("tag_APIcount", tag_APIcount);
    console.log(`Tag API count (on navigation): ${tag_APIcount}`);
  }
}

module.exports = { Dashboard };
