import { expect, test } from "../fixtures";
import { formDialog, openFromMenu, openSaved, pickLink, today } from "../helpers";

test("book an appointment, with the double-booking warning", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Appointments");
  await page.getByRole("button", { name: "New Appointment" }).first().click();
  const dialog = formDialog(page, "New Appointment");
  await expect(dialog).toBeVisible();

  // The dummy data has مصطفى جبار with د. زينب الهاشمي today at 12:30, so 12:45 overlaps it.
  await pickLink(page, "Patient", "هبة", "هبة كاظم", dialog);
  await dialog.getByLabel("Doctor").selectOption({ label: "د. زينب الهاشمي · General Dentist" });
  await dialog.getByLabel("Date").fill(today());
  await dialog.getByLabel("Time").fill("12:45");
  await dialog.getByLabel("Reason for Visit").fill("Test booking");
  await dialog.getByRole("button", { name: "Book Appointment" }).click();

  const warning = page.getByRole("dialog", { name: "This doctor is already booked" });
  await expect(warning).toBeVisible();
  await expect(warning).toContainText("مصطفى جبار");

  // Going back lets the receptionist pick another time.
  await warning.getByRole("button", { name: "Cancel" }).click();
  await expect(warning).toBeHidden();
  await dialog.getByLabel("Time").fill("15:00");
  await dialog.getByRole("button", { name: "Book Appointment" }).click();

  // The dialog closes, the calendar stays, and the message opens the new appointment.
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/appointments(\?|$)/);
  await openSaved(page, "Appointment booked.");
  await expect(page).toHaveURL(/\/appointments\/APT-/);
  await expect(page.getByRole("heading", { name: "هبة كاظم" })).toBeVisible();
  await expect(page.getByText("Test booking").first()).toBeVisible();
  await expect(page.getByText("3:00 PM").first()).toBeVisible();
});
