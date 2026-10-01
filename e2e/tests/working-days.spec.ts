import { expect, test } from "../fixtures";
import { openFromMenu, pickLink, waitForData } from "../helpers";

test("closed days are shaded and booking on one asks first", async ({ page }) => {
  // The dummy clinic is closed on Fridays; Friday 25 September is in this week.
  await page.goto("/appointments?view=week");
  await waitForData(page);
  await expect(page.locator('[data-today]').filter({ hasText: "Fri" })).toContainText("Closed");

  await page.goto("/appointments/new?date=2026-10-02&doctor=DOC-00001");
  await pickLink(page, "Patient", "هبة", "هبة كاظم");
  await expect(page.getByText("The clinic is closed on this day.")).toBeVisible();
  await page.getByLabel("Time").fill("10:00");
  await page.getByRole("button", { name: "Book Appointment" }).click();
  const ask = page.getByRole("dialog", { name: "The clinic is closed on this day" });
  await expect(ask).toBeVisible();
  await ask.getByRole("button", { name: "Book anyway" }).click();
  await expect(page).toHaveURL(/\/appointments\/APT-/);
});

test("the working days are chosen in Settings", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Settings");
  await page.getByRole("tab", { name: "Working Hours" }).click();
  const friday = page.getByRole("button", { name: "Fri", exact: true });
  await expect(friday).toHaveAttribute("aria-pressed", "false");
  await friday.click();
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Settings saved." })).toBeVisible();

  await openFromMenu(page, "Appointments");
  await page.getByRole("button", { name: "Week" }).click();
  await waitForData(page);
  await expect(page.locator('[data-today]').filter({ hasText: "Fri" })).not.toContainText("Closed");
});
