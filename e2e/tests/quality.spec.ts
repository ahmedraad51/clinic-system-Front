import { expect, test } from "../fixtures";
import { navigate, openFromMenu, waitForData } from "../helpers";

test("leaving a form page with unsaved changes asks first", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  // The old form pages still work, and still guard what was typed.
  await navigate(page, "/patients/new");
  await page.getByLabel("Full Name").fill("Half Typed");

  // A menu link asks before throwing the typing away.
  await page.getByRole("navigation").getByRole("link", { name: "Appointments", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Leave without saving?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByLabel("Full Name")).toHaveValue("Half Typed");

  await page.getByRole("link", { name: "Cancel" }).click();
  await dialog.getByRole("button", { name: "Leave without saving" }).click();
  await expect(page).toHaveURL(/\/patients$/);
});

test("an untouched form closes without a question", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Patients");
  await page.getByRole("button", { name: "Add Patient" }).first().click();
  const panel = page.getByRole("dialog", { name: "New Patient" });
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "Cancel" }).click();
  await expect(panel).toBeHidden();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/patients$/);
});

test("keyboard users can skip the menu", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
});

test("dialogs keep the keyboard inside and give the focus back", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00003");
  await waitForData(page);
  const trigger = page.getByRole("button", { name: "Delete patient" });
  await trigger.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Delete this patient?" });
  // The safe choice has the focus first.
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  // Tab moves around inside the dialog only.
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    await expect(dialog.locator(":focus")).toHaveCount(1);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
