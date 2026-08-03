const { webBaseUrl, apiCiBaseUrl, apiNodeBaseUrl, reportBaseUrl } = require("./baseUrl");

const apiCi = (path) => `${apiCiBaseUrl}/${path}`;
const apiNode = (path) => `${apiNodeBaseUrl}/${path}`;
const page = (path) => `${webBaseUrl}${path}`;
const reportAPI = (path) => `${reportBaseUrl}/${path}`;

module.exports = {
  webBaseUrl,
  apiCiBaseUrl,
  apiNodeBaseUrl,
  reportBaseUrl,

  main_URL: {
    live_URL: page("/merchants/login"),
    QA_URL: page("/merchants/dashboard"),
  },

  API_URL: {
    login: apiCi("LoginApiReact/create_session"),
    chkMerchant: apiCi("LoginApiReact/chk_merchant"),
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
    updateVendor_URL: apiNode("Vendor_api_new/update_vendor"),
    deleteVendor_URL: apiNode("Vendor_api_new/delete_vendor"),
    getStoresManagement: apiCi("Store_setting_react_api/getManagerStores"),
    revenueDataAPI: reportAPI("api/reports/revenue_data_api"),
    totalTransaction: reportAPI("api/reports/sales_count_api"),
    customerCountAPI: reportAPI("api/reports/customer_count_api"),
    grossProfitAPI: reportAPI("api/reports/gross_profit_api"),
    avgSalesValueAPI: reportAPI("api/reports/avg_sales_value"),
    avgItemSaleAPI: reportAPI("api/reports/avg_item_sale"),
    discountAmountAPI: reportAPI("api/reports/discount_api_new"),
    discountPercentAPI: reportAPI("api/reports/discount_in_per_api_new"),
    topProductSoldAPI: reportAPI("api/reports/top_sold_products"),
    recentOrder: reportAPI("api/reports/get-recent-activity"),
    salesByHour: apiCi("Sale_summary_api/sale_by_hour_new"),
    system_access: apiCi("api/SettingsReact_api/system_access"),
    featureAnnouncement: apiCi("Feature_announcements_api/show_feature_announcements")
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
