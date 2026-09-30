import { expect, test } from "../fixtures";
import { formDialog, openFromMenu, pickLink, today, waitForData } from "../helpers";

test("book from an empty slot in the day calendar", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Appointments");

  // The day view opens on today, with a column per doctor and today's bookings in them.
  await expect(page.getByRole("button", { name: "Day", pressed: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Mustafa Jabbar, Dr\. Zainab Al-Hashimi/ })).toBeVisible();

  // Clicking 3:00 PM in Dr. Zainab Al-Hashimi's column opens the booking dialog with the slot filled in.
  await page.getByRole("button", { name: "Book at 3:00 PM with Dr. Zainab Al-Hashimi" }).click();
  const dialog = formDialog(page, "New Appointment");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Date")).toHaveValue(today());
  await expect(dialog.getByLabel("Time")).toHaveValue("15:00");
  await expect(dialog.getByLabel("Doctor")).toHaveValue("DOC-00001");

  await pickLink(page, "Patient", "Ruqaya", "Ruqaya Adnan", dialog);
  await dialog.getByRole("button", { name: "Book Appointment" }).click();
  await expect(dialog).toBeHidden();

  // The calendar stays open, and the new booking has its own block at once.
  await expect(page.getByRole("link", { name: /3:00 PM, Ruqaya Adnan, Dr\. Zainab Al-Hashimi/ })).toBeVisible();
});

test("a slot filled in from the calendar still warns about double booking", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Appointments");
  // 12:15 is free on the grid but the 30 minutes run into Mustafa Jabbar's 12:30 appointment.
  await page.getByRole("button", { name: "Book at 12:15 PM with Dr. Zainab Al-Hashimi" }).click();
  const dialog = formDialog(page, "New Appointment");
  await pickLink(page, "Patient", "Hiba", "Hiba Kadhim", dialog);
  await dialog.getByRole("button", { name: "Book Appointment" }).click();
  await expect(page.getByRole("dialog", { name: "This doctor is already booked" })).toBeVisible();
});

test("week view and list view", async ({ page }) => {
  await page.goto("/appointments");
  await waitForData(page);
  await page.getByRole("button", { name: "Week" }).click();
  await expect(page).toHaveURL(/view=week/);
  await waitForData(page);
  await expect(page.getByRole("link", { name: /Fatima Salman/ })).toBeVisible();

  await page.getByRole("button", { name: "List" }).click();
  await expect(page).toHaveURL(/view=list/);
  await waitForData(page);
  await expect(page.getByRole("columnheader", { name: "Reason" })).toBeVisible();
});

test("on a phone the day calendar shows one doctor at a time", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/appointments?view=day");
  // It starts with the first doctor (by name) who has patients today: Dr. Rusul Kareem (Fatima Salman at 10:00).
  await expect(page.getByText("Doctor 4 of 5")).toBeVisible();
  await expect(page.getByRole("link", { name: /Fatima Salman/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /with Dr\. Zainab Al-Hashimi/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Next doctor" }).click();
  await expect(page.getByText("Doctor 5 of 5")).toBeVisible();
  await expect(page.getByRole("button", { name: /with Dr\. Zainab Al-Hashimi/ }).first()).toBeAttached();
  await expect(page.getByRole("link", { name: /Mustafa Jabbar/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Fatima Salman/ })).toHaveCount(0);
});
