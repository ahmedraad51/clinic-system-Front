import { expect, test } from "@playwright/test";
import { openFromMenu, waitForData } from "../helpers";

test("leaving a form with unsaved changes asks first", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Patients");
  await page.getByRole("link", { name: "Add Patient" }).first().click();
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

test("an untouched form leaves without a question", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Patients");
  await page.getByRole("link", { name: "Add Patient" }).first().click();
  await expect(page.getByRole("heading", { name: "New Patient" })).toBeVisible();
  await page.getByRole("link", { name: "Cancel" }).click();
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
