import { expect, test } from "../fixtures";
import { formDialog, navigate, openFromMenu, openSaved, today, waitForData } from "../helpers";
import { mergeActivity, recordTitle } from "../../src/lib/activity";

test("the activity log shows what was added, changed and deleted, and a deleted payment comes back", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Activity");
  await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();

  // A payment entered twice was deleted on 21 Sep; the seed also has changes to PAY-2026-00001.
  const deleted = page.getByTestId("activity-entry").filter({ hasText: "(PAY-2026-00018)" });
  await expect(deleted).toContainText("Laith Hamid deleted Payment Yousif Sattar");
  await page.getByLabel("What happened").selectOption("changed");
  const changed = page.getByTestId("activity-entry").filter({ hasText: "(PAY-2026-00001)" }).first();
  await expect(changed).toContainText("changed Payment");
  await expect(changed).toContainText("→");

  await page.getByLabel("What happened").selectOption("deleted");
  await deleted.getByRole("button", { name: /^Restore: Payment Yousif Sattar/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "is back." })).toBeVisible();
  await expect(deleted.getByText("Restored")).toBeVisible();
  await expect(deleted.getByRole("button", { name: /^Restore/ })).toHaveCount(0);

  // It is back under its own number, and counts on the plan again (25,000 + 10,000 of 50,000).
  await deleted.getByRole("link", { name: /Yousif Sattar/ }).click();
  await expect(page).toHaveURL(/\/payments\/PAY-2026-00018$/);
  await expect(page.getByRole("heading", { name: "Payment Receipt" })).toBeVisible();
  await navigate(page, "/treatments/TRT-2026-00015");
  await expect(page.getByTestId("plan-paid")).toHaveText("IQD 35,000");
});

test("a deleted expense is restored from the log", async ({ page }) => {
  await page.goto("/expenses");
  await waitForData(page);
  const row = page.getByRole("row", { name: /Generator subscription and electricity, September/ });
  await row.getByRole("button", { name: /^Delete/ }).click();
  await page.getByRole("dialog", { name: "Delete this expense?" }).getByRole("button", { name: "Delete" }).click();
  await expect(row).toHaveCount(0);

  await openFromMenu(page, "Activity");
  await page.getByLabel("Record").selectOption("Expense");
  const entry = page.getByTestId("activity-entry").filter({ hasText: "deleted Expense" }).first();
  await expect(entry).toContainText("Administrator deleted Expense Generator subscription and electricity, September");
  await entry.getByRole("button", { name: /^Restore/ }).click();
  await expect(entry.getByText("Restored")).toBeVisible();

  await openFromMenu(page, "Expenses");
  await expect(page.getByRole("row", { name: /Generator subscription and electricity, September/ })).toBeVisible();
});

test("a record cannot come back while what it belongs to is deleted", async ({ page }) => {
  // A long flow: add, book, delete twice, restore three times.
  test.slow();
  // A new patient with one appointment; delete both, then restore them in the right order.
  await page.goto("/patients");
  await waitForData(page);
  await page.getByRole("button", { name: "Add Patient" }).first().click();
  const panel = formDialog(page, "New Patient");
  await panel.getByLabel("Full Name").fill("Restore Test");
  await panel.getByLabel("Phone Number").fill("0790 123 0001");
  await panel.getByRole("button", { name: "Save Patient" }).click();
  await openSaved(page, "Restore Test was added.");

  await page.getByTestId("open-new-appointment").click();
  const booking = formDialog(page, "New Appointment");
  await booking.getByLabel("Doctor").selectOption({ label: "Dr. Noor Al-Saadi · Endodontist" });
  await booking.getByLabel("Date").fill(today());
  await booking.getByLabel("Time").fill("16:00");
  await booking.getByRole("button", { name: "Book Appointment" }).click();
  await openSaved(page, "Appointment booked.");
  await page.getByRole("button", { name: "Delete appointment" }).click();
  await page.getByRole("dialog", { name: "Delete this appointment?" }).getByRole("button", { name: "Delete Appointment" }).click();
  await expect(page).toHaveURL(/\/appointments$/);

  await openFromMenu(page, "Patients");
  await page.getByRole("searchbox").fill("Restore Test");
  await page.getByRole("link", { name: "Restore Test" }).click();
  await waitForData(page);
  await page.getByRole("button", { name: "Delete patient" }).click();
  await page.getByRole("dialog", { name: "Delete this patient?" }).getByRole("button", { name: "Delete Patient" }).click();
  await expect(page).toHaveURL(/\/patients$/);

  await openFromMenu(page, "Activity");
  await page.getByLabel("What happened").selectOption("deleted");
  const appointment = page.getByTestId("activity-entry").filter({ hasText: "deleted Appointment Restore Test" });
  const patient = page.getByTestId("activity-entry").filter({ hasText: "deleted Patient Restore Test" });
  await appointment.getByRole("button", { name: /^Restore/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: /the Patient PAT-\d{4}-\d{5} it belongs to was deleted/ })).toBeVisible();
  await patient.getByRole("button", { name: /^Restore/ }).click();
  await expect(patient.getByText("Restored")).toBeVisible();
  await appointment.getByRole("button", { name: /^Restore/ }).click();
  await expect(appointment.getByText("Restored")).toBeVisible();
});

test("only managers see the activity log", async ({ page }) => {
  await page.goto("/profile");
  await waitForData(page);
  await page.getByLabel("View the app as").selectOption({ label: "Dalia Jawad" });
  await expect(page.getByText("Clinic Receptionist").first()).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link", { name: "Activity", exact: true })).toHaveCount(0);
  await navigate(page, "/activity");
  await expect(page.getByText("You do not have access to this page")).toBeVisible();
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the activity log in Arabic", async ({ page }) => {
    await page.goto("/activity");
    await waitForData(page);
    await expect(page.getByRole("heading", { name: "سجل النشاط" })).toBeVisible();
    await expect(page.getByTestId("activity-entry").filter({ hasText: "(PAY-2026-00018)" })).toContainText("حذف");
    await expect(page.getByRole("button", { name: /^استعادة/ }).first()).toBeVisible();
  });
});

test("the log merges the three sources, newest first", () => {
  const entries = mergeActivity(
    [{ doctype: "Patient", rows: [{ name: "PAT-1", full_name: "Zahraa Hussein", owner: "a", creation: "2026-09-01 10:00:00" }] }],
    [
      { name: "VER-1", ref_doctype: "Patient", docname: "PAT-1", owner: "b", creation: "2026-09-02 10:00:00", data: JSON.stringify({ changed: [["address", "", "Basra"]] }) },
      // Only fields the server works out: nothing to show.
      { name: "VER-2", ref_doctype: "Patient", docname: "PAT-1", owner: "b", creation: "2026-09-03 10:00:00", data: JSON.stringify({ changed: [["total_paid", 0, 5]] }) },
    ],
    [{ name: "DEL-1", deleted_doctype: "Patient", deleted_name: "PAT-2", owner: "c", creation: "2026-09-04 10:00:00", data: JSON.stringify({ full_name: "Ali Kareem" }) }],
    10,
  );
  expect(entries.map((entry) => [entry.kind, entry.name, entry.title])).toEqual([
    ["deleted", "PAT-2", "Ali Kareem"],
    ["changed", "PAT-1", "Zahraa Hussein"],
    ["added", "PAT-1", "Zahraa Hussein"],
  ]);
  expect(recordTitle("Appointment", { patient_name: "Hiba Kadhim", appointment_date: "2026-09-26" })).toBe("Hiba Kadhim · 26 Sep 2026");
  expect(mergeActivity([{ doctype: "Patient", rows: [{ name: "PAT-1", owner: "a", creation: "x" }] }], [], [], 10, false)).toEqual([]);
});
