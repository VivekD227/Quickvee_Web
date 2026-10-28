import { expect } from "@playwright/test";
import routes from "../utilities/routes.js";
const sessionDataStorage = require("../utilities/helper/sessionDataStorage");

const CATEGORIES_PAGE_URL = /\/merchants\/inventory\/category/;

// Drawer toggle labels (the button's accessible name starts with these).
const TOGGLES = {
  register: "Show on register",
  online: "Show online",
  pickup: "In-store pickup",
  delivery: "Local delivery",
  earnPoints: "Earn points",
  redeemPoints: "Redeem points",
  lottery: "Lottery items",
  ebt: "EBT / SNAP eligible",
  excludeInStoreCoupons: "Exclude from in-store coupons",
  excludeOnlineCoupons: "Exclude from online coupons",
};

const DEFAULT_TOGGLE_STATES = {
  register: true,
  online: true,
  pickup: true,
  delivery: true,
  earnPoints: true,
  redeemPoints: true,
  lottery: false,
  ebt: false,
  excludeInStoreCoupons: false,
  excludeOnlineCoupons: false,
};

// Turning Lottery on disables every flag except Show on register.
const LOTTERY_LOCKED_TOGGLES = [
  "online",
  "pickup",
  "delivery",
  "earnPoints",
  "redeemPoints",
  "ebt",
  "excludeInStoreCoupons",
  "excludeOnlineCoupons",
];

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

class Categories {
  constructor(page) {
    this.page = page;

    // List page header
    this.categoriesHeading = page
      .getByText("Categories", { exact: true })
      .last();
    this.categoryCount = page.getByText(
      /\d+ categor(y|ies) · sort independently for online & in-store/,
    );
    this.syncBtn = page.getByRole("button", { name: "Sync" });
    this.searchBar = page.getByRole("textbox", { name: "Search categories" });
    this.addCategoryBtn = page.getByRole("button", { name: "Add category" });

    // Sort modes
    this.alphabeticalTab = page.getByRole("button", { name: "Alphabetical" });
    this.onlineStoreTab = page.getByRole("button", { name: "Online store" });
    this.posRegisterTab = page.getByRole("button", { name: "POS register" });
    this.sortModeHint = page.getByText(
      "Switch to a sort mode to drag-reorder how categories appear.",
    );
    this.massUpdateBtn = page.getByRole("button", { name: "Mass Update" });
    this.viewOnlineStoreBtn = page.getByText("View Online Store");

    // Table header
    this.categoryColumn = page.getByText("Category · Capabilities", {
      exact: true,
    });
    this.lastEditedColumn = page.getByText("Last edited", { exact: true });
    this.actionsColumn = page.getByText("Actions", { exact: true });
    this.categoryRows = page.locator("[data-cat-id]");

    // Add / Edit drawer
    this.drawer = page.getByRole("complementary");
    this.newCategoryLabel = this.drawer.getByText("New category", {
      exact: true,
    });
    this.editCategoryLabel = this.drawer.getByText("Edit category", {
      exact: true,
    });
    this.categoryNameInput = this.drawer.getByPlaceholder("e.g. Vapes");
    this.descriptionInput = this.drawer.getByPlaceholder(
      "What kinds of products are in this category?",
    );
    this.customColorInput = this.drawer.getByRole("textbox", {
      name: "Custom color",
    });
    this.createCategoryBtn = this.drawer.getByRole("button", {
      name: "Create category",
    });
    this.saveChangesBtn = this.drawer.getByRole("button", {
      name: "Save changes",
    });
    this.drawerCancelBtn = this.drawer.getByRole("button", { name: "Cancel" });

    this.lotteryTaxNote = this.drawer.getByText(
      "Taxes don't apply to lottery categories.",
    );

    // Validation / toasts. Toasts stack, so check the newest.
    this.nameRequiredError = page.getByText("Category name is required");
    this.duplicateNameError = page.getByText("The name is Already exist").last();
    // Edit uses a different API, so its duplicate message differs from Add.
    this.duplicateNameOnEditError = page.getByText(
      "Category Title Already Exist!",
    );
    this.addSuccessToast = page.getByText("Added Successfully").last();
    this.updateSuccessToast = page.getByText("Updated Successfully").last();
    this.deleteSuccessToast = page.getByText("Deleted Successfully").last();

    // Delete dialog
    this.deleteCategoryConfirmBtn = page.getByRole("button", {
      name: "Delete category",
    });
    this.deleteDialogCancelBtn = page
      .getByRole("button", { name: "Cancel" })
      .last();
  }

  getCategoryRow(categoryName) {
    return this.categoryRows.filter({
      has: this.page.getByText(categoryName, { exact: true }),
    });
  }

  // Underscores are stripped from category names on save, so keep names alphanumeric.
  generateUniqueCategoryName(prefix = "AutoCat") {
    return `${prefix}${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }

  async verifyCategoriesPageLoaded() {
    await expect(this.page).toHaveURL(CATEGORIES_PAGE_URL);
    expect(this.page.url()).toBe(routes.page_URL.categories);
  }

  async verifyCategoriesPageUI() {
    await expect(this.categoriesHeading).toBeVisible();
    await expect(this.categoryCount).toBeVisible();
    await expect(this.syncBtn).toBeVisible();
    await expect(this.searchBar).toBeVisible();
    await expect(this.addCategoryBtn).toBeVisible();
    await expect(this.alphabeticalTab).toBeVisible();
    await expect(this.onlineStoreTab).toBeVisible();
    await expect(this.posRegisterTab).toBeVisible();
    await expect(this.sortModeHint).toBeVisible();
    await expect(this.massUpdateBtn).toBeVisible();
    await expect(this.categoryColumn).toBeVisible();
    await expect(this.lastEditedColumn).toBeVisible();
    await expect(this.actionsColumn).toBeVisible();
  }

  async getDisplayedCategoryCount() {
    const text = await this.categoryCount.innerText();
    return Number(text.match(/(\d+) categor/)[1]);
  }

  async verifyCategoryCountMatchesAPI() {
    const apiCount = sessionDataStorage.get("category_APIcount");
    expect(await this.getDisplayedCategoryCount()).toBe(apiCount);
    await expect(this.categoryRows).toHaveCount(apiCount);
  }

  // Quickadd is a system category: every store has exactly one, it cannot be
  // deleted or selected, and its name cannot be changed.
  async verifyQuickaddIsProtected() {
    expect(
      sessionDataStorage.get("category_APInames"),
      "Category list API must return Quickadd",
    ).toContain("Quickadd");
    const row = this.getCategoryRow("Quickadd");
    await expect(row, "Quickadd must be present in every store").toHaveCount(1);
    await expect(row.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(row.getByRole("button", { name: "Delete" })).toHaveCount(0);
    await expect(row.getByRole("checkbox")).toHaveCount(0);

    await this.openEditDrawer("Quickadd");
    await expect(this.categoryNameInput).toBeDisabled();
    await expect(this.categoryNameInput).toHaveValue("Quickadd");
    await this.cancelDrawer();
  }

  async addCategoryBtnClick() {
    await this.addCategoryBtn.click();
    await expect(this.newCategoryLabel).toBeVisible();
    await expect(this.categoryNameInput).toBeVisible();
  }

  async verifyAddDrawerDefaults() {
    await expect(this.drawer.getByText("Untitled category")).toBeVisible();
    await expect(this.categoryNameInput).toHaveValue("");
    await expect(this.descriptionInput).toHaveValue("");
    await expect(this.customColorInput).toHaveValue(/#ef4444/i);
    await expect(this.createCategoryBtn).toBeVisible();
    await expect(this.drawerCancelBtn).toBeVisible();
  }

  async setCategoryName(value) {
    await this.categoryNameInput.fill(value);
  }

  async setDescription(value) {
    await this.descriptionInput.fill(value);
  }

  async cancelDrawer() {
    await this.drawerCancelBtn.click();
    await expect(this.drawer).toBeHidden();
  }

  async verifyNameRequired() {
    await this.addCategoryBtnClick();
    await this.createCategoryBtn.click();
    await expect(this.nameRequiredError).toBeVisible();
    await this.cancelDrawer();
  }

  async createCategoryAPI() {
    const addPromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.addCategory_URL),
    );

    await this.createCategoryBtn.click();

    const addResponse = await addPromise;
    expect(addResponse.status()).toBe(200);
    return addResponse.json();
  }

  async addCategory(categoryName, description = "") {
    const countBefore = await this.getDisplayedCategoryCount();
    await this.addCategoryBtnClick();
    await this.setCategoryName(categoryName);
    if (description) await this.setDescription(description);

    const body = await this.createCategoryAPI();
    expect(body.status).toBe("Success");
    expect(body.msg).toBe("Category Created Successfully.");

    await expect(this.addSuccessToast).toBeVisible();
    await expect(this.drawer).toBeHidden();
    await expect(this.categoryCount).toContainText(`${countBefore + 1} categor`);
    await this.verifyCategoryInList(categoryName);
  }

  // Category names don't allow special characters — they are stripped from the name.
  async verifySpecialCharactersStripped(categoryName) {
    await this.addCategoryBtnClick();
    await this.setCategoryName(`${categoryName}!@#$%^&*()_+-=[]{};:'",.<>/?|~`);
    await expect(this.categoryNameInput).toHaveValue(categoryName);

    const body = await this.createCategoryAPI();
    expect(body.status).toBe("Success");
    await expect(this.addSuccessToast).toBeVisible();
    await this.verifyCategoryInList(categoryName);
  }

  async verifyDuplicateNameNotAllowed(categoryName) {
    await this.addCategoryBtnClick();
    await this.setCategoryName(categoryName);

    const body = await this.createCategoryAPI();
    expect(body.status).toBe("Failed");
    expect(body.msg).toBe("The name is Already exist");

    await expect(this.duplicateNameError).toBeVisible();
    await this.cancelDrawer();
  }

  async verifyCategoryInList(categoryName) {
    const row = this.getCategoryRow(categoryName);
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(row.getByRole("button", { name: "Delete" })).toBeVisible();
  }

  async verifyCategoryNotInList(categoryName) {
    await expect(this.getCategoryRow(categoryName)).toHaveCount(0);
  }

  async searchCategory(categoryName) {
    await this.searchBar.fill(categoryName);
  }

  async clearSearch() {
    await this.searchBar.clear();
  }

  async verifySearchedCategoryDisplayed(categoryName) {
    await expect(this.getCategoryRow(categoryName)).toBeVisible();
    await expect(this.categoryRows).toHaveCount(1);
  }

  async verifyNoSearchResults(searchText) {
    await this.searchCategory(searchText);
    await expect(this.categoryRows).toHaveCount(0);
    await expect(
      this.page.getByText(`No categories match "${searchText}"`, { exact: true }),
    ).toBeVisible();
  }

  // The header count always shows the store total, even while a search filters rows.
  async verifyClearSearchRestoresList(searchText) {
    const total = await this.getDisplayedCategoryCount();
    await this.searchCategory(searchText);
    await expect(this.categoryRows).toHaveCount(1);
    await this.clearSearch();
    await expect(this.categoryRows).toHaveCount(total);
    expect(await this.getDisplayedCategoryCount()).toBe(total);
  }

  // Reloads the page and stores the fresh category list API count, so later
  // checks compare against the list after this run's adds/deletes.
  async reloadAndCaptureCategoryList() {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.categoryList_URL),
      ),
      this.page.reload(),
    ]);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.result)).toBeTruthy();
    sessionDataStorage.set("category_APIcount", body.result.length);
    await expect(this.categoryCount).toBeVisible({ timeout: 30_000 });
    await this.selectAlphabeticalMode();
    return body.result.length;
  }

  async openEditDrawer(categoryName) {
    await this.getCategoryRow(categoryName)
      .getByRole("button", { name: "Edit" })
      .click();
    await expect(this.editCategoryLabel).toBeVisible();
    await expect(this.categoryNameInput).toHaveValue(categoryName);
  }

  async saveChangesAPI() {
    const updatePromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.updateCategory_URL),
    );

    await this.saveChangesBtn.click();

    const updateResponse = await updatePromise;
    expect(updateResponse.status()).toBe(200);
    return updateResponse.json();
  }

  async editCategoryName(oldName, newName) {
    await this.openEditDrawer(oldName);
    await this.setCategoryName(newName);

    const body = await this.saveChangesAPI();
    expect(body.status).toBe("Success");
    expect(body.update_message).toBe("Category updated");

    await expect(this.updateSuccessToast).toBeVisible();
    await expect(this.drawer).toBeHidden();
    await this.verifyCategoryInList(newName);
    await this.verifyCategoryNotInList(oldName);
  }

  async verifyDuplicateOnEdit(categoryName, existingName) {
    await this.openEditDrawer(categoryName);
    await this.setCategoryName(existingName);

    const body = await this.saveChangesAPI();
    expect(body.status).toBe("Failed");
    expect(body.update_message).toBe("Category Title Already Exist!");

    await expect(this.duplicateNameOnEditError).toBeVisible();
    await this.cancelDrawer();
  }

  async clickDeleteButton(categoryName) {
    await this.getCategoryRow(categoryName)
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(
      this.page.getByText(`Delete ${categoryName}?`, { exact: true }),
    ).toBeVisible();
    await expect(this.deleteCategoryConfirmBtn).toBeVisible();
  }

  async verifyCancelDelete(categoryName) {
    await this.clickDeleteButton(categoryName);
    await this.deleteDialogCancelBtn.click();
    await expect(this.deleteCategoryConfirmBtn).toBeHidden();
    await this.verifyCategoryInList(categoryName);
  }

  async deleteCategoryAPI(categoryName) {
    const deletePromise = this.page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes(routes.API_URL.deleteCategory_URL),
    );

    await this.deleteCategoryConfirmBtn.click();

    const deleteResponse = await deletePromise;
    expect(deleteResponse.status()).toBe(200);
    const body = await deleteResponse.json();
    expect(body.status).toBeTruthy();
    expect(body.delete_message).toBe(`Category '${categoryName}' Deleted`);

    await expect(this.deleteSuccessToast).toBeVisible();
  }

  // ---------------------------------------------------------------------------
  // Drawer toggles & taxes
  // ---------------------------------------------------------------------------

  toggleButton(key) {
    return this.drawer.getByRole("button", {
      name: new RegExp(`^${escapeRegExp(TOGGLES[key])}`),
    });
  }

  taxCheckbox(taxName) {
    return this.drawer.getByRole("button", { name: taxName, exact: true });
  }

  // Toggles expose no aria state. The ON color differs (brand blue, amber for
  // coupon exclusions), so read the knob position of the 36px switch instead:
  // left 16px = ON, 2px = OFF.
  async isToggleOn(key) {
    return this.toggleButton(key).evaluate((button) => {
      const track = [...button.querySelectorAll("span")].find(
        (span) => span.style.width === "36px",
      );
      return track?.firstElementChild?.style.left === "16px";
    });
  }

  // Unchecked tax boxes use the plain surface background.
  async isTaxChecked(taxName) {
    return this.taxCheckbox(taxName).evaluate(
      (button) =>
        !button.firstElementChild.style.background.includes("qv-inv-surface"),
    );
  }

  async verifyToggleStates(expectedStates) {
    for (const [key, on] of Object.entries(expectedStates)) {
      await expect
        .poll(() => this.isToggleOn(key), { message: `${TOGGLES[key]} ON` })
        .toBe(on);
    }
  }

  async setToggle(key, on) {
    if ((await this.isToggleOn(key)) !== on) {
      await this.toggleButton(key).click();
    }
    await expect.poll(() => this.isToggleOn(key)).toBe(on);
  }

  // Order matters: Lottery off first (it locks other flags), Show online before
  // Pickup/Delivery (they are disabled while offline), Pickup/Delivery turning
  // ON before the one turning OFF (both off takes the category offline),
  // Lottery on last.
  async setToggles(states) {
    if (states.lottery === false) await this.setToggle("lottery", false);
    if ("online" in states) await this.setToggle("online", states.online);
    const keys = Object.keys(TOGGLES).sort(
      (a, b) => Number(states[b] === true) - Number(states[a] === true),
    );
    for (const key of keys) {
      if (!(key in states) || key === "online" || key === "lottery") continue;
      if (states.online === false && (key === "pickup" || key === "delivery")) {
        continue;
      }
      if (states.lottery && LOTTERY_LOCKED_TOGGLES.includes(key)) continue;
      await this.setToggle(key, states[key]);
    }
    if (states.lottery) await this.setToggle("lottery", true);
  }

  async setTax(taxName, checked) {
    if ((await this.isTaxChecked(taxName)) !== checked) {
      await this.taxCheckbox(taxName).click();
    }
    await expect.poll(() => this.isTaxChecked(taxName)).toBe(checked);
  }

  async verifyDefaultToggleStates(taxName) {
    await this.verifyToggleStates(DEFAULT_TOGGLE_STATES);
    for (const key of Object.keys(TOGGLES)) {
      await expect(this.toggleButton(key)).toBeEnabled();
    }
    expect(await this.isTaxChecked(taxName)).toBe(false);
  }

  async verifyOnlineDependency() {
    await this.setToggle("online", false);
    await this.verifyToggleStates({ pickup: false, delivery: false });
    await expect(this.toggleButton("pickup")).toBeDisabled();
    await expect(this.toggleButton("delivery")).toBeDisabled();

    await this.setToggle("online", true);
    await this.verifyToggleStates({ pickup: true, delivery: true });
    await expect(this.toggleButton("pickup")).toBeEnabled();
    await expect(this.toggleButton("delivery")).toBeEnabled();

    // Turning off both fulfillment options takes the category offline.
    await this.setToggle("pickup", false);
    await this.verifyToggleStates({ online: true });
    await this.setToggle("delivery", false);
    await this.verifyToggleStates({ online: false });
  }

  async verifyLotteryLocksOtherFlags(taxName) {
    await this.setToggle("lottery", true);
    for (const key of LOTTERY_LOCKED_TOGGLES) {
      await expect(this.toggleButton(key)).toBeDisabled();
    }
    await expect(this.toggleButton("register")).toBeEnabled();
    await expect(this.lotteryTaxNote).toBeVisible();
    await expect(this.taxCheckbox(taxName)).toHaveCount(0);

    await this.setToggle("lottery", false);
    for (const key of LOTTERY_LOCKED_TOGGLES) {
      if (key === "pickup" || key === "delivery") continue;
      await expect(this.toggleButton(key)).toBeEnabled();
    }
    await expect(this.taxCheckbox(taxName)).toBeVisible();
  }

  parseFormData(postData) {
    return Object.fromEntries(
      [...(postData || "").matchAll(/name="([^"]+)"\r?\n\r?\n([^\r\n]*)/g)].map(
        (match) => [match[1], match[2]],
      ),
    );
  }

  // Creates/updates the category and returns the multipart payload that was sent.
  async submitDrawerAndCapturePayload(apiUrl, submitButton, successToast) {
    const requestPromise = this.page.waitForRequest(
      (req) => req.method() === "POST" && req.url().includes(apiUrl),
    );
    const responsePromise = this.page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url().includes(apiUrl),
    );

    await submitButton.click();

    const payload = this.parseFormData((await requestPromise).postData());
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect((await response.json()).status).toBe("Success");
    await expect(successToast).toBeVisible();
    await expect(this.drawer).toBeHidden();
    return payload;
  }

  async createCategoryWithFlags(categoryName, states, taxName, taxChecked) {
    await this.addCategoryBtnClick();
    await this.setCategoryName(categoryName);
    await this.setToggles(states);
    if (taxName) await this.setTax(taxName, taxChecked);
    return this.submitDrawerAndCapturePayload(
      routes.API_URL.addCategory_URL,
      this.createCategoryBtn,
      this.addSuccessToast,
    );
  }

  async updateCategoryFlags(categoryName, states, taxName, taxChecked) {
    await this.openEditDrawer(categoryName);
    await this.setToggles(states);
    if (taxName) await this.setTax(taxName, taxChecked);
    return this.submitDrawerAndCapturePayload(
      routes.API_URL.updateCategory_URL,
      this.saveChangesBtn,
      this.updateSuccessToast,
    );
  }

  verifyFlagPayload(payload, states, taxChecked) {
    const flag = (on) => (on ? "1" : "0");
    const fields = {
      online: "show_online",
      earnPoints: "earn_point",
      redeemPoints: "use_point",
      lottery: "is_lottery",
      ebt: "is_ebt_eligible",
      excludeInStoreCoupons: "exclude_coupons_store",
      excludeOnlineCoupons: "exclude_coupons_online",
    };
    for (const [key, field] of Object.entries(fields)) {
      if (key in states) {
        expect(payload[field], `${field} in payload`).toBe(flag(states[key]));
      }
    }
    if (taxChecked !== undefined) {
      if (taxChecked) expect(payload.tax).not.toBe("");
      else expect(payload.tax).toBe("");
    }
  }

  async verifyPersistedFlags(categoryName, states, taxName, taxChecked) {
    await this.openEditDrawer(categoryName);
    await this.verifyToggleStates(states);
    if (taxName) expect(await this.isTaxChecked(taxName)).toBe(taxChecked);
    await this.cancelDrawer();
  }

  // After a saved Show online change, Pickup/Delivery follow it: both OFF and
  // disabled while offline, both ON and enabled once back online.
  async verifyFulfillmentFollowsOnline(categoryName, online) {
    await this.openEditDrawer(categoryName);
    await this.verifyToggleStates({ online, pickup: online, delivery: online });
    for (const key of ["pickup", "delivery"]) {
      if (online) await expect(this.toggleButton(key)).toBeEnabled();
      else await expect(this.toggleButton(key)).toBeDisabled();
    }
    await this.cancelDrawer();
  }

  async getRowCapabilities(categoryName) {
    return this.getCategoryRow(categoryName)
      .locator(".qv-inv-cap-chip.is-on")
      .allInnerTexts();
  }

  async verifyRowCapabilities(categoryName, expectedChips) {
    await expect
      .poll(async () => (await this.getRowCapabilities(categoryName)).sort())
      .toEqual([...expectedChips].sort());
  }

  // ---------------------------------------------------------------------------
  // Sort-mode tabs as visibility checks: "POS register" lists only categories
  // shown on register, "Online store" only those shown online.
  // ---------------------------------------------------------------------------

  // The page remembers the last sort tab across reloads, so tests start from
  // Alphabetical explicitly.
  async selectAlphabeticalMode() {
    await this.alphabeticalTab.click();
    await expect(this.sortModeHint).toBeVisible();
  }

  // POS register tab renders a "Register preview" of tiles, not table rows.
  async isCategoryInPosRegisterTab(categoryName) {
    await this.posRegisterTab.click();
    const tiles = this.page.locator("[data-cat-register-body]");
    // Quickadd is always on register, so its tile means the preview has rendered.
    await expect(tiles.getByText("Quickadd", { exact: true })).toBeVisible();
    const present =
      (await tiles.getByText(categoryName, { exact: true }).count()) > 0;
    await this.selectAlphabeticalMode();
    return present;
  }

  async isCategoryInOnlineStoreTab(categoryName) {
    await this.onlineStoreTab.click();
    await expect(
      this.page.getByText("Reordering for online store"),
    ).toBeVisible();
    await expect(this.categoryRows.first()).toBeVisible();
    const present = (await this.getCategoryRow(categoryName).count()) > 0;
    await this.selectAlphabeticalMode();
    return present;
  }

  async verifyCategoryInPosRegisterTab(categoryName, visible) {
    await expect
      .poll(() => this.isCategoryInPosRegisterTab(categoryName), {
        message: `${categoryName} ${visible ? "listed" : "not listed"} in POS register tab`,
      })
      .toBe(visible);
  }

  async verifyCategoryInOnlineStoreTab(categoryName, visible) {
    await expect
      .poll(() => this.isCategoryInOnlineStoreTab(categoryName), {
        message: `${categoryName} ${visible ? "listed" : "not listed"} in Online store tab`,
      })
      .toBe(visible);
  }

  // ---------------------------------------------------------------------------
  // Online store (View Online Store)
  // ---------------------------------------------------------------------------

  // Opens the merchant storefront in a new tab and returns that page.
  async openOnlineStore() {
    const [storePage] = await Promise.all([
      this.page.context().waitForEvent("page"),
      this.viewOnlineStoreBtn.click(),
    ]);
    await expect(storePage).toHaveURL(/\/merchant\/[^/?]+/);
    return storePage;
  }

  async isCategoryOnOnlineStore(storePage, categoryName) {
    const [response] = await Promise.all([
      storePage.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url().includes(routes.API_URL.onlineStoreCategories_URL),
      ),
      storePage.reload(),
    ]);
    expect(response.status()).toBe(200);
    await expect(
      storePage.getByRole("button", { name: /Browse Categories/ }),
    ).toBeVisible({ timeout: 30_000 });
    return (
      (await storePage
        .getByRole("link", { name: categoryName, exact: true })
        .count()) > 0
    );
  }

  // Reloads the storefront until the category shows (or disappears), since
  // the store may take a moment to pick up the change.
  async verifyCategoryOnOnlineStore(storePage, categoryName, visible) {
    await expect
      .poll(() => this.isCategoryOnOnlineStore(storePage, categoryName), {
        message: `${categoryName} ${visible ? "shown" : "hidden"} on online store`,
        timeout: 60_000,
        intervals: [1_000, 3_000, 5_000],
      })
      .toBe(visible);
  }

  // Best-effort cleanup for afterAll: reloads the page (a failed test may leave a
  // drawer or dialog open) and deletes any of the given categories still listed.
  async cleanupCategories(categoryNames) {
    await this.page.goto(routes.page_URL.categories);
    await expect(this.categoryCount).toBeVisible({ timeout: 30_000 });
    await this.selectAlphabeticalMode();
    await expect(this.getCategoryRow("Quickadd")).toBeVisible();

    // Snapshot leftovers first — the list re-renders after each delete, so
    // checking rows inside the loop can miss categories that still exist.
    const leftovers = [];
    for (const categoryName of categoryNames) {
      if ((await this.getCategoryRow(categoryName).count()) > 0) {
        leftovers.push(categoryName);
      }
    }

    for (const categoryName of leftovers) {
      try {
        await this.deleteCategory(categoryName);
        console.log(`Cleanup: deleted leftover category ${categoryName}`);
      } catch (error) {
        console.log(`Cleanup: could not delete ${categoryName}: ${error.message}`);
      }
    }
  }

  async deleteCategory(categoryName) {
    const countBefore = await this.getDisplayedCategoryCount();
    await this.clearSearch();
    await this.searchCategory(categoryName);
    await this.verifySearchedCategoryDisplayed(categoryName);
    await this.clickDeleteButton(categoryName);
    await this.deleteCategoryAPI(categoryName);
    await this.clearSearch();
    await this.verifyCategoryNotInList(categoryName);
    await expect(this.categoryCount).toContainText(`${countBefore - 1} categor`);
  }
}

module.exports = { Categories };
