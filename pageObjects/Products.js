const { expect } = require("@playwright/test");

class Products {
    constructor(page) {
        this.page = page;
        this.productText = page.getByText("Products").nth(1);
        this.massBtn = page.getByRole("button", { name: "Mass Update" });
        this.addProductBtn =
    }
}