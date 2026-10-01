import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";
import { doseMg, prescriptionWarnings, timesPerDay } from "../../src/lib/prescriptions";
import type { DentalMedicine } from "../../src/lib/types";

const medicine = (name: string, fields: Partial<DentalMedicine>): DentalMedicine => ({
  name,
  medicine_name: name,
  strength: "500 mg",
  is_active: 1,
  ...fields,
});

test("the safety warnings come from the patient record and the medicine flags", () => {
  const amoxicillin = medicine("Amoxicillin", { allergy_words: "penicillin, amoxicillin", child_note: "Under 12: 25 mg/kg a day in 3 doses." });
  const ibuprofen = medicine("Ibuprofen", { strength: "400 mg", is_nsaid: 1, avoid_in_pregnancy: 1, max_daily_mg: 2400 });
  const paracetamol = medicine("Paracetamol", { max_daily_mg: 4000 });
  const list = new Map([amoxicillin, ibuprofen, paracetamol].map((m) => [m.name, m]));
  const row = (name: string, dose = "", frequency = "") => ({ medicine: name, dose, frequency });

  // An allergy word in the patient's allergies.
  expect(prescriptionWarnings({ allergies: "Penicillin", age: 35 }, [row("Amoxicillin")], list)).toMatchObject([
    { kind: "allergy", severity: "high", medicine: "Amoxicillin 500 mg" },
  ]);
  // "Ibuprofen" alone does not match "penicillin", and a healthy adult gets nothing.
  expect(prescriptionWarnings({ allergies: "None", age: 35 }, [row("Ibuprofen", "400 mg", "Three times a day")], list)).toEqual([]);
  // An NSAID with a blood thinner, and a medicine to avoid in pregnancy.
  expect(prescriptionWarnings({ current_medications: "Warfarin 3mg", age: 64 }, [row("Ibuprofen")], list)).toMatchObject([
    { kind: "blood_thinner", severity: "high" },
  ]);
  expect(prescriptionWarnings({ medical_history: "Pregnant, 20 weeks", age: 29 }, [row("Ibuprofen")], list)).toMatchObject([
    { kind: "pregnancy", severity: "high" },
  ]);
  // A child gets the medicine's note (or a general one).
  const child = prescriptionWarnings({ age: 8 }, [row("Amoxicillin"), row("Paracetamol")], list);
  expect(child.map((w) => w.kind)).toEqual(["child", "child"]);
  expect(child[0].text).toContain("Under 12: 25 mg/kg");
  expect(child[1].text).toContain("Check the dose for a child");
  // Above the usual daily maximum: 1 g every 4 hours is 6,000 mg of paracetamol a day.
  expect(prescriptionWarnings({ age: 40 }, [row("Paracetamol", "1 g", "Every 4 hours")], list)).toMatchObject([
    { kind: "max_dose", severity: "medium", text: "Paracetamol 500 mg: 6000 mg a day is above the usual maximum of 4000 mg a day." },
  ]);
  // "2 tablets" of 400 mg three times a day is 2,400 mg: not above; "When needed" cannot be counted.
  expect(prescriptionWarnings({ age: 40 }, [row("Ibuprofen", "2 tablets", "Three times a day")], list)).toEqual([]);
  expect(prescriptionWarnings({ age: 40 }, [row("Paracetamol", "1 g", "When needed")], list)).toEqual([]);
  // The same medicine twice; red warnings come first.
  const both = prescriptionWarnings({ allergies: "penicillin", age: 40 }, [row("Paracetamol"), row("Paracetamol"), row("Amoxicillin")], list);
  expect(both.map((w) => w.kind)).toEqual(["allergy", "duplicate"]);

  expect(doseMg("500 mg")).toBe(500);
  expect(doseMg("1 g")).toBe(1000);
  expect(doseMg("2 tablets", "400 mg")).toBe(800);
  expect(doseMg("10 ml")).toBeNull();
  expect(doseMg("1 tablet", "0.12%")).toBeNull();
  expect(timesPerDay("Every 8 hours")).toBe(3);
  expect(timesPerDay("When needed")).toBe(0);
});

test("write a prescription from a visit, with a warning for a penicillin allergy", async ({ page }) => {
  // زهراء حسين is allergic to penicillin; her visit is with د. زينب الهاشمي.
  await page.goto("/appointments/APT-2026-00001");
  await waitForData(page);
  await page.getByRole("link", { name: "Write Prescription" }).click();
  await expect(page.getByRole("heading", { name: "New Prescription" })).toBeVisible();
  await expect(page.getByText("زهراء حسين").first()).toBeVisible();
  await expect(page.getByLabel("Doctor")).toHaveValue("DOC-00001");

  const first = page.getByRole("group", { name: "Medicine 1" });
  await first.getByLabel("Medicine").selectOption({ label: "Amoxicillin 500 mg · Capsule" });
  // The usual dose is filled in and can still be changed.
  await expect(first.getByLabel("Dose")).toHaveValue("500 mg");
  await expect(first.getByLabel("How often")).toHaveValue("Three times a day");
  await expect(first.getByLabel("Days")).toHaveValue("5");
  await expect(first.getByLabel("Instructions")).toHaveValue("بعد الأكل");
  await expect(page.getByRole("alert").filter({ hasText: "Check before signing" })).toContainText(
    'Amoxicillin 500 mg: the patient\'s allergies say "بنسلين". Choose another medicine.',
  );

  // Swap it for the usual alternative: the warning goes away.
  await first.getByLabel("Medicine").selectOption({ label: "Clindamycin 300 mg · Capsule" });
  await expect(first.getByLabel("Dose")).toHaveValue("300 mg");
  await expect(page.getByText("No warnings for this patient and these medicines.")).toBeVisible();

  await page.getByRole("button", { name: "Add medicine" }).click();
  const second = page.getByRole("group", { name: "Medicine 2" });
  await second.getByLabel("Medicine").selectOption({ label: "Paracetamol 500 mg · Tablet" });
  await second.getByLabel("Days").fill("2");
  await page.getByLabel("Notes for the patient").fill("Call the clinic if the pain does not settle in two days.");
  await page.getByRole("button", { name: "Save Prescription" }).click();

  // The printable prescription.
  await expect(page.getByRole("heading", { name: "Prescription", exact: true })).toBeVisible();
  await waitForData(page);
  await expect(page.getByText("Clindamycin 300 mg")).toBeVisible();
  await expect(page.getByText("300 mg · Four times a day · 5 days")).toBeVisible();
  await expect(page.getByText("500 mg · Every 6 hours · 2 days")).toBeVisible();
  await expect(page.getByText("Call the clinic if the pain does not settle in two days.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Print" })).toBeVisible();

  // It is listed on the visit and on the patient's Prescriptions tab.
  await page.getByRole("link", { name: "8 Sep 2026, 10:00 AM" }).click();
  await expect(page.getByRole("heading", { name: "زهراء حسين" })).toBeVisible();
  await waitForData(page);
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: "Prescriptions" }) });
  await expect(card).toContainText("Clindamycin 300 mg, Paracetamol 500 mg");
  await page.getByRole("link", { name: "زهراء حسين" }).first().click();
  await page.getByRole("tab", { name: /Prescriptions/ }).click();
  await expect(page.getByRole("row").filter({ hasText: "Clindamycin 300 mg, Paracetamol 500 mg" })).toBeVisible();
});

test("a warning also shows on a saved prescription, and the medicine list can be changed", async ({ page }) => {
  // سعد نوري takes warfarin: an NSAID on his prescription is flagged when the page opens.
  await page.goto("/prescriptions/new?patient=PAT-2026-00008&doctor=DOC-00004");
  await waitForData(page);
  const first = page.getByRole("group", { name: "Medicine 1" });
  await first.getByLabel("Medicine").selectOption({ label: "Ibuprofen 400 mg · Tablet" });
  await expect(page.getByRole("alert").filter({ hasText: "Check before signing" })).toContainText("takes a blood thinner");
  await page.getByRole("button", { name: "Save Prescription" }).click();
  await expect(page.getByRole("heading", { name: "Prescription", exact: true })).toBeVisible();
  await waitForData(page);
  await expect(page.getByRole("alert").filter({ hasText: "Check before signing" })).toContainText("Ibuprofen 400 mg is an NSAID");

  // A manager keeps the list: add a medicine and it is offered on the next prescription.
  await page.goto("/medicines");
  await waitForData(page);
  await page.getByRole("button", { name: "Add Medicine" }).click();
  const dialog = page.getByRole("dialog", { name: "Add Medicine" });
  await dialog.getByLabel("Name").fill("Benzydamine");
  await dialog.getByLabel("Strength").fill("0.15%");
  await dialog.getByLabel("Form").selectOption("Mouthwash");
  await dialog.getByLabel("Group").selectOption("Mouthwash");
  await dialog.getByRole("textbox", { name: "Dose", exact: true }).fill("15 ml");
  await dialog.getByLabel("How often").selectOption("Three times a day");
  await dialog.getByLabel("Days").fill("5");
  await dialog.getByRole("button", { name: "Add Medicine" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Benzydamine was added." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Benzydamine 0.15%" })).toBeVisible();
});
