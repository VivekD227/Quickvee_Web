import { expect } from "@playwright/test";

export async function getPreset(page, managerole, role) {
  const [response, permissionListResponse] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes("permission/get_permission_preset_by_id"),
    ),
    page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes("Store_setting_react_api/permission_list"),
    ),
    managerole.clickEditForRole(role),
    managerole.permission_PresetAPI(role),
  ]);

  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);
  const responseBody = await response.json();

  expect(permissionListResponse.ok()).toBeTruthy();
  expect(permissionListResponse.status()).toBe(200);

  return responseBody;
}
