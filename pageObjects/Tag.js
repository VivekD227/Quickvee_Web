import { expect } from "@playwright/test";
import routes from "../utilities/routes.js";
import sessionDataStorage from "../utilities/helper/sessionDataStorage";

const TAGS_PAGE_URL = /\/merchants\/inventory\/tags/;
const TAGS_DESCRIPTION_TITLE = "Tags label products for filtering & promotion";
const TAGS_DESCRIPTION_HELPER =
  "Tap a tag name to rename, its color swatch to change how it appears. Select multiple tags to merge duplicates.";
const TAGS_FOOTER_HINT =
  /Tap a tag to rename\s*·\s*Select multiple tags to merge duplicates/i;

class Tag {
  constructor(page) {
    this.page = page;

    this.tagsHeading = page.getByText("Tags", { exact: true }).nth(1);
    // Empty store: "0 tags" | With data: "11 tags · 11 active online · 30 products"
    this.tagStats = page.getByText(
      /^\d+\s+tags?(?:\s*[·•]\s*\d+\s+active online\s*[·•]\s*\d+\s+products?)?$/i,
    );
    this.defaultSortBtn = page.getByRole("button", { name: "Default" });
    this.alphabeticalSortBtn = page.getByRole("button", {
      name: /Alphabetical/i,
    });
    this.mostUsedSortBtn = page.getByRole("button", { name: "Most used" });
    this.recentSortBtn = page.getByRole("button", { name: "Recent" });
    this.searchBar = page.getByRole("textbox", { name: "Search tags" });
    this.addTagBtn = page.getByRole("button", { name: "Add tag" }).first();
    this.cancelBtn = page.getByRole("button", { name: "Cancel" }).first();
    this.addTagConfirm = page.getByRole("button", { name: "Add tag" }).last();
    this.tagName = page.getByPlaceholder("New tag name");
    this.successfullDialog = page.getByText("Added Successfully");
    this.duplicateTagError = page.getByText("Tag already exists");
    this.tagNameMaxLengthError = page.getByText(
      /50 character|maximum.*50|exceed.*50|too long/i,
    );
    // Exact toast text — exclude the "Updated" column header (data-tag-hdr-updated).
    this.updateTagSuccessDialog = page.locator(
      'div:not([data-tag-hdr-updated]):text-is("Updated")',
    );
    this.deleteTagSuccessDialog = page.getByText("Deleted");
    this.deleteTagConfirmBtn = page
      .getByRole("button", { name: /delete tag/i })
      .last();
    this.descriptionTitle = page.getByText(TAGS_DESCRIPTION_TITLE, {
      exact: true,
    });
    this.descriptionHelper = page.getByText(TAGS_DESCRIPTION_HELPER, {
      exact: true,
    });
    this.selectAllBtn = page.getByRole("button", { name: "Select all" });
    this.tagColumn = page.getByText("Tag", { exact: true });
    this.updatedColumn = page.getByText("Updated", { exact: true });
    this.actionsColumn = page.getByText("Actions", { exact: true });
    this.footerHint = page.getByText(TAGS_FOOTER_HINT);
    this.tagsMenuLink = page.getByRole("link", { name: "Tags", exact: true });

    this.selectionCountLabel = page.getByText(/^\d+\s+selected$/);
    this.bulkMergeBtn = page.getByRole("button", { name: "Merge", exact: true });
    this.bulkDeleteBtn = page.getByRole("button", { name: "Delete", exact: true });
    this.cleanBtn = page.getByRole("button", { name: "Clean", exact: true });
    this.mergeDialogTitle = page.getByText(/^Merge \d+ tags$/);
    this.mergeDialogInstructions = page.getByText(
      /Pick the tag to keep\. Other selected tags are merged into it and removed; linked products are updated on the server\./i,
    );
    this.mergeTagsConfirmBtn = page.getByRole("button", {
      name: "Merge tags",
      exact: true,
    });
    this.bulkDeleteCancelBtn = page.getByRole("button", {
      name: "Cancel",
      exact: true,
    });
    this.accessDenied = page.getByText("Access Denied", { exact: true });
  }

  getTagRows() {
    return this.page.locator('[data-tag-row="true"]');
  }

  getRowCheckbox(row) {
    // First control in the row is the selection checkbox button.
    return row.locator("button").first();
  }

  getTagListRow(tagName) {
    return this.page.locator('[data-tag-row="true"]').filter({
      has: this.page.getByRole("button", { name: tagName, exact: true }),
    });
  }

  getFirstTagListRow() {
    return this.page.locator('[data-tag-row="true"]').first();
  }

  async verifyTagsPageLoaded() {
    await expect(this.tagsHeading).toBeVisible({ timeout: 15_000 });
    await expect(this.tagStats).toBeVisible();
  }

  async verifyPageUrl() {
    await expect(this.page).toHaveURL(TAGS_PAGE_URL);
  }

  async verifyTagsMenuAndUrl() {
    await expect(this.tagsMenuLink).toBeVisible();
    await expect(this.tagsMenuLink).toHaveAttribute(
      "href",
      /\/merchants\/inventory\/tags/,
    );
    await this.verifyPageUrl();
  }

  async tagsHeadingDisplay() {
    await expect(this.tagsHeading).toBeVisible();
  }

  async tagStatsDisplay() {
    await expect(this.tagStats).toBeVisible();
  }

  async verifyTagStatsMatchAPI() {
    await expect(this.tagStats).toBeVisible();
    const statsText = (await this.tagStats.textContent())?.trim() ?? "";
    const tagCount = parseInt(statsText.match(/(\d+)\s+tags?/i)?.[1] ?? "0", 10);
    const apiCount = sessionDataStorage.get("tag_APIcount");

    console.log(`UI tag count: ${tagCount}`);
    console.log(`API tag count: ${apiCount}`);
    expect(
      tagCount,
      `UI tag count (${tagCount}) should match API count (${apiCount})`,
    ).toBe(apiCount);
  }

  async sortButtonsDisplay() {
    await expect(this.defaultSortBtn).toBeVisible();
    await expect(this.alphabeticalSortBtn).toBeVisible();
    await expect(this.mostUsedSortBtn).toBeVisible();
    await expect(this.recentSortBtn).toBeVisible();
  }

  async searchBarDisplay() {
    await expect(this.searchBar).toBeVisible();
  }

  async addTagBtnDisplay() {
    await expect(this.addTagBtn).toBeVisible();
  }

  async verifyDescriptionText() {
    await expect(this.descriptionTitle).toBeVisible();
    await expect(this.descriptionTitle).toHaveText(TAGS_DESCRIPTION_TITLE);
  }

  async verifyHelperCopy() {
    await expect(this.descriptionHelper).toBeVisible();
    await expect(this.descriptionHelper).toHaveText(TAGS_DESCRIPTION_HELPER);
  }

  async verifyListHeaderRow() {
    await expect(this.selectAllBtn).toBeVisible();
    await expect(this.tagColumn.first()).toBeVisible();
    await expect(this.updatedColumn).toBeVisible();
    await expect(this.actionsColumn).toBeVisible();
  }

  async verifyListFooter() {
    await expect(this.footerHint).toBeVisible();
  }

  async verifyListApiOnPageLoad() {
    const apiCount = sessionDataStorage.get("tag_APIcount");
    expect(
      apiCount,
      "Tag list API count should be stored on page load",
    ).toBeDefined();
    expect(typeof apiCount).toBe("number");
    expect(apiCount).toBeGreaterThanOrEqual(0);
    await this.verifyTagStatsMatchAPI();
  }

  async tagNameDisplay() {
    await expect(this.tagName).toBeVisible();
  }

  async addTagBtnClick() {
    await this.addTagBtn.click();
    await this.tagNameDisplay();
  }

  async addTagConfirmDisable() {
    await expect(this.addTagConfirm).toBeDisabled();
  }

  async addTagConfirmClick() {
    await this.addTagConfirm.click();
  }

  async setTagName(value) {
    await this.tagName.fill(value);
  }

  async cancelBtnClick() {
    await this.cancelBtn.click();
    await expect(this.tagName).toBeHidden();
  }

  async generateUniqueTagName() {
    return `AutoTag_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  async generateUniqueEditTagName() {
    return `EditTag_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  generateLongTagName(length = 51) {
    return `AutoTag_${"x".repeat(length)}`;
  }

  async clickEditButton(newTagName) {
    await this.getFirstTagListRow()
      .getByRole("button", { name: "Rename" })
      .first()
      .click();

    const tagInput = this.getFirstTagListRow().getByRole("textbox");

    await expect(tagInput).toBeVisible();
    await expect(
      this.getFirstTagListRow().getByRole("button", { name: "Cancel" }),
    ).toBeVisible();
    await expect(
      this.getFirstTagListRow().getByRole("button", { name: "Save" }),
    ).toBeVisible();
    await tagInput.clear();
    await tagInput.fill(newTagName);

    await this.saveBtnClick();
    await this.updateDialogDisplay();
    await this.verifyAddedTagInListWithActions(newTagName);
  }

  async verifyDuplicateOnEdit(duplicateTag) {
    await this.getFirstTagListRow()
      .getByRole("button", { name: "Rename" })
      .first()
      .click();

    const tagInput = this.getFirstTagListRow().getByRole("textbox");
    await tagInput.fill(duplicateTag);
    await this.getFirstTagListRow()
      .getByRole("button", { name: "Save" })
      .first()
      .click();
    await expect(this.duplicateTagError).toBeVisible();
    await this.getFirstTagListRow()
      .getByRole("button", { name: "Cancel" })
      .first()
      .click();
  }

  async updateDialogDisplay() {
    await expect(this.updateTagSuccessDialog).toBeVisible();
  }

  async saveBtnClick() {
    const updatePromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.updateBrandQA),
    );

    await this.page.getByRole("button", { name: "Save" }).click();

    const updateAPI = await updatePromise;
    expect(updateAPI.status()).toBe(200);
    const updateResponseBody = await updateAPI.json();
    expect(updateResponseBody.message).toBe("Updated");
    expect(updateResponseBody.status).toBeTruthy();

    // Edit does not change tag count. Do not sync/compare counts from the
    // post-edit list response — UI can briefly show "0 tags" while refresh races.
  }

  async verifyTagNotInList(tagName) {
    await expect(this.getTagListRow(tagName)).toHaveCount(0);
  }

  async clickDeleteTagButton(tagName) {
    const tagRow = this.getTagListRow(tagName);
    await expect(tagRow).toBeVisible({ timeout: 15_000 });
    await tagRow.getByRole("button", { name: "Delete tag" }).click();
  }

  async confirmDeleteTag() {
    await expect(this.deleteTagConfirmBtn).toBeVisible({ timeout: 10_000 });
    await this.deleteTagConfirmBtn.click();
  }

  async deleteTagSuccessDialogDisplay() {
    await expect(this.deleteTagSuccessDialog).toBeVisible({ timeout: 10_000 });
  }

  async deleteTagAPI() {
    const previousCount = sessionDataStorage.get("tag_APIcount");

    const deleteTagPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.deleteBrandQA),
    );

    const listResponsePromise = this.page.waitForResponse(
      async (res) => {
        if (
          res.request().method() !== "POST" ||
          !res.url().includes(routes.API_URL.brand_URL) ||
          res.status() !== 200
        ) {
          return false;
        }
        const body = await res.json();
        return Number(body?.total_count?.tag) === previousCount - 1;
      },
      { timeout: 15_000 },
    );

    await this.confirmDeleteTag();

    const [deleteResponse, listResponse] = await Promise.all([
      deleteTagPromise,
      listResponsePromise,
    ]);

    expect(deleteResponse.status()).toBe(200);
    const deleteResponseBody = await deleteResponse.json();
    expect(deleteResponseBody.message).toBe("Deleted");
    expect(deleteResponseBody.status).toBeTruthy();

    await this.deleteTagSuccessDialogDisplay();

    expect(listResponse.status()).toBe(200);
    const listResponseBody = await listResponse.json();
    const newApiCount = Number(listResponseBody.total_count.tag);
    sessionDataStorage.set("tag_APIcount", newApiCount);
    console.log(`Previous tag count (before delete): ${previousCount}`);
    console.log(`New tag count from list API (after delete): ${newApiCount}`);
    expect(
      newApiCount,
      `Tag list API count should decrease by 1 after delete (was ${previousCount}, now ${newApiCount})`,
    ).toBe(previousCount - 1);
  }

  async deleteTag(tagName) {
    await this.clearTagSearch();
    await this.searchTag(tagName);
    await this.verifySearchedTagDisplayed(tagName);
    await this.clickDeleteTagButton(tagName);
    await this.deleteTagAPI();
    await this.clearTagSearch();
    await this.verifyTagNotInList(tagName);
  }

  async successfullDialogDisplay() {
    await expect(this.successfullDialog).toBeVisible();
  }

  async verifyAddedTagInListWithActions(tagName) {
    await expect(this.tagsHeading).toBeVisible({ timeout: 15_000 });
    const firstRow = this.getFirstTagListRow();
    await expect(firstRow).toBeVisible();
    await expect(
      firstRow.getByRole("button", { name: tagName, exact: true }),
    ).toBeVisible();
    await expect(firstRow.getByRole("button", { name: "Rename" })).toBeVisible();
    await expect(
      firstRow.getByRole("button", { name: "Delete tag" }),
    ).toBeVisible();
  }

  async searchTag(tagName) {
    await this.searchBar.fill(tagName);
  }

  async clearTagSearch() {
    await this.searchBar.clear();
  }

  async verifySearchedTagDisplayed(tagName) {
    await expect(this.getTagListRow(tagName)).toBeVisible();
    await expect(this.page.locator('[data-tag-row="true"]')).toHaveCount(1);
    await expect(
      this.getTagListRow(tagName).getByRole("button", {
        name: tagName,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      this.getTagListRow(tagName).getByRole("button", { name: "Rename" }),
    ).toBeVisible();
    await expect(
      this.getTagListRow(tagName).getByRole("button", { name: "Delete tag" }),
    ).toBeVisible();
  }

  async verifyDuplicateTagNameError() {
    await expect(this.duplicateTagError).toBeVisible({ timeout: 10_000 });
    await expect(this.successfullDialog).not.toBeVisible();
  }

  async verifyDuplicateTagNameNotAllowed(tagName) {
    await this.addTagBtnClick();
    await this.setTagName(tagName);
    await this.addTagConfirmClick();
    await this.verifyDuplicateTagNameError();
    await this.cancelBtnClick();
  }

  async verifyTagNameMaxLengthError() {
    await expect(this.tagNameMaxLengthError).toBeVisible({ timeout: 10_000 });
    await expect(this.successfullDialog).not.toBeVisible();
  }

  async verifyTagNameExceedingMaxLengthNotAllowed(maxLength = 50) {
    await this.addTagBtnClick();
    await this.setTagName(this.generateLongTagName(maxLength + 1));
    await this.addTagConfirmClick();
    await this.verifyTagNameMaxLengthError();
    await this.cancelBtnClick();
  }

  async addBtnAPI() {
    const previousCount = sessionDataStorage.get("tag_APIcount");
    const expectedCount = previousCount + 1;

    // list_brand_tag can complete before add_brand_tag; only accept the
    // post-add list whose total_count.tag reflects +1.
    const addTagPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.addBrandQA),
    );
    const tagListPromise = this.page.waitForResponse(
      async (res) => {
        if (
          res.request().method() !== "POST" ||
          !res.url().includes(routes.API_URL.brand_URL) ||
          res.status() !== 200
        ) {
          return false;
        }
        const body = await res.json();
        return Number(body?.total_count?.tag) === expectedCount;
      },
      { timeout: 15_000 },
    );

    await this.addTagConfirmClick();

    const addResponse = await addTagPromise;
    expect(addResponse.status()).toBe(200);
    const addResponseBody = await addResponse.json();
    expect(addResponseBody.message).toBe("Inserted");
    expect(addResponseBody.status).toBeTruthy();

    const listResponse = await tagListPromise;
    const listResponseBody = await listResponse.json();
    const newApiCount = Number(listResponseBody.total_count.tag);
    sessionDataStorage.set("tag_APIcount", newApiCount);
    console.log(`Previous tag count (before add): ${previousCount}`);
    console.log(`New tag count from list API (after add): ${newApiCount}`);
    expect(
      newApiCount,
      `Tag list API count should increase by 1 after add (was ${previousCount}, now ${newApiCount})`,
    ).toBe(expectedCount);
  }

  async getDisplayedTagCount() {
    await expect(this.tagStats).toBeVisible();
    const statsText = (await this.tagStats.textContent())?.trim() ?? "";
    return parseInt(statsText.match(/(\d+)\s+tags?/i)?.[1] ?? "0", 10);
  }

  async getSelectionCount() {
    await expect(this.selectionCountLabel).toBeVisible();
    const text = (await this.selectionCountLabel.textContent())?.trim() ?? "";
    return parseInt(text.match(/(\d+)\s+selected/i)?.[1] ?? "0", 10);
  }

  async selectTagRowByIndex(index = 0) {
    const row = this.getTagRows().nth(index);
    await expect(row).toBeVisible({ timeout: 15_000 });
    await this.getRowCheckbox(row).click();
  }

  async selectTagByName(tagName) {
    const row = this.getTagListRow(tagName);
    await expect(row).toBeVisible({ timeout: 15_000 });
    await this.getRowCheckbox(row).click();
  }

  async deselectTagRowByIndex(index = 0) {
    await this.selectTagRowByIndex(index);
  }

  async verifySingleSelectionBar() {
    await expect(this.selectionCountLabel).toHaveText("1 selected");
    await expect(this.bulkDeleteBtn).toBeVisible();
    await expect(this.cleanBtn).toBeVisible();
    await expect(this.bulkMergeBtn).toHaveCount(0);
  }

  async verifyMultiSelectionBar(expectedCount) {
    await expect(this.selectionCountLabel).toHaveText(
      `${expectedCount} selected`,
    );
    await expect(this.bulkMergeBtn).toBeVisible();
    await expect(this.bulkDeleteBtn).toBeVisible();
    await expect(this.cleanBtn).toBeVisible();
  }

  async selectAllTags() {
    await this.selectAllBtn.click();
  }

  async verifySelectAllMatchesTotal() {
    const totalTags = await this.getTagRows().count();
    expect(totalTags).toBeGreaterThan(0);
    const selected = await this.getSelectionCount();
    expect(
      selected,
      `Selection count (${selected}) should equal total tags (${totalTags})`,
    ).toBe(totalTags);
  }

  async verifySelectionCountIs(expected) {
    await expect(this.selectionCountLabel).toHaveText(`${expected} selected`);
  }

  async cleanSelection() {
    await expect(this.cleanBtn).toBeVisible();
    await this.cleanBtn.click();
  }

  async verifySelectionCleared() {
    await expect(this.selectionCountLabel).toHaveCount(0);
    await expect(this.bulkMergeBtn).toHaveCount(0);
    await expect(this.cleanBtn).toHaveCount(0);
  }

  async openBulkDeleteConfirm() {
    await expect(this.bulkDeleteBtn).toBeVisible();
    await this.bulkDeleteBtn.click();
  }

  async cancelBulkDelete() {
    // Bulk delete uses window.confirm — register handler before click.
    const dialogPromise = new Promise((resolve) => {
      this.page.once("dialog", async (dialog) => {
        console.log(`Bulk delete confirm dismissed: ${dialog.message()}`);
        await dialog.dismiss();
        resolve(dialog.message());
      });
    });
    await expect(this.bulkDeleteBtn).toBeVisible();
    await this.bulkDeleteBtn.click();
    await dialogPromise;
  }

  async verifyTagsStillSelected(expectedCount) {
    await this.verifySelectionCountIs(expectedCount);
  }

  async confirmBulkDelete() {
    const dialogPromise = new Promise((resolve) => {
      this.page.once("dialog", async (dialog) => {
        console.log(`Bulk delete confirm accepted: ${dialog.message()}`);
        await dialog.accept();
        resolve(dialog.message());
      });
    });
    await expect(this.bulkDeleteBtn).toBeVisible();
    await this.bulkDeleteBtn.click();
    await dialogPromise;
  }

  async bulkDeleteSelectedTags(selectedCount) {
    const previousCount = sessionDataStorage.get("tag_APIcount");
    const expectedCount = previousCount - selectedCount;

    const deletePromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.deleteBrandQA),
    );
    const listPromise = this.page.waitForResponse(
      async (res) => {
        if (
          res.request().method() !== "POST" ||
          !res.url().includes(routes.API_URL.brand_URL) ||
          res.status() !== 200
        ) {
          return false;
        }
        const body = await res.json();
        return Number(body?.total_count?.tag) === expectedCount;
      },
      { timeout: 20_000 },
    );

    await this.confirmBulkDelete();

    const deleteResponse = await deletePromise;
    expect(deleteResponse.status()).toBe(200);

    const listResponse = await listPromise;
    const listBody = await listResponse.json();
    const newApiCount = Number(listBody.total_count.tag);
    sessionDataStorage.set("tag_APIcount", newApiCount);
    console.log(`Previous tag count (before bulk delete): ${previousCount}`);
    console.log(
      `New tag count from list API (after bulk delete): ${newApiCount}`,
    );
    expect(
      newApiCount,
      `Tag list API count should decrease by ${selectedCount} after bulk delete (was ${previousCount}, now ${newApiCount})`,
    ).toBe(expectedCount);

    await this.verifySelectionCleared();
  }

  async openMergeDialog() {
    await expect(this.bulkMergeBtn).toBeVisible();
    await this.bulkMergeBtn.click();
    await expect(this.mergeDialogTitle).toBeVisible({ timeout: 10_000 });
  }

  async verifyMergeDialogOpened(selectedCount) {
    await expect(
      this.page.getByText(new RegExp(`^Merge ${selectedCount} tags$`)),
    ).toBeVisible();
  }

  async verifyMergeDialogInstructions() {
    await expect(this.mergeDialogInstructions).toBeVisible();
  }

  async verifyMergeTagsButtonDisabled() {
    await expect(this.mergeTagsConfirmBtn).toBeDisabled();
  }

  async cancelMergeDialog() {
    await this.page.getByRole("button", { name: "Cancel", exact: true }).last().click();
    await expect(this.mergeDialogTitle).toHaveCount(0);
  }

  async pickKeepTagInMergeDialog(tagName) {
    // Tag name also appears as a list-row button — scope to the merge panel.
    const mergePanel = this.page
      .locator("div")
      .filter({ has: this.mergeDialogInstructions })
      .filter({ has: this.mergeTagsConfirmBtn })
      .last();
    await mergePanel.getByRole("button", { name: tagName, exact: true }).click();
    await expect(this.mergeTagsConfirmBtn).toBeEnabled();
  }

  async confirmMergeTags(removedCount) {
    const previousCount = sessionDataStorage.get("tag_APIcount");
    const expectedCount = previousCount - removedCount;

    const listPromise = this.page.waitForResponse(
      async (res) => {
        if (
          res.request().method() !== "POST" ||
          !res.url().includes(routes.API_URL.brand_URL) ||
          res.status() !== 200
        ) {
          return false;
        }
        const body = await res.json();
        return Number(body?.total_count?.tag) === expectedCount;
      },
      { timeout: 20_000 },
    );

    await this.mergeTagsConfirmBtn.click();
    const listResponse = await listPromise;
    const listBody = await listResponse.json();
    const newApiCount = Number(listBody.total_count.tag);
    sessionDataStorage.set("tag_APIcount", newApiCount);
    console.log(`Previous tag count (before merge): ${previousCount}`);
    console.log(`New tag count from list API (after merge): ${newApiCount}`);
    expect(
      newApiCount,
      `Tag list API count should decrease by ${removedCount} after merge (was ${previousCount}, now ${newApiCount})`,
    ).toBe(expectedCount);
  }

  async mergeSelectedTagsKeeping(keepTagName, selectedCount) {
    await this.openMergeDialog();
    await this.verifyMergeDialogOpened(selectedCount);
    await this.pickKeepTagInMergeDialog(keepTagName);
    await this.confirmMergeTags(selectedCount - 1);
    await expect(this.getTagListRow(keepTagName)).toBeVisible({
      timeout: 15_000,
    });
  }

  async ensureTagExists(tagName) {
    await this.clearTagSearch();
    await this.searchTag(tagName);
    const count = await this.getTagListRow(tagName).count();
    await this.clearTagSearch();
    if (count > 0) return tagName;

    await this.addTagBtnClick();
    await this.setTagName(tagName);
    await this.addBtnAPI();
    await this.successfullDialogDisplay();
    return tagName;
  }

  async createUniqueTag() {
    const name = await this.generateUniqueTagName();
    await this.clearTagSearch();
    await this.addTagBtnClick();
    await this.setTagName(name);
    await this.addBtnAPI();
    await this.successfullDialogDisplay();
    return name;
  }

  async ensureMinimumTagCount(minCount) {
    await this.clearTagSearch();
    // Drop any leftover selection so the full list is visible.
    if ((await this.selectionCountLabel.count()) > 0) {
      await this.cleanSelection();
    }

    let current = await this.getTagRows().count();
    while (current < minCount) {
      await this.createUniqueTag();
      await expect
        .poll(async () => this.getTagRows().count(), { timeout: 15_000 })
        .toBeGreaterThan(current);
      current = await this.getTagRows().count();
    }

    await expect
      .poll(async () => this.getTagRows().count(), { timeout: 15_000 })
      .toBeGreaterThanOrEqual(minCount);
  }
}

module.exports = {
  Tag,
  TAGS_PAGE_URL,
  TAGS_DESCRIPTION_TITLE,
  TAGS_DESCRIPTION_HELPER,
};
