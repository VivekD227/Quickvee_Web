import { expect } from "@playwright/test";
import routes from "../utilities/routes.js";
const sessionDataStorage = require("../utilities/helper/sessionDataStorage");

const LIST_URL = /\/merchants\/purchase-order\/?$/;
const ADD_URL = /\/merchants\/purchase-order\/add/;
const DETAIL_URL = /\/merchants\/purchase-order\/(\d+)$/;

// Exact URL match: new_purchase_orders_list is a prefix of _list_count.
const isPostTo = (req, url) => req.method() === "POST" && req.url() === url;
const isPost = (res, url) => isPostTo(res.request(), url);

const TAB_COUNT_KEYS = {
  All: "all_po_count",
  Draft: "draft_po_count",
  Active: "active_po_count",
  Partial: "partial_po_count",
  Received: "received_po_count",
  Cancelled: "void_po_count",
};

const money = (value) =>
  `$${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

class PurchaseOrder {
  constructor(page) {
    this.page = page;

    // List page
    this.heading = page.getByRole("heading", { name: "Purchase Orders", level: 1 });
    this.newPoBtn = page.getByRole("button", { name: "New Purchase Order" });
    this.searchBar = page.getByRole("textbox", { name: "Search purchase orders" });
    this.vendorFilterBtn = page.getByRole("button", { name: "All vendors" });
    this.rows = page.getByRole("button", { name: /^Open purchase order / });
    this.listFooter = page.getByText(/^Showing \d+ purchase orders?$/);
    this.noMatch = page.getByText("No purchase orders match.");

    // New PO form
    this.formTitle = page.getByText("New Purchase Order", { exact: true });
    this.goBackBtn = page.getByRole("button", { name: "Go back" });
    this.saveDraftBtn = page.getByRole("button", { name: "Save as draft" });
    this.createReceiveBtn = page.getByRole("button", { name: "Create & Receive" }).first();
    this.createPoBtn = page.getByRole("button", { name: "Create PO", exact: true }).first();
    this.supplierBtn = page
      .getByText("Supplier", { exact: true })
      .locator("xpath=following::button[1]");
    this.vendorSearch = page.getByRole("textbox", { name: "Search vendors" });
    this.dueDateInput = page.getByRole("textbox", { name: "MM/DD/YYYY" });
    this.chooseDateBtn = page.getByRole("button", { name: /^Choose date/ });
    this.calendar = page.getByRole("grid");
    this.poNumberInput = page
      .getByText(/^Order number/)
      .first()
      .locator("xpath=following::input[1]");
    this.poNumberHint = page.getByText("20 characters max");
    this.poNumberExists = page.getByText("PO number already exists");
    this.invoiceInput = page.getByPlaceholder("Enter a Supplier Invoice Number");
    this.noteInput = page.getByPlaceholder("Enter a note for this order");
    this.noProductsYet = page.getByText(/No products yet/);
    this.scanInput = page.getByRole("textbox", { name: "Scan UPC or custom code" });
    this.addItemsBtn = page.getByRole("button", { name: "Search or scan to add a product" });
    this.qtyMinError = page.getByText("Minimum 1 qty required.").first();

    // Add items dialog
    this.addItemsDialog = page.getByRole("dialog", { name: "Add items to PO" });
    this.addItemsSearch = this.addItemsDialog.getByRole("textbox");
    this.addSelectedBtn = this.addItemsDialog.getByRole("button", { name: /^Add \d+ to PO$/ });
    this.notFoundDialog = page.getByRole("dialog", { name: "Product not found" });

    // Detail page
    this.backBtn = page.getByRole("button", { name: "Back", exact: true });
    this.editBtn = page.getByRole("button", { name: "Edit", exact: true });
    this.notifyBtn = page.getByRole("button", { name: "Notify Vendor", exact: true });
    this.discardBtn = page.getByRole("button", { name: "Discard", exact: true });
    this.cancelPoBtn = page.getByRole("button", { name: "Cancel PO", exact: true }).first();
    this.receiveUnitsBtn = page.getByRole("button", { name: "Receive units", exact: true });
    this.saveChangesBtn = page.getByRole("button", { name: "Save changes" });

    // Dialogs
    this.receiveDialog = page.getByRole("dialog", { name: "Receive units" });
    this.receiveAllBtn = this.receiveDialog.getByRole("button", { name: /^Receive all remaining/ });
    this.clearAllBtn = this.receiveDialog.getByRole("button", { name: "Clear all" });
    this.receiveNote = this.receiveDialog.getByPlaceholder(/e\.g\. 6 boxes accepted/);
    this.receiveSubmitBtn = this.receiveDialog.getByRole("button", { name: /^Receive (\d+ units?|units)$/ });
    this.cancelPoDialog = page.getByRole("dialog").filter({ hasText: "Cancel purchase order?" });
    this.discardDialog = page.getByRole("dialog").filter({ hasText: "Discard draft?" });
    // Shown when leaving a new PO form that has unsaved changes.
    this.unsavedDialog = page.getByRole("dialog").filter({ hasText: "Discard this draft?" });
    this.createReceiveDialog = page
      .getByRole("dialog")
      .filter({ hasText: "Create and receive this purchase order?" });
    this.notifyDialog = page.getByRole("dialog", { name: "Notify vendor of purchase order" });
    // Shown when an edit lowers the ordered qty below what was received.
    this.reduceReceivedDialog = page
      .getByRole("dialog")
      .filter({ hasText: "Reduce received quantity?" });
    this.toast = (text) => page.getByRole("alert").filter({ hasText: text }).last();
  }

  generatePoNumber(prefix = "AutoPO") {
    return `${prefix}${Date.now().toString().slice(-7)}`;
  }

  row(poNumber) {
    return this.rows.filter({
      has: this.page.getByText(poNumber, { exact: true }),
    });
  }

  tab(status) {
    return this.page.getByRole("button", { name: new RegExp(`^${status} \\d+$`) });
  }

  waitForApi(url, timeout = 30_000) {
    return this.page.waitForResponse((res) => isPost(res, url), { timeout });
  }

  async readApi(response, name) {
    expect(response.status(), `${name} should return HTTP 200`).toBe(200);
    return response.json();
  }

  parseFormData(postData) {
    return Object.fromEntries(
      [...(postData || "").matchAll(/name="([^"]+)"\r?\n\r?\n([^\r\n]*)/g)].map(
        (match) => [match[1], match[2]],
      ),
    );
  }

  // Clicks and returns the multipart payload and JSON body of the API call.
  async submitAndCapture(button, apiUrl, name) {
    const requestPromise = this.page.waitForRequest((req) => isPostTo(req, apiUrl), {
      timeout: 30_000,
    });
    const responsePromise = this.waitForApi(apiUrl);
    await button.click();
    const request = await requestPromise.catch(async () => {
      // Say what blocked the save: the page keeps going (afterAll), so the
      // error context snapshot doesn't show it.
      const dialogs = await this.page.getByRole("dialog").allInnerTexts();
      const alerts = await this.page.getByRole("alert").allInnerTexts();
      throw new Error(
        `${name} was not called after clicking. url=${this.page.url()} dialogs=${JSON.stringify(dialogs)} alerts=${JSON.stringify(alerts)}`,
      );
    });
    responsePromise.catch(() => {});
    const payload = this.parseFormData(request.postData());
    const body = await this.readApi(await responsePromise, name);
    if (payload.order_items) payload.order_items = JSON.parse(payload.order_items);
    return { payload, body };
  }

  // Ctrl+A doesn't select in these masked inputs. Cost (cents mask, e.g.
  // "2.50") ignores a selection, so Backspace it down to 0.00. A quantity is
  // replaced by typing over a selection, because an emptied received-PO
  // quantity refills itself.
  async typeInto(input, text) {
    await input.click();
    const current = await input.inputValue();
    if (/^\d[\d,]*\.\d{2}$/.test(current)) {
      await input.press("End");
      for (let i = 0; i < current.length + 2; i++) await input.press("Backspace");
      if (text !== "") await input.pressSequentially(String(text));
      return;
    }
    await input.evaluate((el) => el.select());
    if (text === "") await input.press("Backspace");
    else await input.pressSequentially(String(text));
  }

  // ---------- List ----------

  async gotoList() {
    const listPromise = this.waitForApi(routes.API_URL.poList_URL);
    const tabsPromise = this.waitForApi(routes.API_URL.poTabCounts_URL);
    const kpiPromise = this.waitForApi(routes.API_URL.poKpiCounts_URL);
    await this.page.goto(routes.page_URL.purchaseOrders);
    sessionDataStorage.set("po_listAPI", await this.readApi(await listPromise, "PO list"));
    sessionDataStorage.set("po_tabCountsAPI", await this.readApi(await tabsPromise, "PO tab counts"));
    sessionDataStorage.set("po_kpiAPI", await this.readApi(await kpiPromise, "PO KPI counts"));
    await this.verifyListLoaded();
  }

  async verifyListLoaded() {
    await expect(this.page).toHaveURL(LIST_URL, { timeout: 15_000 });
    await expect(this.heading).toBeVisible({ timeout: 20_000 });
    await expect(this.tab("All")).toBeVisible({ timeout: 20_000 });
  }

  async verifyListUI() {
    await expect(this.heading).toBeVisible();
    await expect(this.newPoBtn).toBeVisible();
    await expect(this.searchBar).toHaveAttribute(
      "placeholder",
      "Search PO #, Item name, reference, vendors",
    );
    await expect(this.vendorFilterBtn).toBeVisible();
    for (const label of ["Open value", "Units incoming", "Overdue"]) {
      await expect(this.page.getByText(label, { exact: true })).toBeVisible();
    }
    for (const status of Object.keys(TAB_COUNT_KEYS)) {
      await expect(this.tab(status)).toBeVisible();
    }
  }

  async verifyTabCountsMatchApi() {
    const counts = sessionDataStorage.get("po_tabCountsAPI").total_count;
    for (const [status, key] of Object.entries(TAB_COUNT_KEYS)) {
      await expect(this.tab(status), `${status} tab count`).toHaveAccessibleName(
        `${status} ${Number(counts[key])}`,
      );
    }
  }

  kpiCard(label) {
    return this.page.getByText(label, { exact: true }).locator("xpath=..");
  }

  async verifyKpisMatchApi() {
    const kpi = sessionDataStorage.get("po_kpiAPI").data;
    await expect(this.kpiCard("Open value")).toContainText(money(kpi.total_cost));
    await expect(this.kpiCard("Open value")).toContainText(
      `Across ${Number(kpi.open_po_count)} purchase order`,
    );
    await expect(this.kpiCard("Units incoming")).toContainText(String(Number(kpi.total_units)));
    await expect(this.kpiCard("Overdue")).toContainText(String(Number(kpi.due_po_count)));
  }

  getTabCount(status) {
    return Number(sessionDataStorage.get("po_tabCountsAPI").total_count[TAB_COUNT_KEYS[status]]);
  }

  // Some tab clicks refetch the list and some filter the loaded rows.
  async selectTab(status) {
    const listPromise = this.waitForApi(routes.API_URL.poList_URL, 5_000).catch(() => null);
    await this.tab(status).click();
    const response = await listPromise;
    if (response) await this.readApi(response, "PO list");
  }

  async verifyTabShowsOnly(status) {
    await this.selectTab(status);
    const count = this.getTabCount(status);
    const shown = Math.min(count, 100);
    await expect(this.rows).toHaveCount(shown, { timeout: 15_000 });
    if (count) {
      for (const text of await this.rows.allInnerTexts()) {
        expect(text, `Row in ${status} tab`).toContain(status);
      }
    }
  }

  // Waits for the list API call carrying this search, so checks never read the
  // rows of the previous search.
  async search(text) {
    const value = String(text);
    if ((await this.searchBar.inputValue()) === value) return;
    const listPromise = this.page.waitForResponse(
      (res) =>
        isPost(res, routes.API_URL.poList_URL) &&
        this.parseFormData(res.request().postData()).search_by === value,
      { timeout: 8_000 },
    );
    await this.searchBar.fill(value);
    const response = await listPromise.catch(() => null);
    if (response) await this.readApi(response, "PO list (search)");
    else await this.page.waitForTimeout(2_000);
  }

  // poNumbers must be every PO the search is expected to return.
  async verifySearchShows(text, poNumbers) {
    await this.search(text);
    await expect(this.rows, `Search "${text}" result count`).toHaveCount(poNumbers.length, {
      timeout: 15_000,
    });
    for (const po of poNumbers) {
      await expect(this.row(po), `Search "${text}" should show ${po}`).toBeVisible();
    }
    const word = poNumbers.length === 1 ? "purchase order" : "purchase orders";
    await expect(this.listFooter).toHaveText(`Showing ${poNumbers.length} ${word}`);
  }

  async verifySearchNoMatch(text) {
    await this.search(text);
    await expect(this.noMatch).toBeVisible({ timeout: 15_000 });
    await expect(this.rows).toHaveCount(0);
  }

  async verifyRow(po, { status, units }) {
    const row = this.row(po.number);
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toContainText(status);
    if (po.vendor) await expect(row).toContainText(po.vendor);
    if (po.invoice) await expect(row).toContainText(`Ref: ${po.invoice}`);
    await expect(row).toContainText(`${po.lines.length} line`);
    if (units) await expect(row).toContainText(units);
  }

  // ---------- New PO form ----------

  async openNewForm() {
    const numberPromise = this.waitForApi(routes.API_URL.poGenerateNumber_URL);
    if (await this.newPoBtn.isVisible()) await this.newPoBtn.click();
    else await this.page.goto(routes.page_URL.purchaseOrder_add);
    const body = await this.readApi(await numberPromise, "generate_po_number");
    expect(body.status).toBeTruthy();
    await expect(this.page).toHaveURL(ADD_URL, { timeout: 15_000 });
    await expect(this.poNumberInput).toHaveValue(body.po_number, { timeout: 15_000 });
    return body.po_number;
  }

  async verifyNewFormDefaults() {
    await expect(this.formTitle).toBeVisible();
    await expect(this.goBackBtn).toBeVisible();
    await expect(this.supplierBtn).toHaveText(/No Vendor/);
    await expect(this.dueDateInput).toHaveValue("");
    await expect(this.poNumberHint).toBeVisible();
    await expect(this.invoiceInput).toHaveValue("");
    await expect(this.noteInput).toHaveValue("");
    await expect(this.noProductsYet).toBeVisible();
    await expect(this.saveDraftBtn).toBeDisabled();
    await expect(this.createReceiveBtn).toBeDisabled();
    await expect(this.createPoBtn).toBeDisabled();
    await this.verifyTotals(0, "0.00");
  }

  async verifySaveButtonsEnabled() {
    await expect(this.saveDraftBtn).toBeEnabled();
    await expect(this.createReceiveBtn).toBeEnabled();
    await expect(this.createPoBtn).toBeEnabled();
  }

  // Blur runs an availability check (generate_po_number with po_number); a save
  // clicked while it runs is ignored, so wait for it.
  async setPoNumber(number) {
    const checkPromise = this.page
      .waitForResponse(
        (res) =>
          isPost(res, routes.API_URL.poGenerateNumber_URL) &&
          this.parseFormData(res.request().postData()).po_number === String(number),
        { timeout: 10_000 },
      )
      .catch(() => null);
    await this.typeInto(this.poNumberInput, number);
    await this.poNumberInput.blur();
    await checkPromise;
  }

  async assertTyped(input, typed, expected) {
    await this.typeInto(input, typed);
    await expect(input).toHaveValue(expected);
  }

  async selectVendor(vendorName) {
    await this.supplierBtn.click();
    await this.vendorSearch.fill(vendorName);
    await this.page.getByRole("button", { name: vendorName, exact: true }).last().click();
    await expect(this.supplierBtn).toHaveText(new RegExp(vendorName));
  }

  // Picks a day of the current month in the calendar; returns MM/DD/YYYY.
  async pickDueDay(day) {
    await this.chooseDateBtn.click();
    await this.calendar.getByRole("gridcell", { name: String(day), exact: true }).click();
    await expect(this.dueDateInput).not.toHaveValue("");
    if (await this.calendar.isVisible()) await this.page.keyboard.press("Escape");
    await expect(this.calendar).toBeHidden();
    return this.dueDateInput.inputValue();
  }

  async verifyPastDaysDisabled() {
    await this.chooseDateBtn.click();
    const today = new Date().getDate();
    if (today > 1) {
      await expect(
        this.calendar.getByRole("gridcell", { name: String(today - 1), exact: true }),
      ).toBeDisabled();
    }
    await expect(
      this.calendar.getByRole("gridcell", { name: String(today), exact: true }),
    ).toBeEnabled();
    await expect(this.page.getByRole("button", { name: "Previous month" })).toBeDisabled();
    await this.page.keyboard.press("Escape");
  }

  async addProductFromDialog(productName) {
    await this.addItemsBtn.click();
    await expect(this.addItemsDialog).toBeVisible();
    await this.addItemsSearch.fill(productName);
    await this.addItemsDialog.getByRole("button", { name: new RegExp(productName) }).first().click();
    await expect(this.addSelectedBtn).toHaveText("Add 1 to PO");
    await this.addSelectedBtn.click();
    await expect(this.addItemsDialog).toBeHidden();
    await expect(this.lineRow(productName)).toBeVisible();
  }

  async scanCode(code) {
    await this.scanInput.click();
    await this.page.keyboard.type(String(code), { delay: 15 });
    await this.page.keyboard.press("Enter");
  }

  lineRow(productName) {
    return this.page
      .getByText(productName, { exact: true })
      .locator("xpath=ancestor::*[.//input][1]");
  }

  // On the new PO form the line inputs are [quantity, cost]; in edit mode they
  // are [cost, quantity].
  lineQty(productName, editMode = false) {
    return this.lineRow(productName).locator("input").nth(editMode ? 1 : 0);
  }

  lineCost(productName, editMode = false) {
    return this.lineRow(productName).locator("input").nth(editMode ? 0 : 1);
  }

  // Typing a value below the received qty on a received PO is reset as you
  // type, so fall back to setting the value directly.
  async setLineQty(productName, qty, editMode = false) {
    const input = this.lineQty(productName, editMode);
    await this.typeInto(input, qty);
    if ((await input.inputValue()) !== String(qty)) await input.fill(String(qty));
    await expect(input, `${productName} quantity`).toHaveValue(
      String(qty),
    );
  }

  // Cost is typed cents-style, so 2.5 is typed as "250".
  async setLineCost(productName, cost, editMode = false) {
    const cents = Number(cost).toFixed(2).replace(/\D/g, "");
    await this.typeInto(this.lineCost(productName, editMode), cents);
    await expect(this.lineCost(productName, editMode)).toHaveValue(Number(cost).toFixed(2));
  }

  async verifyTotals(units, total) {
    await expect
      .poll(async () => {
        const text = (await this.page.locator("body").innerText()).replace(/\s+/g, " ");
        const m = text.match(/Subtotal of Products (\d+) units? \$([\d,.]+) ORDER TOTAL \$([\d,.]+)/i);
        return m ? `${m[1]}|${m[2]}|${m[3]}` : text.slice(0, 0);
      }, { message: "PO form totals" })
      .toBe(`${units}|${total}|${total}`);
  }

  async fillPoForm(po) {
    // Lines first: an open vendor list or date picker can swallow the click
    // that opens the Add items dialog.
    for (const line of po.lines) {
      await this.addProductFromDialog(line.name);
      await this.setLineQty(line.name, line.qty);
      await this.setLineCost(line.name, line.cost);
    }
    po.number = po.number || this.generatePoNumber();
    await this.setPoNumber(po.number);
    await expect(this.poNumberExists).toHaveCount(0);
    if (po.vendor) await this.selectVendor(po.vendor);
    if (po.dueDay) po.dueDate = await this.pickDueDay(po.dueDay);
    if (po.invoice) await this.invoiceInput.fill(po.invoice);
    if (po.note) await this.noteInput.fill(po.note);
  }

  // Cancel on a filled form asks before leaving; Keep editing stays on the form.
  async cancelNewForm() {
    const cancelBtn = this.page.getByRole("button", { name: "Cancel", exact: true }).first();
    await cancelBtn.click();
    await expect(this.unsavedDialog).toContainText(
      "Unsaved changes will be lost. This action cannot be undone.",
    );
    await this.unsavedDialog.getByRole("button", { name: "Keep editing" }).click();
    await expect(this.unsavedDialog).toBeHidden();
    await expect(this.page).toHaveURL(ADD_URL);
    await cancelBtn.click();
    await this.unsavedDialog.getByRole("button", { name: "Discard draft" }).click();
    await this.verifyListLoaded();
  }

  verifyCreatePayload(payload, po, { isDraft }) {
    expect(payload.po_number).toBe(po.number);
    expect(payload.is_draft).toBe(isDraft ? "1" : "0");
    expect(payload.vendor_name).toBe(po.vendor || "");
    expect(payload.inv_number).toBe(po.invoice || "");
    expect(payload.reference).toBe(po.note || "");
    const items = Object.values(payload.order_items);
    expect(items).toHaveLength(po.lines.length);
    po.lines.forEach((line, i) => {
      expect(items[i].title).toBe(line.name);
      expect(items[i].required_qty).toBe(String(line.qty));
      expect(items[i].cost_per_item).toBe(Number(line.cost).toFixed(2));
      expect(items[i].total_pricing).toBe((line.qty * line.cost).toFixed(2));
    });
  }

  // Saves the open new PO form with Save as draft or Create PO.
  async saveNewPo(po, { draft }) {
    const button = draft ? this.saveDraftBtn : this.createPoBtn;
    const detailsPromise = this.waitForApi(routes.API_URL.poDetails_URL);
    const { payload, body } = await this.submitAndCapture(button, routes.API_URL.poAdd_URL, "add_new_purchase_order");
    expect(body.status).toBeTruthy();
    expect(body.message).toBe("Purchase order created successfully");
    expect(body.po_number).toBe(po.number);
    this.verifyCreatePayload(payload, po, { isDraft: draft });
    po.id = String(body.po_id);
    await expect(this.toast("Purchase order created successfully")).toBeVisible({ timeout: 10_000 });
    await expect(this.page).toHaveURL(new RegExp(`/purchase-order/${po.id}$`), { timeout: 20_000 });
    const details = await this.readApi(await detailsPromise, "new_purchase_order_details");
    sessionDataStorage.set("po_detailsAPI", details);
    return payload;
  }

  // ---------- Detail ----------

  // A details call still in flight from the previous page can match first and
  // lose its body on navigation, so retry once with a reload.
  async openPo(po) {
    let body;
    for (let attempt = 0; attempt < 2 && !body; attempt++) {
      const detailsPromise = this.waitForApi(routes.API_URL.poDetails_URL);
      if (attempt === 0) await this.page.goto(`${routes.page_URL.purchaseOrders}/${po.id}`);
      else await this.page.reload();
      body = await this.readApi(await detailsPromise, "new_purchase_order_details").catch(
        () => null,
      );
    }
    expect(body, "new_purchase_order_details body").toBeTruthy();
    sessionDataStorage.set("po_detailsAPI", body);
    await expect(this.backBtn).toBeVisible({ timeout: 20_000 });
    await expect(this.page.getByText(po.number, { exact: true }).first()).toBeVisible();
    return body;
  }

  async verifyStatus(po, status) {
    await expect(
      this.page.getByText(status, { exact: true }).first(),
      `${po.number} should be ${status}`,
    ).toBeVisible({ timeout: 15_000 });
    const data = sessionDataStorage.get("po_detailsAPI").po_data;
    const apiStatus =
      data.po_is_void === "1" ? "Cancelled"
        : data.po_is_draft === "1" ? "Draft"
          : { 0: "Active", 1: "Partial", 2: "Received" }[data.po_received_status];
    expect(apiStatus, "Status from new_purchase_order_details").toBe(status);
  }

  async verifyActions(visible, hidden) {
    for (const name of visible) {
      await expect(
        this.page.getByRole("button", { name, exact: true }).first(),
        `${name} should be shown`,
      ).toBeVisible();
    }
    for (const name of hidden) {
      await expect(
        this.page.getByRole("button", { name, exact: true }),
        `${name} should not be shown`,
      ).toHaveCount(0);
    }
  }

  async verifyDetailData(po) {
    const { po_data: data, po_items_data: items } = sessionDataStorage.get("po_detailsAPI");
    expect(data.po_number).toBe(po.number);
    expect(data.vendor_name || "").toBe(po.vendor || "");
    expect(data.po_inv_number || "").toBe(po.invoice || "");
    expect(data.po_reference || "").toBe(po.note || "");
    expect(items).toHaveLength(po.lines.length);
    for (const line of po.lines) {
      const item = items.find((i) => i.product_title === line.name);
      expect(item, `${line.name} on the PO`).toBeTruthy();
      expect(Number(item.ordered_qty)).toBe(line.qty);
      expect(Number(item.unit_cost)).toBe(Number(line.cost));
      expect(Number(item.received_qty)).toBe(line.received || 0);
    }
    const main = this.page.locator("body");
    for (const line of po.lines) await expect(main).toContainText(line.name);
    if (po.vendor) await expect(main).toContainText(po.vendor);
    if (po.invoice) {
      await expect(main).toContainText(new RegExp(`Vendor reference\\s*${po.invoice}`));
    }
    if (po.note) await expect(main).toContainText(new RegExp(`Internal note\\s*${po.note}`));
    const ordered = po.lines.reduce((sum, l) => sum + l.qty, 0);
    const received = po.lines.reduce((sum, l) => sum + (l.received || 0), 0);
    await expect(main).toContainText(new RegExp(`Received\\s*${received}\\s*/\\s*${ordered}`));
    const total = po.lines.reduce((sum, l) => sum + l.qty * l.cost, 0);
    await expect(main).toContainText(money(total));
  }

  // ---------- Edit ----------

  async startEdit() {
    await this.editBtn.click();
    await expect(this.saveChangesBtn).toBeVisible({ timeout: 10_000 });
  }

  async saveEdit() {
    const detailsPromise = this.waitForApi(routes.API_URL.poDetails_URL);
    const { payload, body } = await this.submitAndCapture(
      this.saveChangesBtn,
      routes.API_URL.poUpdate_URL,
      "update_new_purchase_order_items",
    );
    expect(body.status).toBeTruthy();
    expect(body.message).toBe("Purchase order updated successfully");
    await expect(this.toast("Purchase order updated successfully")).toBeVisible({ timeout: 10_000 });
    sessionDataStorage.set("po_detailsAPI", await this.readApi(await detailsPromise, "details"));
    return payload;
  }

  // Lowering ordered qty below received asks first; Cancel saves nothing,
  // Continue saves and lowers the received qty and the stock.
  async saveEditReducingReceived() {
    await this.saveChangesBtn.click();
    await expect(this.reduceReceivedDialog).toContainText(
      "The received quantity will be reduced, and the inventory stock will be adjusted automatically. Continue?",
    );
    const updatePromise = this.waitForApi(routes.API_URL.poUpdate_URL, 3_000).catch(() => null);
    await this.reduceReceivedDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(this.reduceReceivedDialog).toBeHidden();
    expect(await updatePromise, "Cancel should not save the PO").toBeNull();
    await expect(this.saveChangesBtn).toBeVisible();

    await this.saveChangesBtn.click();
    const detailsPromise = this.waitForApi(routes.API_URL.poDetails_URL);
    const { payload, body } = await this.submitAndCapture(
      this.reduceReceivedDialog.getByRole("button", { name: "Continue" }),
      routes.API_URL.poUpdate_URL,
      "update_new_purchase_order_items",
    );
    expect(body.status).toBeTruthy();
    sessionDataStorage.set("po_detailsAPI", await this.readApi(await detailsPromise, "details"));
    return payload;
  }

  async createPoFromDraft() {
    const detailsPromise = this.waitForApi(routes.API_URL.poDetails_URL);
    const { payload, body } = await this.submitAndCapture(
      this.createPoBtn,
      routes.API_URL.poUpdate_URL,
      "update_new_purchase_order_items",
    );
    expect(body.message).toBe("Purchase order updated successfully");
    expect(payload.is_draft).toBe("0");
    await expect(this.toast("Purchase order updated successfully")).toBeVisible({ timeout: 10_000 });
    sessionDataStorage.set("po_detailsAPI", await this.readApi(await detailsPromise, "details"));
  }

  // ---------- Receive ----------

  async openReceiveDialog() {
    await this.receiveUnitsBtn.click();
    await expect(this.receiveDialog).toBeVisible();
  }

  receiveLine(productName) {
    return this.receiveDialog
      .getByText(productName, { exact: true })
      .locator("xpath=ancestor::*[.//input][1]");
  }

  receiveQty(productName) {
    return this.receiveLine(productName).getByRole("textbox");
  }

  async verifyReceiveDialog(po) {
    const pending = po.lines.reduce((sum, l) => sum + l.qty - (l.received || 0), 0);
    await expect(this.receiveDialog).toContainText(
      `Mark units as received from ${po.vendor || ""}`.trim(),
    );
    await expect(this.receiveDialog).toContainText(`for ${po.number}`);
    await expect(this.receiveAllBtn).toHaveText(`Receive all remaining (${pending} units)`);
    await expect(this.clearAllBtn).toBeVisible();
    for (const line of po.lines) {
      const left = line.qty - (line.received || 0);
      await expect(this.receiveLine(line.name)).toContainText(
        `Received ${line.received || 0} of ${line.qty}`,
      );
      await expect(this.receiveLine(line.name)).toContainText(`${left} remaining`);
      await expect(this.receiveQty(line.name)).toHaveValue("0");
    }
    await expect(this.receiveSubmitBtn).toBeDisabled();
  }

  async verifyReceiveFooter(units, nextStatus) {
    await expect(this.receiveDialog).toContainText(
      new RegExp(`Receiving\\s*${units} units?\\s*across`),
    );
    await expect(this.receiveDialog).toContainText(new RegExp(`PO will become\\s*${nextStatus}`));
    await expect(this.receiveSubmitBtn).toHaveText(`Receive ${units} unit${units === 1 ? "" : "s"}`);
  }

  async closeReceiveDialog() {
    await this.receiveDialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(this.receiveDialog).toBeHidden();
  }

  // quantities: { productName: qty }; returns the receive payload.
  async receive(po, quantities, note = "") {
    await this.openReceiveDialog();
    for (const [name, qty] of Object.entries(quantities)) {
      await this.receiveQty(name).fill(String(qty));
    }
    if (note) await this.receiveNote.fill(note);
    const detailsPromise = this.waitForApi(routes.API_URL.poDetails_URL);
    const { payload, body } = await this.submitAndCapture(
      this.receiveSubmitBtn,
      routes.API_URL.poReceive_URL,
      "receive_new_purchase_order",
    );
    expect(body.status).toBeTruthy();
    expect(body.message).toBe("Purchase Order received successfully.");
    await expect(this.receiveDialog).toBeHidden({ timeout: 10_000 });
    sessionDataStorage.set("po_detailsAPI", await this.readApi(await detailsPromise, "details"));
    for (const line of po.lines) line.received = (line.received || 0) + (quantities[line.name] || 0);
    const total = Object.values(quantities).reduce((a, b) => a + b, 0);
    expect(Number(payload.total_units)).toBe(total);
    expect(payload.po_note).toBe(note);
    return payload;
  }

  async verifyLatestHistory(units, note = "") {
    const entry = this.page.getByText(new RegExp(`^${units} units? received · `)).first();
    await expect(entry).toBeVisible({ timeout: 15_000 });
    // The date comes from the server, so don't compare it with this machine's
    // clock (which may be changed for testing).
    await expect(entry).toHaveText(
      new RegExp(`^${units} units? received · [A-Z][a-z]{2} \\d{1,2}, \\d{4} · by .+`),
    );
    if (note) await expect(entry.locator("xpath=..")).toContainText(note);
  }

  // ---------- Cancel / Discard / Create & Receive ----------

  async cancelPoKeep() {
    await this.cancelPoBtn.click();
    await expect(this.cancelPoDialog).toBeVisible();
    await this.cancelPoDialog.getByRole("button", { name: "Keep PO" }).click();
    await expect(this.cancelPoDialog).toBeHidden();
  }

  async cancelPo(po) {
    await this.cancelPoBtn.click();
    await expect(this.cancelPoDialog).toContainText(
      `Cancelling ${po.number} will mark this order as cancelled and it can no longer be received against.`,
    );
    const { body } = await this.submitAndCapture(
      this.cancelPoDialog.getByRole("button", { name: "Cancel PO" }),
      routes.API_URL.poVoid_URL,
      "void_new_purchase_order",
    );
    expect(body.message).toBe("Purchase order voided successfully");
    await expect(this.toast("Purchase order voided successfully")).toBeVisible({ timeout: 10_000 });
    // After cancelling, the app opens the New Purchase Order form (confirmed).
    await expect(this.page).toHaveURL(ADD_URL, { timeout: 15_000 });
  }

  async discardKeep() {
    await this.discardBtn.click();
    await expect(this.discardDialog).toBeVisible();
    await this.discardDialog.getByRole("button", { name: "Keep PO" }).click();
    await expect(this.discardDialog).toBeHidden();
  }

  async discardDraft(po) {
    await this.discardBtn.click();
    await expect(this.discardDialog).toContainText(`This will permanently delete ${po.number}.`);
    const { body } = await this.submitAndCapture(
      this.discardDialog.getByRole("button", { name: "Discard draft" }),
      routes.API_URL.poDelete_URL,
      "delete_new_purchase_order",
    );
    expect(body.message).toBe("Purchase order deleted successfully");
    await expect(this.toast("Purchase order deleted successfully")).toBeVisible({ timeout: 10_000 });
    await expect(this.page).toHaveURL(ADD_URL, { timeout: 15_000 });
  }

  async openCreateReceiveDialog() {
    await this.createReceiveBtn.click();
    await expect(this.createReceiveDialog).toBeVisible();
    await expect(this.createReceiveDialog).toContainText(
      "Every product's ordered quantity will be added to stock at this location right away.",
    );
  }

  async createReceiveGoBack() {
    await this.openCreateReceiveDialog();
    await this.createReceiveDialog.getByRole("button", { name: "Go back" }).click();
    await expect(this.createReceiveDialog).toBeHidden();
  }

  // ---------- Notify ----------

  async verifyNotifyDialog(po, vendorEmail) {
    await this.notifyBtn.click();
    await expect(this.notifyDialog).toBeVisible();
    await expect(this.notifyDialog).toContainText(`Email this purchase order to ${po.vendor}`);
    const inputs = this.notifyDialog.getByRole("textbox");
    await expect(inputs.nth(0)).toHaveValue(vendorEmail);
    await expect(inputs.nth(1)).toHaveValue(new RegExp(`^Purchase Order ${po.number} — `));
    await expect(inputs.nth(2)).toHaveValue(new RegExp(`PO #: ${po.number}`));
    await expect(this.notifyDialog).toContainText(`${po.number}.pdf`);
    await expect(this.notifyDialog.getByRole("button", { name: "Download" })).toBeVisible();
    await expect(this.notifyDialog.getByRole("button", { name: "Send email" })).toBeVisible();
    // Never send: it emails the vendor.
    await this.notifyDialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(this.notifyDialog).toBeHidden();
  }

  // ---------- Stock ----------

  // Reads a product's on-hand quantity ("Qty: N" in the Add items dialog) and
  // cost (the cost a new line starts with) from a fresh New PO form.
  async getProductStock(productName) {
    await this.openNewForm();
    await this.addItemsBtn.click();
    await this.addItemsSearch.fill(productName);
    const option = this.addItemsDialog
      .getByRole("button", { name: new RegExp(productName) })
      .first();
    await expect(option).toBeVisible({ timeout: 15_000 });
    const quantity = Number((await option.innerText()).match(/Qty:\s*(-?\d+)/)[1]);
    await option.click();
    await this.addSelectedBtn.click();
    await expect(this.addItemsDialog).toBeHidden();
    const cost = await this.lineCost(productName).inputValue();
    return { quantity, cost };
  }
}

module.exports = { PurchaseOrder };
