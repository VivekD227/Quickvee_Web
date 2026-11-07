import { test, expect } from "@playwright/test";
import { PurchaseOrder } from "../pageObjects/PurchaseOrder";
import { Products } from "../pageObjects/Products";
import { Vendor } from "../pageObjects/Vendor";
import { LoginPage } from "../pageObjects/LoginPage";
import { Dashboard } from "../pageObjects/Dashboard";
import { navigateToLoginPage } from "../utilities/helper/navigationHelper";
import merchants from "../api/testData/merchants.json";
import routes from "../utilities/routes.js";
import sessionDataStorage from "../utilities/helper/sessionDataStorage";

// Sorting, permissions, Print and sending the Notify Vendor email are tested
// manually. Write flows run only on the Test Automation store with data this
// run creates: POs can't be deleted once created, so Active ones are received
// or cancelled and drafts discarded.

test.describe("Purchase Order Module", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let context;
  let page;
  let dashboard;
  let po;
  let products;
  let vendor;
  let product;
  let vendorName;
  let vendorEmail;
  let stock;
  let mainPo;

  const expectStock = async (expected, message) => {
    const { quantity } = await po.getProductStock(product.name);
    expect(quantity, message).toBe(expected);
    stock = quantity;
  };

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();

      const loginpage = new LoginPage(page);
      dashboard = new Dashboard(page);
      po = new PurchaseOrder(page);
      products = new Products(page);
      vendor = new Vendor(page);

      await navigateToLoginPage(page);
      const [loginApiResponse] = await Promise.all([
        page.waitForResponse(
          (res) =>
            res.request().method() === "POST" &&
            res.url().includes(routes.API_URL.login),
        ),
        loginpage.login(
          merchants.merchantLogin.storename,
          merchants.merchantLogin.username,
          merchants.merchantLogin.password,
        ),
      ]);
      expect(loginApiResponse.status()).toBe(200);
      await dashboard.logoDisplayed();
      await dashboard.menuClick();
      await dashboard.inventoryClick();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    test.setTimeout(120_000);
    if (page && product?.upc) {
      try {
        await page.goto(routes.page_URL.products);
        await products.verifyProductsPageLoaded();
        await products.searchListing(product.name);
        await products.waitForCatalogIdle();
        if ((await products.productRows.filter({ hasText: product.name }).count()) > 0) {
          await products.deleteProductFromRowActions(product.name);
        }
      } catch (error) {
        console.log(`Cleanup: could not delete ${product.name}: ${error.message}`);
      }
    }
    await context?.close();
  });

  test("Create a test vendor and a product with a custom code", async () => {
    await dashboard.vendorsClick();
    vendorName = vendor.generateUniqueVendorName();
    vendorEmail = vendor.generateUniqueVendorEmail();
    await vendor.createVendor({ vendorName, phone: "5553334455", email: vendorEmail });

    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();
    product = {
      name: `Auto PO Product ${Date.now()}`,
      cost: "4.00",
      price: "9.00",
      customCode: `CC${Date.now().toString().slice(-8)}`,
    };
    await products.reopenAddSingleProductForm();
    await products.addSingleProductWithRequiredFieldsAndVerifyMarginProfit(product);
    await products.openEditSingleProduct(product.name);
    await products.customCodeInput.first().fill(product.customCode);
    await products.saveEditedProduct();
  });

  test.describe("List page", () => {
    test("Open Purchase Order from the Stock Control menu", async () => {
      await dashboard.purchaseOrderClick();
      await po.verifyListLoaded();
      expect(page.url()).toBe(routes.page_URL.purchaseOrders);
      await po.verifyListUI();
    });

    test("Status tab counts and KPI cards match the APIs", async () => {
      await po.verifyTabCountsMatchApi();
      await po.verifyKpisMatchApi();
    });

    test("Each status tab lists only its purchase orders", async () => {
      for (const status of ["Draft", "Active", "Partial", "Received", "Cancelled"]) {
        await po.verifyTabShowsOnly(status);
      }
      await po.selectTab("All");
    });
  });

  test.describe("New purchase order form", () => {
    test("Form defaults: generated number and disabled save buttons", async () => {
      await po.openNewForm();
      await po.verifyNewFormDefaults();
    });

    test("Order number: 20 characters, letters and digits only, unique", async () => {
      const existing = sessionDataStorage.get("po_listAPI").data[0]?.po_number;
      await po.assertTyped(po.poNumberInput, "ABCDEFGHIJKLMNOPQRSTUVWXY", "ABCDEFGHIJKLMNOPQRST");
      await po.assertTyped(po.poNumberInput, "PO-#@!/ 1", "PO1");
      if (existing) {
        await po.setPoNumber(existing);
        await expect(po.poNumberExists).toBeVisible({ timeout: 10_000 });
      }
      await po.setPoNumber(po.generatePoNumber());
      await expect(po.poNumberExists).toHaveCount(0);
    });

    test("Stock due date: days before today are disabled", async () => {
      await po.verifyPastDaysDisabled();
    });

    test("Add a product from the Add items dialog", async () => {
      await po.addProductFromDialog(product.name);
      await expect(po.lineQty(product.name)).toHaveValue("1");
      await expect(po.lineCost(product.name)).toHaveValue(product.cost);
      await po.verifySaveButtonsEnabled();
      await po.verifyTotals(1, product.cost);
    });

    test("Quantity accepts digits only, up to 6", async () => {
      const qty = po.lineQty(product.name);
      await po.assertTyped(qty, "-5", "5");
      await po.assertTyped(qty, "abc", "");
      await po.assertTyped(qty, "2.5", "25");
      await po.assertTyped(qty, "1234567890", "123456");
    });

    test("Cost is typed cents-style up to 999999.99", async () => {
      const cost = po.lineCost(product.name);
      await po.assertTyped(cost, "-3", "0.03");
      await po.assertTyped(cost, "abc", "0.00");
      await po.assertTyped(cost, "99999999", "999999.99");
      await po.assertTyped(cost, "250", "2.50");
    });

    test("Line and order totals follow quantity and cost", async () => {
      await po.setLineQty(product.name, 5);
      await po.setLineCost(product.name, "2.50");
      await po.verifyTotals(5, "12.50");
    });

    test("Quantity 0 is blocked on save", async () => {
      await po.setLineQty(product.name, 0);
      const addPromise = po.waitForApi(routes.API_URL.poAdd_URL, 4_000).catch(() => null);
      await po.saveDraftBtn.click();
      await expect(po.qtyMinError).toBeVisible({ timeout: 10_000 });
      expect(await addPromise, "PO with quantity 0 should not be saved").toBeNull();
      await expect(page).toHaveURL(/\/purchase-order\/add/);
    });

    test("Scanning a UPC adds the line and focuses its quantity", async () => {
      await po.openNewForm();
      await po.scanCode(product.upc);
      await expect(po.lineQty(product.name)).toBeFocused({ timeout: 10_000 });
      await expect(po.lineQty(product.name)).toHaveValue("");
      await po.verifyTotals(0, "0.00");
      await page.keyboard.type("3");
      await po.verifyTotals(3, "12.00");
      await po.scanCode(product.upc);
      await page.waitForTimeout(1_500);
      await expect(page.getByText(product.name, { exact: true })).toHaveCount(1);
    });

    test("Scanning the custom code adds the same product once", async () => {
      await po.openNewForm();
      await po.scanCode(product.customCode);
      await expect(po.lineQty(product.name)).toBeFocused({ timeout: 10_000 });
      await po.scanCode(product.upc);
      await page.waitForTimeout(1_500);
      await expect(page.getByText(product.name, { exact: true })).toHaveCount(1);
    });

    test("Scanning an unknown code offers to create the product", async () => {
      await po.openNewForm();
      const code = `0${Date.now().toString().slice(-11)}`;
      await po.scanCode(code);
      await expect(po.notFoundDialog).toBeVisible({ timeout: 10_000 });
      await expect(po.notFoundDialog).toContainText(`No product found for “${code}”`);
      await expect(po.notFoundDialog.getByRole("button", { name: /^Create a new product/ })).toBeVisible();
      await expect(
        po.notFoundDialog.getByRole("button", { name: /^Add as a variant of an existing product/ }),
      ).toBeVisible();
      await po.notFoundDialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(po.notFoundDialog).toBeHidden();
      await expect(po.noProductsYet).toBeVisible();
    });

    test("Cancel on a filled form asks before discarding and saves nothing", async () => {
      const number = po.generatePoNumber("AutoPOC");
      await po.setPoNumber(number);
      await po.addProductFromDialog(product.name);
      await po.cancelNewForm();
      await po.verifySearchNoMatch(number);
      await po.search("");
    });
  });

  test.describe("Draft", () => {
    test("Save as draft with vendor, due date, invoice and note", async () => {
      stock = (await po.getProductStock(product.name)).quantity;
      mainPo = {
        vendor: vendorName,
        dueDay: new Date().getDate(),
        invoice: `INV${Date.now().toString().slice(-6)}`,
        note: "Automation PO note",
        lines: [{ name: product.name, qty: 5, cost: 2.5 }],
      };
      await po.openNewForm();
      await po.fillPoForm(mainPo);
      await po.saveNewPo(mainPo, { draft: true });
      await po.verifyStatus(mainPo, "Draft");
      await po.verifyActions(
        ["Discard", "Edit", "Notify Vendor", "Print", "Create & Receive", "Create PO"],
        ["Cancel PO", "Receive units"],
      );
      await po.verifyDetailData(mainPo);
    });

    test("Draft does not change stock and is listed under Draft", async () => {
      await expectStock(stock, "Saving a draft must not change stock");
      await po.gotoList();
      await po.selectTab("Draft");
      await po.verifySearchShows(mainPo.number, [mainPo.number]);
      await po.verifyRow(mainPo, { status: "Draft" });
      await po.search("");
      await po.selectTab("All");
    });

    test("Edit draft quantity and cost", async () => {
      await po.openPo(mainPo);
      await po.startEdit();
      mainPo.lines[0].qty = 4;
      mainPo.lines[0].cost = 3;
      await po.setLineQty(product.name, 4, true);
      await po.setLineCost(product.name, "3.00", true);
      const payload = await po.saveEdit();
      expect(payload.is_draft).toBe("1");
      await po.verifyStatus(mainPo, "Draft");
      await po.verifyDetailData(mainPo);
      await expectStock(stock, "Editing a draft must not change stock");
    });

    test("Discard dialog Keep PO keeps the draft", async () => {
      await po.openPo(mainPo);
      await po.discardKeep();
      await po.verifyStatus(mainPo, "Draft");
    });

    test("Create PO from the draft makes it Active", async () => {
      await po.createPoFromDraft();
      await po.verifyStatus(mainPo, "Active");
      await po.verifyActions(
        ["Cancel PO", "Edit", "Notify Vendor", "Print", "Receive units"],
        ["Discard", "Create PO"],
      );
      await po.verifyDetailData(mainPo);
      await expectStock(stock, "Creating a PO must not change stock");
    });
  });

  test.describe("Search", () => {
    test("Search by PO number in any case, item name and vendor", async () => {
      await po.gotoList();
      // The list remembers the last status tab.
      await po.selectTab("All");
      await po.verifySearchShows(mainPo.number, [mainPo.number]);
      await po.verifySearchShows(mainPo.number.toLowerCase(), [mainPo.number]);
      await po.verifySearchShows(product.name, [mainPo.number]);
      await po.verifySearchShows(vendorName, [mainPo.number]);
      await po.verifyRow(mainPo, { status: "Active", units: `${mainPo.lines[0].qty} units` });
    });

    // Known bug (reported): the placeholder says reference is searchable but the
    // supplier invoice number finds nothing. Remove test.fail once fixed.
    test.fail("Search by supplier invoice number", async () => {
      await po.verifySearchShows(mainPo.invoice, [mainPo.number]);
    });

    test("Search with no match", async () => {
      await po.verifySearchNoMatch(`zz${Date.now()}`);
      await po.search("");
    });
  });

  test.describe("Active purchase order", () => {
    test("Notify Vendor dialog is prefilled (not sent)", async () => {
      await po.openPo(mainPo);
      await po.verifyNotifyDialog(mainPo, vendorEmail);
    });

    test("Receive dialog: limits, footer and Clear all", async () => {
      await po.openReceiveDialog();
      await po.verifyReceiveDialog(mainPo);
      const qty = po.receiveQty(product.name);
      await po.receiveDialog.getByRole("button", { name: "+" }).click();
      await po.receiveDialog.getByRole("button", { name: "+" }).click();
      await expect(qty).toHaveValue("2");
      await po.verifyReceiveFooter(2, "Partial");
      await qty.fill("99");
      await expect(qty).toHaveValue(String(mainPo.lines[0].qty));
      await po.verifyReceiveFooter(mainPo.lines[0].qty, "Received");
      await po.clearAllBtn.click();
      await expect(qty).toHaveValue("0");
      await expect(po.receiveSubmitBtn).toBeDisabled();
      await po.closeReceiveDialog();
    });

    test("Partial receive adds stock and records history", async () => {
      const payload = await po.receive(mainPo, { [product.name]: 2 }, "Automation partial");
      expect(payload.received_status).toBe("1");
      await po.verifyStatus(mainPo, "Partial");
      await po.verifyDetailData(mainPo);
      await po.verifyLatestHistory(2, "Automation partial");
      await po.verifyActions(["Cancel PO", "Edit", "Receive units"], ["Discard"]);
      await expectStock(stock + 2, "Partial receive adds the received units");
    });

    test("Receive the rest completes the PO", async () => {
      await po.openPo(mainPo);
      const left = mainPo.lines[0].qty - mainPo.lines[0].received;
      const payload = await po.receive(mainPo, { [product.name]: left });
      expect(payload.received_status).toBe("2");
      await po.verifyStatus(mainPo, "Received");
      await po.verifyDetailData(mainPo);
      await po.verifyActions(["Edit", "Print"], ["Cancel PO", "Receive units", "Notify Vendor"]);
      const { quantity, cost } = await po.getProductStock(product.name);
      expect(quantity).toBe(stock + left);
      expect(cost, "Receiving does not change the product cost").toBe(product.cost);
      stock = quantity;
    });
  });

  test.describe("Edit received purchase order", () => {
    test("Raising the ordered quantity re-opens it as Partial", async () => {
      await po.openPo(mainPo);
      await po.startEdit();
      mainPo.lines[0].qty += 1;
      await po.setLineQty(product.name, mainPo.lines[0].qty, true);
      await po.saveEdit();
      await po.verifyStatus(mainPo, "Partial");
      await po.verifyActions(["Cancel PO", "Receive units"], []);
      await po.verifyDetailData(mainPo);
      await expectStock(stock, "Editing a PO must not change stock");
    });

    test("Receiving the re-opened quantity completes it again", async () => {
      await po.openPo(mainPo);
      await po.receive(mainPo, { [product.name]: 1 });
      await po.verifyStatus(mainPo, "Received");
      await expectStock(stock + 1, "Receiving adds the re-opened unit");
    });

    test("Ordered quantity below received asks, then lowers received and stock", async () => {
      const line = mainPo.lines[0];
      const newQty = line.received - 2;
      await po.openPo(mainPo);
      await po.startEdit();
      await po.setLineQty(product.name, newQty, true);
      const payload = await po.saveEditReducingReceived();
      const item = Object.values(payload.order_items)[0];
      expect(item.required_qty).toBe(String(newQty));
      expect(item.recieved_qty).toBe(String(newQty));
      line.qty = newQty;
      line.received = newQty;
      await po.openPo(mainPo);
      await po.verifyStatus(mainPo, "Received");
      await po.verifyDetailData(mainPo);
      await expectStock(stock - 2, "Reducing received qty takes the units back out of stock");
    });

    test("Cost can be changed on a received PO without touching stock", async () => {
      await po.openPo(mainPo);
      await po.startEdit();
      mainPo.lines[0].cost = 3.5;
      await po.setLineCost(product.name, "3.50", true);
      await po.saveEdit();
      await po.verifyStatus(mainPo, "Received");
      await po.verifyDetailData(mainPo);
      const { quantity, cost } = await po.getProductStock(product.name);
      expect(quantity).toBe(stock);
      expect(cost).toBe(product.cost);
    });
  });

  test.describe("Cancel, discard and create & receive", () => {
    test("Create PO and edit it without changing stock, then cancel it", async () => {
      const cancelPo = { lines: [{ name: product.name, qty: 2, cost: 4 }] };
      await po.openNewForm();
      await po.fillPoForm(cancelPo);
      await po.saveNewPo(cancelPo, { draft: false });
      await po.verifyStatus(cancelPo, "Active");
      await expectStock(stock, "Creating a PO from the new form must not change stock");

      // Editing an active PO (nothing received yet) doesn't change stock either.
      await po.openPo(cancelPo);
      await po.startEdit();
      cancelPo.lines[0].qty = 3;
      await po.setLineQty(product.name, 3, true);
      await po.saveEdit();
      await po.verifyStatus(cancelPo, "Active");
      await po.verifyDetailData(cancelPo);
      await expectStock(stock, "Editing an active PO must not change stock");

      await po.openPo(cancelPo);
      await po.cancelPoKeep();
      await po.verifyStatus(cancelPo, "Active");
      await po.cancelPo(cancelPo);
      await po.openPo(cancelPo);
      await po.verifyStatus(cancelPo, "Cancelled");
      await po.verifyActions([], ["Edit", "Cancel PO", "Receive units", "Notify Vendor"]);
      await expectStock(stock, "Cancelling must not change stock");
    });

    test("Discard draft deletes it", async () => {
      const draftPo = { lines: [{ name: product.name, qty: 1, cost: 4 }] };
      await po.openNewForm();
      await po.fillPoForm(draftPo);
      await po.saveNewPo(draftPo, { draft: true });
      await po.discardDraft(draftPo);
      await po.gotoList();
      await po.verifySearchNoMatch(draftPo.number);
      await po.search("");
      await expectStock(stock, "Discarding a draft must not change stock");
    });

    test("Create & Receive: Go back keeps the form, confirm receives all", async () => {
      const crPo = { lines: [{ name: product.name, qty: 3, cost: 4 }] };
      await po.openNewForm();
      await po.fillPoForm(crPo);
      await po.createReceiveGoBack();
      await expect(po.lineQty(product.name)).toHaveValue("3");
      await po.openCreateReceiveDialog();
      const { payload, body } = await po.submitAndCapture(
        po.createReceiveDialog.getByRole("button", { name: "Create & Receive" }),
        routes.API_URL.poAddAndReceive_URL,
        "add_and_receive_new_purchase_order",
      );
      expect(body.status).toBeTruthy();
      expect(body.message).toBe("Purchase order created and received successfully");
      po.verifyCreatePayload(payload, crPo, { isDraft: false });
      crPo.id = String(body.po_id);
      await expect(page).toHaveURL(new RegExp(`/purchase-order/${crPo.id}$`), { timeout: 20_000 });
      crPo.lines[0].received = 3;
      await po.openPo(crPo);
      await po.verifyStatus(crPo, "Received");
      await po.verifyDetailData(crPo);
      await expectStock(stock + 3, "Create & Receive adds the ordered quantity");
    });
  });

  test("List counts and KPI cards still match the APIs", async () => {
    await po.gotoList();
    await po.verifyTabCountsMatchApi();
    await po.verifyKpisMatchApi();
  });
});
