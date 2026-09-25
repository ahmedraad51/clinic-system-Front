import { expect, test } from "@playwright/test";
import { openFromMenu, waitForData } from "../helpers";

test("add a patient", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Patients");
  await page.getByRole("link", { name: "Add Patient" }).first().click();

  await expect(page.getByRole("heading", { name: "New Patient" })).toBeVisible();
  await page.getByLabel("Full Name").fill("Laila Test Patient");
  await page.getByLabel("Phone Number").fill("+20 100 000 1234");
  await page.getByLabel("Gender").selectOption("Female");
  await page.getByLabel("Allergies").fill("Penicillin");
  await page.getByRole("button", { name: "Save Patient" }).click();

  // The new patient's page opens, with the allergy warning on top.
  await expect(page.getByRole("heading", { name: "Laila Test Patient" })).toBeVisible();
  await waitForData(page);
  await expect(page.getByRole("alert").filter({ hasText: "Penicillin" })).toBeVisible();

  // And the patient is in the list.
  await openFromMenu(page, "Patients");
  await page.getByRole("searchbox").fill("Laila Test");
  await expect(page.getByRole("link", { name: "Laila Test Patient" })).toBeVisible();
});
