import { expect, test } from "@playwright/test";
import { openFromMenu } from "../helpers";

test("the front desk marks today's patients from the Today board", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Today");
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();

  // Today's two appointments, each under its doctor.
  const hana = page.locator("section").filter({ has: page.getByRole("heading", { name: "Dr. Hana Aziz" }) });
  const sarah = page.locator("section").filter({ has: page.getByRole("heading", { name: "Dr. Sarah Mansour" }) });
  await expect(hana).toContainText("Salma Ibrahim");
  await expect(sarah).toContainText("Karim Fouad");

  // One tap to confirm, one to complete.
  await sarah.getByRole("button", { name: "Confirm" }).click();
  await expect(sarah.getByText("Confirmed", { exact: true })).toBeVisible();
  await hana.getByRole("button", { name: "Completed" }).click();
  await expect(hana.getByText("Completed", { exact: true })).toBeVisible();
  await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible();

  // A mistake can be undone.
  await hana.getByRole("button", { name: "Undo" }).click();
  await expect(hana.getByRole("button", { name: "Completed" })).toBeVisible();

  // Quick payment for the patient.
  await sarah.getByRole("link", { name: "Add Payment" }).click();
  await expect(page.getByRole("heading", { name: "New Payment" })).toBeVisible();
  await expect(page.getByText("Karim Fouad").first()).toBeVisible();
});
