import { expect } from "@playwright/test";
import routes from "../utilities/routes.js";

const flat = (text) => text.replace(/\s+/g, " ").trim();
const money = (text) => Number(text.replace(/[$,]/g, ""));
const isApi = (name) => (res) =>
  res.request().method() === "POST" && res.url().endsWith(`/StocktakeNewUI/${name}`);

export const REASONS = [
  "Damage",
  "Theft / shrink",
  "Mislocated",
  "Receiving error",
  "Already sold (not POS)",
  "Counting error",
  "Other",
];

// Stock Control → Stocktake (/merchants/stocktake-app): the list of counts and
// one count's page. A count is started with a scope (Walkaround, Category,
// Vendor or Ad-hoc), items are counted (row input, side panel, quick set or
// keys), saved as a draft (save_counts), reviewed (Variance review) and posted
// (post_stocktake_adjustment), which overwrites on-hand with the counted
// values. A posted count can be voided, which reverses the adjustments.
//
// Line names must not contain the words Pending / Loss / Gain / Match: a line
// is found as the nearest element around the name that holds its status.
export class StockControlStocktake {
  constructor(page) {
    this.page = page;

    // List
    this.newCountBtn = page.getByRole("button", { name: /New count/ });
    this.searchCounts = page.getByPlaceholder(/Search counts/);

    // New count dialog
    this.newDialogTitle = page.getByText("Start new count", { exact: true });
    this.nameInput = page.getByPlaceholder(/Footwear cycle count/);
    this.startBtn = page.getByRole("button", { name: "Start counting" });
    this.cancelBtn = page.getByRole("button", { name: "Cancel", exact: true });

    // Count page
    this.backBtn = page.getByRole("button", { name: "Back to counts" });
    this.countEntriesTab = page.getByRole("button", { name: "Count entries" });
    this.varianceTab = page.getByRole("button", { name: "Variance review" });
    this.exportBtn = page.getByRole("button", { name: "Export", exact: true });
    this.exportCsvBtn = page.getByRole("button", { name: /Export CSV/ });
    this.saveDraftBtn = page.getByRole("button", { name: "Save as Draft" }).first();
    this.postBtn = page.getByRole("button", { name: "Post adjustments" }).first();
    this.voidBtn = page.getByRole("button", { name: "Void", exact: true });
    this.printBtn = page.getByRole("button", { name: "Print", exact: true });
    this.emailBtn = page.getByRole("button", { name: "Email", exact: true });
    this.searchItem = page.getByPlaceholder(/Search item/);
    this.scanInput = page.getByPlaceholder(/Scan SKU/);
    this.pendingOnlyBtn = page.getByRole("button", { name: /Pending only/ });

    // Side panel for the selected line
    this.panel = page.getByRole("complementary");
    this.panelCounted = this.panel.locator("input").first();
    this.panelMinus = this.panel.locator("button").filter({ hasNotText: /\S/ }).nth(0);
    this.panelPlus = this.panel.locator("button").filter({ hasNotText: /\S/ }).nth(1);
    this.noteInput = this.panel.getByPlaceholder(/Damage, mislocated/);
    this.flagBtn = this.panel.getByRole("button", { name: /recount/i });
    this.clearBtn = this.panel.getByRole("button", { name: "Clear count" });
    this.removeBtn = this.panel.getByRole("button", { name: "Remove item" });

    // Dialogs
    this.unsavedTitle = page.getByText("Unsaved changes", { exact: true });
    this.stayBtn = page.getByRole("button", { name: "Stay and keep editing" });
    this.postDialog = page
      .getByText("Post adjustments?", { exact: true })
      .locator("xpath=ancestor::*[.//button[normalize-space()='Cancel']][1]");
    this.voidDialog = page
      .getByText("Void this count?", { exact: true })
      .locator("xpath=ancestor::*[.//button[normalize-space()='Cancel']][1]");
    this.emailDialog = page
      .getByText("Send email", { exact: true })
      .first()
      .locator("xpath=ancestor::*[.//button[normalize-space()='Skip']][1]");
  }

  // ---- List ----

  async open() {
    const list = this.page.waitForResponse(isApi("stocktake_list"), { timeout: 60_000 });
    await this.page.goto(routes.page_URL.stocktakeApp);
    await list;
    await expect(this.newCountBtn).toBeVisible({ timeout: 30_000 });
  }

  async bodyText() {
    return this.page.locator("body").innerText();
  }

  // Summary cards: { active, pending, shrink, overage }.
  async cards() {
    const text = await this.bodyText();
    const m = text.match(
      /ACTIVE COUNTS\s+(\d+)[\s\S]*?PENDING REVIEW\s+(\d+)[\s\S]*?SHRINK \(30D\)\s+\$([\d,.]+)[\s\S]*?OVERAGE \(30D\)\s+\$([\d,.]+)/i,
    );
    expect(m, "summary cards").toBeTruthy();
    return { active: Number(m[1]), pending: Number(m[2]), shrink: money(m[3]), overage: money(m[4]) };
  }

  // Status tab counts: { all, inProgress, ready, posted, void }.
  async tabCounts() {
    const text = await this.bodyText();
    const m = text.match(/All\s+(\d+)\s+In progress\s+(\d+)\s+Ready to post\s+(\d+)\s+Posted\s+(\d+)\s+Void\s+(\d+)/);
    expect(m, "status tabs").toBeTruthy();
    const [all, inProgress, ready, posted, voided] = m.slice(1).map(Number);
    return { all, inProgress, ready, posted, void: voided };
  }

  async clickTab(name) {
    const list = this.page.waitForResponse(isApi("stocktake_list"));
    await this.page.getByRole("button", { name: new RegExp(`^${name}\\s*\\d+$`) }).click();
    return (await list).request();
  }

  async searchList(text) {
    const list = this.page.waitForResponse(isApi("stocktake_list"));
    await this.searchCounts.fill(text);
    await list;
    await this.page.waitForTimeout(500);
  }

  async filterScope(scope) {
    const list = this.page.waitForResponse(isApi("stocktake_list"));
    // The dropdown left of the search box shows the current scope.
    await this.searchCounts
      .locator("xpath=preceding::*[normalize-space()='All' or normalize-space()='Walkaround' or normalize-space()='Category' or normalize-space()='Vendor' or normalize-space()='Ad-hoc'][1]")
      .click();
    await this.page.getByText(scope, { exact: true }).filter({ visible: true }).last().click();
    await list;
    await this.page.waitForTimeout(500);
  }

  // The list row of a count, found by its ST code.
  listRow(stCode) {
    return this.page
      .getByText(stCode, { exact: true })
      .first()
      .locator("xpath=ancestor::*[contains(., 'counted')][1]");
  }

  async listRowText(stCode) {
    return flat(await this.listRow(stCode).innerText());
  }

  // ---- New count ----

  async openNewCount() {
    await this.newCountBtn.click();
    await expect(this.newDialogTitle).toBeVisible();
  }

  async chooseScope(scope) {
    await this.page.getByText(scope, { exact: true }).last().click();
  }

  // Starts a count and returns { id, st, items } from create_stocktake.
  async startCount({ scope = "Walkaround", pick, sample, name }) {
    await this.openNewCount();
    if (scope !== "Walkaround") await this.chooseScope(scope);
    if (pick) {
      await this.page.getByText(`Select a ${scope.toLowerCase()}`).click();
      const focused = this.page.locator("input:focus");
      if (await focused.count()) await focused.fill(pick);
      else await this.page.keyboard.type(pick);
      await this.page.getByText(pick, { exact: true }).last().click();
    }
    if (sample) await this.page.getByRole("button", { name: String(sample), exact: true }).click();
    await this.nameInput.fill(name);
    const created = this.page.waitForResponse(isApi("create_stocktake"));
    await this.startBtn.click();
    const body = await (await created).json();
    expect(body.status, JSON.stringify(body).slice(0, 300)).toBe(true);
    await expect(this.countEntriesTab).toBeVisible({ timeout: 30_000 });
    await expect(this.page).toHaveURL(new RegExp(`/stocktake-app/${body.result.id}$`));
    await this.waitForLines();
    return { id: body.result.id, st: body.result.st_id, items: Object.values(body.result.all_items || {}) };
  }

  // ---- One count ----

  async openCount(id) {
    const details = this.page.waitForResponse(isApi("get_stocktake_details"), { timeout: 60_000 });
    await this.page.goto(`${routes.page_URL.stocktakeApp}/${id}`);
    const body = await (await details).json();
    await expect(this.countEntriesTab).toBeVisible({ timeout: 30_000 });
    await this.waitForLines();
    return body.result;
  }

  // Category / vendor / ad-hoc counts load their lines after the page opens.
  async waitForLines() {
    await this.page.waitForTimeout(1000);
    await expect(this.page.getByText("Loading products…")).toBeHidden({ timeout: 60_000 });
  }

  // The part of the page from "Back to counts" on, on one line.
  async detailText() {
    const text = await this.bodyText();
    return flat(text.slice(Math.max(0, text.indexOf("Back to counts"))));
  }

  async status(countName) {
    const m = (await this.detailText()).match(
      new RegExp(`${countName} (In progress|Ready to post|Posted|Void)`),
    );
    expect(m, `status of ${countName}`).toBeTruthy();
    return m[1];
  }

  // Header counters: { loss, gain, match, pending }.
  async counters() {
    const m = (await this.detailText()).match(/LOSS (\d+) u.*?GAIN (\d+) u.*?MATCH (\d+) PENDING (\d+)/i);
    expect(m, "LOSS / GAIN / MATCH / PENDING").toBeTruthy();
    const [loss, gain, match, pending] = m.slice(1).map(Number);
    return { loss, gain, match, pending };
  }

  // A line of the count table.
  line(name) {
    return this.page
      .getByText(name, { exact: true })
      .first()
      .locator("xpath=ancestor::*[contains(., 'Pending') or contains(., 'Loss') or contains(., 'Gain') or contains(., 'Match')][1]");
  }

  async lineText(name) {
    return flat(await this.line(name).innerText());
  }

  // Δ units and status of a line: { delta: "-2" | "—", status }.
  async lineState(name) {
    const m = (await this.lineText(name)).match(/(—|[+-]?\d+) (?:-?\$[\d,.]+ )?(Pending|Loss|Gain|Match)$/);
    expect(m, `line ${name}`).toBeTruthy();
    return { delta: m[1], status: m[2] };
  }

  async select(name) {
    await this.page.getByText(name, { exact: true }).first().click();
    await expect(this.panel.getByText(name, { exact: true })).toBeVisible();
  }

  async setCount(name, qty) {
    const input = this.line(name).locator("input").first();
    await input.fill(String(qty));
    await input.press("Tab");
  }

  async scan(code) {
    await this.scanInput.fill(code);
    await this.scanInput.press("Enter");
    await this.page.waitForTimeout(1000);
  }

  async addFromSearch(name) {
    await this.searchItem.fill(name);
    const result = this.page.getByText(name, { exact: true }).first();
    await expect(result).toBeVisible({ timeout: 20_000 });
    await expect(this.page.getByText("ADD FROM CATALOG", { exact: false })).toBeVisible();
    await result.click();
    await this.searchItem.fill("");
    await expect(this.line(name)).toBeVisible();
  }

  async saveDraft() {
    const saved = this.page.waitForResponse(isApi("save_counts"));
    await this.saveDraftBtn.click();
    const res = await saved;
    const body = await res.json();
    expect(body.status, JSON.stringify(body).slice(0, 300)).toBe(true);
    return { body, request: res.request() };
  }

  // Sends the count's save_counts items as JSON.
  static sentItems(request) {
    const m = (request.postData() || "").match(/name="items"\r?\n\r?\n([^\r\n]*)/);
    return m ? JSON.parse(m[1]) : [];
  }

  async openPostDialog() {
    await this.postBtn.click();
    await expect(this.postDialog).toBeVisible();
    return flat(await this.postDialog.innerText());
  }

  async confirmPost({ ok = true } = {}) {
    const posted = this.page.waitForResponse(isApi("post_stocktake_adjustment"));
    await this.postDialog.getByRole("button", { name: "Post adjustments" }).click();
    const body = await (await posted).json();
    expect(body.status, JSON.stringify(body).slice(0, 300)).toBe(ok);
    return body;
  }

  async openVoidDialog() {
    await this.voidBtn.click();
    await expect(this.voidDialog).toBeVisible();
    return flat(await this.voidDialog.innerText());
  }

  async confirmVoid() {
    const voided = this.page.waitForResponse(isApi("void_stocktake"));
    await this.voidDialog.getByRole("button", { name: "Void count" }).click();
    const body = await (await voided).json();
    expect(body.status, JSON.stringify(body).slice(0, 300)).toBe(true);
    return body;
  }

  // ---- Variance review ----

  async openVarianceReview() {
    await this.varianceTab.click();
    await expect(this.page.getByText("Discrepancy report", { exact: true })).toBeVisible();
  }

  // Net units, Shrink, Overage, Match rate cards.
  async varianceCards() {
    const m = (await this.detailText()).match(
      /NET UNITS ([+-]?\d+) .*?SHRINK (\d+) .*?OVERAGE (\d+) .*?MATCH RATE (\d+)%/i,
    );
    expect(m, "variance cards").toBeTruthy();
    const [net, shrink, overage, matchRate] = m.slice(1).map(Number);
    return { net, shrink, overage, matchRate };
  }

  reasonRow(name) {
    return this.page
      .locator("div")
      .filter({ has: this.page.getByText(name, { exact: true }) })
      .filter({ has: this.page.getByRole("button", { name: new RegExp(`Choose reason|${REASONS.map((r) => r.replace(/[()/]/g, "\\$&")).join("|")}`) }) })
      .last();
  }

  async openReasons(name) {
    await this.reasonRow(name).getByRole("button").last().click();
  }

  async setReason(name, reason) {
    await this.openReasons(name);
    await this.page.getByText(reason, { exact: true }).last().click();
    await expect(this.reasonRow(name)).toContainText(reason);
  }

  // Loss attribution rows as text, e.g. "Unassigned 4 u 2 items".
  async lossAttribution() {
    const text = await this.detailText();
    return text.slice(text.indexOf("Loss attribution"));
  }

  // Clicks an export button and returns { name, csv }.
  async download(button) {
    const download = this.page.waitForEvent("download");
    await button.click();
    const file = await download;
    const filePath = await file.path();
    const fs = await import("fs");
    return { name: file.suggestedFilename(), csv: fs.readFileSync(filePath, "utf8") };
  }
}
