import { test, expect } from "@playwright/test";
import { Tag } from "../pageObjects/Tag";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import merchants from "../api/testData/merchants.json";
import routes from "../utilities/routes.js";

test.describe("Tags Module", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let context;
  let page;
  let loginpage;
  let dashboard;
  let tag;
  let sName;
  let uName;
  let pwd;
  let newTag;
  let editTag;
  // Must be unique per run — a fixed name fails addBtnAPI (+1) if it already exists.
  let duplicate_Tag;
  let bulkTagA;
  let bulkTagB;
  let mergeKeep;
  let mergeDrop;

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      tag = new Tag(page);
      sName = merchants.merchantLogin.storename;
      uName = merchants.merchantLogin.username;
      pwd = merchants.merchantLogin.password;

      await navigateToLoginPage(page);
      const [loginApiResponse] = await Promise.all([
        page.waitForResponse(
          (res) =>
            res.request().method() === "POST" &&
            res.url().includes(routes.API_URL.login),
        ),
        loginpage.login(sName, uName, pwd),
      ]);
      await loginApiResponse.json();
      await dashboard.logoDisplayed();
      await dashboard.menuClick();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    await context?.close();
  });

  test("Expand Inventory and click Tags", async () => {
    await dashboard.inventoryClick();
    await dashboard.tagsClick();
    await tag.verifyTagsPageLoaded();
  });

  test("Verify page URL", async () => {
    await tag.verifyPageUrl();
  });

  test("Verify Tags in Inventory menu and Tags URL", async () => {
    await tag.verifyTagsMenuAndUrl();
  });

  test("Verify page header", async () => {
    await tag.tagsHeadingDisplay();
  });

  test("Verify stats under heading", async () => {
    await tag.tagStatsDisplay();
    await tag.verifyTagStatsMatchAPI();
  });

  test("Verify sort button group", async () => {
    await tag.sortButtonsDisplay();
  });

  test("Verify search box is displayed", async () => {
    await tag.searchBarDisplay();
  });

  test("Verify Add tag button is displayed", async () => {
    await tag.addTagBtnDisplay();
  });

  test("Verify description area", async () => {
    await tag.verifyDescriptionText();
  });

  test("Verify helper copy", async () => {
    await tag.verifyHelperCopy();
  });

  test("Verify list header row", async () => {
    await tag.verifyListHeaderRow();
  });

  test("Verify list footer", async () => {
    await tag.verifyListFooter();
  });

  test("Seed tag used for duplicate/edit checks", async () => {
    duplicate_Tag = await tag.generateUniqueTagName();
    await tag.addTagBtnClick();
    await tag.setTagName(duplicate_Tag);
    await tag.addBtnAPI();
    await tag.successfullDialogDisplay();
    await tag.verifyAddedTagInListWithActions(duplicate_Tag);
  });

  test("Adding a new tag", async () => {
    newTag = await tag.generateUniqueTagName();
    await tag.addTagBtnClick();
    await tag.setTagName(newTag);
    await tag.addBtnAPI();
    await tag.successfullDialogDisplay();
    await tag.verifyAddedTagInListWithActions(newTag);
  });

  test("Search for the added tag", async () => {
    await tag.searchTag(newTag);
    await tag.verifySearchedTagDisplayed(newTag);
  });

  test("Verify duplicate tag name is not allowed", async () => {
    await tag.clearTagSearch();
    await tag.verifyDuplicateTagNameNotAllowed(newTag);
  });

  test("Verify tag name exceeding 50 characters shows error", async () => {
    await tag.verifyTagNameExceedingMaxLengthNotAllowed(50);
  });

  test("Verify Edit tag name functionality", async () => {
    editTag = await tag.generateUniqueEditTagName();
    await tag.clickEditButton(editTag);
  });

  test("Verify duplicate name while Editing", async () => {
    await tag.verifyDuplicateOnEdit(duplicate_Tag);
  });

  test("Verify Delete Tag", async () => {
    await tag.deleteTag(duplicate_Tag);
  });

  // --- Bulk Selection (TC_TAG_069 - TC_TAG_074) ---

  test("Select single tag shows selection bar", async () => {
    await tag.clearTagSearch();
    await tag.ensureMinimumTagCount(2);
    await tag.selectTagRowByIndex(0);
    await tag.verifySingleSelectionBar();
    await tag.cleanSelection();
    await tag.verifySelectionCleared();
  });

  test("Select two tags shows Merge", async () => {
    await tag.clearTagSearch();
    await tag.ensureMinimumTagCount(2);
    await tag.selectTagRowByIndex(0);
    await tag.selectTagRowByIndex(1);
    await tag.verifyMultiSelectionBar(2);
    await tag.cleanSelection();
    await tag.verifySelectionCleared();
  });

  test("Select all tags", async () => {
    await tag.ensureMinimumTagCount(2);
    await tag.selectAllTags();
    await tag.verifySelectAllMatchesTotal();
    await tag.cleanSelection();
    await tag.verifySelectionCleared();
  });

  test("Deselect individual tag", async () => {
    await tag.ensureMinimumTagCount(2);
    await tag.selectAllTags();
    const total = await tag.getSelectionCount();
    await tag.deselectTagRowByIndex(0);
    await tag.verifySelectionCountIs(total - 1);
    await tag.cleanSelection();
    await tag.verifySelectionCleared();
  });

  test("Clean clears selection", async () => {
    await tag.ensureMinimumTagCount(1);
    await tag.selectTagRowByIndex(0);
    await tag.verifySelectionCountIs(1);
    await tag.cleanSelection();
    await tag.verifySelectionCleared();
  });

  test("Select all then Clean", async () => {
    await tag.ensureMinimumTagCount(2);
    await tag.selectAllTags();
    await tag.verifySelectAllMatchesTotal();
    await tag.cleanSelection();
    await tag.verifySelectionCleared();
  });

  // --- Bulk Delete (TC_TAG_075 - TC_TAG_077) ---

  test("Cancel bulk delete", async () => {
    await tag.ensureMinimumTagCount(2);
    await tag.selectTagRowByIndex(0);
    await tag.selectTagRowByIndex(1);
    await tag.verifyMultiSelectionBar(2);
    await tag.cancelBulkDelete();
    await tag.verifyTagsStillSelected(2);
    await tag.cleanSelection();
    await tag.verifySelectionCleared();
  });

  test("Bulk delete selected tags", async () => {
    bulkTagA = await tag.createUniqueTag();
    bulkTagB = await tag.createUniqueTag();
    await tag.clearTagSearch();
    await tag.selectTagByName(bulkTagA);
    await tag.selectTagByName(bulkTagB);
    await tag.verifyMultiSelectionBar(2);
    await tag.bulkDeleteSelectedTags(2);
    await tag.verifyTagNotInList(bulkTagA);
    await tag.verifyTagNotInList(bulkTagB);
  });

  // --- Merge (TC_TAG_078 - TC_TAG_086) ---

  test("Open Merge dialog", async () => {
    mergeKeep = await tag.createUniqueTag();
    mergeDrop = await tag.createUniqueTag();
    await tag.clearTagSearch();
    await tag.selectTagByName(mergeKeep);
    await tag.selectTagByName(mergeDrop);
    await tag.openMergeDialog();
    await tag.verifyMergeDialogOpened(2);
  });

  test("Merge dialog copy/instructions", async () => {
    await tag.verifyMergeDialogInstructions();
  });

  test("Merge tags button disabled until keep-tag chosen", async () => {
    await tag.verifyMergeTagsButtonDisabled();
  });

  test("Cancel merge dialog", async () => {
    await tag.cancelMergeDialog();
    await tag.verifyTagsStillSelected(2);
    await expect(tag.getTagListRow(mergeKeep)).toBeVisible();
    await expect(tag.getTagListRow(mergeDrop)).toBeVisible();
    await tag.cleanSelection();
    await tag.verifySelectionCleared();
  });

  test("Merge two tags successfully and count decreases", async () => {
    await tag.clearTagSearch();
    await tag.selectTagByName(mergeKeep);
    await tag.selectTagByName(mergeDrop);
    await tag.mergeSelectedTagsKeeping(mergeKeep, 2);
    await tag.verifyTagNotInList(mergeDrop);
    await expect(tag.getTagListRow(mergeKeep)).toBeVisible();
  });

  test("Merge more than two tags", async () => {
    const keep = await tag.createUniqueTag();
    const dropA = await tag.createUniqueTag();
    const dropB = await tag.createUniqueTag();
    await tag.clearTagSearch();
    await tag.selectTagByName(keep);
    await tag.selectTagByName(dropA);
    await tag.selectTagByName(dropB);
    await tag.verifyMultiSelectionBar(3);
    await tag.mergeSelectedTagsKeeping(keep, 3);
    await expect(tag.getTagListRow(keep)).toBeVisible();
    await tag.verifyTagNotInList(dropA);
    await tag.verifyTagNotInList(dropB);
  });
});
