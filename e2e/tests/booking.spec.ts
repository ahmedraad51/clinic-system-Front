import { expect, test } from "@playwright/test";
import { openFromMenu, pickLink, today } from "../helpers";

function tomorrow() {
  const [y, m, d] = today().split("-").map(Number);
  const date = new Date(y, m - 1, d + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

test("the booking form shows the doctor's day, offers free times and remembers the doctor", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Appointments");
  await page.getByRole("button", { name: "List" }).click();
  await page.getByRole("link", { name: "New Appointment" }).first().click();
  await expect(page.getByRole("heading", { name: "New Appointment" })).toBeVisible();

  await pickLink(page, "Patient", "Mona", "Mona Adel");
  await page.getByLabel("Doctor").selectOption({ label: "Dr. Sarah Mansour · General Dentist" });
  await page.getByLabel("Date").fill(tomorrow());

  // Tomorrow Dr. Sarah Mansour already sees Dina Rashad at 11:00; the clinic opens at 9:00.
  await expect(page.getByText("Nothing booked yet.")).toBeHidden();
  await expect(page.getByText("Dina Rashad")).toBeVisible();
  await page.getByRole("button", { name: "Next free: 9:00 AM" }).click();
  await expect(page.getByLabel("Time")).toHaveValue("09:00");

  // A time that overlaps is pointed out while typing.
  await page.getByLabel("Time").fill("11:15");
  await expect(page.getByText(/11:15 AM overlaps Dina Rashad/)).toBeVisible();
  await page.getByRole("button", { name: "9:30 AM" }).click();

  await page.getByRole("button", { name: "Book Appointment" }).click();
  await expect(page).toHaveURL(/\/appointments\/APT-/);
  await expect(page.getByRole("heading", { name: "Mona Adel" })).toBeVisible();

  // The next booking starts with the same doctor.
  await openFromMenu(page, "Appointments");
  await page.getByRole("link", { name: "New Appointment" }).first().click();
  await expect(page.getByLabel("Doctor")).toHaveValue("DOC-00001");
});

test("the calendar and the booking form know each doctor's working hours", async ({ page }) => {
  await page.goto("/appointments?view=day");
  // Dr. Omar Khalil works 12:00 to 18:00 in the dummy data.
  await expect(page.getByText("12:00 PM–6:00 PM")).toBeVisible();
  await page.getByRole("button", { name: "Book at 10:00 AM with Dr. Omar Khalil (outside working hours)" }).click();
  await expect(page.getByRole("heading", { name: "New Appointment" })).toBeVisible();
  await expect(page.getByText(/10:00 AM is outside Dr\. Omar Khalil's working hours/)).toBeVisible();
});
