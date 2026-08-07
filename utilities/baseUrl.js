/**
 * Switch environment by commenting one block and uncommenting the other.
 *
 * LIVE active  → comment the QA block below
 * QA active    → comment the LIVE block below and uncomment QA
 */

// ----- LIVE -----
// const webBaseUrl = "https://quickvee.com";
// const apiCiBaseUrl = "https://api-ci.quickvee.us";
// const apiNodeBaseUrl = "https://api-node.quickvee.us";
// const reportBaseUrl = "https://reports-api.quickvee.us";
// ----- QA -----
const webBaseUrl = "https://quickvee-qa.com";
const apiCiBaseUrl = "https://api-ci.quickvee-qa.com";
const apiNodeBaseUrl = "https://qa-api-node.quickvee.us";
const reportBaseUrl = "https://reports-api-qa.quickvee.us";

module.exports = { webBaseUrl, apiCiBaseUrl, apiNodeBaseUrl, reportBaseUrl };
