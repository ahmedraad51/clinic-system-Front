import { expect, test } from "../fixtures";
import { openFromMenu, pickLink, waitForData } from "../helpers";

test("the price list fills in the cost of a new treatment plan", async ({ page }) => {
  await page.goto("/dashboard");
  // Change the usual price of a crown in Settings.
  await openFromMenu(page, "Settings");
  await page.getByLabel("Crown (USD)").fill("6500");
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Settings saved." })).toBeVisible();

  await openFromMenu(page, "Treatments");
  await page.getByRole("link", { name: "New Treatment" }).first().click();
  await pickLink(page, "Patient", "Yara", "Yara Mostafa");
  await page.getByLabel("Treatment Type").selectOption("Crown");
  await expect(page.getByLabel(/Total Cost/)).toHaveValue("6500");
  await expect(page.getByText("Usual price for crown: $6,500")).toBeVisible();

  // Switching type moves the price along while nobody typed their own.
  await page.getByLabel("Treatment Type").selectOption("Filling");
  await expect(page.getByLabel(/Total Cost/)).toHaveValue("900");
  // A typed price is kept.
  await page.getByLabel(/Total Cost/).fill("750");
  await page.getByLabel("Treatment Type").selectOption("Crown");
  await expect(page.getByLabel(/Total Cost/)).toHaveValue("750");
});

test("print a treatment estimate for a patient", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00004");
  await waitForData(page);
  await page.getByRole("tab", { name: /Treatment Plans/ }).click();
  await page.getByRole("link", { name: "Print estimate" }).click();
  await expect(page.getByRole("heading", { name: "Treatment Estimate" })).toBeVisible();
  await waitForData(page);
  // Tarek Hassan: implant (6,000 left) and bridge (12,000 left).
  await expect(page.getByRole("cell", { name: "Implant" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Bridge" })).toBeVisible();
  await expect(page.getByText("Left to pay").locator("..")).toContainText("$18,000");
  await expect(page.getByRole("button", { name: "Print" })).toBeEnabled();
});
