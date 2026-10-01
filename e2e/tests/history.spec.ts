import { expect, test } from "../fixtures";
import { navigate, waitForData } from "../helpers";
import { fieldLabel, historyValue, isShownChange, parseDocHistory, readableChanges } from "../../src/lib/history";

const money = (amount: number | string) => `IQD ${Number(amount).toLocaleString("en-US")}`;

test("Frappe's version records become readable changes", () => {
  const history = parseDocHistory(
    { owner: "dalia.jawad@dentclinic.test", creation: "2026-08-20 10:30:00.123456" },
    {
      versions: [
        { name: "V1", owner: "dalia.jawad@dentclinic.test", creation: "2026-08-20 11:04:05", data: '{"changed": [["payment_method", "Cash", "Bank Transfer"]]}' },
        { name: "V2", owner: "someone@else.test", creation: "2026-08-21 09:12:40", data: { changed: [["amount", 150000, 100000]] } },
        { name: "V3", owner: "x", creation: "2026-08-22 09:00:00", data: "not json" },
      ],
      user_info: { "dalia.jawad@dentclinic.test": { fullname: "داليا جواد" } },
    },
  );
  expect(history.createdByName).toBe("داليا جواد");
  // Newest first; a user without a known name shows the user ID; an unreadable record has no changes.
  expect(history.entries.map((e) => e.name)).toEqual(["V3", "V2", "V1"]);
  expect(history.entries[1]).toMatchObject({ userName: "someone@else.test", changes: [{ field: "amount", from: 150000, to: 100000 }] });
  expect(history.entries[0].changes).toEqual([]);
  // No docinfo at all (no Track Changes): just who added it, by ID when getdoc did not name them.
  expect(parseDocHistory({ owner: "a", creation: "b" }, undefined)).toMatchObject({ createdByName: "a", entries: [] });

  // A Link shows the names Frappe records with it, not the IDs; the ID only when there is no name.
  expect(
    readableChanges("Appointment", [
      { field: "doctor", from: "DOC-00001", to: "DOC-00003" },
      { field: "doctor_name", from: "د. زينب الهاشمي", to: "د. نور الساعدي" },
      { field: "status", from: "Scheduled", to: "Confirmed" },
    ]),
  ).toEqual([
    { field: "doctor", from: "د. زينب الهاشمي", to: "د. نور الساعدي" },
    { field: "status", from: "Scheduled", to: "Confirmed" },
  ]);
  expect(readableChanges("Payment", [{ field: "treatment_plan", from: "TRT-1", to: "TRT-2" }])).toEqual([
    { field: "treatment_plan", from: "TRT-1", to: "TRT-2" },
  ]);

  expect(historyValue("amount", 150000, money)).toBe("IQD 150,000");
  // Frappe writes a Version's values as formatted text: money with separators (and maybe the currency), a
  // date in the site's own format, and "<br>" for a line break.
  expect(historyValue("amount", "150,000.00", money)).toBe("IQD 150,000");
  expect(historyValue("total_cost", "IQD 150,000.00", money)).toBe("IQD 150,000");
  expect(historyValue("amount", "not a number", money)).toBe("not a number");
  expect(historyValue("appointment_date", "20-08-2026", money)).toBe("20-08-2026");
  expect(historyValue("notes", "Line one<br>Line two", money)).toBe("Line one\nLine two");
  expect(historyValue("no_recall", "Yes", money)).toBe("Yes");
  expect(historyValue("no_recall", "0", money)).toBe("No");
  expect(historyValue("appointment_date", "2026-09-08", money)).toBe("8 Sep 2026");
  expect(historyValue("appointment_time", "14:30:00", money)).toBe("2:30 PM");
  expect(historyValue("no_recall", 1, money)).toBe("Yes");
  expect(historyValue("notes", "", money)).toBe("—");
  expect(fieldLabel("Payment", "payment_method")).toBe("Method");
  expect(fieldLabel("Payment", "some_new_field")).toBe("Some new field");
  // Worked-out and copied fields are left out; a Treatment Plan's treatment_type is not.
  expect(isShownChange("Payment", "treatment_type")).toBe(false);
  expect(isShownChange("Treatment Plan", "treatment_type")).toBe(true);
  expect(isShownChange("Treatment Plan", "remaining_amount")).toBe(false);
});

test("a payment shows who changed it and what", async ({ page }) => {
  await page.goto("/payments/PAY-2026-00001");
  await waitForData(page);
  const history = page.locator("section").filter({ has: page.getByRole("heading", { name: "History" }) });
  // Closed until someone asks.
  await expect(history.getByRole("listitem")).toHaveCount(0);
  await history.getByRole("button", { name: "Show History" }).click();
  const items = history.locator("ol > li");
  await expect(items.nth(0)).toContainText("ليث حامد changed it · 21 Aug 2026, 9:12 AM");
  await expect(items.nth(0)).toContainText("Amount: IQD 150,000 → IQD 100,000");
  await expect(items.nth(1)).toContainText("داليا جواد changed it");
  await expect(items.nth(1)).toContainText("Method: Cash → Bank Transfer");
  await expect(items.last()).toContainText("داليا جواد added it · 20 Aug 2026, 10:30 AM");
});

test("a change made in the app is recorded with the user who made it", async ({ page }) => {
  await page.goto("/profile");
  await waitForData(page);
  await page.getByLabel("View the app as").selectOption({ label: "داليا جواد" });
  await expect(page.getByText("Clinic Receptionist").first()).toBeVisible();

  await navigate(page, "/appointments/APT-2026-00001");
  const history = page.locator("section").filter({ has: page.getByRole("heading", { name: "History" }) });
  await history.getByRole("button", { name: "Show History" }).click();
  await expect(history.getByText("No changes since then.")).toBeVisible();

  // The open card loads again after the save.
  await page.getByRole("button", { name: "Confirmed", exact: true }).click();
  const first = history.locator("ol > li").first();
  await expect(first).toContainText("داليا جواد changed it");
  await expect(first).toContainText("Status: Scheduled → Confirmed");
  await expect(history.getByText("No changes since then.")).toHaveCount(0);
  // A second save at once shows up too.
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(history.locator("ol > li").first()).toContainText("Status: Confirmed → Completed");
});

test("moving a visit to another doctor shows the doctors' names", async ({ page }) => {
  await page.goto("/appointments/APT-2026-00001/edit");
  await waitForData(page);
  await page.getByLabel(/^Doctor/).selectOption({ label: "د. نور الساعدي · Endodontist" });
  await page.getByRole("button", { name: /Save/ }).click();
  await expect(page).toHaveURL(/\/appointments\/APT-2026-00001$/);
  const history = page.locator("section").filter({ has: page.getByRole("heading", { name: "History" }) });
  await history.getByRole("button", { name: "Show History" }).click();
  await expect(history.locator("ol > li").first()).toContainText("Doctor: د. زينب الهاشمي → د. نور الساعدي");
  await expect(history).not.toContainText("DOC-");
});

test("the patient page has a History tab", async ({ page }) => {
  await page.goto("/patients/PAT-2025-00001");
  await waitForData(page);
  await page.getByRole("button", { name: /Change the next check-up/ }).click();
  const dialog = page.getByRole("dialog", { name: "Next check-up" });
  await dialog.getByLabel(/^Check-up/).selectOption({ label: "Every 3 months" });
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("tab", { name: "History" }).click();
  const history = page.locator("section").filter({ has: page.getByRole("heading", { name: "History" }) });
  const first = history.locator("ol > li").first();
  await expect(first).toContainText("Administrator changed it");
  await expect(first).toContainText("Check-up every (months): 0 → 3");
  await expect(first).toContainText("Next check-up: — → 10 Mar 2026");
  await expect(history.locator("ol > li").last()).toContainText("داليا جواد added it · 2 Nov 2025");
});
