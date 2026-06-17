import { expect } from "@playwright/test";
import routes from "../utilities/routes.json";
import sessionDataStorage from "../utilities/helper/sessionDataStorage";

const BRANDS_PAGE_URL = /\/merchants\/inventory\/brands/;

class Brands {
  constructor(page) {
    this.page = page;

    this.brandsHeading = page.getByText("Brands", { exact: true }).nth(1);
    this.brandCount = page.getByText(/\d+ brands?/);
    this.addBrandBtn = page.getByRole("button", { name: /Add brand/i });
    this.searchBar = page.getByRole("textbox", { name: "Search brands" });
    this.onlineDisplayOrder = page.getByText("Online display order");
    this.onlineDisplayDescription = page.getByText(
      /Drag rows to set the order shoppers see on quickvee\.com/i,
    );
    this.brandColumn = page.getByText("Brand", { exact: true });
    this.productsColumn = page.getByText("Products", { exact: true }).nth(1);
    this.actionsColumn = page.getByText("Actions", { exact: true });
    this.reorderHint = page.getByText(
      /Drag the handle to reorder · Tap a brand name to rename/i,
    );
    this.emptyState = page.getByText(
      /No brands yet\. Add your first brand to get started/i,
    );

    this.addBrandBtn = page.getByRole("button", { name: "Add brand" }).first();
    this.cancelBtn = page.getByRole("button", { name: "Cancel" }).first();
    this.addBrandConfirm = page
      .getByRole("button", { name: "Add brand" })
      .last();
    this.brandName = page.getByPlaceholder("New brand name");
    this.successfullDialog = page.getByText("Added Successfully");
    this.duplicateBrandError = page.getByText("Brand already exists");
    this.brandNameMaxLengthError = page.getByText(
      /50 character|maximum.*50|exceed.*50|too long/i,
    );
    this.updateBrandSuccessDialog = page.getByText("Updated");
  }

  getBrandListRow(brandName) {
    return this.page.locator('[data-brand-row="true"]').filter({
      has: this.page.getByRole("button", { name: brandName, exact: true }),
    });
  }

  getFirstBrandListRow() {
    return this.page.locator('[data-brand-row="true"]').first();
  }

  async clickEditButton(newBrandName) {
    await this.getFirstBrandListRow().getByRole("button").first().click();

    const brandInput = this.getFirstBrandListRow().getByRole("textbox");

    await expect(brandInput).toBeVisible();
    await expect(this.getFirstBrandListRow().getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(this.getFirstBrandListRow().getByRole("button", { name: "Save" })).toBeVisible();
    await brandInput.clear();
    await brandInput.fill(newBrandName);

    await this.saveBtnClick();
    await this.updateDialogDisplay();
    await this.verifyAddedBrandInListWithActions(newBrandName);
  }

  async updateDialogDisplay() {
    await expect(this.updateBrandSuccessDialog).toBeVisible();
  }


  async saveBtnClick() {
    const [updateAPI, listResponse] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.QA_URL.updateBrandQA),
      ),
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.QA_URL.brand_URL),
      ),
      this.page.getByRole("button", { name: "Save" }).click(),

    ]);

    expect(updateAPI.status()).toBe(200);
    expect(listResponse.status()).toBe(200);
    const updateResponseBody = await updateAPI.json();
    expect(updateResponseBody.message).toBe("Updated");
    expect(updateResponseBody.status).toBeTruthy();
    expect(updateResponseBody.codeElastic).toBe(200);

    const listResponseBody = await listResponse.json();
    const newApiCount = listResponseBody.total_count.brand;
    sessionDataStorage.set("brand_APIcount", newApiCount);
    console.log(`New brand count from list API (after edit): ${newApiCount}`);
    await this.verifyBrandCountMatchesAPI();
  }

  async successfullDialogDisplay() {
    await expect(this.successfullDialog).toBeVisible();
  }

  async verifyAddedBrandInListWithActions(brandName) {
    await expect(this.brandsHeading).toBeVisible({ timeout: 15_000 });
    const brandRow = this.getBrandListRow(brandName);
    await expect(brandRow).toBeVisible({ timeout: 15_000 });
    await expect(
      brandRow.getByRole("button", { name: brandName, exact: true }),
    ).toBeVisible();
    await expect(
      brandRow.getByRole("button", { name: "Rename" }),
    ).toBeVisible();
    await expect(
      brandRow.getByRole("button", { name: "Delete brand" }),
    ).toBeVisible();

    // TODO: Uncomment once newly added brand is fixed to appear at the top of the list
    // const firstRow = this.getFirstBrandListRow();
    // await expect(firstRow).toBeVisible();
    // await expect(
    //   firstRow.getByRole("button", { name: brandName, exact: true }),
    // ).toBeVisible();
    // await expect(firstRow.getByRole("button", { name: "Rename" })).toBeVisible();
    // await expect(
    //   firstRow.getByRole("button", { name: "Delete brand" }),
    // ).toBeVisible();
  }

  async brandsHeadingDisplay() {
    await expect(this.brandsHeading).toBeVisible();
  }

  async brandCountDisplay() {
    await expect(this.brandCount).toBeVisible();
  }

  async getDisplayedBrandCount() {
    await expect(this.brandCount).toBeVisible();
    const countText = (await this.brandCount.textContent())?.trim() ?? "";
    return parseInt(countText.match(/\d+/)?.[0] ?? "0", 10);
  }

  async verifyBrandCountMatchesAPI() {
    const uiCount = await this.getDisplayedBrandCount();
    const apiCount = sessionDataStorage.get("brand_APIcount");
    console.log(`UI brand count: ${uiCount}`);
    console.log(`API brand count: ${apiCount}`);
    expect(
      uiCount,
      `UI brand count (${uiCount}) should match API count (${apiCount})`,
    ).toBe(apiCount);
  }

  async addBrandBtnDisplay() {
    await expect(this.addBrandBtn).toBeVisible();
  }

  async searchBarDisplay() {
    await expect(this.searchBar).toBeVisible();
  }

  async searchBrand(brandName) {
    await this.searchBar.fill(brandName);
  }

  async clearBrandSearch() {
    await this.searchBar.clear();
  }

  async verifySearchedBrandDisplayed(brandName) {
    await expect(this.getBrandListRow(brandName)).toBeVisible();
    await expect(this.page.locator('[data-brand-row="true"]')).toHaveCount(1);
    await expect(
      this.getBrandListRow(brandName).getByRole("button", {
        name: brandName,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      this.getBrandListRow(brandName).getByRole("button", { name: "Rename" }),
    ).toBeVisible();
    await expect(
      this.getBrandListRow(brandName).getByRole("button", {
        name: "Delete brand",
      }),
    ).toBeVisible();
  }

  async onlineDisplayOrderDisplay() {
    await expect(this.onlineDisplayOrder).toBeVisible();
    await expect(this.onlineDisplayDescription).toBeVisible();
  }

  async tableColumnsDisplay() {
    await expect(this.brandColumn).toBeVisible();
    await expect(this.productsColumn).toBeVisible();
    await expect(this.actionsColumn).toBeVisible();
  }

  async reorderHintDisplay() {
    await expect(this.reorderHint).toBeVisible();
  }

  async emptyStateOrListingDisplay() {
    const countText = (await this.brandCount.textContent())?.trim() ?? "";
    const hasBrands = !countText.startsWith("0");

    if (hasBrands) {
      await expect(this.brandColumn).toBeVisible();
    } else {
      await expect(this.emptyState).toBeVisible();
    }
  }

  async brandNameDisplay() {
    await expect(this.brandName).toBeVisible();
  }

  async addBrandBtnClick() {
    await this.addBrandBtn.click();
    await this.brandNameDisplay();
  }

  async addBrandConfirmDisable() {
    await expect(this.addBrandConfirm).toBeDisabled();
  }

  async addBrandConfirmClick() {
    await this.addBrandConfirm.click();
  }

  async multipleClickAdd() {
    await this.addBrandBtn.click();
    await this.addBrandBtn.click();
    await this.addBrandBtn.click();

    await expect(this.page.getByPlaceholder("New brand name")).toHaveCount(1);
    await expect(this.cancelBtn).toBeVisible();
    await this.addBrandConfirmDisable();
  }

  async setBrandName(value) {
    await this.page.getByPlaceholder("New brand name").fill(value);
  }

  async getBrandName() {
    const value = await this.page
      .getByPlaceholder("New brand name")
      .inputValue();
    if (value.length === 0) {
      await expect(this.addBrandConfirm).toBeDisabled();
      console.log("Disable");
    } else {
      await expect(this.addBrandConfirm).toBeEnabled();
      console.log("Enable");
    }
  }

  async generateUniqueBrandName() {
    return `AutoBrand_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  async generateUniqueEditBrandName() {
    return `EditBrand_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  async verifyDuplicateBrandNameError() {
    await expect(this.duplicateBrandError).toBeVisible({ timeout: 10_000 });
    await expect(this.successfullDialog).not.toBeVisible();
  }

  async verifyDuplicateBrandNameNotAllowed(brandName) {
    await this.addBrandBtnClick();
    await this.setBrandName(brandName);
    await this.addBrandConfirmClick();
    await this.verifyDuplicateBrandNameError();
    await this.cancelBtnClick();
  }

  generateLongBrandName(length = 51) {
    return `AutoBrand_${"x".repeat(length)}`;
  }

  async verifyBrandNameMaxLengthError() {
    await expect(this.brandNameMaxLengthError).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.successfullDialog).not.toBeVisible();
  }

  async verifyBrandNameExceedingMaxLengthNotAllowed(maxLength = 50) {
    await this.addBrandBtnClick();
    await this.setBrandName(this.generateLongBrandName(maxLength + 1));
    await this.addBrandConfirmClick();
    await this.verifyBrandNameMaxLengthError();
    await this.cancelBtnClick();
  }

  async cancelBtnClick() {
    await this.cancelBtn.click();
    expect(this.page.getByPlaceholder("New brand name")).toBeHidden();
  }

  async addBtnAPI() {
    const previousCount = sessionDataStorage.get("brand_APIcount");
    const addBrandPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.QA_URL.addBrandQA),
    );
    const brandListPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.QA_URL.brand_URL),
    );

    await this.addBrandConfirmClick();

    const [addResponse, listResponse] = await Promise.all([
      addBrandPromise,
      brandListPromise,
    ]);

    expect(addResponse.status()).toBe(200);
    const addResponseBody = await addResponse.json();
    expect(addResponseBody.message).toBe("Inserted");
    expect(addResponseBody.status).toBeTruthy();

    expect(listResponse.status()).toBe(200);
    const listResponseBody = await listResponse.json();
    const newApiCount = listResponseBody.total_count.brand;
    sessionDataStorage.set("brand_APIcount", newApiCount);
    console.log(`Previous brand count (before add): ${previousCount}`);
    console.log(`New brand count from list API (after add): ${newApiCount}`);
    expect(
      newApiCount,
      `Brand list API count should increase by 1 after add (was ${previousCount}, now ${newApiCount})`,
    ).toBe(previousCount + 1);

    await this.verifyBrandCountMatchesAPI();
  }
}

module.exports = { Brands };
