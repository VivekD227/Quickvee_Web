import { expect } from "@playwright/test";
import sessionDataStorage from "../utilities/helper/sessionDataStorage";

const ORDER_COUPONS_URL =
  /\/merchants\/promotions\/coupons\/order-coupons\/?$/;
const ITEM_COUPONS_URL =
  /\/merchants\/promotions\/coupons\/item-coupons\/?$/;
const ADD_ORDER_COUPON_URL =
  /\/merchants\/promotions\/coupons\/order-coupons\/add/;

class Coupons {
  constructor(page) {
    this.page = page;

    this.orderCouponTab = page.getByText("Order Coupon", { exact: true });
    this.itemCouponTab = page.getByText("Item Coupon", { exact: true });
    this.addOrderCouponBtn = page
      .getByRole("link", { name: /Add Order Coupon/i })
      .or(page.getByRole("button", { name: /Add Order Coupon/i }));
    this.addItemCouponBtn = page
      .getByRole("link", { name: /Add Item Coupon/i })
      .or(page.getByRole("button", { name: /Add Item Coupon/i }));
    this.couponsMenuLink = page.getByRole("link", {
      name: "Coupons",
      exact: true,
    });

    this.addFormHeading = page.getByText(/Add Order Coupons/i);
    this.listOnlineLabel = page.getByText("List Online", { exact: true });
    this.couponCodeInput = page.getByRole("textbox", { name: "Coupon Code" }).or(
      page
        .getByText("Coupon Code", { exact: true })
        .locator("xpath=following::input[1]"),
    );
    this.descriptionInput = page.getByRole("textbox", { name: "Description" });
    this.copyToStoresLabel = page.getByText(/Copy coupon to other stores/i);
    this.searchStoresInput = page.getByPlaceholder(/Search Stores/i);
    this.minOrderInput = page.getByPlaceholder("Enter Minimum Order Amount");
    this.discountAmountInput = page.getByPlaceholder("Enter Discount Amount");
    this.amountTypeBtn = page.getByText("Amount ($)", { exact: true });
    this.percentageTypeBtn = page.getByText("Percentage (%)", { exact: true });
    this.startDateInput = page.getByRole("textbox", { name: "Start Date" });
    this.endDateInput = page.getByRole("textbox", { name: "End Date" });
    this.redemptionLimitLabel = page.getByText(/Enable Redemption Limit/i);
    this.addSubmitBtn = page.getByRole("button", { name: "Add", exact: true });
    this.cancelBtn = page.getByRole("button", { name: "Cancel", exact: true });
    this.successToast = page
      .getByRole("alert")
      .filter({ hasText: "Added Successfully" });
    this.couponNameRequired = page.getByText("Coupon name is required");
    this.minOrderRequired = page.getByText(
      "Minimum Order Amount is required",
    );
    this.discountAmountRequired = page.getByText(
      "Discount Amount is required",
    );
    this.minGreaterThanDiscount = page.getByText(
      /Minimum order amount must be greater than the discount amount/i,
    );
    this.popupOkBtn = page.getByRole("button", { name: "Ok", exact: true });
    this.discountPercentInput = page.getByPlaceholder(
      "Enter Discount Percentage",
    );
    this.maxDiscountInput = page.getByPlaceholder(
      "Enter Maximum Discount Amount",
    );
    this.listOnlineCheckbox = page
      .locator("div")
      .filter({ has: page.getByText("List Online", { exact: true }) })
      .getByRole("checkbox")
      .first();
    this.duplicateCouponError = page.getByText(
      /Coupon name already exist/i,
    );
    this.editFormHeading = page.getByText(/Edit Order Coupon/i);
    this.saveBtn = page.getByRole("button", { name: "Save", exact: true });
    this.deleteConfirmText = page.getByText(
      /Are you sure you want to\s*delete this Order Coupon\s*\?/i,
    );
    this.deleteConfirmBtn = page.getByRole("button", {
      name: "Delete",
      exact: true,
    });
    this.deleteCancelBtn = page.getByRole("button", {
      name: "Cancel",
      exact: true,
    });
    this.deleteSuccessToast = page
      .getByRole("alert")
      .filter({ hasText: "Deleted Successfully" });
  }

  async verifyPageUrl() {
    await expect(this.page).toHaveURL(ORDER_COUPONS_URL);
  }

  async verifyCouponsPageUI() {
    await this.verifyPageUrl();
    await expect(this.couponsMenuLink).toBeVisible();
    await expect(this.orderCouponTab.first()).toBeVisible();
    await expect(this.itemCouponTab.first()).toBeVisible();
    await expect(this.addOrderCouponBtn).toBeVisible();
  }

  getCouponListCount(body) {
    return Number(body?.total_rows ?? body?.data?.length ?? 0);
  }

  async waitForCouponListApi() {
    return this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes("get_coupon_list"),
    );
  }

  async waitForCouponListWithCount(expectedCount) {
    const listResponse = await this.page.waitForResponse(
      async (res) => {
        if (
          res.request().method() !== "POST" ||
          !res.url().includes("get_coupon_list") ||
          res.status() !== 200
        ) {
          return false;
        }
        const body = await res.json();
        return this.getCouponListCount(body) === expectedCount;
      },
      { timeout: 15_000 },
    );
    const newCount = this.getCouponListCount(await listResponse.json());
    sessionDataStorage.set("coupon_APIcount", newCount);
    return newCount;
  }

  async openItemCouponTab() {
    const listPromise = this.waitForCouponListApi();
    await this.itemCouponTab.first().click();
    await listPromise;
    await expect(this.page).toHaveURL(ITEM_COUPONS_URL);
    await expect(this.addItemCouponBtn).toBeVisible();
  }

  async openOrderCouponTab() {
    const listPromise = this.waitForCouponListApi();
    await this.orderCouponTab.first().click();
    const listResponse = await listPromise;
    sessionDataStorage.set(
      "coupon_APIcount",
      this.getCouponListCount(await listResponse.json()),
    );
    await expect(this.page).toHaveURL(ORDER_COUPONS_URL);
    await expect(this.addOrderCouponBtn).toBeVisible();
  }

  async openAddOrderCouponForm() {
    await this.addOrderCouponBtn.click();
    await expect(this.page).toHaveURL(ADD_ORDER_COUPON_URL);
    await expect(this.addFormHeading).toBeVisible();
  }

  async verifyAddOrderCouponFormUI() {
    await expect(this.listOnlineLabel).toBeVisible();
    await expect(this.couponCodeInput).toBeVisible();
    await expect(this.descriptionInput).toBeVisible();
    await this.verifyCopyToStoresByStoreCount();
    await expect(this.minOrderInput).toBeVisible();
    await expect(this.discountAmountInput).toBeVisible();
    await expect(this.amountTypeBtn).toBeVisible();
    await expect(this.percentageTypeBtn).toBeVisible();
    await expect(this.startDateInput).toBeVisible();
    await expect(this.endDateInput).toBeVisible();
    await expect(this.redemptionLimitLabel).toBeVisible();
    await expect(this.addSubmitBtn).toBeVisible();
    await expect(this.cancelBtn).toBeVisible();
  }

  async verifyCopyToStoresByStoreCount() {
    const storeCount = Number(sessionDataStorage.get("storeCount") ?? 0);
    if (storeCount > 1) {
      await expect(this.copyToStoresLabel).toBeVisible();
      await expect(this.searchStoresInput).toBeVisible();
      return;
    }
    await expect(this.copyToStoresLabel).toBeHidden();
    await expect(this.searchStoresInput).toBeHidden();
  }

  async submitEmptyAddForm() {
    await this.addSubmitBtn.click();
    await expect(this.page).toHaveURL(ADD_ORDER_COUPON_URL);
    await expect(this.couponNameRequired).toBeVisible();
    await expect(this.minOrderRequired).toBeVisible();
  }

  async cancelAddForm() {
    await this.cancelBtn.click();
    await expect(this.page).toHaveURL(ORDER_COUPONS_URL);
    await expect(this.addOrderCouponBtn).toBeVisible();
  }

  generateUniqueCouponCode() {
    return `A${Date.now().toString().slice(-10)}`;
  }

  formatDate(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${month}/${day}/${date.getFullYear()}`;
  }

  async fillValidDates() {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);
    await this.startDateInput.fill(this.formatDate(start));
    await this.endDateInput.fill(this.formatDate(end));
    await this.endDateInput.press("Tab");
  }

  async fillOrderCouponForm({
    code,
    description = "Automation coupon",
    minOrder = "10.00",
    discount = "1.00",
    discountType = "amount",
    maxDiscount,
    sameDates = false,
    listOnline = false,
  }) {
    if (listOnline) {
      await this.listOnlineCheckbox.check({ force: true });
      await expect(this.listOnlineCheckbox).toBeChecked();
    }

    await this.couponCodeInput.fill(code);
    await this.descriptionInput.fill(description);
    await this.minOrderInput.fill(minOrder);

    if (discountType === "percentage") {
      await this.percentageTypeBtn.click();
      await expect(this.discountPercentInput).toBeVisible();
      await this.discountPercentInput.fill(discount);
      if (maxDiscount) {
        await expect(this.maxDiscountInput).toBeVisible();
        await this.maxDiscountInput.fill(maxDiscount);
      }
    } else {
      await this.discountAmountInput.fill(discount);
    }

    if (sameDates) {
      const today = this.formatDate(new Date());
      await this.startDateInput.fill(today);
      await this.endDateInput.fill(today);
      await this.endDateInput.press("Tab");
    } else {
      await this.fillValidDates();
    }
  }

  async verifyDiscountAmountRequired() {
    await this.couponCodeInput.fill(this.generateUniqueCouponCode());
    await this.minOrderInput.fill("10.00");
    await this.fillValidDates();
    await this.addSubmitBtn.click();
    await expect(this.page).toHaveURL(ADD_ORDER_COUPON_URL);
    await expect(this.discountAmountRequired).toBeVisible();
  }

  async verifyMinOrderGreaterThanDiscount() {
    await this.couponCodeInput.fill(this.generateUniqueCouponCode());
    await this.fillValidDates();
    await this.minOrderInput.fill("5.00");
    await this.discountAmountInput.fill("10.00");
    await this.addSubmitBtn.click();
    await expect(this.minGreaterThanDiscount).toBeVisible();
    await expect(this.popupOkBtn).toBeVisible();
    await this.popupOkBtn.click();
    await expect(this.minGreaterThanDiscount).toBeHidden();
  }

  async addOrderCoupon(code) {
    await this.submitNewCoupon(code);
  }

  async addPercentOrderCoupon(code) {
    await this.submitNewCoupon(code, {
      minOrder: "10.00",
      discount: "50",
      discountType: "percentage",
      maxDiscount: "10.00",
    });
  }

  async submitNewCoupon(code, formOptions = {}) {
    const previousCount = Number(sessionDataStorage.get("coupon_APIcount") ?? 0);
    const expectedCount = previousCount + 1;
    const addPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes("add_coupon"),
    );
    const listPromise = this.waitForCouponListWithCount(expectedCount);
    await this.fillOrderCouponForm({ code, ...formOptions });
    await this.addSubmitBtn.click();
    const addResponse = await addPromise;
    expect(addResponse.status()).toBe(200);
    const newCount = await listPromise;
    await expect(this.successToast.first()).toBeVisible();
    await expect(this.page).toHaveURL(ORDER_COUPONS_URL);
    await expect(this.page.getByText(code, { exact: true }).first()).toBeVisible();
    expect(
      newCount,
      `Coupon list API count should increase by 1 after add (was ${previousCount}, now ${newCount})`,
    ).toBe(expectedCount);
  }

  async addOrderCouponWithListOnline(code) {
    await this.submitNewCoupon(code, { listOnline: true });
  }

  async verifyDuplicateCouponNameNotAllowed(code) {
    await this.fillOrderCouponForm({ code });
    await this.addSubmitBtn.click();
    await expect(this.page).toHaveURL(ADD_ORDER_COUPON_URL);
    await expect(this.duplicateCouponError).toBeVisible();
    await this.cancelAddForm();
  }

  async addOrderCouponWithSameDates(code) {
    await this.submitNewCoupon(code, { sameDates: true });
    await expect(
      this.page.getByText("Expire Date", { exact: true }),
    ).toHaveCount(0);
  }

  getCouponEditLink(code) {
    return this.page
      .getByText(code, { exact: true })
      .locator("xpath=following::a[contains(@href,'edit-order-coupons')][1]");
  }

  async openEditCoupon(code) {
    const editLink = this.getCouponEditLink(code);
    await expect(editLink).toBeVisible();
    await editLink.click();
    await expect(this.page).toHaveURL(/\/edit-order-coupons\/\d+/);
    await expect(this.editFormHeading).toBeVisible();
  }

  async verifyCouponCodeNotEditable(code) {
    await expect(this.couponCodeInput).toHaveValue(code);
    await expect(this.couponCodeInput).not.toBeEditable();
  }

  async saveEditedCoupon(code) {
    const previousCount = Number(sessionDataStorage.get("coupon_APIcount") ?? 0);
    const editPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes("edit_coupon"),
    );
    const listPromise = this.waitForCouponListWithCount(previousCount);
    await this.saveBtn.click();
    const editResponse = await editPromise;
    expect(editResponse.status()).toBe(200);
    const newCount = await listPromise;
    await expect(this.page.getByRole("alert").first()).toBeVisible();
    await expect(this.page).toHaveURL(ORDER_COUPONS_URL);
    await expect(this.page.getByText(code, { exact: true }).first()).toBeVisible();
    expect(
      newCount,
      `Coupon list API count should stay the same after edit (was ${previousCount}, now ${newCount})`,
    ).toBe(previousCount);
  }

  async editAmountCoupon(code, { description, discount }) {
    await this.openEditCoupon(code);
    await this.verifyCouponCodeNotEditable(code);
    await this.descriptionInput.fill(description);
    await this.discountAmountInput.fill(discount);
    await this.saveEditedCoupon(code);
  }

  async editPercentCoupon(code, { description, discount, maxDiscount }) {
    await this.openEditCoupon(code);
    await this.verifyCouponCodeNotEditable(code);
    await this.descriptionInput.fill(description);
    await expect(this.discountPercentInput).toBeVisible();
    await this.discountPercentInput.fill(discount);
    if (maxDiscount) {
      await this.maxDiscountInput.fill(maxDiscount);
    }
    await this.saveEditedCoupon(code);
  }

  getCouponDeleteIcon(code) {
    return this.page
      .getByText(code, { exact: true })
      .locator("xpath=following::img[@alt='delete'][1]");
  }

  async clickDeleteCoupon(code) {
    const deleteIcon = this.getCouponDeleteIcon(code);
    await expect(deleteIcon).toBeVisible();
    await deleteIcon.click();
    await expect(this.deleteConfirmText).toBeVisible();
    await expect(this.deleteCancelBtn).toBeVisible();
    await expect(this.deleteConfirmBtn).toBeVisible();
  }

  async cancelDeleteCoupon(code) {
    const previousCount = Number(sessionDataStorage.get("coupon_APIcount") ?? 0);
    await this.clickDeleteCoupon(code);
    await this.deleteCancelBtn.click();
    await expect(this.deleteConfirmText).toBeHidden();
    await expect(this.page.getByText(code, { exact: true }).first()).toBeVisible();
    expect(
      Number(sessionDataStorage.get("coupon_APIcount") ?? 0),
      "Coupon list API count should stay the same after cancel delete",
    ).toBe(previousCount);
  }

  async confirmDeleteCoupon(code) {
    const previousCount = Number(sessionDataStorage.get("coupon_APIcount") ?? 0);
    const expectedCount = previousCount - 1;
    const deletePromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes("delete_coupon"),
    );
    await this.deleteConfirmBtn.click();
    const deleteResponse = await deletePromise;
    expect(deleteResponse.status()).toBe(200);
    await expect(this.deleteSuccessToast.first()).toBeVisible();
    await expect(this.deleteConfirmText).toBeHidden();
    await expect(this.page.getByText(code, { exact: true })).toHaveCount(0);

    const listPromise = this.waitForCouponListWithCount(expectedCount);
    await this.itemCouponTab.first().click();
    await this.orderCouponTab.first().click();
    const newCount = await listPromise;
    expect(
      newCount,
      `Coupon list API count should decrease by 1 after delete (was ${previousCount}, now ${newCount})`,
    ).toBe(expectedCount);
  }

  async deleteOrderCoupon(code) {
    await this.clickDeleteCoupon(code);
    await this.confirmDeleteCoupon(code);
  }
}

module.exports = { Coupons };
