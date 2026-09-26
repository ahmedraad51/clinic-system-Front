import { expect, test } from "@playwright/test";
import { openFromMenu, pickLink, waitForData } from "../helpers";

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

test("medical alerts show on the patient, the appointment and the treatment plan", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00008");
  await waitForData(page);
  const alerts = page.getByRole("alert").filter({ hasText: "Medical alerts" });
  await expect(alerts).toContainText("Allergy: Aspirin");
  await expect(alerts).toContainText("Blood thinner: warfarin");
  await expect(alerts).toContainText("Heart / blood pressure");

  // The summary: tap to call, WhatsApp, last visit, balance.
  await expect(page.getByRole("link", { name: "+20 122 340 9915" })).toHaveAttribute("href", "tel:+201223409915");
  await expect(page.getByRole("main").getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/201223409915");
  await expect(page.getByText("Last visit")).toBeVisible();
  await expect(page.getByText("Wisdom tooth extraction").first()).toBeVisible();

  // The same band on a treatment plan for this patient.
  await page.getByRole("tab", { name: /Treatment Plans/ }).click();
  await page.getByRole("link", { name: "Crown" }).click();
  await expect(page.getByRole("heading", { name: "Crown · Tooth 37" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Blood thinner" })).toBeVisible();
});

test("a healthy patient shows no medical alert", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00007");
  await waitForData(page);
  await expect(page.getByRole("heading", { name: "Dina Rashad" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Medical alerts" })).toHaveCount(0);
});

test("the booking and treatment forms show the chosen patient's medical alerts", async ({ page }) => {
  await page.goto("/treatments/new");
  await waitForData(page);
  await expect(page.getByRole("alert").filter({ hasText: "Medical alerts" })).toHaveCount(0);
  await pickLink(page, "Patient", "Amir", "Amir Zaki");
  await expect(page.getByRole("alert").filter({ hasText: "Blood thinner" })).toBeVisible();

  await page.goto("/appointments/new?patient=PAT-2026-00002");
  await waitForData(page);
  await expect(page.getByRole("alert").filter({ hasText: "Diabetes" })).toBeVisible();
});
