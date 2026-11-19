import { test, expect } from "@playwright/test";
import { PurchaseOrder } from "../../pageObjects/PurchaseOrder";
import { Products } from "../../pageObjects/Products";
import { LoginPage } from "../../pageObjects/LoginPage";
import { Dashboard } from "../../pageObjects/Dashboard";
import { navigateToLoginPage } from "../../utilities/helper/navigationHelper";
import merchants from "../../api/testData/merchants.json";
import routes from "../../utilities/routes.js";

// Cancelling a received or partially received PO, with the choice to keep or
// remove the received stock, and deleting a cancelled PO. Uses two products
// each run creates (deleted in afterAll; the cancelled POs stay).

test.describe("Purchase Order — cancel received and delete", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  let context;
  let page;
  let po;
  let products;
  const stamp = Date.now();
  const A = { name: `AutoVoid A ${stamp}`, quantity: "5", cost: "2.00", price: "5.00" };
  const B = { name: `AutoVoid B ${stamp}`, quantity: "5", cost: "2.00", price: "5.00" };
  const V = {
    name: `AutoVoid Variant ${stamp}`,
    cost: "2.00",
    price: "5.00",
    attributes: [{ values: ["V1", "V2"] }],
  };
  let receivedKeep;

  const stock = async (product) => (await po.getProductStock(product.name)).quantity;

  // Creates an Active PO and receives the given quantities.
  async function receivedPo(lines, received) {
    const order = { lines };
    await po.gotoList();
    await po.openNewForm();
    await po.fillPoForm(order);
    await po.saveNewPo(order, { draft: false });
    await po.receive(order, received);
    return order;
  }

  // Returns the list's tab counts and KPIs, read on the way.
  async function verifyCancelled(order) {
    await po.openPo(order);
    await po.verifyStatus(order, "Cancelled");
    await po.verifyActions(["Delete"], ["Cancel PO", "Edit", "Receive units"]);
    await po.gotoList();
    const counts = po.listCounts();
    await po.selectTab("Cancelled");
    await po.verifySearchShows(order.number, [order.number]);
    // The list remembers its search: clear it for the next test.
    await po.search("");
    return counts;
  }

  // Counts the calls to a POST API while action runs.
  async function countCalls(url, action) {
    let calls = 0;
    const count = (req) => {
      if (req.method() === "POST" && req.url() === url) calls += 1;
    };
    page.on("request", count);
    try {
      await action();
      await page.waitForTimeout(3_000);
    } finally {
      page.off("request", count);
    }
    return calls;
  }

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();
      po = new PurchaseOrder(page);
      products = new Products(page);
      await navigateToLoginPage(page);
      await new LoginPage(page).login(
        merchants.merchantLogin.storename,
        merchants.merchantLogin.username,
        merchants.merchantLogin.password,
      );
      await new Dashboard(page).logoDisplayed();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    test.setTimeout(180_000);
    if (page) {
      page.on("dialog", (dialog) => dialog.accept().catch(() => {}));
      try {
        await page.goto(routes.page_URL.products);
        await products.verifyProductsPageLoaded();
        for (const product of [A, B, V]) {
          await products.searchListing(product.name);
          await products.waitForCatalogIdle();
          if ((await products.productRows.filter({ hasText: product.name }).count()) > 0) {
            await products.deleteProductFromRowActions(product.name);
          }
        }
      } catch (error) {
        console.log(`Cleanup: ${error.message}`);
      }
    }
    await context?.close();
  });

  test("Create the test products", async () => {
    await page.goto(routes.page_URL.products);
    await products.verifyProductsPageLoaded();
    for (const product of [A, B]) {
      await products.reopenAddSingleProductForm();
      await products.addProductWithQuantity(product);
    }
    await products.reopenAddVariantsProductForm();
    await products.addVariantProductWithRequiredFields(V);
  });

  test("A received PO offers Cancel PO with Keep received stock as the default", async () => {
    receivedKeep = await receivedPo([{ name: A.name, qty: 3, cost: 2 }], { [A.name]: 3 });
    await po.openPo(receivedKeep);
    await po.verifyStatus(receivedKeep, "Received");
    await po.verifyActions(["Cancel PO", "Edit", "Print"], ["Receive units"]);
    await po.openCancelReceivedDialog(receivedKeep);
    // Keep PO closes the dialog and changes nothing.
    await po.cancelPoDialog.getByRole("button", { name: "Keep PO" }).click();
    await expect(po.cancelPoDialog).toBeHidden();
    await po.openPo(receivedKeep);
    await po.verifyStatus(receivedKeep, "Received");
  });

  test("Cancel a received PO and keep the stock; it moves from Received to Cancelled", async () => {
    const before = await stock(A);
    await po.gotoList();
    const countsBefore = po.listCounts();
    await po.openPo(receivedKeep);
    await po.cancelReceivedPo(receivedKeep, { removeStock: false });
    const counts = await verifyCancelled(receivedKeep);
    expect(counts, "Tab counts and KPIs").toEqual({
      ...countsBefore,
      Received: countsBefore.Received - 1,
      Cancelled: countsBefore.Cancelled + 1,
    });
    expect(await stock(A), "Kept stock").toBe(before);
    await po.openPo(receivedKeep);
    await expect(page.getByText("received quantity reversed")).toHaveCount(0);
  });

  test("Cancel a received PO and remove the stock", async () => {
    const order = await receivedPo([{ name: A.name, qty: 4, cost: 2 }], { [A.name]: 4 });
    const before = await stock(A);
    await po.openPo(order);
    await po.cancelReceivedPo(order, { removeStock: true });
    await verifyCancelled(order);
    expect(await stock(A), "The 4 received units are removed").toBe(before - 4);
    await po.openPo(order);
    await expect(
      page.getByText("Purchase order voided, received quantity reversed").first(),
    ).toBeVisible();
  });

  test("Cancel a partial PO and keep the stock", async () => {
    const order = await receivedPo(
      [
        { name: A.name, qty: 2, cost: 2 },
        { name: B.name, qty: 6, cost: 2 },
      ],
      { [A.name]: 2 },
    );
    await po.openPo(order);
    await po.verifyStatus(order, "Partial");
    const before = { a: await stock(A), b: await stock(B) };
    await po.gotoList();
    const countsBefore = po.listCounts();
    await po.openPo(order);
    await po.cancelReceivedPo(order, { removeStock: false });
    const counts = await verifyCancelled(order);
    // The 6 pending units of B stop counting as incoming. A Partial PO is not
    // in "Across N purchase orders" (Active only), before or after.
    expect(counts, "Tab counts and KPIs").toEqual({
      ...countsBefore,
      Partial: countsBefore.Partial - 1,
      Cancelled: countsBefore.Cancelled + 1,
      units: countsBefore.units - 6,
    });
    expect({ a: await stock(A), b: await stock(B) }, "Kept stock").toEqual(before);
  });

  test("Cancel a partial PO and remove the stock: only the received line changes", async () => {
    const order = await receivedPo(
      [
        { name: A.name, qty: 2, cost: 2 },
        { name: B.name, qty: 6, cost: 2 },
      ],
      { [A.name]: 2 },
    );
    const before = { a: await stock(A), b: await stock(B) };
    await po.openPo(order);
    await po.cancelReceivedPo(order, { removeStock: true });
    await verifyCancelled(order);
    expect(
      { a: await stock(A), b: await stock(B) },
      "A loses its 2 received units, B (nothing received) is unchanged",
    ).toEqual({ a: before.a - 2, b: before.b });
  });

  test("Variant product: remove takes stock only from the received variant", async () => {
    const [v1, v2] = V.variantNames;
    const line1 = `${V.name} / ${v1}`;
    const line2 = `${V.name} / ${v2}`;
    const order = {
      lines: [
        { name: line1, qty: 3, cost: 2 },
        { name: line2, qty: 2, cost: 2 },
      ],
    };
    await po.gotoList();
    await po.openNewForm();
    await po.addVariantsFromDialog(V.name, V.variantNames);
    for (const line of order.lines) {
      await po.setLineQty(line.name, line.qty);
      await po.setLineCost(line.name, line.cost);
    }
    order.number = po.generatePoNumber();
    await po.setPoNumber(order.number);
    await po.saveNewPo(order, { draft: false });
    await po.receive(order, { [line1]: 3 });
    const before = await po.getVariantStock(V.name, V.variantNames);
    await po.openPo(order);
    await po.verifyStatus(order, "Partial");
    await po.cancelReceivedPo(order, { removeStock: true });
    await verifyCancelled(order);
    expect(await po.getVariantStock(V.name, V.variantNames), "Only V1 loses its 3 units").toEqual({
      [v1]: before[v1] - 3,
      [v2]: before[v2],
    });
  });

  test("Received in two receipts: remove takes out both", async () => {
    const order = await receivedPo([{ name: A.name, qty: 5, cost: 2 }], { [A.name]: 2 });
    await po.openPo(order);
    await po.receive(order, { [A.name]: 1 });
    const before = await stock(A);
    await po.openPo(order);
    await po.verifyStatus(order, "Partial");
    await po.cancelReceivedPo(order, { removeStock: true });
    await verifyCancelled(order);
    expect(await stock(A), "Both receipts (2 + 1) are removed").toBe(before - 3);
  });

  test("Received PO edited with a new line: remove takes out every received unit", async () => {
    const order = await receivedPo([{ name: A.name, qty: 2, cost: 2 }], { [A.name]: 2 });
    await po.openPo(order);
    await po.verifyStatus(order, "Received");
    await po.startEdit();
    await po.addProductFromDialog(B.name);
    await po.setLineQty(B.name, 4, true);
    await po.saveEdit();
    order.lines.push({ name: B.name, qty: 4, cost: 2 });
    await po.openPo(order);
    await po.verifyStatus(order, "Partial");
    await po.receive(order, { [B.name]: 1 });
    const before = { a: await stock(A), b: await stock(B) };
    await po.openPo(order);
    await po.cancelReceivedPo(order, { removeStock: true });
    await verifyCancelled(order);
    expect({ a: await stock(A), b: await stock(B) }, "A loses 2, B loses 1").toEqual({
      a: before.a - 2,
      b: before.b - 1,
    });
  });

  test("Cancelling an Active PO has no stock choice and leaves Delete", async () => {
    const order = { lines: [{ name: A.name, qty: 2, cost: 2 }] };
    await po.gotoList();
    await po.openNewForm();
    await po.fillPoForm(order);
    await po.saveNewPo(order, { draft: false });
    const before = await stock(A);
    await po.openPo(order);
    await po.verifyStatus(order, "Active");
    await po.cancelPoBtn.click();
    await expect(po.cancelPoDialog).toBeVisible();
    await expect(po.cancelPoDialog.getByRole("radio"), "Nothing received: no stock choice").toHaveCount(0);
    await po.cancelPoDialog.getByRole("button", { name: "Keep PO" }).click();
    await expect(po.cancelPoDialog).toBeHidden();
    await po.cancelPo(order);
    await verifyCancelled(order);
    expect(await stock(A)).toBe(before);
  });

  test("Double-clicking Cancel PO and Delete PO calls each API once", async () => {
    const order = await receivedPo([{ name: A.name, qty: 2, cost: 2 }], { [A.name]: 2 });
    await po.openPo(order);
    await po.openCancelReceivedDialog(order);
    const voids = await countCalls(routes.API_URL.poVoid_URL, async () => {
      await po.cancelPoDialog.getByRole("button", { name: "Cancel PO" }).dblclick();
      await expect(po.cancelPoDialog).toBeHidden({ timeout: 30_000 });
    });
    expect(voids, "void_new_purchase_order calls").toBe(1);
    await po.openPo(order);
    await po.verifyStatus(order, "Cancelled");
    await po.deletePoBtn.click();
    await expect(po.deletePoDialog).toBeVisible();
    const deletes = await countCalls(routes.API_URL.poDelete_URL, async () => {
      await po.deletePoDialog.getByRole("button", { name: "Delete PO" }).dblclick();
      await expect(po.deletePoDialog).toBeHidden({ timeout: 30_000 });
    });
    expect(deletes, "delete_new_purchase_order calls").toBe(1);
  });

  test("Removing stock that was already sold takes stock below 0", async () => {
    const order = await receivedPo([{ name: A.name, qty: 4, cost: 2 }], { [A.name]: 4 });
    // Bring stock down to 1 with a Stocktake, as if the units had been sold.
    await page.goto(routes.page_URL.products);
    await products.verifyProductsPageLoaded();
    await products.openEditSingleProduct(A.name);
    await products.stocktakeFromEdit(1, "PO cancel automation");
    await products.returnToProductsList();
    await po.openPo(order);
    await po.cancelReceivedPo(order, { removeStock: true });
    await verifyCancelled(order);
    expect(await stock(A), "1 in stock minus the 4 received units").toBe(-3);
  });

  test("Delete a cancelled PO: Keep PO, then Delete PO removes it from the list", async () => {
    const before = await stock(A);
    await po.openPo(receivedKeep);
    await po.deletePoKeep();
    await po.verifyStatus(receivedKeep, "Cancelled");
    await po.deletePo(receivedKeep);
    await po.gotoList();
    for (const tab of ["All", "Cancelled"]) {
      await po.selectTab(tab);
      await po.verifySearchNoMatch(receivedKeep.number);
      await po.search("");
    }
    expect(await stock(A), "Deleting doesn't change stock").toBe(before);
  });

  // Fixed on QA on 16 Nov 2026 (the number used to be offered as available).
  test("A deleted PO's number can't be used for a new PO", async () => {
    await po.gotoList();
    await po.openNewForm();
    try {
      await po.setPoNumber(receivedKeep.number);
      await expect(po.poNumberExists).toBeVisible({ timeout: 5_000 });
    } finally {
      await po.discardNewForm();
    }
  });
});
