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
  // Salma has no open treatment plan, so the visit dialog only offers to start one; skip it.
  await page.getByRole("dialog", { name: "What was done in this visit?" }).getByRole("button", { name: "Skip" }).click();
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

test("past appointments without an outcome are listed to be closed", async ({ page }) => {
  await page.goto("/today");
  const earlier = page.locator("section").filter({ has: page.getByRole("heading", { name: /Earlier, still open/ }) });
  // In the dummy data five September appointments were never marked Completed or No Show.
  await expect(earlier.getByRole("heading")).toHaveText("Earlier, still open (5)");
  const tarek = earlier.getByRole("listitem").filter({ hasText: "Tarek Hassan" });
  await tarek.getByRole("button", { name: "No show" }).click();
  await expect(earlier.getByRole("heading")).toHaveText("Earlier, still open (4)");
  await expect(earlier.getByText("Tarek Hassan")).toHaveCount(0);
});
