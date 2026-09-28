import { expect, test } from "../fixtures";
import { openFromMenu, pickLink, today } from "../helpers";

test("book an appointment, with the double-booking warning", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Appointments");
  await page.getByRole("link", { name: "New Appointment" }).first().click();
  await expect(page.getByRole("heading", { name: "New Appointment" })).toBeVisible();

  // The dummy data has Mustafa Jabbar with Dr. Zainab Al-Hashimi today at 12:30, so 12:45 overlaps it.
  await pickLink(page, "Patient", "Hiba", "Hiba Kadhim");
  await page.getByLabel("Doctor").selectOption({ label: "Dr. Zainab Al-Hashimi · General Dentist" });
  await page.getByLabel("Date").fill(today());
  await page.getByLabel("Time").fill("12:45");
  await page.getByLabel("Reason for Visit").fill("Test booking");
  await page.getByRole("button", { name: "Book Appointment" }).click();

  const warning = page.getByRole("dialog", { name: "This doctor is already booked" });
  await expect(warning).toBeVisible();
  await expect(warning).toContainText("Mustafa Jabbar");

  // Going back lets the receptionist pick another time.
  await warning.getByRole("button", { name: "Cancel" }).click();
  await expect(warning).toBeHidden();
  await page.getByLabel("Time").fill("15:00");
  await page.getByRole("button", { name: "Book Appointment" }).click();

  // The appointment page opens.
  await expect(page).toHaveURL(/\/appointments\/APT-/);
  await expect(page.getByRole("heading", { name: "Hiba Kadhim" })).toBeVisible();
  await expect(page.getByText("Test booking").first()).toBeVisible();
  await expect(page.getByText("3:00 PM").first()).toBeVisible();
});
