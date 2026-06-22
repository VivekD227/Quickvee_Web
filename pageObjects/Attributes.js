import { expect } from "@playwright/test";
import routes from "../utilities/routes.json";
import sessionDataStorage from "../utilities/helper/sessionDataStorage";

const ATTRIBUTES_PAGE_URL = /\/merchants\/inventory\/attributes/;
const ATTRIBUTES_DESCRIPTION_TITLE =
  "Attributes name the option types you offer";
const ATTRIBUTES_DESCRIPTION_BODY =
  "Define the option type once (Size, Color, Flavor) and pick its values when you set up each variant product. That way the same attribute can mean S/M/L on a t-shirt and 8oz/12oz/16oz on a candle.";

class Attributes {
  constructor(page) {
    this.page = page;

    this.attributesHeading = page
      .getByText("Attributes", { exact: true })
      .nth(1);
    this.attributeCount = page.getByText(/\d+ attributes?/i);
    this.addAttributeBtn = page.getByRole("button", { name: /Add attribute/i });
    this.searchBar = page.getByRole("textbox", { name: /Search attribute/i });
    this.attributesDescriptionTitle = page.getByText(
      ATTRIBUTES_DESCRIPTION_TITLE,
      { exact: true },
    );
    this.attributesDescriptionBody = page.getByText(
      ATTRIBUTES_DESCRIPTION_BODY,
      { exact: true },
    );
  }

  async verifyAttributesPageLoaded() {
    await expect(this.attributesHeading).toBeVisible({ timeout: 15_000 });
    await expect(this.attributeCount).toBeVisible();
  }

  async verifyPageUrl() {
    await expect(this.page).toHaveURL(ATTRIBUTES_PAGE_URL);
  }

  async verifyListApiOnPageLoad() {
    const apiCount = sessionDataStorage.get("attribute_APIcount");
    expect(
      apiCount,
      "Attribute list API count should be stored on page load",
    ).toBeDefined();
    expect(typeof apiCount).toBe("number");
    expect(apiCount).toBeGreaterThanOrEqual(0);

    const uiCount = await this.getDisplayedAttributeCount();
    console.log(`UI attribute count: ${uiCount}`);
    console.log(`API attribute count: ${apiCount}`);
    expect(
      uiCount,
      `UI attribute count (${uiCount}) should match API count (${apiCount})`,
    ).toBe(apiCount);
  }

  async getDisplayedAttributeCount() {
    await expect(this.attributeCount).toBeVisible();
    const countText = (await this.attributeCount.textContent())?.trim() ?? "";
    return parseInt(countText.match(/\d+/)?.[0] ?? "0", 10);
  }

  async attributesHeadingDisplay() {
    await expect(this.attributesHeading).toBeVisible();
  }

  async attributeCountDisplay() {
    await expect(this.attributeCount).toBeVisible();
  }

  async addAttributeBtnDisplay() {
    await expect(this.addAttributeBtn).toBeVisible();
  }

  async searchBarDisplay() {
    await expect(this.searchBar).toBeVisible();
  }

  async verifyAttributeCountAtLeast(minCount = 9) {
    const uiCount = await this.getDisplayedAttributeCount();
    const apiCount = sessionDataStorage.get("attribute_APIcount");

    console.log(`UI attribute count: ${uiCount}`);
    console.log(`API attribute count: ${apiCount}`);

    expect(
      uiCount,
      `UI attribute count (${uiCount}) should be at least ${minCount}`,
    ).toBeGreaterThanOrEqual(minCount);
    expect(
      apiCount,
      `API attribute count (${apiCount}) should be at least ${minCount}`,
    ).toBeGreaterThanOrEqual(minCount);
  }

  async verifyAttributesDescriptionText() {
    await expect(this.attributesDescriptionTitle).toBeVisible();
    await expect(this.attributesDescriptionTitle).toHaveText(
      ATTRIBUTES_DESCRIPTION_TITLE,
    );
    await expect(this.attributesDescriptionBody).toBeVisible();
    await expect(this.attributesDescriptionBody).toHaveText(
      ATTRIBUTES_DESCRIPTION_BODY,
    );
  }

  async verifyAttributesPageUIElements() {
    await this.attributesHeadingDisplay();
    await this.attributeCountDisplay();
    await this.verifyAttributeCountAtLeast(9);
    await this.addAttributeBtnDisplay();
    await this.searchBarDisplay();
  }
}

module.exports = {
  Attributes,
  ATTRIBUTES_PAGE_URL,
  ATTRIBUTES_DESCRIPTION_TITLE,
  ATTRIBUTES_DESCRIPTION_BODY,
};
