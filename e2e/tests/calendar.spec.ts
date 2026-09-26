import { expect, test } from "@playwright/test";
import { openFromMenu, pickLink, today, waitForData } from "../helpers";

test("book from an empty slot in the day calendar", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Appointments");

  // The day view opens on today, with a column per doctor and today's bookings in them.
  await expect(page.getByRole("button", { name: "Day", pressed: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Karim Fouad, Dr\. Sarah Mansour/ })).toBeVisible();

  // Clicking 3:00 PM in Dr. Sarah Mansour's column opens the form with the slot filled in.
  await page.getByRole("button", { name: "Book at 3:00 PM with Dr. Sarah Mansour" }).click();
  await expect(page.getByRole("heading", { name: "New Appointment" })).toBeVisible();
  await expect(page.getByLabel("Date")).toHaveValue(today());
  await expect(page.getByLabel("Time")).toHaveValue("15:00");
  await expect(page.getByLabel("Doctor")).toHaveValue("DOC-00001");

  await pickLink(page, "Patient", "Yara", "Yara Mostafa");
  await page.getByRole("button", { name: "Book Appointment" }).click();
  // Wait for the new appointment's page (the name is already shown in the picker on the form).
  await expect(page).toHaveURL(/\/appointments\/APT-/);
  await expect(page.getByRole("heading", { name: "Yara Mostafa" })).toBeVisible();

  // Back in the calendar, the new booking has its own block.
  await openFromMenu(page, "Appointments");
  await expect(page.getByRole("link", { name: /3:00 PM, Yara Mostafa, Dr\. Sarah Mansour/ })).toBeVisible();
});

test("a slot filled in from the calendar still warns about double booking", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Appointments");
  // 12:15 is free on the grid but the 30 minutes run into Karim Fouad's 12:30 appointment.
  await page.getByRole("button", { name: "Book at 12:15 PM with Dr. Sarah Mansour" }).click();
  await pickLink(page, "Patient", "Mona", "Mona Adel");
  await page.getByRole("button", { name: "Book Appointment" }).click();
  await expect(page.getByRole("dialog", { name: "This doctor is already booked" })).toBeVisible();
});

test("week view and list view", async ({ page }) => {
  await page.goto("/appointments");
  await waitForData(page);
  await page.getByRole("button", { name: "Week" }).click();
  await expect(page).toHaveURL(/view=week/);
  await waitForData(page);
  await expect(page.getByRole("link", { name: /Salma Ibrahim/ })).toBeVisible();

  await page.getByRole("button", { name: "List" }).click();
  await expect(page).toHaveURL(/view=list/);
  await waitForData(page);
  await expect(page.getByRole("columnheader", { name: "Reason" })).toBeVisible();
});

test("on a phone the day calendar shows one doctor at a time", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/appointments?view=day");
  // It starts with the first doctor who has patients today: Dr. Hana Aziz (Salma Ibrahim at 10:00).
  await expect(page.getByText("Doctor 1 of 5")).toBeVisible();
  await expect(page.getByRole("link", { name: /Salma Ibrahim/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /with Dr\. Leila Haddad/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Next doctor" }).click();
  await expect(page.getByText("Doctor 2 of 5")).toBeVisible();
  await expect(page.getByRole("button", { name: /with Dr\. Leila Haddad/ }).first()).toBeAttached();
  await expect(page.getByRole("link", { name: /Salma Ibrahim/ })).toHaveCount(0);
});
