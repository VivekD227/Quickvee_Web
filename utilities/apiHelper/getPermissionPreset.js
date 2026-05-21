import { expect } from "@playwright/test";

export async function getPreset(page, managerole, role, mid, preset_id, email) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes("permission/get_permission_preset_by_id"),
    ),
    managerole.clickEditForRole(role),
  ]);

  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);
  const responseBody = await response.json();
  return responseBody;
}
