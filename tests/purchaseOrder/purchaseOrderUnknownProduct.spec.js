import { test, expect } from "@playwright/test";
import { PurchaseOrder } from "../../pageObjects/PurchaseOrder";
import { Products } from "../../pageObjects/Products";
import { LoginPage } from "../../pageObjects/LoginPage";
import { Dashboard } from "../../pageObjects/Dashboard";
import { navigateToLoginPage } from "../../utilities/helper/navigationHelper";
import merchants from "../../api/testData/merchants.json";
import routes from "../../utilities/routes.js";

// Adding a product that isn't in the catalog yet from the New Purchase Order
// form. An unknown code (scanned) or an unknown name (Add items search →
// "Add “…” to your catalog") opens "Product not found", which offers to
// create a new product or add a variant to an existing product; once saved
// the item goes straight onto the PO.
//
// Runs on the Test Automation store; every product it creates is deleted in
// afterAll. No PO is saved.

const newCode = () => `0${Date.now().toString().slice(-11)}`;

test.describe("Purchase Order — add an unknown product", () => {
  test.describe.configure({ mode: "serial", timeout: 150_000 });

  let context;
  let page;
  let dashboard;
  let po;
  let products;
  let variantBase;
  const created = [];

  const productDialog = () =>
    page.getByRole("dialog").filter({ hasText: "Creating a product for this purchase order." });
  const variantDialog = () => page.getByRole("dialog").filter({ hasText: "Add as a variant" });

  // Saves the product form opened over the PO; returns the add_product body.
  async function saveProductOnPo(product) {
    const addPromise = page.waitForResponse(
      (res) => res.request().method() === "POST" && products.isAddProductUrl(res.url()),
      { timeout: 20_000 },
    );
    const byUpcPromise = page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url().includes("new_purchase_order_product_by_upc"),
      { timeout: 20_000 },
    );
    await products.saveProductClick();
    const addResponse = await addPromise;
    expect(addResponse.status(), "add_product").toBe(200);
    created.push(product.name);
    expect((await byUpcPromise).status(), "new_purchase_order_product_by_upc").toBe(200);
    await expect(po.toast(`Created ${product.name} and added it to the purchase order.`)).toBeVisible({
      timeout: 10_000,
    });
    await expect(productDialog()).toBeHidden();
    await expect(page).toHaveURL(/\/purchase-order\/add/);
  }

  test.beforeAll(
    async ({ browser }) => {
      test.setTimeout(90_000);
      context = await browser.newContext();
      page = await context.newPage();
      dashboard = new Dashboard(page);
      po = new PurchaseOrder(page);
      products = new Products(page);
      await navigateToLoginPage(page);
      await new LoginPage(page).login(
        merchants.merchantLogin.storename,
        merchants.merchantLogin.username,
        merchants.merchantLogin.password,
      );
      await dashboard.logoDisplayed();
      await dashboard.menuClick();
      await dashboard.inventoryClick();
    },
    { timeout: 90_000 },
  );

  test.afterAll(async () => {
    test.setTimeout(300_000);
    if (page) {
      // Leaving a filled PO form asks "Leave page?"; accept it.
      page.on("dialog", (dialog) => dialog.accept().catch(() => {}));
      try {
        await page.goto(routes.page_URL.products);
        await products.verifyProductsPageLoaded();
        for (const name of created) {
          await products.searchListing(name);
          await products.waitForCatalogIdle();
          if ((await products.productRows.filter({ hasText: name }).count()) > 0) {
            await products.deleteProductFromRowActions(name);
          }
        }
      } catch (error) {
        console.log(`Cleanup: ${error.message}`);
      }
    }
    await context?.close();
  });

  test("Create a product with two variants", async () => {
    await dashboard.productsClick();
    await products.verifyProductsPageLoaded();
    variantBase = {
      name: `AutoPO VarBase ${Date.now()}`,
      cost: "5.00",
      price: "10.00",
      attributes: [{ values: ["V1", "V2"] }],
    };
    await products.reopenAddVariantsProductForm();
    await products.addVariantProductWithRequiredFields(variantBase);
    created.push(variantBase.name);
  });

  test("Unknown UPC: Create a new product adds it to the PO", async () => {
    await po.gotoList();
    await po.openNewForm();
    const code = newCode();
    await po.scanCode(code);
    await expect(po.notFoundDialog).toContainText(`No product found for “${code}”`, { timeout: 10_000 });
    await expect(po.notFoundDialog).toContainText("Add it to your catalog, and it goes straight onto this purchase order.");
    await po.notFoundDialog.getByRole("button", { name: /^Create a new product/ }).click();

    await expect(productDialog()).toContainText("Save it and it is added to the order", { timeout: 15_000 });
    await expect(page.getByPlaceholder("Scan or enter UPC")).toHaveValue(code);
    const product = { name: `AutoPO Unknown ${Date.now()}`, upc: code };
    await products.fillProductName(product.name, { assertAvailable: false });
    await products.selectCategory("Quickadd");
    await products.fillCost("2.50");
    await products.fillPrice("6.00");
    await saveProductOnPo(product);

    // On the PO with an empty quantity and the product's cost.
    await expect(po.lineRow(product.name)).toBeVisible();
    await expect(po.lineQty(product.name)).toHaveValue("");
    await expect(po.lineCost(product.name)).toHaveValue("2.50");

    // The code is known now: scanning it again neither opens "Product not
    // found" nor adds a second line.
    await po.scanCode(code);
    await page.waitForTimeout(1_500);
    await expect(po.notFoundDialog).toBeHidden();
    await expect(page.getByText(product.name, { exact: true })).toHaveCount(1);
    await po.discardNewForm();
  });

  test("Unknown name in Add items: Add to your catalog creates it with that name", async () => {
    await po.openNewForm();
    const name = `AutoPO Catalog ${Date.now()}`;
    await po.addItemsBtn.click();
    await expect(po.addItemsDialog).toBeVisible();
    await po.addItemsSearch.fill(name);
    await expect(po.addItemsDialog).toContainText("No products match.", { timeout: 15_000 });
    await po.addItemsDialog.getByRole("button", { name: `Add “${name}” to your catalog` }).click();

    await expect(po.notFoundDialog).toContainText(`No product found for “${name}”`, { timeout: 10_000 });
    await po.notFoundDialog.getByRole("button", { name: /^Create a new product/ }).click();
    await expect(productDialog()).toBeVisible({ timeout: 15_000 });
    // The name is taken from the search; there is no UPC yet.
    await expect(products.productNameInput).toHaveValue(name);
    await expect(page.getByPlaceholder("Scan or enter UPC")).toHaveValue("");
    const product = { name };
    await products.selectCategory("Quickadd");
    await products.fillCost("1.75");
    await products.fillPrice("4.00");
    product.upc = await products.generateUpc();
    await saveProductOnPo(product);

    await expect(po.lineRow(name)).toBeVisible();
    await expect(po.lineQty(name)).toHaveValue("");
    await expect(po.lineCost(name)).toHaveValue("1.75");
    await po.discardNewForm();
  });

  test("Scanning an unknown name offers to create it too", async () => {
    await po.openNewForm();
    const name = `NoSuchProduct${Date.now()}`;
    await po.scanCode(name);
    await expect(po.notFoundDialog).toContainText(`No product found for “${name}”`, { timeout: 10_000 });
    await po.notFoundDialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(po.notFoundDialog).toBeHidden();
    await expect(po.noProductsYet).toBeVisible();
  });

  test("Unknown UPC: Add as a variant of an existing product adds the variant to the PO", async () => {
    const code = newCode();
    await po.scanCode(code);
    await expect(po.notFoundDialog).toBeVisible({ timeout: 10_000 });
    await po.notFoundDialog.getByRole("button", { name: /^Add as a variant/ }).click();

    const dialog = variantDialog();
    await expect(dialog).toContainText("Choose the product this item is a variant of.");
    await dialog.getByRole("textbox").first().fill(variantBase.name);
    await dialog.getByRole("button", { name: variantBase.name, exact: true }).click();

    await expect(dialog).toContainText(`New variant of ${variantBase.name}`);
    await expect(dialog.getByRole("textbox", { name: "Barcode" })).toHaveValue(code);
    const size = dialog.getByRole("combobox");
    await size.fill("V3");
    const option = page.getByRole("option", { name: /V3/ }).first();
    if (await option.isVisible({ timeout: 2_000 }).catch(() => false)) await option.click();
    else await size.press("Enter");
    const [cost, price, qty] = [1, 2, 3].map((i) => dialog.getByRole("textbox").nth(i));
    await po.typeInto(cost, "300");
    await po.typeInto(price, "700");
    await qty.fill("4");

    const addPromise = page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url().includes("new_purchase_order_product_by_upc"),
      { timeout: 20_000 },
    );
    await dialog.getByRole("button", { name: "Add variant" }).click();
    expect((await addPromise).status(), "new_purchase_order_product_by_upc").toBe(200);
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    const line = `${variantBase.name} / V3`;
    await expect(po.lineRow(line)).toBeVisible({ timeout: 10_000 });
    await expect(po.lineQty(line)).toHaveValue("");
    await expect(po.lineCost(line)).toHaveValue("3.00");

    // The new variant is on the product with the stock entered.
    const stock = await po.getVariantStock(variantBase.name, ["V3"]);
    expect(stock.V3).toBe(4);
  });
});
