import { expect, test } from "../fixtures";
import { openFromMenu } from "../helpers";

test("add a doctor, who can then be booked in the calendar", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Doctors");
  await expect(page.getByRole("button", { name: "Dr. Zainab Al-Hashimi" })).toBeVisible();

  await page.getByRole("button", { name: "Add Doctor" }).click();
  const dialog = page.getByRole("dialog", { name: "Add Doctor" });
  await dialog.getByLabel("Full Name").fill("Dr. Rana Fathy");
  await dialog.getByLabel("Specialization").selectOption("Periodontist");
  await dialog.getByLabel("Phone").fill("0790 555 0101");
  await dialog.getByRole("button", { name: "Add Doctor" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Dr. Rana Fathy" })).toBeVisible();

  // Working hours must make sense.
  await page.getByRole("button", { name: "Dr. Rana Fathy" }).click();
  const edit = page.getByRole("dialog", { name: "Edit Doctor" });
  await edit.getByLabel("Starts work at").fill("14:00");
  await edit.getByLabel("Finishes at").fill("10:00");
  await edit.getByRole("button", { name: "Save Doctor" }).click();
  await expect(edit.getByRole("alert").filter({ hasText: "must be after the start" })).toBeVisible();
  await edit.getByLabel("Finishes at").fill("19:00");
  await edit.getByRole("button", { name: "Save Doctor" }).click();
  await expect(edit).toBeHidden();
  await expect(page.getByRole("row", { name: /Dr\. Rana Fathy/ })).toContainText("2:00 PM – 7:00 PM");

  // The new doctor has a column in the day calendar.
  await openFromMenu(page, "Appointments");
  await expect(page.getByRole("button", { name: /with Dr\. Rana Fathy/ }).first()).toBeAttached();
});
