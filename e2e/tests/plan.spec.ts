import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";

test("Settings > Plan shows the plan, until when it is paid, and the use against its limits", async ({ page }) => {
  await page.goto("/settings");
  await waitForData(page);
  await page.getByRole("navigation", { name: "Settings pages" }).getByRole("link", { name: "Plan" }).click();
  await expect(page).toHaveURL(/\/settings\/plan$/);

  const plan = page.getByTestId("current-plan");
  await expect(plan).toContainText("Cloud");
  await expect(plan).toContainText("Active");
  await expect(plan).toContainText("IQD 45,000 a month");
  // Paid 40 days ahead of 26 Sep 2026.
  await expect(plan).toContainText("Paid until 5 Nov 2026.");
  await expect(plan).toContainText("40 days left");

  const usage = page.getByTestId("plan-usage");
  await expect(usage.locator('[data-meter="doctors"]')).toContainText("5 of 8");
  await expect(usage.locator('[data-meter="users"]')).toContainText("6 of 15");
  await expect(usage.locator('[data-meter="storage"]')).toContainText("14 MB of 20 GB");

  // Asking for another plan.
  await page.getByRole("button", { name: "Request an Upgrade" }).click();
  const dialog = page.getByRole("dialog", { name: "Request a Plan Change" });
  await dialog.locator('select[name="plan"]').selectOption("server-cloud");
  await dialog.getByLabel("Note (optional)").fill("نريد العمل دون إنترنت");
  await dialog.getByRole("button", { name: "Send Request" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Request sent." })).toBeVisible();
  await expect(plan).toContainText("You asked for Clinic Server + Cloud copy on 26 Sep 2026.");
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the plan page in Arabic", async ({ page }) => {
    await page.goto("/settings/plan");
    await waitForData(page);
    const plan = page.getByTestId("current-plan");
    await expect(plan).toContainText("السحابة");
    await expect(plan).toContainText("فعّالة");
    await expect(plan).toContainText("شهريًا");
    await expect(page.getByTestId("plan-usage").locator('[data-meter="doctors"]')).toContainText("5 من 8");
  });
});
