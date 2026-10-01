import { expect, test } from "../fixtures";
import { formDialog, openFromMenu, pickLink, today, waitForData } from "../helpers";

test("book from an empty slot in the day calendar", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Appointments");

  // The day view opens on today, with a column per doctor and today's bookings in them.
  await expect(page.getByRole("button", { name: "Day", pressed: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /مصطفى جبار, د\. زينب الهاشمي/ })).toBeVisible();

  // Clicking 3:00 PM in د. زينب الهاشمي's column opens the booking dialog with the slot filled in.
  await page.getByRole("button", { name: "Book at 3:00 PM with د. زينب الهاشمي" }).click();
  const dialog = formDialog(page, "New Appointment");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Date")).toHaveValue(today());
  await expect(dialog.getByLabel("Time")).toHaveValue("15:00");
  await expect(dialog.getByLabel("Doctor")).toHaveValue("DOC-00001");

  await pickLink(page, "Patient", "رقية", "رقية عدنان", dialog);
  await dialog.getByRole("button", { name: "Book Appointment" }).click();
  await expect(dialog).toBeHidden();

  // The calendar stays open, and the new booking has its own block at once.
  await expect(page.getByRole("link", { name: /3:00 PM, رقية عدنان, د\. زينب الهاشمي/ })).toBeVisible();
});

test("a slot filled in from the calendar still warns about double booking", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Appointments");
  // 12:15 is free on the grid but the 30 minutes run into مصطفى جبار's 12:30 appointment.
  await page.getByRole("button", { name: "Book at 12:15 PM with د. زينب الهاشمي" }).click();
  const dialog = formDialog(page, "New Appointment");
  await pickLink(page, "Patient", "هبة", "هبة كاظم", dialog);
  await dialog.getByRole("button", { name: "Book Appointment" }).click();
  await expect(page.getByRole("dialog", { name: "This doctor is already booked" })).toBeVisible();
});

test("week view and list view", async ({ page }) => {
  await page.goto("/appointments");
  await waitForData(page);
  await page.getByRole("button", { name: "Week" }).click();
  await expect(page).toHaveURL(/view=week/);
  await waitForData(page);
  await expect(page.getByRole("link", { name: /فاطمة سلمان/ })).toBeVisible();

  await page.getByRole("button", { name: "List" }).click();
  await expect(page).toHaveURL(/view=list/);
  await waitForData(page);
  await expect(page.getByRole("columnheader", { name: "Reason" })).toBeVisible();
});

test("on a phone the day calendar shows one doctor at a time", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/appointments?view=day");
  // It starts with the first doctor (by name, in Arabic order) who has patients today: د. رسل كريم (فاطمة سلمان at 10:00).
  await expect(page.getByText("Doctor 2 of 5")).toBeVisible();
  await expect(page.getByRole("link", { name: /فاطمة سلمان/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /with د\. زينب الهاشمي/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Next doctor" }).click();
  await expect(page.getByText("Doctor 3 of 5")).toBeVisible();
  await expect(page.getByRole("button", { name: /with د\. زينب الهاشمي/ }).first()).toBeAttached();
  await expect(page.getByRole("link", { name: /مصطفى جبار/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /فاطمة سلمان/ })).toHaveCount(0);
});
