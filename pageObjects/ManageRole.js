class ManageRole{
    constructor(page){
        this.page = page;
        this.manageemptext = page.getByText("Manage Employee Roles");
        this.createText = page.getByText("Create and customize roles with specific permissions");
        this.closeModuleBtn = page.locator(".quic-btn-cancle");
    }
}

module.exports = { ManageRole };