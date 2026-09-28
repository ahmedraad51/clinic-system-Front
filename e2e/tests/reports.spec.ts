import { expect, test } from "../fixtures";
import { openFromMenu } from "../helpers";

test("reports show revenue by doctor and appointment outcomes", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Reports");

  // This month (to 26 Sep): the implant payment was Dr. Haider Al-Obaidi's, the root canal Dr. Noor Al-Saadi's.
  const byDoctor = page.locator("section").filter({ has: page.getByRole("heading", { name: "Revenue by Doctor" }) });
  await expect(byDoctor).toContainText("Dr. Haider Al-Obaidi");
  await expect(byDoctor).toContainText("IQD 200,000");
  await expect(byDoctor).toContainText("Dr. Noor Al-Saadi");

  // July to September: 8 completed visits and 1 no-show.
  await page.getByLabel("Period").selectOption("last_3_months");
  const visits = page.locator("section").filter({ has: page.getByRole("heading", { name: "Appointments", exact: true }) });
  await expect(visits).toContainText("11%");
  await expect(visits).toContainText("Completed");
});
