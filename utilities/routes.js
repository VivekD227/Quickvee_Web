const { webBaseUrl, apiCiBaseUrl, apiNodeBaseUrl } = require("./baseUrl");

const apiCi = (path) => `${apiCiBaseUrl}/${path}`;
const apiNode = (path) => `${apiNodeBaseUrl}/${path}`;
const page = (path) => `${webBaseUrl}${path}`;

module.exports = {
  webBaseUrl,
  apiCiBaseUrl,
  apiNodeBaseUrl,

  main_URL: {
    live_URL: page("/merchants/login"),
    QA_URL: page("/merchants/dashboard"),
  },

  API_URL: {
    login: apiCi("LoginApiReact/create_session"),
    preset_URL: apiNode("permission/get_permission_preset_by_id"),
    main_preset_URL: apiNode("permission/get_permission_preset"),
    employeeList_URL: apiCi("Store_setting_react_api/employee_list"),
    managerStore_URL: apiCi("Store_setting_react_api/getManagerStores"),
    deleteEmployeeList_URL: apiCi(
      "Store_setting_react_api/deleted_employee_list",
    ),
    deleteEmployee_URL: apiCi("Store_setting_react_api/delete_employee"),
    addEmployee_URL: apiCi("Store_setting_react_api/addEdit_employee"),
    forverDeleteEmployee_URL: apiCi(
      "Store_setting_react_api/forever_delete_employee",
    ),
    restoreEmployee_URL: apiCi("Store_setting_react_api/restore_employee"),
    resetPasswordSend_URL: apiCi("LoginApiReact/reset_password_send"),
    brand_URL: apiCi("Product_api_react/list_brand_tag"),
    addBrandQA: apiCi("Product_api_react/add_brand_tag"),
    updateBrandQA: apiCi("Product_api_react/update_brand_tag"),
    deleteBrandQA: apiCi("Product_api_react/delete_brand_tag"),
    attributeList_URL: apiCi("Varient_react_api/varients_list"),
    addAttributeQA: apiCi("Varient_react_api/add_varient"),
    vendorList_URL: apiNode("Vendor_api_new/vendor_list"),
    addVendor_URL: apiNode("Vendor_api_new/create_vendor"),
  },

  //   QA_URL: {
  //     brand_URL: apiCi("Product_api_react/list_brand_tag"),
  //     addBrandQA: apiCi("Product_api_react/add_brand_tag"),
  //     updateBrandQA: apiCi("Product_api_react/update_brand_tag"),
  //     deleteBrandQA: apiCi("Product_api_react/delete_brand_tag"),
  //     attributeList_URL: apiCi("Varient_react_api/varients_list"),
  //     addAttributeQA: apiCi("Varient_react_api/add_varient"),
  //   },

  page_URL: {
    login: page("/merchants/login"),
    dashboard: page("/merchants/dashboard"),
    forgot_password: page("/merchants/forgot-password"),
  },
};
