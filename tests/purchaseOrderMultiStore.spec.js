import { test, expect } from "@playwright/test";
import { PurchaseOrder } from "../pageObjects/PurchaseOrder";
import { Products } from "../pageObjects/Products";
import { LoginPage } from "../pageObjects/LoginPage";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import routes from "../utilities/routes.js";
import sessionDataStorage from "../utilities/helper/sessionDataStorage";

// Purchase orders for a merchant with more than one store: the list's store
// filter, the New PO "Location" and "Copy purchase order to other stores",
// and stock landing only in the PO's store.
//
// Runs on the user's two test stores (same login, store chosen by the login
// "Store Name"). Credentials come from the environment only:
//   QV_MS_USER, QV_MS_PASS
// Each run creates its own products in both stores (same UPC) and deletes
// them in afterAll; open POs it creates are cancelled there.

const ASH = { name: "Ash Rum", city: "San Ramon, CA", id: "VIV271990CA", login: "ash" };
const CHAIN = { name: "Chain Smoker", city: "Banta, AZ", id: "VIV102927MA", login: "chain" };
const STORE_NAMES = [ASH.name, CHAIN.name];

const tabAll = () => Number(sessionDataStorage.get("po_tabCountsAPI").total_count.all_po_count);
const kpi = () => {
  const data = sessionDataStorage.get("po_kpiAPI").data;
  return {
    open: Number(data.open_po_count),
    units: Number(data.total_units),
    overdue: Number(data.due_po_count),
  };
};

async function login(browser, store) {
  const context = await browser.newContext();
  const page = await context.newPage();
  // Some pages never fire "load"; don't let a navigation hang the run.
  page.setDefaultNavigationTimeout(60_000);
  page.setDefaultTimeout(30_000);
  await navigateToLoginPage(page);
  await new LoginPage(page).login(store.login, process.env.QV_MS_USER, process.env.QV_MS_PASS);
  await page.waitForURL(/\/merchants\/dashboard/, { timeout: 60_000 });
  // The dashboard keeps loading for a while; navigating away at once can hang.
  await page.waitForTimeout(5_000);
  return { context, page };
}

test.describe("Purchase Order — multi-store", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });
  test.skip(
    !process.env.QV_MS_USER || !process.env.QV_MS_PASS,
    "Set QV_MS_USER and QV_MS_PASS for the multi-store login",
  );

  let ash; // { context, page } logged in to Ash Rum (header store)
  let chain; // logged in to Chain Smoker, used for its products
  let page;
  let po;
  let shared1;
  let shared2;
  let ashOnly;
  const counts = {};
  const toCancel = [];

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(150_000);
    ash = await login(browser, ASH);
    chain = await login(browser, CHAIN);
    page = ash.page;
    po = new PurchaseOrder(page);
  });

  test.afterAll(async () => {
    test.setTimeout(300_000);
    if (page) {
      for (const open of toCancel) {
        try {
          await po.openPoFromList(open, STORE_NAMES);
          await po.cancelPo(open);
        } catch (error) {
          console.log(`Cleanup ${open.number}: ${error.message}`);
        }
      }
    }
    const remove = [
      [ash, [shared1, shared2, ashOnly]],
      [chain, [shared1, shared2]],
    ];
    for (const [session, list] of remove) {
      if (!session) continue;
      try {
        const products = new Products(session.page);
        await session.page.goto(routes.page_URL.products);
        await products.verifyProductsPageLoaded();
        for (const product of list.filter((p) => p?.upc)) {
          await products.searchListing(product.name);
          await products.waitForCatalogIdle();
          if ((await products.productRows.filter({ hasText: product.name }).count()) > 0) {
            await products.deleteProductFromRowActions(product.name);
          }
        }
      } catch (error) {
        console.log(`Cleanup products: ${error.message}`);
      }
    }
    await ash?.context.close();
    await chain?.context.close();
  });

  test("Create the same two products in both stores and one only in Ash Rum", async () => {
    const stamp = Date.now();
    shared1 = { name: `Auto MS One ${stamp}`, cost: "4.00", price: "9.00", chainCost: "6.00" };
    shared2 = { name: `Auto MS Two ${stamp}`, cost: "5.00", price: "10.00", chainCost: "7.00" };
    ashOnly = { name: `Auto MS AshOnly ${stamp}`, cost: "3.00", price: "6.00" };

    const ashProducts = new Products(page);
    await page.goto(routes.page_URL.products);
    await ashProducts.verifyProductsPageLoaded();
    for (const product of [shared1, shared2, ashOnly]) {
      await ashProducts.reopenAddSingleProductForm();
      await ashProducts.addSingleProductWithRequiredFieldsAndVerifyMarginProfit(product);
    }

    const chainProducts = new Products(chain.page);
    await chain.page.goto(routes.page_URL.products);
    await chainProducts.verifyProductsPageLoaded();
    for (const product of [shared1, shared2]) {
      await chainProducts.reopenAddSingleProductForm();
      await chainProducts.addProductWithSpecialNameAndUpc({
        name: product.name,
        upc: product.upc,
        cost: product.chainCost,
        price: String((Number(product.chainCost) * 2).toFixed(2)),
      });
    }
  });

  test.describe("List store filter", () => {
    test("Defaults to the header store", async () => {
      await po.gotoList();
      await expect(po.storeFilterBtn).toHaveText(ASH.name);
      await po.verifyRowLocations([ASH.name]);
      await po.verifyTabCountsMatchApi();
      await po.verifyKpisMatchApi();
      counts.ash = { all: tabAll(), kpi: kpi() };
    });

    test("Lists the merchant's stores and searches them", async () => {
      await po.openStoreFilter();
      for (const name of ["All Stores", ...STORE_NAMES]) {
        await expect(po.storeFilterOption(name)).toBeVisible();
      }
      // "Ash Rum" is also the header store's name; count only the visible ones.
      const visibleAsh = () =>
        page.getByText(ASH.name, { exact: true }).locator("visible=true").count();
      const ashShown = await visibleAsh();
      await po.storeFilterSearch.fill("chain");
      await expect(po.storeFilterOption(CHAIN.name)).toBeVisible();
      await expect.poll(visibleAsh).toBe(ashShown - 1);
      await po.storeFilterSearch.fill("zzz");
      await expect(page.getByText("No options found")).toBeVisible();
      await po.storeFilterSearch.fill("");
      await expect.poll(visibleAsh).toBe(ashShown);
      await po.closeStoreFilter();
    });

    test("Both stores: both merchant ids are sent and the counts add up", async () => {
      const ids = await po.toggleStoreFilter(CHAIN.name);
      expect(ids).toEqual([ASH.id, CHAIN.id].sort());
      await po.closeStoreFilter();
      await expect(po.storeFilterBtn).toHaveText("All Stores");
      await po.verifyTabCountsMatchApi();
      await po.verifyKpisMatchApi();
      await po.verifyRowLocations(STORE_NAMES);
      counts.both = { all: tabAll(), kpi: kpi() };
    });

    test("Only Chain Smoker: only its purchase orders", async () => {
      const ids = await po.toggleStoreFilter(ASH.name);
      expect(ids).toEqual([CHAIN.id]);
      await po.closeStoreFilter();
      await expect(po.storeFilterBtn).toHaveText(CHAIN.name);
      await po.verifyRowLocations([CHAIN.name]);
      await po.verifyTabCountsMatchApi();
      await po.verifyKpisMatchApi();
      counts.chain = { all: tabAll(), kpi: kpi() };
      expect(counts.ash.all + counts.chain.all, "All tab: Ash Rum + Chain Smoker").toBe(counts.both.all);
      for (const key of ["open", "units", "overdue"]) {
        expect(counts.ash.kpi[key] + counts.chain.kpi[key], `KPI ${key}`).toBe(counts.both.kpi[key]);
      }
    });

    // Intended (confirmed): the filter falls back to the header store. No new
    // list call is made; the header store's rows are shown again.
    test("Unticking the last store goes back to the header store", async () => {
      await po.openStoreFilter();
      await po.storeFilterOption(CHAIN.name).click();
      await po.closeStoreFilter();
      await expect(po.storeFilterBtn).toHaveText(ASH.name);
      await expect(po.tab("All")).toHaveAccessibleName(`All ${counts.ash.all}`);
      await po.verifyRowLocations([ASH.name]);
    });

    test("All Stores selects every store and is remembered after a reload", async () => {
      // Both stores were loaded before, so this one is shown from memory.
      await po.toggleStoreFilter("All Stores");
      await po.closeStoreFilter();
      await expect(po.storeFilterBtn).toHaveText("All Stores");
      await expect(po.tab("All")).toHaveAccessibleName(`All ${counts.both.all}`);
      await po.verifyRowLocations(STORE_NAMES);
      const listPromise = po.waitForApi(routes.API_URL.poList_URL);
      await page.reload();
      const request = (await listPromise).request();
      expect(po.parseFormData(request.postData()).merchant_id.split(",").sort()).toEqual(
        [ASH.id, CHAIN.id].sort(),
      );
      await expect(po.storeFilterBtn).toHaveText("All Stores");
    });
  });

  test.describe("New PO form: Location", () => {
    test("Location defaults to the header store and lists every store", async () => {
      await po.openNewForm();
      await po.verifyLocation(ASH);
      await po.locationBtn.click();
      await expect(po.locationOption(ASH)).toBeVisible();
      await expect(po.locationOption(CHAIN)).toBeVisible();
      await po.locationSearch.fill("chain");
      await expect(po.locationOption(CHAIN)).toBeVisible();
      await expect(po.locationOption(ASH)).toHaveCount(0);
      await page.keyboard.press("Escape");
      await po.verifyLocation(ASH);
    });

    test("Switching Location loads that store's vendors, PO number and products", async () => {
      const ashNumber = await po.openNewForm();
      const vendorsPromise = page.waitForRequest(
        (req) =>
          req.url().endsWith("/new_purchase_orders_vendor_list") &&
          po.parseFormData(req.postData()).merchant_id === CHAIN.id,
        { timeout: 15_000 },
      );
      const number = await po.selectLocation(CHAIN);
      await vendorsPromise;
      expect(number.po_number, "Chain Smoker has its own PO numbers").not.toBe(ashNumber);

      const productsPromise = page.waitForRequest(
        (req) =>
          req.url().includes("/new_purchase_orders_product_list") &&
          po.parseFormData(req.postData()).merchant_id === CHAIN.id,
        { timeout: 15_000 },
      );
      await po.addItemsBtn.click();
      await productsPromise;
      await po.addItemsSearch.fill(shared1.name);
      await expect(
        po.addItemsDialog.getByRole("button", { name: new RegExp(shared1.name) }).first(),
      ).toContainText(`${shared1.upc} · Qty: 0`, { timeout: 15_000 });
      await page.keyboard.press("Escape");
    });

    test("Copy to other stores lists every store except the Location", async () => {
      await po.openNewForm();
      const options = await po.openCopyStores();
      expect(options[0]).toBe("Select All");
      expect(options).toContain(CHAIN.name);
      expect(options).not.toContain(ASH.name);
      await page.keyboard.press("Escape");
      await page
        .getByText("Copy purchase order to other stores")
        .locator("xpath=following::*[name()='svg'][1]")
        .hover();
      await expect(page.getByText("The purchase order will be copied to the selected stores.")).toBeVisible();

      // Choosing the copy target as the Location drops it from the copy list.
      await po.selectCopyStore(CHAIN.name);
      expect(await po.copyStoresText()).toContain(CHAIN.name);
      await po.selectLocation(CHAIN);
      expect(await po.copyStoresText()).not.toContain(CHAIN.name);
      const after = await po.openCopyStores();
      expect(after).toContain(ASH.name);
      expect(after).not.toContain(CHAIN.name);
      await page.keyboard.press("Escape");
    });

    test("Change location keeps the products the new store has", async () => {
      await po.openNewForm();
      for (const product of [shared1, shared2, ashOnly]) await po.addProductFromDialog(product.name);
      await po.setLineCost(shared1.name, 7.77);

      // Keep products: nothing changes.
      await po.locationBtn.click();
      await po.locationOption(CHAIN).click();
      await expect(po.changeLocationDialog).toContainText(
        "Products that are in the new location's inventory will stay on this purchase order. " +
          "A cost you edited stays as entered. A cost you did not edit is updated from the new store. " +
          "Products that are not in that store will be removed.",
      );
      await po.changeLocationDialog.getByRole("button", { name: "Keep products" }).click();
      await expect(po.changeLocationDialog).toBeHidden();
      await po.verifyLocation(ASH);
      await po.verifyTotals(3, "15.77");

      // Change location: products are matched by UPC in the new store.
      const byUpc = page.waitForRequest(
        (req) =>
          req.url().endsWith("/new_purchase_order_product_by_upc") &&
          po.parseFormData(req.postData()).merchant_id === CHAIN.id,
        { timeout: 15_000 },
      );
      await po.selectLocation(CHAIN, { onLines: "change" });
      await byUpc;
      await expect(po.lineCost(shared1.name), "edited cost stays").toHaveValue("7.77");
      await expect(po.lineCost(shared2.name), "cost from Chain Smoker").toHaveValue(shared2.chainCost);
      await expect(page.getByText(ashOnly.name, { exact: true }), "not in Chain Smoker").toHaveCount(0);
      await po.verifyTotals(2, "14.77");
    });

    test("A product only in the other store can't be added", async () => {
      // The form is still at Chain Smoker.
      await po.addItemsBtn.click();
      await po.addItemsSearch.fill(ashOnly.name);
      await expect(po.addItemsDialog.getByText("No products match.")).toBeVisible({ timeout: 15_000 });
      await page.keyboard.press("Escape");
      await expect(po.addItemsDialog).toBeHidden();
      await po.scanCode(ashOnly.upc);
      await expect(po.notFoundDialog).toBeVisible({ timeout: 10_000 });
      await page.keyboard.press("Escape");
    });
  });

  test.describe("Purchase orders at another store", () => {
    let chainPo;

    test("Create a PO at Chain Smoker while the header store is Ash Rum", async () => {
      await po.gotoList();
      await po.filterStores(STORE_NAMES, [CHAIN.name]);
      counts.chainBefore = kpi();
      await po.filterStores(STORE_NAMES, [ASH.name]);
      counts.ashBefore = kpi();

      chainPo = { lines: [{ name: shared1.name, qty: 5, cost: 6 }] };
      await po.openNewForm();
      await po.selectLocation(CHAIN);
      await po.fillPoForm(chainPo);
      const payload = await po.saveNewPo(chainPo, { draft: false });
      toCancel.push(chainPo);
      expect(payload.merchant_id).toBe(CHAIN.id);
      expect(payload.order_for).toBe(CHAIN.id);
      expect(payload.deliver_to).toBe(CHAIN.id);
      expect(payload.stores).toBe("");
      await po.verifyStatus(chainPo, "Active");
      await po.verifyDetailData(chainPo);
      await expect(page.locator("body")).toContainText(
        new RegExp(`Location\\s*${CHAIN.name} · ${CHAIN.city}`),
      );
    });

    test("The PO is listed and counted under Chain Smoker only", async () => {
      await po.gotoList();
      await po.filterStores(STORE_NAMES, [CHAIN.name]);
      expect(kpi().open, "Chain Smoker open POs").toBe(counts.chainBefore.open + 1);
      expect(kpi().units, "Chain Smoker units incoming").toBe(counts.chainBefore.units + 5);
      await po.selectTab("All");
      await po.verifySearchShows(chainPo.number, [chainPo.number]);
      await expect(po.row(chainPo.number)).toContainText(`Location: ${CHAIN.name}`);
      await po.search("");

      await po.filterStores(STORE_NAMES, [ASH.name]);
      expect(kpi(), "Ash Rum KPIs don't change").toEqual(counts.ashBefore);
      await po.verifySearchNoMatch(chainPo.number);
      await po.search("");
    });

    test("Receiving adds stock at Chain Smoker only", async () => {
      const ashBefore = (await po.getProductStock(shared1.name)).quantity;
      const chainBefore = (await po.getProductStock(shared1.name, CHAIN)).quantity;
      const { merchantId } = await po.openPoFromList(chainPo, STORE_NAMES);
      expect(merchantId, "details are read from Chain Smoker").toBe(CHAIN.id);
      const payload = await po.receive(chainPo, { [shared1.name]: 2 });
      expect(payload.merchant_id).toBe(CHAIN.id);
      await po.verifyStatus(chainPo, "Partial");
      expect((await po.getProductStock(shared1.name, CHAIN)).quantity).toBe(chainBefore + 2);
      expect((await po.getProductStock(shared1.name)).quantity, "Ash Rum stock").toBe(ashBefore);
    });

    test("Create & Receive at Chain Smoker adds stock there only", async () => {
      const ashBefore = (await po.getProductStock(shared2.name)).quantity;
      const chainBefore = (await po.getProductStock(shared2.name, CHAIN)).quantity;
      const crPo = { lines: [{ name: shared2.name, qty: 3, cost: 7 }] };
      await po.openNewForm();
      await po.selectLocation(CHAIN);
      await po.fillPoForm(crPo);
      await po.openCreateReceiveDialog();
      const { payload, body } = await po.submitAndCapture(
        po.createReceiveDialog.getByRole("button", { name: "Create & Receive" }),
        routes.API_URL.poAddAndReceive_URL,
        "add_and_receive_new_purchase_order",
      );
      expect(body.message).toBe("Purchase order created and received successfully");
      expect(payload.merchant_id).toBe(CHAIN.id);
      expect(payload.deliver_to).toBe(CHAIN.id);
      await expect(page).toHaveURL(new RegExp(`/purchase-order/${body.po_id}$`), { timeout: 20_000 });
      await expect(po.backBtn).toBeVisible({ timeout: 20_000 });
      expect((await po.getProductStock(shared2.name, CHAIN)).quantity).toBe(chainBefore + 3);
      expect((await po.getProductStock(shared2.name)).quantity, "Ash Rum stock").toBe(ashBefore);
    });

    test("A draft keeps its Location", async () => {
      const draftPo = { lines: [{ name: shared1.name, qty: 1, cost: 6 }] };
      await po.openNewForm();
      await po.selectLocation(CHAIN);
      await po.fillPoForm(draftPo);
      const payload = await po.saveNewPo(draftPo, { draft: true });
      expect(payload.merchant_id).toBe(CHAIN.id);
      await po.openPoFromList(draftPo, STORE_NAMES);
      await po.verifyStatus(draftPo, "Draft");
      await expect(page.locator("body")).toContainText(`${CHAIN.name} · ${CHAIN.city}`);
      await po.discardDraft(draftPo);
    });

    test("Editing a PO doesn't allow changing its Location", async () => {
      await po.openPoFromList(chainPo, STORE_NAMES);
      await po.startEdit();
      await expect(po.locationBtn).toHaveCount(0);
      await expect(po.copyStoresInput).toHaveCount(0);
      await expect(page.locator("body")).toContainText(`${CHAIN.name} · ${CHAIN.city}`);
      await page.getByRole("button", { name: "Cancel", exact: true }).first().click();
      await expect(po.saveChangesBtn).toBeHidden();
    });

    test("Copy to other stores creates the PO at each chosen store", async () => {
      const copyPo = { lines: [{ name: shared2.name, qty: 2, cost: 7 }] };
      await po.openNewForm();
      await po.selectLocation(CHAIN);
      await po.fillPoForm(copyPo);
      await po.selectCopyStore(ASH.name);
      const payload = await po.saveNewPo(copyPo, { draft: false });
      toCancel.push(copyPo);
      expect(payload.merchant_id).toBe(CHAIN.id);
      expect(payload.stores).toBe(ASH.id);

      // The copy gets Ash Rum's next PO number, so find it by the product.
      await po.gotoList();
      await po.filterStores(STORE_NAMES, [ASH.name]);
      await po.selectTab("All");
      await po.search(shared2.name);
      await expect(po.rows).toHaveCount(1, { timeout: 15_000 });
      const row = po.rows.first();
      await expect(row).toContainText(`Location: ${ASH.name}`);
      await expect(row).toContainText("Active");
      await expect(row).toContainText("1 line");
      await expect(row).toContainText("2 units");
      const copy = { number: (await row.innerText()).split("\n")[0].trim(), lines: copyPo.lines };
      expect(copy.number, "the copy has its own number").not.toBe(copyPo.number);
      const detailsPromise = po.waitForApi(routes.API_URL.poDetails_URL);
      await row.click();
      const details = await po.readApi(await detailsPromise, "details");
      copy.id = String(details.po_data.po_id ?? page.url().match(/(\d+)$/)[1]);
      toCancel.push(copy);
      const item = details.po_items_data[0];
      expect(details.po_items_data).toHaveLength(1);
      expect(item.product_title).toBe(shared2.name);
      expect(Number(item.ordered_qty)).toBe(2);
      // Confirmed as intended: the copy keeps the PO's cost (Chain Smoker's
      // 7.00), not Ash Rum's product cost (5.00).
      expect(Number(item.unit_cost), "copy keeps the source cost").toBe(copyPo.lines[0].cost);
    });

    test("The same PO number can be used at another store, not twice in one", async () => {
      await po.openNewForm();
      await po.setPoNumber(chainPo.number);
      await expect(po.poNumberExists, "free at Ash Rum").toHaveCount(0);
      // A typed number is kept when the Location changes.
      await po.selectLocation(CHAIN, { typedNumber: true });
      await po.setPoNumber(`${chainPo.number}1`);
      await po.setPoNumber(chainPo.number);
      await expect(po.poNumberExists, "taken at Chain Smoker").toBeVisible({ timeout: 10_000 });
    });
  });
});
