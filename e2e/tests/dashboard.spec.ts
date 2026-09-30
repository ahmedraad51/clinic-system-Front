import { expect, test } from "../fixtures";
import { navigate, waitForData } from "../helpers";

test("the dashboard lists what needs attention today", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: "Needs attention" }) });
  await expect(card).toContainText("5 past appointments to close");
  await expect(card).toContainText("1 reminder to send for tomorrow");
  await expect(card).toContainText("4 patients due for a check-up");
  await expect(card).toContainText("7 patients owe money");

  await card.getByRole("link", { name: /patients owe money/ }).click();
  await expect(page.getByLabel("Balance")).toHaveValue("owing");
  await expect(page.getByText("7 records")).toBeVisible();
});

test("the everyday jobs are large tiles at the top of the dashboard", async ({ page }) => {
  await page.goto("/profile");
  await waitForData(page);
  await navigate(page, "/dashboard");
  const tiles = page.getByRole("region", { name: "Quick Actions" });
  await expect(tiles.getByRole("link")).toHaveText([
    /New Appointment\s*Book a visit/,
    /Add Patient\s*Register someone new/,
    /New Treatment\s*Start a treatment plan/,
    /Record Payment\s*Take a payment/,
  ]);
  // Above the day's numbers and lists.
  const tilesTop = (await tiles.boundingBox())?.y ?? Infinity;
  const attentionTop = (await page.getByRole("heading", { name: "Needs attention" }).boundingBox())?.y ?? 0;
  expect(tilesTop).toBeLessThan(attentionTop);

  // A receptionist cannot start treatment plans, so that tile is not there.
  await navigate(page, "/profile");
  await page.getByLabel("View the app as").selectOption({ label: "Dalia Jawad" });
  await expect(page.getByText("Clinic Receptionist").first()).toBeVisible();
  await navigate(page, "/dashboard");
  await expect(tiles.getByRole("link", { name: /New Treatment/ })).toHaveCount(0);
  // A tile opens its form in place: Add Patient slides in a panel over the dashboard.
  await tiles.getByRole("link", { name: /Add Patient/ }).click();
  await expect(page.getByRole("dialog", { name: "New Patient" })).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
});
