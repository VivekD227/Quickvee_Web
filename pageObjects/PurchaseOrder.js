const { expect } = require("@playwright/test");

class PurchaseOrder {
    constructor(page) {
        this.page = page;

        this.poText = page.getByRole("heading", {
            name: "Purchase Orders",
            level: 1,
        });

        this.newPOBtn = page.getByRole("button", {
            name: "New Purchase Order",
        });

        this.trackText = page.getByText(
            "Track inbound stock from your vendors",
            { exact: true },
        );

        this.draftText = page.getByText(
            "Draft a purchase order, notify your vendor, then receive units as they arrive — partial deliveries are tracked per line item and stock is added to your on-hand counts on receive.",
            { exact: true },
        );

        this.closeDialogBtn = page.locator("button[aria-label='Dismiss']");
    }

    /** Store switcher next to New Purchase Order — name comes from stores API */
    poStoreSwitcher(storeName) {
        return this.page.getByRole("button", { name: storeName, exact: true });
    }

    async poTextVisible() {
        await expect(this.poText).toBeVisible();
    }

    async expectPOSwitchStoreVisible(storeName) {
        await expect(this.poStoreSwitcher(storeName)).toBeVisible();
    }

    async expectPOSwitchStoreHidden(storeName) {
        await expect(this.poStoreSwitcher(storeName)).toBeHidden();
    }

    async newPOBtnVisible() {
        await expect(this.newPOBtn).toBeVisible();
    }

    async newPOBtnClick() {
        await this.newPOBtn.click();
    }

    async trackVisible() {
        await expect(this.trackText).toBeVisible();
        await expect(this.draftText).toBeVisible();
        await expect(this.closeDialogBtn).toBeVisible();
    }

    async closeDialogBtnClick() {
        await this.closeDialogBtn.click();

        await expect(this.trackText).not.toBeVisible();
        await expect(this.draftText).not.toBeVisible();
    }
}

module.exports = { PurchaseOrder };
