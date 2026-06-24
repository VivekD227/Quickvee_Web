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
    this.addAttributeBtn = page
      .getByRole("button", { name: /Add attribute/i })
      .first();
    this.searchBar = page.getByRole("textbox", { name: /Search attribute/i });
    this.attributesDescriptionTitle = page.getByText(
      ATTRIBUTES_DESCRIPTION_TITLE,
      { exact: true },
    );
    this.attributesDescriptionBody = page.getByText(
      ATTRIBUTES_DESCRIPTION_BODY,
      { exact: true },
    );
    this.cancelBtn = page.getByRole("button", { name: "Cancel" }).first();
    this.setAttribute = page.getByPlaceholder("Attribute Name");
    this.addAttribute = page
      .getByRole("button", { name: "Add Attribute" })
      .last();
    this.successfullDialog = page.getByText("Added Successfully");
    this.duplicateError = page.getByText("Attribute name already exists");
    this.specialCharacterError = page.getByText(
      "Special characters are not allowed",
    );
    this.attributeNameMaxLengthError = page.getByText(
      /50 character|maximum.*50|exceed.*50|too long/i,
    );
    this.updateAttributeSuccessDialog = page.getByText("Updated Successfully");
  }

  getAttributeListRow(attributeName) {
    return this.page.locator('[data-attr-row="true"]').filter({
      has: this.page.getByRole("button", { name: attributeName, exact: true }),
    });
  }

  getFirstAttributeListRow() {
    return this.page.locator('[data-attr-row="true"]').first();
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

  async verifyAttributeCountMatchesAPI() {
    const uiCount = await this.getDisplayedAttributeCount();
    const apiCount = sessionDataStorage.get("attribute_APIcount");
    console.log(`UI attribute count: ${uiCount}`);
    console.log(`API attribute count: ${apiCount}`);
    expect(
      uiCount,
      `UI attribute count (${uiCount}) should match API count (${apiCount})`,
    ).toBe(apiCount);
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
    await this.multipleClickAddBtn();
  }

  async addAttributeBtnClick() {
    await this.addAttributeBtn.click();
    await expect(this.cancelBtn).toBeVisible();
    await expect(this.setAttribute).toBeVisible();
    await expect(this.addAttribute).toBeVisible();
    await this.disableAddAttribute();
  }

  async multipleClickAddBtn() {
    await this.addAttributeBtnClick();
    await this.addAttributeBtnClick();
    await this.addAttributeBtnClick();
    await expect(this.cancelBtn).toBeVisible();
    await expect(this.cancelBtn).toHaveCount(1);
    await this.cancelBtn.click();
  }

  async disableAddAttribute() {
    const getAttributeName = await this.setAttribute.inputValue();
    if (getAttributeName === "") {
      await expect(this.addAttribute).toBeDisabled();
    } else {
      await expect(this.addAttribute).toBeEnabled();
    }
  }

  async setAttributeName(attributeName) {
    await this.setAttribute.fill(attributeName);
    await this.disableAddAttribute();
  }

  async addAttributeClick() {
    await this.addAttribute.click();
  }

  async successfullDialogDisplay() {
    await expect(this.successfullDialog).toBeVisible();
  }

  async verifyAddedAttributeInListWithActions(attributeName) {
    await expect(this.attributesHeading).toBeVisible({ timeout: 15_000 });
    const attributeRow = this.getAttributeListRow(attributeName);
    await expect(attributeRow).toBeVisible();
    await expect(
      attributeRow.getByRole("button", { name: attributeName, exact: true }),
    ).toBeVisible();
    await expect(
      attributeRow.getByRole("button", { name: "Rename" }),
    ).toBeVisible();
  }

  async searchAttribute(attributeName) {
    await this.searchBar.fill(attributeName);
  }

  async clearAttributeSearch() {
    await this.searchBar.clear();
  }

  async verifySearchedAttributeDisplayed(attributeName) {
    await expect(this.getAttributeListRow(attributeName)).toBeVisible();
    await expect(this.getAttributeListRow(attributeName)).toHaveCount(1);
    await expect(
      this.getAttributeListRow(attributeName).getByRole("button", {
        name: attributeName,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      this.getAttributeListRow(attributeName).getByRole("button", {
        name: "Rename",
      }),
    ).toBeVisible();

    await this.searchBar.clear();
  }

  async generateUniqueAttributeName() {
    return `AutoAttribute${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }

  async generateUniqueEditAttributeName() {
    return `EditAttribute${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }

  async duplicateErrorMsg() {
    await expect(this.duplicateError).toBeVisible();
  }

  async specialCharacterErrorMsg() {
    await expect(this.specialCharacterError).toBeVisible();
  }

  async verifyDuplicateAttributeNameError() {
    await expect(this.duplicateError).toBeVisible({ timeout: 10_000 });
    await expect(this.successfullDialog).not.toBeVisible();
  }

  async verifyDuplicateAttributeNameNotAllowed(attributeName) {
    await this.addAttributeBtnClick();
    await this.setAttributeName(attributeName);
    await this.addAttributeClick();
    await this.verifyDuplicateAttributeNameError();
    await this.cancelBtnClick();
  }

  generateLongAttributeName(length = 51) {
    return `AutoAttribute${"x".repeat(length)}`;
  }

  generateLongEditName(length = 51) {
    return "x".repeat(length);
  }

  async startEditForAttribute(attributeName) {
    await this.clearAttributeSearch();
    await this.searchAttribute(attributeName);

    const attributeRow = this.getAttributeListRow(attributeName);
    await expect(attributeRow).toBeVisible({ timeout: 15_000 });
    await attributeRow
      .getByRole("button", { name: attributeName, exact: true })
      .click();

    const editingRow = this.page.locator('[data-attr-row="true"]').first();
    await expect(editingRow.getByRole("textbox")).toBeVisible();
    await expect(
      editingRow.getByRole("button", { name: "Cancel" }),
    ).toBeVisible();
    await expect(
      editingRow.getByRole("button", { name: "Save" }),
    ).toBeVisible();
    return editingRow;
  }

  async cancelEdit(attributeName) {
    const editingRow = await this.startEditForAttribute(attributeName);
    const attributeInput = editingRow.getByRole("textbox");
    const temporaryName = `${attributeName}Temp`;

    await attributeInput.clear();
    await attributeInput.fill(temporaryName);
    await editingRow.getByRole("button", { name: "Cancel" }).click();

    await expect(attributeInput).toBeHidden();
    const attributeRow = this.getAttributeListRow(attributeName);
    await expect(
      attributeRow.getByRole("button", { name: attributeName, exact: true }),
    ).toBeVisible();
    await expect(
      this.getAttributeListRow(temporaryName),
    ).toHaveCount(0);
    await this.clearAttributeSearch();
  }

  async verifyMaxLengthOnEdit(attributeName, maxLength = 50) {
    const editingRow = await this.startEditForAttribute(attributeName);
    const attributeInput = editingRow.getByRole("textbox");

    await attributeInput.clear();
    await attributeInput.fill(this.generateLongEditName(maxLength + 1));
    await editingRow.getByRole("button", { name: "Save" }).click();
    await this.verifyAttributeNameMaxLengthError();
    await editingRow.getByRole("button", { name: "Cancel" }).click();
    await expect(attributeInput).toBeHidden();
    await this.clearAttributeSearch();
  }

  async verifyAttributeNameMaxLengthError() {
    await expect(this.attributeNameMaxLengthError).toBeVisible({
      timeout: 10_000,
    });
    await expect(this.successfullDialog).not.toBeVisible();
  }

  async verifyAttributeNameExceedingMaxLengthNotAllowed(maxLength = 50) {
    await this.addAttributeBtnClick();
    await this.setAttributeName(this.generateLongAttributeName(maxLength + 1));
    await this.addAttributeClick();
    await this.verifyAttributeNameMaxLengthError();
    await this.cancelBtnClick();
  }

  async clickEditButton(newAttributeName) {
    await this.getFirstAttributeListRow().getByRole("button").first().click();

    const attributeInput = this.getFirstAttributeListRow().getByRole("textbox");

    await expect(attributeInput).toBeVisible();
    await expect(
      this.getFirstAttributeListRow().getByRole("button", { name: "Cancel" }),
    ).toBeVisible();
    await expect(
      this.getFirstAttributeListRow().getByRole("button", { name: "Save" }),
    ).toBeVisible();
    await attributeInput.clear();
    await attributeInput.fill(newAttributeName);

    await this.saveBtnClick();
    await this.updateDialogDisplay();
    await this.verifyAddedAttributeInListWithActions(newAttributeName);
  }

  async verifyDuplicateOnEdit(duplicateAttribute) {
    await this.getFirstAttributeListRow()
      .getByRole("button", { name: "Rename" })
      .first()
      .click();

    const attributeInput = this.getFirstAttributeListRow().getByRole("textbox");
    await attributeInput.fill(duplicateAttribute);
    await this.getFirstAttributeListRow()
      .getByRole("button", { name: "Save" })
      .first()
      .click();
    await expect(this.duplicateError).toBeVisible();
  }

  async updateDialogDisplay() {
    await expect(this.updateAttributeSuccessDialog).toBeVisible();
  }

  async saveBtnClick() {
    const [updateAPI, listResponse] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.QA_URL.addAttributeQA),
      ),
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.QA_URL.attributeList_URL),
      ),
      this.page.getByRole("button", { name: "Save" }).click(),
    ]);

    expect(updateAPI.status()).toBe(200);
    expect(listResponse.status()).toBe(200);
    const updateResponseBody = await updateAPI.json();
    expect(updateResponseBody.message).toBe("Success");
    expect(updateResponseBody.response_message).toBe("variant updated");

    const listResponseBody = await listResponse.json();
    const newApiCount = listResponseBody.total;
    sessionDataStorage.set("attribute_APIcount", newApiCount);
    console.log(
      `New attribute count from list API (after edit): ${newApiCount}`,
    );
    await this.verifyAttributeCountMatchesAPI();
  }

  async verifyAttributeNotInList(attributeName) {
    await expect(this.getAttributeListRow(attributeName)).toHaveCount(0);
  }

  async cancelBtnClick() {
    await this.cancelBtn.click();
    await expect(this.setAttribute).toBeHidden();
  }

  async addBtnAPI() {
    const previousCount = sessionDataStorage.get("attribute_APIcount");
    const addAttributePromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.QA_URL.addAttributeQA),
    );
    const attributeListPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.QA_URL.attributeList_URL),
    );

    await this.addAttributeClick();

    const [addResponse, listResponse] = await Promise.all([
      addAttributePromise,
      attributeListPromise,
    ]);

    expect(addResponse.status()).toBe(200);
    expect(listResponse.status()).toBe(200);

    const addResponseBody = await addResponse.json();
    expect(addResponseBody.message).toBe("Success");

    const listResponseBody = await listResponse.json();
    const newApiCount = listResponseBody.total;
    sessionDataStorage.set("attribute_APIcount", newApiCount);
    console.log(`Previous attribute count (before add): ${previousCount}`);
    console.log(
      `New attribute count from list API (after add): ${newApiCount}`,
    );
    expect(
      newApiCount,
      `Attribute list API count should increase by 1 after add (was ${previousCount}, now ${newApiCount})`,
    ).toBe(previousCount + 1);
  }
}

module.exports = {
  Attributes,
  ATTRIBUTES_PAGE_URL,
  ATTRIBUTES_DESCRIPTION_TITLE,
  ATTRIBUTES_DESCRIPTION_BODY,
};
