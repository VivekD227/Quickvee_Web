class EmployeeManagement{
    constructor(page){
        this.page = page;
        this.manage_role = page.getByText("Manage Roles");
    }

    async manageRoleClick(){
        await this.manage_role.click();
    }
}

module.exports = { EmployeeManagement };