import { expect, test } from "../fixtures";
import { formDialog, openFromMenu, pickLink, today } from "../helpers";

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
  await page.getByRole("button", { name: "New Appointment" }).first().click();
  const dialog = formDialog(page, "New Appointment");
  await expect(dialog).toBeVisible();

  await pickLink(page, "Patient", "Hiba", "Hiba Kadhim", dialog);
  await dialog.getByLabel("Doctor").selectOption({ label: "Dr. Zainab Al-Hashimi · General Dentist" });
  await dialog.getByLabel("Date").fill(tomorrow());

  // Tomorrow Dr. Zainab Al-Hashimi already sees Shahad Qasim at 11:00; the clinic opens at 9:00.
  await expect(dialog.getByText("Nothing booked yet.")).toBeHidden();
  await expect(dialog.getByText("Shahad Qasim")).toBeVisible();
  await dialog.getByRole("button", { name: "Next free: 9:00 AM" }).click();
  await expect(dialog.getByLabel("Time")).toHaveValue("09:00");

  // A time that overlaps is pointed out while typing.
  await dialog.getByLabel("Time").fill("11:15");
  await expect(dialog.getByText(/11:15 AM overlaps Shahad Qasim/)).toBeVisible();
  await dialog.getByRole("button", { name: "9:30 AM" }).click();

  await dialog.getByRole("button", { name: "Book Appointment" }).click();
  await expect(dialog).toBeHidden();
  // The list behind shows the new booking at once.
  await expect(page.getByRole("link", { name: "Hiba Kadhim" }).first()).toBeVisible();

  // The next booking starts with the same doctor.
  await page.getByRole("button", { name: "New Appointment" }).first().click();
  await expect(formDialog(page, "New Appointment").getByLabel("Doctor")).toHaveValue("DOC-00001");
});

test("the calendar and the booking form know each doctor's working hours", async ({ page }) => {
  await page.goto("/appointments?view=day");
  // Dr. Ali Al-Jubouri works 12:00 to 18:00 in the dummy data.
  await expect(page.getByText("12:00 PM–6:00 PM")).toBeVisible();
  await page.getByRole("button", { name: "Book at 10:00 AM with Dr. Ali Al-Jubouri (outside working hours)" }).click();
  const dialog = formDialog(page, "New Appointment");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Time")).toHaveValue("10:00");
  await expect(dialog.getByText(/10:00 AM is outside Dr\. Ali Al-Jubouri's working hours/)).toBeVisible();
});
