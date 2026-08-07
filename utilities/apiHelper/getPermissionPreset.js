import { expect } from "@playwright/test";

async function waitForPresetResponses(page, clickAction) {
  const presetPromise = page.waitForResponse(
    (res) =>
      res.request().method() === "POST" &&
      res.url().includes("permission/get_permission_preset_by_id"),
    { timeout: 30_000 },
  );
  // permission_list often fires only on first open, not every role switch
  const listPromise = page
    .waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes("Store_setting_react_api/permission_list"),
      { timeout: 5_000 },
    )
    .catch(() => null);

  const [response] = await Promise.all([presetPromise, clickAction()]);
  await listPromise;

  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);
  return response.json();
}

export async function getPreset(page, managerole, role) {
  const editingCurrentRole = page.getByText(
    new RegExp(`^Editing:\\s*${role}$`, "i"),
  );

  // Edit panel stays open after save; switch roles first so APIs re-fire.
  if (await editingCurrentRole.isVisible().catch(() => false)) {
    const otherRole = role === "Manager" ? "Cashier" : "Manager";
    await waitForPresetResponses(page, () =>
      managerole.clickEditForRole(otherRole),
    );
    await expect(
      page.getByText(new RegExp(`^Editing:\\s*${otherRole}$`, "i")),
    ).toBeVisible({ timeout: 15_000 });
  }

  const responseBody = await waitForPresetResponses(page, () =>
    managerole.clickEditForRole(role),
  );

  await expect(
    page.getByText(new RegExp(`^Editing:\\s*${role}$`, "i")),
  ).toBeVisible({ timeout: 15_000 });

  return responseBody;
}
