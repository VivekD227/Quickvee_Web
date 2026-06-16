import { expect } from "@playwright/test";

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
  }

  async verifyBrandsPageLoaded() {
    await expect(this.page).toHaveURL(BRANDS_PAGE_URL);
    await expect(this.brandsHeading).toBeVisible();
  }

  async brandsHeadingDisplay() {
    await expect(this.brandsHeading).toBeVisible();
  }

  async brandCountDisplay() {
    await expect(this.brandCount).toBeVisible();
  }

  async addBrandBtnDisplay() {
    await expect(this.addBrandBtn).toBeVisible();
  }

  async searchBarDisplay() {
    await expect(this.searchBar).toBeVisible();
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

  async cancelBtnClick() {
    await this.cancelBtn.click();
    expect(this.page.getByPlaceholder("New brand name")).toBeHidden();
  }
}

module.exports = { Brands };
