import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";

test("finishing a visit saves what was done on the treatment plan", async ({ page }) => {
  // Zahraa Hussein's crown fitting with Dr. Zainab Al-Hashimi; her crown plan is In Progress.
  await page.goto("/appointments/APT-2026-00001");
  await waitForData(page);
  await page.getByRole("button", { name: "Completed", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "What was done in this visit?" });
  await expect(dialog.getByLabel("Treatment plan")).toHaveValue("TRT-2026-00002");
  await dialog.getByLabel("What was done").fill("Crown cemented, bite checked.");
  await dialog.getByRole("switch", { name: /This treatment is now finished/ }).click();
  await dialog.getByRole("button", { name: "Save Visit" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Crown marked complete" })).toBeVisible();
  await expect(dialog).toBeHidden();

  // The plan now has the session and is Completed.
  await page.getByRole("link", { name: "Zahraa Hussein" }).first().click();
  await page.getByRole("tab", { name: /Treatment Plans/ }).click();
  await page.getByRole("link", { name: "Crown", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Crown · Tooth 36" })).toBeVisible();
  await waitForData(page);
  await expect(page.getByText("Crown cemented, bite checked.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Completed", exact: true })).toBeDisabled();
});
