import { expect, test } from "../fixtures";
import { formDialog, openFromMenu, openSaved, pickLink, waitForData } from "../helpers";

test("add a patient", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Patients");
  await page.getByRole("button", { name: "Add Patient" }).first().click();

  // The form slides in from the side, over the list.
  const panel = formDialog(page, "New Patient");
  await expect(panel).toBeVisible();
  await panel.getByLabel("Full Name").fill("Laila Test Patient");
  await panel.getByLabel("Phone Number").fill("0790 000 1234");
  await panel.getByLabel("Gender").selectOption("Female");
  await panel.getByLabel("Allergies").fill("Penicillin");
  await panel.getByRole("button", { name: "Save Patient" }).click();
  await expect(panel).toBeHidden();

  // The list behind has the patient at once.
  await page.getByRole("searchbox").fill("Laila Test");
  await expect(page.getByRole("link", { name: "Laila Test Patient" })).toBeVisible();

  // The message opens the new patient's page, with the allergy warning on top.
  await openSaved(page, "Laila Test Patient was added.");
  await expect(page.getByRole("heading", { name: "Laila Test Patient" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Penicillin" })).toBeVisible();
});

test("medical alerts show on the patient, the appointment and the treatment plan", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00008");
  await waitForData(page);
  const alerts = page.getByRole("alert").filter({ hasText: "Medical alerts" });
  await expect(alerts).toContainText("Allergy: Aspirin");
  await expect(alerts).toContainText("Blood thinner: warfarin");
  await expect(alerts).toContainText("Heart / blood pressure");

  // The summary: tap to call, WhatsApp, last visit, balance.
  await expect(page.getByRole("link", { name: "0781 340 9915" })).toHaveAttribute("href", "tel:07813409915");
  await expect(page.getByRole("main").getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/9647813409915");
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
  await expect(page.getByRole("heading", { name: "Shahad Qasim" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Medical alerts" })).toHaveCount(0);
});

test("the booking and treatment forms show the chosen patient's medical alerts", async ({ page }) => {
  await page.goto("/treatments/new");
  await waitForData(page);
  await expect(page.getByRole("alert").filter({ hasText: "Medical alerts" })).toHaveCount(0);
  await pickLink(page, "Patient", "Saad", "Saad Nouri");
  await expect(page.getByRole("alert").filter({ hasText: "Blood thinner" })).toBeVisible();

  await page.goto("/appointments/new?patient=PAT-2026-00002");
  await waitForData(page);
  await expect(page.getByRole("alert").filter({ hasText: "Diabetes" })).toBeVisible();
});

test("the patient list shows medical alerts and the next visit", async ({ page }) => {
  await page.goto("/patients");
  await waitForData(page);
  const saad = page.getByRole("row", { name: /Saad Nouri/ });
  await expect(saad).toContainText("Blood thinner");
  await expect(saad).toContainText("Allergy");
  await expect(saad).toContainText("Not booked");
  // Shahad Qasim is booked for tomorrow at 11:00.
  await expect(page.getByRole("row", { name: /Shahad Qasim/ })).toContainText("11:00 AM");
});

test("adding a patient who is already registered warns first", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Patients");
  await page.getByRole("button", { name: "Add Patient" }).first().click();
  const panel = formDialog(page, "New Patient");
  await panel.getByLabel("Full Name").fill("N. Hussein");
  // Zahraa Hussein's number, typed the local way without spaces.
  await panel.getByLabel("Phone Number").fill("07702345678");

  // A yellow notice (not role=alert, which is kept for red errors).
  const warning = panel.getByText("Already registered?").locator("..");
  await expect(warning).toContainText("Zahraa Hussein");
  await expect(warning).toContainText("same phone number");

  await panel.getByRole("button", { name: "Save Patient" }).click();
  const ask = page.getByRole("dialog", { name: "This phone number is already registered" });
  await expect(ask).toContainText("Zahraa Hussein");
  await ask.getByRole("button", { name: "Cancel" }).click();
  await expect(panel).toBeVisible();

  // Opening the existing record is one click away, and the panel goes with the page it was opened on.
  await warning.getByRole("link", { name: "Zahraa Hussein" }).click();
  await page.getByRole("dialog", { name: "Leave without saving?" }).getByRole("button", { name: "Leave without saving" }).click();
  await expect(page.getByRole("heading", { name: "Zahraa Hussein" })).toBeVisible();
  await expect(panel).toBeHidden();
});

test("the quick medical checklist fills the medical fields", async ({ page }) => {
  await page.goto("/patients/new");
  await page.getByRole("button", { name: "Diabetes" }).click();
  await page.getByRole("button", { name: "Takes blood thinners" }).click();
  await page.getByRole("button", { name: "Allergic to latex" }).click();
  await expect(page.getByLabel("Chronic Diseases")).toHaveValue("Diabetes");
  await expect(page.getByLabel("Current Medications")).toHaveValue("Blood thinners");
  await expect(page.getByLabel("Allergies")).toHaveValue("Latex");
  // A second tap takes it off again.
  await page.getByRole("button", { name: "Diabetes" }).click();
  await expect(page.getByLabel("Chronic Diseases")).toHaveValue("");

  await page.getByLabel("Full Name").fill("Checklist Patient");
  await page.getByLabel("Phone Number").fill("0790 999 0000");
  await page.getByRole("button", { name: "Save Patient" }).click();
  const alerts = page.getByRole("alert").filter({ hasText: "Medical alerts" });
  await expect(alerts).toContainText("Allergy: Latex");
  await expect(alerts).toContainText("Blood thinner");
});

test("the checklist recognises what is already written", async ({ page }) => {
  // Saad Nouri takes Warfarin 3mg.
  await page.goto("/patients/PAT-2026-00008/edit");
  await waitForData(page);
  const box = page.getByRole("button", { name: "Takes blood thinners" });
  await expect(box).toHaveAttribute("aria-pressed", "true");
  await expect(box).toBeDisabled();
});

test("the patient list shows who owes money, biggest balance first", async ({ page }) => {
  await page.goto("/patients");
  await waitForData(page);
  await page.getByLabel("Balance").selectOption("owing");
  await expect(page.getByText("7 records")).toBeVisible();
  const first = page.getByRole("row").nth(1);
  await expect(first).toContainText("Abbas Mahdi");
  await expect(first).toContainText("IQD 850,000");
  await expect(first.getByRole("link", { name: "Remind" })).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\/9647727714520\?text=Hello%20Abbas%20Mahdi%2C%20this%20is%20a%20friendly%20reminder/,
  );
});

test("a patient who only knows their age", async ({ page }) => {
  await page.goto("/patients/new");
  await page.getByLabel("Full Name").fill("Age Only Patient");
  await page.getByLabel("Phone Number").fill("0790 777 1234");
  await page.getByRole("button", { name: "Only know the age?" }).click();
  // exact: the Allergies hint ("...patient page") also contains "age".
  await page.getByLabel("Age", { exact: true }).fill("42");
  await page.getByRole("button", { name: "Save Patient" }).click();
  await expect(page.getByRole("heading", { name: "Age Only Patient" })).toBeVisible();
  await expect(page.getByText(/42 years/).first()).toBeVisible();
});
