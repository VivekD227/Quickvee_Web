import { test, expect } from "@playwright/test";
import { Products } from "../../pageObjects/Products";
import { ProductStocktake } from "../../pageObjects/ProductStocktake";
import { StockControlStocktake, REASONS } from "../../pageObjects/StockControlStocktake";
import { Categories } from "../../pageObjects/Categories";
import { Vendor } from "../../pageObjects/Vendor";
import { Dashboard } from "../../pageObjects/Dashboard";
import { LoginPage } from "../../pageObjects/LoginPage";
import { navigateToLoginPage } from "../../utilities/helper/navigationHelper";
import merchants from "../../api/testData/merchants.json";
import routes from "../../utilities/routes.js";

// Stock Control → Stocktake (counts). Runs on the Test Automation store only,
// with a category, a vendor and products each run creates (deleted in
// afterAll):
//   A (stock 10, cost 10.00) and B (stock 5, cost 4.00) — walkaround count,
//   C (stock 6, cost 3.00) and V (variants V1 / V2, stock 0, cost 5.00) in the
//   test category — category count; the vendor is on A and C — vendor count.
// The walkaround, category and vendor counts end posted or voided
// (in-progress counts can't be voided). The ad-hoc count picks random store
// products and can't be posted without changing one of them (a post needs a
// difference, and extra items can't be added), so each run leaves one ad-hoc
// count In progress.
// Test plan: Stock_Control_Stocktake_Test_Plan_and_TestCases.xlsx (STC-nnn).

const NO_RECEIPT = "Counted values will not be posted to inventory";

test.describe("Stock Control → Stocktake", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  let context;
  let page;
  let products;
  let st;
  let dashboard;
  const stamp = Date.now();
  const category = `AutoSTCCat${stamp}`;
  let vendorName;
  const A = { name: `AutoSTC A ${stamp}`, cost: "10.00", price: "20.00", quantity: "10" };
  const B = { name: `AutoSTC B ${stamp}`, cost: "4.00", price: "8.00", quantity: "5" };
  const C = { name: `AutoSTC C ${stamp}`, cost: "3.00", price: "6.00", quantity: "6", category };
  const V = { name: `AutoSTC V ${stamp}`, cost: "5.00", price: "10.00", category, attributes: [{ values: ["V1", "V2"] }] };
  const V1 = `${V.name} - V1`;
  const V2 = `${V.name} - V2`;
  const createdProducts = [];
  let categoryCreated = false;
  let vendorCreated = false;

  const walk = { name: `AutoSTC Walk ${stamp}` };
  const cat = { name: `AutoSTC Category ${stamp}` };
  const ven = { name: `AutoSTC Vendor ${stamp}` };
  const adhoc = { name: `AutoSTC Adhoc ${stamp}` };
  let cardsBeforePost;

  // The Stocktake dialog of a single product, from its edit page (the listing
  // shows "Low · 4" instead of "4 in stock" for low stock, and its row
  // actions menu sometimes doesn't open).
  async function productStocktake(product) {
    await page.goto(routes.page_URL.products);
    await products.verifyProductsPageLoaded();
    await products.openEditSingleProduct(product.name);
    const stocktake = new ProductStocktake(page, products);
    await stocktake.openFromEdit();
    return stocktake;
  }

  async function onHand(product) {
    const stocktake = await productStocktake(product);
    const quantity = await stocktake.currentOnHand();
    await stocktake.close();
    return quantity;
  }

  // Changes the stock outside the count (a product stocktake).
  async function setStock(product, quantity) {
    const stocktake = await productStocktake(product);
    await stocktake.fill(0, quantity);
    await stocktake.submit();
  }

  // Serial: don't run with --retries (a retry would create the products again).
  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(180_000);
      // The server dates counts in UTC; a UTC browser keeps "today" in step.
      context = await browser.newContext({ timezoneId: "UTC", acceptDownloads: true });
      page = await context.newPage();
      products = new Products(page);
      st = new StockControlStocktake(page);
      dashboard = new Dashboard(page);
      await navigateToLoginPage(page);
      await new LoginPage(page).login(
        merchants.merchantLogin.storename,
        merchants.merchantLogin.username,
        merchants.merchantLogin.password,
      );
      await page.waitForURL(/\/merchants\/dashboard/, { timeout: 150_000 });
      // The dashboard keeps loading for a while; navigating away at once can hang.
      await page.waitForTimeout(5_000);
    },
    { timeout: 180_000 },
  );

  test.afterAll(async () => {
    test.setTimeout(400_000);
    if (!page) return;
    page.on("dialog", (dialog) => dialog.accept().catch(() => {}));
    try {
      await page.goto(routes.page_URL.products);
      await products.verifyProductsPageLoaded();
      for (const name of createdProducts) {
        await products.searchListing(name);
        await products.waitForCatalogIdle();
        if ((await products.productRows.filter({ hasText: name }).count()) > 0) {
          await products.deleteProductFromRowActions(name);
        }
      }
    } catch (error) {
      console.log(`Cleanup products: ${error.message}`);
    }
    try {
      if (categoryCreated) await new Categories(page).cleanupCategories([category]);
    } catch (error) {
      console.log(`Cleanup category: ${error.message}`);
    }
    try {
      if (vendorCreated) {
        await page.goto(routes.page_URL.categories);
        await dashboard.vendorsClick();
        await new Vendor(page).deleteVendorAndVerifyRemoved(vendorName);
      }
    } catch (error) {
      console.log(`Cleanup vendor: ${error.message}`);
    }
    await context?.close();
  });

  test("Create the test category, vendor and products", async () => {
    test.setTimeout(600_000);
    await dashboard.menuClick();
    await dashboard.inventoryClick();
    await dashboard.categoriesClick();
    const categories = new Categories(page);
    await categories.selectAlphabeticalMode();
    await categories.addCategory(category);
    categoryCreated = true;

    await dashboard.vendorsClick();
    const vendor = new Vendor(page);
    vendorName = vendor.generateUniqueVendorName();
    await vendor.createVendorWithRequiredFieldsOnly(vendorName);
    vendorCreated = true;

    await page.goto(routes.page_URL.products);
    await products.verifyProductsPageLoaded();
    for (const product of [A, B, C]) {
      await products.reopenAddSingleProductForm();
      await products.addProductWithQuantity(product);
      createdProducts.push(product.name);
    }
    await products.reopenAddVariantsProductForm();
    await products.addVariantProductWithRequiredFields(V);
    createdProducts.push(V.name);

    for (const product of [A, C]) {
      await page.goto(routes.page_URL.products);
      await products.verifyProductsPageLoaded();
      await products.changeProductVendors({ product, add: [vendorName] });
    }
  });

  // ---------- List and New count ----------

  test("STC-001/002/008: List page shows the cards, status tabs and columns", async () => {
    await st.open();
    await expect(page.getByText("Count physical inventory, review variance, post adjustments")).toBeVisible();
    for (const label of ["ACTIVE COUNTS", "PENDING REVIEW", "SHRINK (30D)", "OVERAGE (30D)"]) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
    }
    await expect(st.searchCounts).toBeVisible();
    const columns = ["COUNT", "SCOPE", "COUNTER", "CREATED", "UPDATED", "STATUS", "PROGRESS", "VARIANCE", "$ VARIANCE"];
    const text = await st.bodyText();
    for (const column of columns) expect(text, column).toMatch(new RegExp(`^${column.replace("$", "\\$")}$`, "mi"));

    const tabs = await st.tabCounts();
    expect(tabs.all).toBe(tabs.inProgress + tabs.ready + tabs.posted + tabs.void);
    const cards = await st.cards();
    expect(cards.active).toBe(tabs.inProgress);
    expect(cards.pending).toBe(tabs.ready);
  });

  test("STC-011/012/014: New count dialog, scope options and Cancel", async () => {
    await st.open();
    const { all } = await st.tabCounts();
    await st.openNewCount();
    const dialog = st.newDialogTitle.locator("xpath=ancestor::*[.//button[normalize-space()='Start counting']][1]");
    await expect(dialog).toContainText("Pick a scope.");
    for (const scope of ["Walkaround", "Category", "Vendor", "Ad-hoc"]) {
      await expect(dialog.getByText(scope, { exact: true }).first()).toBeVisible();
    }
    await expect(dialog).toContainText("How walkaround works");
    await expect(dialog).toContainText("Items not added to this count are not changed.");
    await expect(st.nameInput).toHaveAttribute("placeholder", "e.g. Footwear cycle count — May");

    await st.chooseScope("Category");
    await expect(dialog.getByText("Select a category")).toBeVisible();
    await st.chooseScope("Vendor");
    await expect(dialog.getByText("Select a vendor")).toBeVisible();
    await st.chooseScope("Ad-hoc");
    await expect(dialog).toContainText("We'll pick this many random products to count.");
    for (const size of ["5", "10", "15", "25", "50"]) {
      await expect(dialog.getByRole("button", { name: size, exact: true })).toBeVisible();
    }

    let created = 0;
    const count = (res) => {
      if (res.url().endsWith("/StocktakeNewUI/create_stocktake")) created++;
    };
    page.on("response", count);
    await st.nameInput.fill("AutoSTC cancelled");
    await st.cancelBtn.click();
    await expect(st.newDialogTitle).toBeHidden();
    await st.open();
    page.off("response", count);
    expect(created).toBe(0);
    expect((await st.tabCounts()).all).toBe(all);
  });

  // ---------- Walkaround ----------

  test("STC-013: Start a walkaround count", async () => {
    await st.open();
    Object.assign(walk, await st.startCount({ name: walk.name }));
    expect(walk.st).toMatch(/^ST\d+$/);
    expect(await st.status(walk.name)).toBe("In progress");
    const text = await st.detailText();
    expect(text).toContain(`${walk.st} · Walkaround · Admin`);
    expect(text).toContain("No items added yet");
    expect(text).toContain("Scan a barcode or use the search above to add items as you walk the floor.");
    expect(await st.counters()).toEqual({ loss: 0, gain: 0, match: 0, pending: 0 });
  });

  test("STC-020/021/023: Add items by search and by scan; unknown UPC is refused", async () => {
    await st.scan("000000000000");
    await expect(page.getByText("No product found for this UPC or code")).toBeVisible();

    await st.addFromSearch(A.name);
    expect(await st.lineState(A.name)).toEqual({ delta: "—", status: "Pending" });
    await st.scan(B.upc);
    await expect(st.line(B.name)).toBeVisible();
    expect(await st.lineState(B.name)).toEqual({ delta: "—", status: "Pending" });
    expect(await st.detailText()).toContain("2 items added");
    expect(await st.counters()).toMatchObject({ pending: 2 });
  });

  test("STC-022: Scanning an added item again adds 1 each time", async () => {
    // The first scan only adds the line (by design).
    await st.scan(B.upc);
    await st.select(B.name);
    await expect(st.panelCounted).toHaveValue("2");
    await st.scan(B.upc);
    await expect(st.panelCounted).toHaveValue("3");
  });

  test("STC-024: Remove item", async () => {
    await st.scan(C.upc);
    await expect(st.line(C.name)).toBeVisible();
    await st.select(C.name);
    await st.removeBtn.click();
    await expect(page.getByText("Item removed.").first()).toBeVisible();
    await expect(page.getByText(C.name, { exact: true })).toHaveCount(0);
    expect(await st.detailText()).toContain("2 items added");
  });

  test("STC-025/026/027: Count with the row input, side panel and quick set", async () => {
    await st.setCount(A.name, 8);
    expect(await st.lineState(A.name)).toEqual({ delta: "-2", status: "Loss" });

    await st.select(B.name);
    await st.panel.getByRole("button", { name: "5", exact: true }).click();
    await expect(st.panelCounted).toHaveValue("5");
    expect(await st.lineState(B.name)).toEqual({ delta: "0", status: "Match" });
    await st.panelPlus.click();
    await st.panelPlus.click();
    await st.panelMinus.click();
    await st.panelPlus.click();
    await expect(st.panelCounted).toHaveValue("7");
    expect(await st.lineState(B.name)).toEqual({ delta: "+2", status: "Gain" });
    expect(await st.counters()).toEqual({ loss: 2, gain: 2, match: 0, pending: 0 });
  });

  test("STC-037: Leaving with unsaved counts asks to stay or save", async () => {
    await st.backBtn.click();
    await expect(st.unsavedTitle).toBeVisible();
    await expect(page.getByText("You have unsaved counted quantities.", { exact: false })).toBeVisible();
    const dialog = st.unsavedTitle.locator("xpath=ancestor::*[.//button[normalize-space()='Stay and keep editing']][1]");
    await expect(dialog.getByRole("button", { name: "Save as Draft" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /leave|discard/i })).toHaveCount(0);
    await st.stayBtn.click();
    await expect(st.unsavedTitle).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`/stocktake-app/${walk.id}$`));
    expect(await st.lineState(A.name)).toEqual({ delta: "-2", status: "Loss" });
  });

  test("STC-035: Save as Draft with every line counted makes the count Ready to post", async () => {
    const { body, request } = await st.saveDraft();
    const items = StockControlStocktake.sentItems(request);
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ product_name: A.name, expected_qty: 10, counted_qty: 8, discrepancy: -2, discrepancy_cost: -20 }),
        expect.objectContaining({ product_name: B.name, expected_qty: 5, counted_qty: 7, discrepancy: 2, discrepancy_cost: 8 }),
      ]),
    );
    expect(body.message).toBe("Counts saved successfully");
    expect(body.header).toMatchObject({ counted_items: "2", pending_count: "0", status: "3" });
    // The header label changes after a reload (by design).
    await st.openCount(walk.id);
    expect(await st.status(walk.name)).toBe("Ready to post");
  });

  test("STC-010: A Ready to post count shows no variance in the list", async () => {
    await st.open();
    await st.searchList(walk.st);
    const row = await st.listRowText(walk.st);
    expect(row).toContain("Ready to post");
    expect(row).toMatch(/2 counted — —/);
  });

  test("STC-063: Changing a Ready to post count; Clear count", async () => {
    await st.openCount(walk.id);
    await st.setCount(B.name, 6);
    await st.saveDraft();
    await st.openCount(walk.id);
    expect(await st.status(walk.name)).toBe("Ready to post");
    expect(await st.lineState(B.name)).toEqual({ delta: "+1", status: "Gain" });

    // Clear count removes the saved line's count on the server at once.
    await st.select(B.name);
    await st.clearBtn.click();
    await expect(page.getByText("Stocktake item removed successfully").first()).toBeVisible();
    expect(await st.lineState(B.name)).toEqual({ delta: "—", status: "Pending" });
    await st.openCount(walk.id);
    expect(await st.lineState(B.name)).toEqual({ delta: "—", status: "Pending" });
  });

  test("STC-067: A Ready to post count with a cleared line stays Ready to post", async () => {
    // By design (as per the user, 25 Nov 2026): with A still counted and B
    // cleared (Pending), the count stays "Ready to post" after Save as Draft.
    await st.openCount(walk.id);
    await st.saveDraft();
    await st.openCount(walk.id);
    expect(await st.counters()).toMatchObject({ pending: 1 });
    expect(await st.status(walk.name)).toBe("Ready to post");
  });

  test("STC-063: Counting the cleared line again", async () => {
    await st.openCount(walk.id);
    await st.setCount(B.name, 7);
    await st.saveDraft();
    await st.openCount(walk.id);
    expect(await st.status(walk.name)).toBe("Ready to post");
    expect(await st.lineState(B.name)).toEqual({ delta: "+2", status: "Gain" });
  });

  test("STC-039/040/041: Variance review cards, reasons and loss attribution", async () => {
    await st.openCount(walk.id);
    await st.openVarianceReview();
    expect(await st.varianceCards()).toEqual({ net: 0, shrink: 2, overage: 2, matchRate: 0 });
    expect(await st.detailText()).toContain("2 items with variance · sorted by units");
    expect(await st.lossAttribution()).toMatch(/Unassigned 4 u 2 items/);

    await st.openReasons(A.name);
    for (const reason of REASONS) await expect(page.getByText(reason, { exact: true }).last()).toBeVisible();
    await page.getByText("Damage", { exact: true }).last().click();
    await expect(st.reasonRow(A.name)).toContainText("Damage");
    await st.setReason(B.name, "Counting error");
    const attribution = await st.lossAttribution();
    expect(attribution).toMatch(/Damage 2 u 1 item/);
    expect(attribution).toMatch(/Counting error 2 u 1 item/);
  });

  test("STC-042: Export and Export CSV download the variance review", async () => {
    for (const button of [st.exportCsvBtn, st.exportBtn]) {
      const { name, csv } = await st.download(button);
      expect(name).toMatch(new RegExp(`^${walk.name.replace(/ /g, "_")}_variance_review_\\d{4}-\\d{2}-\\d{2}\\.csv$`));
      const lines = csv.trim().split(/\r?\n/);
      expect(lines[0]).toBe("Item,SKU,Expected,Counted,Variance Units,Reason,Note,Flagged For Recount");
      expect(lines).toContain(`"${A.name}","${A.upc}","10","8","-2","Damage","",""`);
      expect(lines).toContain(`"${B.name}","${B.upc}","5","7","2","Counting error","",""`);
    }
  });

  test("STC-043/048: Post dialog; Cancel posts nothing", async () => {
    await st.openCount(walk.id);
    let posts = 0;
    const count = (res) => {
      if (res.url().endsWith("/StocktakeNewUI/post_stocktake_adjustment")) posts++;
    };
    page.on("response", count);
    const text = await st.openPostDialog();
    expect(text).toContain("On-hand quantities will be overwritten with counted values. This cannot be undone.");
    expect(text).toMatch(/LOSS 2 units GAIN 2 units/i);
    expect(text).not.toContain("not yet counted");
    await st.postDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(st.postDialog).toBeHidden();
    await page.waitForTimeout(1500);
    page.off("response", count);
    expect(posts).toBe(0);
    expect(await st.status(walk.name)).toBe("Ready to post");
  });

  test("STC-044/009: Post updates the stock, the list and the 30-day cards", async () => {
    await st.open();
    cardsBeforePost = await st.cards();
    await st.openCount(walk.id);
    await st.openPostDialog();
    const body = await st.confirmPost();
    expect(body).toMatchObject({ message: "Stocktake posted successfully", posted_items: "2", adjusted_items: "2" });
    await expect(page).toHaveURL(/\/stocktake-app$/);

    await st.searchList(walk.st);
    const row = await st.listRowText(walk.st);
    expect(row).toContain("Posted");
    expect(row).toMatch(/2 counted 0 -\$12\.00/);
    const cards = await st.cards();
    expect(cards.shrink).toBeCloseTo(cardsBeforePost.shrink + 20, 2);
    expect(cards.overage).toBeCloseTo(cardsBeforePost.overage + 8, 2);

    expect(await onHand(A)).toBe(8);
    expect(await onHand(B)).toBe(7);
  });

  test("STC-049: A posted count is read only", async () => {
    await st.openCount(walk.id);
    expect(await st.status(walk.name)).toBe("Posted");
    for (const button of [st.exportBtn, st.printBtn, st.voidBtn, st.emailBtn]) await expect(button).toBeVisible();
    await expect(st.saveDraftBtn).toHaveCount(0);
    await expect(st.postBtn).toHaveCount(0);
    const text = await st.detailText();
    expect(text).toContain("LOSS 2 u / -$20.00");
    expect(text).toContain("GAIN 2 u / $8.00");
    expect(await st.lineText(A.name)).toMatch(/10 8 -2 -\$20\.00 Loss$/);
    expect(await st.lineText(B.name)).toMatch(/5 7 \+2 \$8\.00 Gain$/);
    await expect(page.getByPlaceholder("Posted — read only")).toBeDisabled();
  });

  test("STC-055/056: Print opens the browser print; Email dialog", async () => {
    await page.evaluate(() => {
      window.__printed = false;
      window.print = () => {
        window.__printed = true;
      };
    });
    await st.printBtn.click();
    await expect.poll(() => page.evaluate(() => window.__printed)).toBe(true);

    await st.emailBtn.click();
    await expect(st.emailDialog).toBeVisible();
    await expect(st.emailDialog).toContainText("Email this stocktake report to a recipient.");
    await expect(st.emailDialog.getByRole("button", { name: "Send email" })).toBeVisible();
    await st.emailDialog.getByRole("button", { name: "Skip" }).click();
    await expect(st.emailDialog).toBeHidden();
  });

  test("STC-052: Void dialog says the posted adjustments are reversed", async () => {
    // Reported 23 Nov 2026 (dialog said counted values won't be posted); fixed on live 26 Nov.
    await st.openCount(walk.id);
    const text = await st.openVoidDialog();
    await st.voidDialog.getByRole("button", { name: "Cancel" }).click();
    expect(text).toContain(`${walk.name} will be marked as void.`);
    expect(text).toContain("Adjustments will be reversed and stock will go back to the previous quantity.");
    expect(text).not.toContain(NO_RECEIPT);
  });

  test("STC-051/054/003: Void a posted count reverses the stock", async () => {
    await st.openCount(walk.id);
    await st.openVoidDialog();
    const body = await st.confirmVoid();
    expect(body).toMatchObject({ message: "Stocktake voided successfully", result: { reversed_items: "2" } });
    await st.openCount(walk.id);
    expect(await st.status(walk.name)).toBe("Void");

    await st.open();
    const request = await st.clickTab("Void");
    expect(request.postData()).toMatch(/name="status"\r?\n\r?\n2/);
    await st.searchList(walk.st);
    expect(await st.listRowText(walk.st)).toContain("Void");

    expect(await onHand(A)).toBe(10);
    expect(await onHand(B)).toBe(5);
  });

  // ---------- Category ----------

  test("STC-017/053: Category count lists the category's products and variants", async () => {
    await st.open();
    Object.assign(cat, await st.startCount({ scope: "Category", pick: category, name: cat.name }));
    expect(await st.detailText()).toContain(`${cat.st} · ${category} · Admin`);
    expect(await st.detailText()).toContain("0/3");
    for (const name of [C.name, V1, V2]) expect((await st.lineState(name)).status).toBe("Pending");
    expect(await st.counters()).toEqual({ loss: 0, gain: 0, match: 0, pending: 3 });
    // An in-progress count has no Void (by design).
    await expect(st.voidBtn).toHaveCount(0);
  });

  test("STC-029/030/034: Note, flag on an unsaved line, Save as Draft with lines pending", async () => {
    await st.select(C.name);
    await st.panelCounted.fill("4");
    await st.noteInput.fill(`note ${stamp}`);
    expect(await st.lineState(C.name)).toEqual({ delta: "-2", status: "Loss" });

    await st.select(V1);
    await st.flagBtn.click();
    await expect(page.getByText("Save as Draft this item before flagging for recount.")).toBeVisible();

    const { body, request } = await st.saveDraft();
    expect(StockControlStocktake.sentItems(request)).toEqual([
      expect.objectContaining({ product_name: C.name, counted_qty: 4, discrepancy: -2, note: `note ${stamp}` }),
    ]);
    expect(body.header).toMatchObject({ counted_items: "1", pending_count: "2" });
    await st.openCount(cat.id);
    expect(await st.status(cat.name)).toBe("In progress");
    expect(await st.detailText()).toContain("1/3");
    await st.select(C.name);
    await expect(st.noteInput).toHaveValue(`note ${stamp}`);
  });

  test("STC-031: Flag a saved line for recount", async () => {
    const flagged = page.waitForResponse((res) => res.url().endsWith("/StocktakeNewUI/update_recount_flag"));
    await st.flagBtn.click();
    const body = await (await flagged).json();
    expect(body).toMatchObject({ status: true, message: "Recount flag updated successfully", result: { recount_flag: "1" } });
    await expect(st.panel.getByRole("button", { name: "Flagged for recount" })).toBeVisible();
    expect(await st.lineText(C.name)).toContain("RECOUNT");
  });

  test("STC-066: Reason and note are kept after a reload and exported", async () => {
    await st.openVarianceReview();
    await st.setReason(C.name, "Mislocated");
    await st.countEntriesTab.click();
    const { request } = await st.saveDraft();
    expect(StockControlStocktake.sentItems(request)).toEqual([
      expect.objectContaining({ product_name: C.name, reason_id: expect.stringMatching(/^\d+$/), note: `note ${stamp}` }),
    ]);

    await st.openCount(cat.id);
    await st.select(C.name);
    await expect(st.noteInput).toHaveValue(`note ${stamp}`);
    await st.openVarianceReview();
    await expect(st.reasonRow(C.name)).toContainText("Mislocated");
    const { csv } = await st.download(st.exportCsvBtn);
    expect(csv.trim().split(/\r?\n/)).toContain(`"${C.name}","${C.upc}","6","4","-2","Mislocated","note ${stamp}","Yes"`);
    await st.countEntriesTab.click();
  });

  test("STC-033: Pending only", async () => {
    await st.pendingOnlyBtn.click();
    await expect(page.getByText(C.name, { exact: true })).toHaveCount(0);
    await expect(st.line(V1)).toBeVisible();
    await expect(st.line(V2)).toBeVisible();
    await st.pendingOnlyBtn.click();
    await expect(st.line(C.name)).toBeVisible();
  });

  test("STC-028/032: Keys set the count; Clear count", async () => {
    await st.select(V2);
    await page.keyboard.press("3");
    await page.keyboard.press("Enter");
    await expect(st.panelCounted).toHaveValue("4");
    expect(await st.lineState(V2)).toEqual({ delta: "+4", status: "Gain" });
    expect(await st.detailText()).toContain("2/3");

    // Clear count is offered on saved lines.
    await expect(st.clearBtn).toHaveCount(0);
    await st.saveDraft();
    await st.select(V2);
    await st.clearBtn.click();
    expect(await st.lineState(V2)).toEqual({ delta: "—", status: "Pending" });
    await st.select(V2);
    await page.keyboard.press("4");
    await expect(st.panelCounted).toHaveValue("4");
  });

  test("STC-045/046/050: Post with a pending line and a flagged line", async () => {
    const text = await st.openPostDialog();
    expect(text).toContain("1 item not yet counted will be skipped — their on-hand stays the same.");
    expect(text).toMatch(/LOSS 2 units GAIN 4 units/i);
    const body = await st.confirmPost();
    expect(body).toMatchObject({ posted_items: "2", adjusted_items: "2" });

    await st.openCount(cat.id);
    expect(await st.status(cat.name)).toBe("Posted");
    expect(await st.lineText(C.name)).toMatch(/6 4 -2 -\$6\.00 Loss$/);
    expect(await st.lineText(V2)).toMatch(/0 4 \+4 \$20\.00 Gain$/);

    expect(await onHand(C)).toBe(4);
    const stocktake = new ProductStocktake(page, products);
    await stocktake.openFromRow(V.name);
    expect(await stocktake.currentOnHand("V1")).toBe(0);
    expect(await stocktake.currentOnHand("V2")).toBe(4);
    await stocktake.close();
  });

  // ---------- Vendor and Ad-hoc ----------

  const NEEDS_DISCREPANCY = "At least one item must have a discrepancy to post adjustment";

  test("STC-018: Vendor count lists the vendor's products", async () => {
    await st.open();
    Object.assign(ven, await st.startCount({ scope: "Vendor", pick: vendorName, name: ven.name }));
    expect(await st.detailText()).toContain(`${ven.st} · ${vendorName} · Admin`);
    expect(await st.detailText()).toContain("0/2");
    expect(await st.lineText(A.name)).toMatch(/ 10 — Pending$/);
    expect(await st.lineText(C.name)).toMatch(/ 4 — Pending$/);
  });

  test("STC-061/064: Post is refused when every line matches; stock changed during the count", async () => {
    for (const name of [A.name, C.name]) {
      await st.select(name);
      await st.panel.getByRole("button", { name: "Match", exact: true }).click();
      expect((await st.lineState(name)).status).toBe("Match");
    }
    expect(await st.openPostDialog()).toMatch(/LOSS 0 units GAIN 0 units/i);
    const body = await st.confirmPost({ ok: false });
    expect(body.message).toBe(NEEDS_DISCREPANCY);
    await expect(page.getByText(NEEDS_DISCREPANCY).first()).toBeVisible();

    // The refused post saved nothing: after a reload only A (now 9) is
    // counted, C is skipped.
    await st.openCount(ven.id);
    await st.setCount(A.name, 9);
    await st.saveDraft();

    // STC-064: A's stock changes from 10 to 12 outside the count. The count
    // follows the live stock: expected 12, Δ -3; posting sets A to 9.
    await setStock(A, 12);
    await st.openCount(ven.id);
    expect(await st.lineText(A.name)).toMatch(/ 12 -3 Loss$/);
    expect(await st.openPostDialog()).toMatch(/LOSS 3 units GAIN 0 units/i);
    expect(await st.confirmPost()).toMatchObject({ posted_items: "1", adjusted_items: "1" });
    expect(await onHand(A)).toBe(9);
    expect(await onHand(C)).toBe(4);
    await st.openCount(ven.id);
    expect(await st.lineText(A.name)).toMatch(/12 9 -3 -\$30\.00 Loss$/);
  });

  test("STC-019/047: Ad-hoc count picks the sample size; Post needs a counted line", async () => {
    await st.open();
    Object.assign(adhoc, await st.startCount({ scope: "Ad-hoc", sample: 5, name: adhoc.name }));
    expect(adhoc.items).toHaveLength(5);
    expect(await st.detailText()).toContain("0/5");
    expect(await st.counters()).toMatchObject({ pending: 5 });

    await st.postBtn.click();
    await expect(page.getByText("Please add at least one product.")).toBeVisible();
    await expect(st.postDialog).toBeHidden();
  });

  // ---------- One product in two counts; status tabs; report ----------

  const twoX = { name: `AutoSTC Two X ${stamp}` };
  const twoY = { name: `AutoSTC Two Y ${stamp}` };

  async function listedCounts() {
    const body = await st.bodyText();
    const rows = body.slice(body.indexOf("$ VARIANCE"));
    return {
      text: rows,
      statuses: [...new Set((rows.match(/\n(In progress|Ready to post|Posted|Void)\n/g) || []).map((s) => s.trim()))],
    };
  }

  test("STC-065/003: The same product in two counts; status tabs", async () => {
    // B is 5 again after the walkaround count was voided.
    for (const [count, qty] of [[twoX, 3], [twoY, 6]]) {
      await st.open();
      Object.assign(count, await st.startCount({ name: count.name }));
      await st.scan(B.upc);
      await st.setCount(B.name, qty);
      await st.saveDraft();
    }

    await st.open();
    for (const [tab, status] of [["Ready to post", "3"], ["In progress", "1"], ["Posted", "0"], ["Void", "2"], ["All", "all"]]) {
      const request = await st.clickTab(tab);
      expect(request.postData()).toMatch(new RegExp(`name="status"\\r?\\n\\r?\\n${status}\\r?\\n`));
      await page.waitForTimeout(1000);
      const { text, statuses } = await listedCounts();
      if (tab !== "All") expect(statuses, tab).toEqual([tab]);
      const listsBoth = text.includes(twoX.st) && text.includes(twoY.st);
      expect(listsBoth, `${tab} lists ${twoX.st} and ${twoY.st}`).toBe(tab === "Ready to post" || tab === "All");
    }

    // X posts first (B 5 → 3); Y then counts against the live stock 3.
    await st.openCount(twoX.id);
    await st.openPostDialog();
    await st.confirmPost();
    expect(await onHand(B)).toBe(3);
    await st.openCount(twoY.id);
    expect(await st.lineText(B.name)).toMatch(/ 3 \+3 Gain$/);
    expect(await st.openPostDialog()).toMatch(/LOSS 0 units GAIN 3 units/i);
    await st.confirmPost();
    expect(await onHand(B)).toBe(6);
    await st.openCount(twoX.id);
    expect(await st.lineText(B.name)).toMatch(/5 3 -2 -\$8\.00 Loss$/);
    await st.openCount(twoY.id);
    expect(await st.lineText(B.name)).toMatch(/3 6 \+3 \$12\.00 Gain$/);

    // Voiding Y puts back what Y changed.
    await st.openVoidDialog();
    await st.confirmVoid();
    expect(await onHand(B)).toBe(3);
  });

  test("STC-058: Stocktake History Report lists posted and voided counts", async () => {
    const reportCall = (searchBy) =>
      page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          res.url() === routes.API_URL.stocktakeReport_URL &&
          (res.request().postData() || "").includes(`name="search_by"\r\n\r\n${searchBy}\r\n`),
        { timeout: 30_000 },
      );
    const first = reportCall("");
    await page.goto(routes.page_URL.stocktakeHistoryReport);
    expect((await (await first).json()).status).toBeTruthy();
    const search = page.getByPlaceholder("Search Stocktake by ID or Employee Name");
    const expected = [
      [twoX, { status: "completed", total_quantity: 3 }, -8, "Posted", "-$8.00"],
      [twoY, { status: "void", total_quantity: 6 }, 12, "Void", "$12.00"],
    ];
    for (const [count, fields, cost, label, money] of expected) {
      const searched = reportCall(count.st);
      await search.fill(count.st);
      await search.press("Enter");
      const body = await (await searched).json();
      const row = (body.result || []).find((r) => r.stocktake === count.st);
      expect(row, `${count.st} in the report`).toMatchObject({ id: Number(count.id), employee_name: "Admin", ...fields });
      expect(Number(row.total_discrepancy_cost)).toBe(cost);
      const shown = page.getByRole("row").filter({ hasText: count.st });
      await expect(shown).toContainText(label);
      await expect(shown).toContainText(money);
    }
  });

  // ---------- List search and filter ----------

  test("STC-005/006/007/004: Search by name and ST code, no match, scope filter", async () => {
    await st.open();
    await st.searchList(cat.name);
    expect(await st.listRowText(cat.st)).toContain("Category");
    await expect(page.getByText(walk.st, { exact: true })).toHaveCount(0);

    await st.searchList(walk.st);
    expect(await st.listRowText(walk.st)).toContain(walk.name);

    await st.searchList(`zzz-no-match-${stamp}`);
    await expect(page.getByText(/^ST\d+$/)).toHaveCount(0);

    await st.searchList(`AutoSTC`);
    await st.filterScope("Vendor");
    await expect(page.getByText(ven.st, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(cat.st, { exact: true })).toHaveCount(0);
    await expect(page.getByText(walk.st, { exact: true })).toHaveCount(0);
  });
});
