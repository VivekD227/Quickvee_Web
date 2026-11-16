/**
 * Environment switch: LIVE by default, QA when QV_ENV=qa
 * (e.g. `QV_ENV=qa npx playwright test ...`).
 */

const ENVIRONMENTS = {
  live: {
    webBaseUrl: "https://quickvee.com",
    apiCiBaseUrl: "https://api-ci.quickvee.us",
    apiNodeBaseUrl: "https://api-node.quickvee.us",
    reportBaseUrl: "https://reports-api.quickvee.us",
    elasticsearchBaseUrl: "https://elasticsearch.quickvee.us",
  },
  qa: {
    webBaseUrl: "https://quickvee-qa.com",
    apiCiBaseUrl: "https://api-ci.quickvee-qa.com",
    apiNodeBaseUrl: "https://qa-api-node.quickvee.us",
    reportBaseUrl: "https://reports-api-qa.quickvee.us",
    elasticsearchBaseUrl: "https://qa-elasticsearch.quickvee.us",
  },
};

const envName = (process.env.QV_ENV || "live").toLowerCase();
if (!ENVIRONMENTS[envName]) {
  throw new Error(`Unknown QV_ENV "${process.env.QV_ENV}" (use live or qa)`);
}

const {
  webBaseUrl,
  apiCiBaseUrl,
  apiNodeBaseUrl,
  reportBaseUrl,
  elasticsearchBaseUrl,
} = ENVIRONMENTS[envName];

module.exports = {
  envName,
  webBaseUrl,
  apiCiBaseUrl,
  apiNodeBaseUrl,
  reportBaseUrl,
  elasticsearchBaseUrl,
};
