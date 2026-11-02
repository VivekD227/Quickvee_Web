import { expect } from "@playwright/test";
import routes from "../utilities/routes.js";
const sessionDataStorage = require("../utilities/helper/sessionDataStorage");

const LIST_URL = /\/merchants\/inventory\/lottery\/?$/;
const ADD_URL = /\/merchants\/inventory\/lottery\/add-lottery/;
const EDIT_URL = /\/merchants\/inventory\/lottery\/update-lottery\/(\d+)/;

const REQUIRED_ERRORS = {
  name: "Lottery name is required",
  quantity: "Quantity is required",
  category: "Category is required",
  upc: "UPC is required",
};

// Match on the API path only: the same endpoint is served from api-ci or from
// api-node under /ci/, and the app moves calls between them.
const apiPath = (url) => new URL(url).pathname.replace(/^\/ci\//, "/");
const isPostTo = (req, url) =>
  req.method() === "POST" && apiPath(req.url()) === apiPath(url);
const isPost = (res, url) => isPostTo(res.request(), url);

// "5.00" -> "$500": the list chip renders "$5<sup>00</sup>".
const priceChipText = (price) => `$${Number(price).toFixed(2).replace(".", "")}`;

class Lottery {
  constructor(page) {
    this.page = page;

    // List page
    this.header = page.getByRole("banner");
    this.heading = this.header.getByText("Lottery", { exact: true });
    this.countText = this.header.getByText(
      /\d+ lotter(y|ies) in this store|Showing \d+ of \d+ lotter(y|ies)/,
    );
    this.searchBar = page.getByPlaceholder("Search by lottery name or UPC");
    this.addLotteryBtn = page
      .getByRole("button", { name: "Add new lottery" })
      .first();
    this.columnButtons = ["Price", "Lottery name", "UPC", "Quantity"].map(
      (name) => page.getByRole("button", { name, exact: true }),
    );
    this.rows = page.locator(".qv-lot-row");
    this.noMatchTitle = page.getByText("No lotteries match that search");
    this.noMatchHint = page.getByText(
      "Try a different name, or clear the search to see every lottery in this store.",
    );
    // The no-match message has its own button; the search box also has an
    // icon button labelled "Clear search".
    this.clearSearchBtn = page.locator("button.qv-lot-btn", {
      hasText: "Clear search",
    });

    // Add / Edit form
    this.backBtn = page.getByRole("button", { name: "Back to lottery list" });
    this.addSubtitle = page.getByText("A new lottery ticket for the register");
    this.editTitle = this.header.getByText("Edit lottery", { exact: true });
    this.cancelBtn = this.header.getByRole("button", {
      name: "Cancel",
      exact: true,
    });
    this.saveLotteryBtn = page.getByRole("button", { name: "Save lottery" });
    this.saveChangesBtn = page.getByRole("button", { name: "Save changes" });
    this.sectionHeadings = ["Lottery details", "Category", "Barcode", "Inventory"].map(
      (name) => page.getByRole("heading", { name, level: 3 }),
    );
    this.nameInput = page.locator("input[name=title]");
    this.priceInput = page.locator("input[name=price]");
    this.quantityInput = page.locator("input[name=quantity]");
    this.upcInput = page.locator("input[name=upc]");
    this.generateBtn = page.getByRole("button", { name: "Generate" });
    this.trackQuantityInput = page.locator("input[name=trackqnty]");
    this.quantityLocked = page.getByText("Locked", { exact: true });
    this.quantityLockedHelp = page.getByText(
      "Quantity is managed by your inventory settings.",
    );

    this.categoryBox = page.locator(".dropdownBox[name=collection]");
    this.categoryInput = page.getByPlaceholder("Search category");
    this.categoryOptions = this.categoryBox.locator(".options-box .item");
    this.categoryChips = this.categoryBox.locator(".selected-item .item");
    this.noCategoryResult = this.categoryBox.getByText("No Search Result Found");

    // Live preview
    this.preview = page.locator(".qv-lot-preview");
    this.previewKicker = this.preview.locator(".qv-lot-ticket-kicker");
    this.previewName = this.preview.locator(".qv-lot-ticket-name");
    this.previewPrice = this.preview.locator(".qv-lot-ticket-price");
    this.previewMeta = this.preview.locator(".qv-lot-ticket-meta");

    // Messages
    this.duplicateNameError = page.getByText("Title already exists");
    this.duplicateUpcError = page.getByText(/upc already exists/i);
    this.successToast = page.getByRole("alert").filter({ hasText: "Success" });
    this.deleteSuccessToast = page.getByText("Deleted Successfully");

    // Delete dialog (not exposed as role=dialog)
    this.deleteDialogText = page.getByText(
      /Are you sure you want to\s*delete this lottery/,
    );
    this.deleteConfirmBtn = page.getByRole("button", {
      name: "Delete",
      exact: true,
    });
    this.deleteCancelBtn = page
      .getByRole("button", { name: "Cancel", exact: true })
      .last();
  }

  // UPC is required and unique across products and lotteries.
  generateUniqueName(prefix = "AutoLottery") {
    return `${prefix} ${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }

  generateUniqueUpc() {
    return `7${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 90 + 10)}`;
  }

  requiredError(field) {
    return this.page.getByText(REQUIRED_ERRORS[field], { exact: true });
  }

  getRow(name) {
    return this.rows.filter({
      has: this.page.getByTitle(name, { exact: true }),
    });
  }

  deleteRowBtn(name) {
    return this.page.getByRole("button", {
      name: `Delete ${name}`,
      exact: true,
    });
  }

  // ---------- List page ----------

  waitForListApi() {
    return this.page.waitForResponse(
      (res) => isPost(res, routes.API_URL.lotteryList_URL),
      { timeout: 30_000 },
    );
  }

  async readListApi(response) {
    expect(response.status(), "Lottery list API should return HTTP 200").toBe(200);
    const body = await response.json();
    expect(body.status).toBeTruthy();
    expect(Array.isArray(body.data)).toBeTruthy();
    sessionDataStorage.set("lottery_APIdata", body.data);
    return body.data;
  }

  async gotoLotteryList() {
    const listPromise = this.waitForListApi();
    await this.page.goto(routes.page_URL.lottery);
    const data = await this.readListApi(await listPromise);
    await this.verifyLotteryPageLoaded();
    return data;
  }

  async verifyLotteryPageLoaded() {
    await expect(this.page).toHaveURL(LIST_URL, { timeout: 15_000 });
    await expect(this.searchBar).toBeVisible({ timeout: 20_000 });
    await expect(this.countText).toBeVisible({ timeout: 20_000 });
  }

  async verifyLotteryPageUI() {
    await expect(this.heading).toBeVisible();
    await expect(this.countText).toBeVisible();
    await expect(this.searchBar).toBeVisible();
    await expect(this.addLotteryBtn).toBeVisible();
    for (const column of this.columnButtons) {
      await expect(column).toBeVisible();
    }
  }

  async getDisplayedCount() {
    const text = await this.countText.innerText();
    const showing = text.match(/Showing \d+ of (\d+)/);
    return Number(showing ? showing[1] : text.match(/(\d+) lotter/)[1]);
  }

  async verifyCountText(count) {
    const word = count === 1 ? "lottery" : "lotteries";
    await expect(this.countText).toHaveText(`${count} ${word} in this store`, {
      timeout: 15_000,
    });
  }

  async verifyListMatchesApi() {
    const data = sessionDataStorage.get("lottery_APIdata");
    for (const item of data) {
      expect(item.is_lottery, `${item.title} should be a lottery`).toBe("1");
    }
    await this.verifyCountText(data.length);
    await expect(this.rows).toHaveCount(data.length);
    for (const item of data) {
      await this.verifyLotteryRow({
        name: item.title,
        price: item.price,
        quantity: item.quantity,
        upc: item.upc,
      });
    }
  }

  async verifyLotteryRow({ name, price, quantity, upc }) {
    const row = this.getRow(name);
    await expect(row, `Lottery "${name}" should be listed`).toHaveCount(1, {
      timeout: 15_000,
    });
    const chip = (await row.locator(".qv-lot-stub-amt").innerText()).replace(
      /\s/g,
      "",
    );
    expect(chip, `Price chip of "${name}"`).toBe(priceChipText(price));
    await expect(row.locator(".qv-lot-row-upc")).toHaveText(upc);
    await expect(row.locator(".qv-lot-qty")).toHaveText(
      `${Number(quantity)} in stock`,
    );
    await expect(row.getByRole("button", { name: `Delete ${name}` })).toBeVisible();
  }

  async verifyLotteryNotListed(name) {
    await expect(this.getRow(name)).toHaveCount(0, { timeout: 15_000 });
  }

  // Search filters the loaded list in the browser; no API call.
  async searchLottery(text) {
    await this.searchBar.fill(String(text));
  }

  async clearSearch() {
    await this.searchBar.fill("");
  }

  // names must be every lottery the search is expected to return.
  async verifySearchShows(text, names) {
    await this.searchLottery(text);
    await expect(this.rows, `Search "${text}" result count`).toHaveCount(names.length);
    for (const name of names) {
      await expect(this.getRow(name), `Search "${text}" should show ${name}`).toHaveCount(1);
    }
    const total = sessionDataStorage.get("lottery_APIdata").length;
    await expect(this.countText).toHaveText(
      `Showing ${names.length} of ${total} ${total === 1 ? "lottery" : "lotteries"}`,
    );
  }

  async verifySearchNoMatch(text) {
    await this.searchLottery(text);
    await expect(this.rows).toHaveCount(0);
    await expect(this.noMatchTitle).toBeVisible();
    await expect(this.noMatchHint).toBeVisible();
    await expect(this.clearSearchBtn).toBeVisible();
  }

  async verifyClearSearchRestoresList() {
    const total = sessionDataStorage.get("lottery_APIdata").length;
    await this.clearSearchBtn.click();
    await expect(this.searchBar).toHaveValue("");
    await expect(this.rows).toHaveCount(total);
    await this.verifyCountText(total);
  }

  // ---------- Add / Edit form ----------

  waitForFormCategories() {
    return this.page.waitForResponse(
      (res) => isPost(res, routes.API_URL.formCategoryList_URL),
      { timeout: 30_000 },
    );
  }

  // The form only offers categories that have "Lottery items" turned on.
  async storeLotteryCategories(response) {
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBeTruthy();
    sessionDataStorage.set(
      "lottery_formCategories",
      body.result
        .filter((c) => c.is_lottery === "1")
        .map((c) => ({ id: c.id, title: c.title })),
    );
  }

  async openAddForm() {
    const categoriesPromise = this.waitForFormCategories();
    await this.addLotteryBtn.click();
    await expect(this.page).toHaveURL(ADD_URL, { timeout: 15_000 });
    await expect(this.nameInput).toBeVisible();
    await this.storeLotteryCategories(await categoriesPromise);
  }

  async verifyAddFormUI() {
    await expect(this.backBtn).toBeVisible();
    await expect(this.header.getByText("Add new lottery", { exact: true })).toBeVisible();
    await expect(this.addSubtitle).toBeVisible();
    await expect(this.cancelBtn).toBeVisible();
    await expect(this.saveLotteryBtn).toBeVisible();
    for (const heading of this.sectionHeadings) {
      await expect(heading).toBeVisible();
    }
    await expect(this.nameInput).toHaveAttribute("placeholder", "e.g. Lucky 7s $5");
    await expect(this.categoryInput).toBeVisible();
    await expect(this.upcInput).toHaveAttribute("placeholder", "Scan or generate a code");
    await expect(this.generateBtn).toBeEnabled();
    await expect(this.preview.getByText("Live preview")).toBeVisible();
  }

  async verifyAddFormDefaults() {
    await expect(this.nameInput).toHaveValue("");
    await expect(this.priceInput).toHaveValue("");
    await expect(this.quantityInput).toHaveValue("");
    await expect(this.quantityInput).toBeEnabled();
    await expect(this.categoryChips).toHaveCount(0);
    await expect(this.upcInput).toHaveValue("");
    await expect(this.trackQuantityInput).toBeChecked();
    await this.verifyPreview({
      kicker: "Lottery ticket",
      name: "Untitled lottery",
      price: "0.00",
      meta: "No quantity yet",
      tracked: true,
      upc: /no upc/i,
    });
  }

  async verifyPreview({ kicker, name, price, meta, tracked, upc }) {
    if (kicker) await expect(this.previewKicker).toHaveText(kicker, { ignoreCase: true });
    if (name) await expect(this.previewName).toHaveText(name);
    if (price !== undefined) {
      await expect
        .poll(async () => (await this.previewPrice.innerText()).replace(/\s/g, ""))
        .toBe(priceChipText(price));
    }
    if (meta) await expect(this.previewMeta).toContainText(meta);
    if (tracked !== undefined) {
      await expect(this.previewMeta).toContainText(tracked ? /Tracked/ : /Not tracked/);
      if (tracked) await expect(this.previewMeta).not.toContainText("Not tracked");
    }
    if (upc) await expect(this.preview).toContainText(upc);
  }

  async backToList() {
    await this.backBtn.click();
    await this.verifyLotteryPageLoaded();
  }

  async cancelForm() {
    await this.cancelBtn.click();
    await this.verifyLotteryPageLoaded();
  }

  async fillName(name) {
    await this.nameInput.fill(String(name));
  }

  // Price is typed cents-style: "500" shows 5.00. Pass a price like "5.00".
  async fillPrice(price) {
    await this.priceInput.click();
    await this.priceInput.press("Control+a");
    await this.priceInput.press("Backspace");
    if (price !== "") {
      await this.priceInput.pressSequentially(String(price).replace(/\D/g, ""));
    }
  }

  async fillQuantity(quantity) {
    await this.quantityInput.fill(String(quantity));
  }

  async fillUpc(upc) {
    await this.upcInput.fill(String(upc));
  }

  async openCategoryList() {
    await this.categoryInput.click();
    await expect(this.categoryBox.locator(".options-box")).toBeVisible();
  }

  // An open dropdown swallows the next click (e.g. on Generate), so close it.
  async closeCategoryList() {
    await this.page.keyboard.press("Escape");
    await this.sectionHeadings[2].click();
    await expect(this.categoryBox.locator(".options-box")).toBeHidden();
  }

  async selectCategory(categoryName) {
    await this.openCategoryList();
    await this.categoryInput.fill(categoryName);
    await this.categoryOptions.getByText(categoryName, { exact: true }).click();
    await this.closeCategoryList();
    await expect(this.categoryChip(categoryName)).toBeVisible();
  }

  categoryChip(categoryName) {
    return this.categoryChips.filter({
      has: this.page.getByText(categoryName, { exact: true }),
    });
  }

  async removeCategory(categoryName) {
    await this.categoryChip(categoryName).locator(".cancel-image").click();
    await expect(this.categoryChip(categoryName)).toHaveCount(0);
  }

  async generateUpc() {
    for (let i = 0; i < 3 && !(await this.upcInput.inputValue()); i++) {
      await this.generateBtn.click();
      await expect
        .poll(() => this.upcInput.inputValue(), { timeout: 3_000 })
        .not.toBe("")
        .catch(() => {});
    }
    const upc = await this.upcInput.inputValue();
    expect(upc, "Generate should fill a 12-digit UPC").toMatch(/^\d{12}$/);
    return upc;
  }

  async setTrackQuantity(on) {
    if ((await this.trackQuantityInput.isChecked()) !== on) {
      await this.trackQuantityInput.locator("xpath=..").click();
    }
    if (on) await expect(this.trackQuantityInput).toBeChecked();
    else await expect(this.trackQuantityInput).not.toBeChecked();
  }

  // lottery: { name, price, quantity, category, upc, track }. A missing upc is
  // generated and stored back on the object.
  async fillLotteryForm(lottery) {
    if (lottery.name !== undefined) await this.fillName(lottery.name);
    if (lottery.price !== undefined) await this.fillPrice(lottery.price);
    if (lottery.quantity !== undefined) await this.fillQuantity(lottery.quantity);
    if (lottery.category) await this.selectCategory(lottery.category);
    if (lottery.upc) await this.fillUpc(lottery.upc);
    else lottery.upc = await this.generateUpc();
    if (lottery.track !== undefined) await this.setTrackQuantity(lottery.track);
  }

  async assertTyped(input, typed, expected) {
    await input.fill("");
    await input.pressSequentially(typed);
    await expect(input).toHaveValue(expected);
    await input.fill("");
  }

  async verifyRequiredErrors(expected) {
    for (const [field, shown] of Object.entries(expected)) {
      if (shown) await expect(this.requiredError(field)).toBeVisible();
      else await expect(this.requiredError(field)).toHaveCount(0);
    }
  }

  // Clicks save and checks no add/edit API call goes out.
  async saveExpectingRejection(saveBtn = this.saveLotteryBtn) {
    const saveApi = (res) =>
      isPost(res, routes.API_URL.addProduct) ||
      isPost(res, routes.API_URL.updateProduct);
    const savePromise = this.page
      .waitForResponse(saveApi, { timeout: 4_000 })
      .catch(() => null);
    await saveBtn.click();
    expect(await savePromise, "Invalid lottery form should not be saved").toBeNull();
    await expect(this.page).not.toHaveURL(LIST_URL);
  }

  parseFormData(postData) {
    return Object.fromEntries(
      [...(postData || "").matchAll(/name="([^"]+)"\r?\n\r?\n([^\r\n]*)/g)].map(
        (match) => [match[1], match[2]],
      ),
    );
  }

  categoryId(categoryName) {
    const category = sessionDataStorage
      .get("lottery_formCategories")
      .find((c) => c.title === categoryName);
    expect(category, `${categoryName} should be a lottery category`).toBeTruthy();
    return category.id;
  }

  verifySavePayload(payload, lottery) {
    expect(payload.title).toBe(lottery.name);
    expect(payload.price).toBe(Number(lottery.price).toFixed(2));
    expect(payload.quantity).toBe(String(lottery.quantity));
    expect(payload.upc).toBe(lottery.upc);
    expect(payload.trackqnty).toBe(lottery.track === false ? "0" : "1");
    expect(payload.is_lottery).toBe("1");
    expect(payload.collection).toBe(this.categoryId(lottery.category));
  }

  async submitAndCapture(saveBtn, apiUrl) {
    const requestPromise = this.page.waitForRequest(
      (req) => isPostTo(req, apiUrl),
      { timeout: 20_000 },
    );
    const responsePromise = this.page.waitForResponse(
      (res) => isPost(res, apiUrl),
      { timeout: 20_000 },
    );
    const listPromise = this.waitForListApi();
    await saveBtn.click();
    const payload = this.parseFormData((await requestPromise).postData());
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const body = await response.json();
    await this.verifyLotteryPageLoaded();
    await expect(this.successToast.last()).toBeVisible({ timeout: 10_000 });
    await this.readListApi(await listPromise);
    return { payload, body };
  }

  // Fills and saves a new lottery, then checks the add API and the list row.
  async addLottery(lottery) {
    const countBefore = await this.getDisplayedCount();
    await this.openAddForm();
    await this.fillLotteryForm(lottery);
    const { payload, body } = await this.submitAndCapture(
      this.saveLotteryBtn,
      routes.API_URL.addProduct,
    );
    expect(body.status).toBeTruthy();
    expect(body.success_message).toBe("Successfully created product");
    lottery.id = String(body.productid);
    this.verifySavePayload(payload, lottery);
    await this.verifyCountText(countBefore + 1);
    await this.verifyLotteryRow(lottery);
    const saved = sessionDataStorage
      .get("lottery_APIdata")
      .find((item) => item.id === lottery.id);
    expect(saved, "List API should return the new lottery").toMatchObject({
      title: lottery.name,
      upc: lottery.upc,
      price: Number(lottery.price).toFixed(2),
      quantity: String(lottery.quantity),
      is_lottery: "1",
    });
  }

  async verifyAddRejected(lottery, errorLocator) {
    const countBefore = await this.getDisplayedCount();
    // A duplicate-name check reuses a listed name, so it must stay listed once.
    const listedBefore = await this.getRow(lottery.name).count();
    await this.openAddForm();
    await this.fillLotteryForm(lottery);
    await this.saveExpectingRejection();
    await expect(errorLocator).toBeVisible({ timeout: 10_000 });
    await expect(this.page).toHaveURL(ADD_URL);
    await this.cancelForm();
    await this.verifyCountText(countBefore);
    await expect(this.getRow(lottery.name)).toHaveCount(listedBefore);
  }

  async openEditLottery(name) {
    const dataPromise = this.page.waitForResponse(
      (res) => isPost(res, routes.API_URL.getProductDataById),
      { timeout: 30_000 },
    );
    const categoriesPromise = this.waitForFormCategories();
    await this.getRow(name).locator(".qv-lot-name").click();
    await expect(this.page).toHaveURL(EDIT_URL, { timeout: 15_000 });
    expect((await dataPromise).status()).toBe(200);
    await this.storeLotteryCategories(await categoriesPromise);
    await expect(this.nameInput).toHaveValue(name, { timeout: 15_000 });
    // Save clicked before the form finishes loading does nothing, so wait for
    // the category chip and UPC, which fill in last.
    await expect(this.categoryChips).toHaveCount(1, { timeout: 15_000 });
    await expect(this.upcInput).not.toHaveValue("", { timeout: 15_000 });
    return this.page.url().match(EDIT_URL)[1];
  }

  async verifyEditForm(lottery) {
    await expect(this.editTitle).toBeVisible();
    await expect(this.header.getByText(lottery.name, { exact: true })).toBeVisible();
    await expect(this.cancelBtn).toBeVisible();
    await expect(this.saveChangesBtn).toBeVisible();
    await expect(this.nameInput).toHaveValue(lottery.name);
    await expect(this.priceInput).toHaveValue(Number(lottery.price).toFixed(2));
    await expect(this.quantityInput).toHaveValue(String(lottery.quantity));
    await expect(this.quantityInput).toBeDisabled();
    await expect(this.quantityLocked).toBeVisible();
    await expect(this.quantityLockedHelp).toBeVisible();
    await expect(this.categoryChips).toHaveCount(1);
    await expect(this.categoryChip(lottery.category)).toBeVisible();
    await expect(this.upcInput).toHaveValue(lottery.upc);
    await expect(this.generateBtn).toBeDisabled();
    if (lottery.track === false) await expect(this.trackQuantityInput).not.toBeChecked();
    else await expect(this.trackQuantityInput).toBeChecked();
    await this.verifyPreview({
      name: lottery.name,
      price: lottery.price,
      tracked: lottery.track !== false,
      upc: lottery.upc,
    });
  }

  // Saves the open edit form and checks the edit API and the list row.
  async saveEditedLottery(lottery) {
    const { payload, body } = await this.submitAndCapture(
      this.saveChangesBtn,
      routes.API_URL.updateProduct,
    );
    expect(body.status).toBeTruthy();
    expect(body.success_message).toBe("Successfully Updated product");
    expect(payload.productid).toBe(lottery.id);
    this.verifySavePayload(payload, lottery);
    await this.verifyLotteryRow(lottery);
  }

  // UPCs are unique across lottery UPCs, product UPCs and product custom codes.
  async verifyEditUpcRejected(lottery, upc) {
    await this.openEditLottery(lottery.name);
    await this.fillUpc(upc);
    await this.saveExpectingRejection(this.saveChangesBtn);
    await expect(this.duplicateUpcError).toBeVisible({ timeout: 10_000 });
    await this.cancelForm();
    await this.verifyLotteryRow(lottery);
  }

  // ---------- Delete ----------

  async openDeleteDialog(name) {
    await this.deleteRowBtn(name).click();
    await expect(this.deleteDialogText).toBeVisible();
    await expect(this.deleteDialogText).toContainText(`"${name}"`);
    await expect(this.deleteConfirmBtn).toBeVisible();
    await expect(this.deleteCancelBtn).toBeVisible();
  }

  async cancelDelete(name) {
    await this.openDeleteDialog(name);
    await this.deleteCancelBtn.click();
    await expect(this.deleteDialogText).toBeHidden();
    await expect(this.getRow(name)).toHaveCount(1);
  }

  async deleteLottery(name) {
    const countBefore = await this.getDisplayedCount();
    await this.openDeleteDialog(name);
    const deletePromise = this.page.waitForResponse(
      (res) => isPost(res, routes.API_URL.lotteryDelete_URL),
      { timeout: 20_000 },
    );
    const listPromise = this.waitForListApi();
    await this.deleteConfirmBtn.click();
    const response = await deletePromise;
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBeTruthy();
    expect(body.delete_message).toBe("Successfully deleted product");
    await expect(this.deleteSuccessToast.last()).toBeVisible({ timeout: 10_000 });
    const data = await this.readListApi(await listPromise);
    expect(data.map((item) => item.title)).not.toContain(name);
    await expect(this.deleteDialogText).toBeHidden();
    await this.verifyLotteryNotListed(name);
    await this.verifyCountText(countBefore - 1);
  }

  // Best-effort cleanup for afterAll: reloads the list (a failed test may leave
  // a form or dialog open) and deletes any of the given lotteries still listed.
  async cleanupLotteries(names) {
    const data = await this.gotoLotteryList();
    const leftovers = names.filter((name) =>
      data.some((item) => item.title === name),
    );
    for (const name of leftovers) {
      try {
        await this.deleteLottery(name);
        console.log(`Cleanup: deleted leftover lottery ${name}`);
      } catch (error) {
        console.log(`Cleanup: could not delete ${name}: ${error.message}`);
      }
    }
  }
}

module.exports = { Lottery };
