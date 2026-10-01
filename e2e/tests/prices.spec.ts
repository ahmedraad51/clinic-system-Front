import { expect, test } from "../fixtures";
import { formDialog, openFromMenu, pickLink, waitForData } from "../helpers";

test("the price list fills in the cost of a new treatment plan", async ({ page }) => {
  await page.goto("/dashboard");
  // Change the usual price of a crown in Settings.
  await openFromMenu(page, "Settings");
  await page.getByRole("tab", { name: "Price List" }).click();
  await page.getByLabel("Crown (IQD)").fill("225000");
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Settings saved." })).toBeVisible();

  await openFromMenu(page, "Treatments");
  await page.getByRole("button", { name: "New Treatment" }).first().click();
  const dialog = formDialog(page, "New Treatment Plan");
  await pickLink(page, "Patient", "رقية", "رقية عدنان", dialog);
  await dialog.getByLabel("Treatment Type").selectOption("Crown");
  await expect(dialog.getByLabel(/Total Cost/)).toHaveValue("225000");
  await expect(dialog.getByText("Usual price for crown: IQD 225,000")).toBeVisible();

  // Switching type moves the price along while nobody typed their own.
  await dialog.getByLabel("Treatment Type").selectOption("Filling");
  await expect(dialog.getByLabel(/Total Cost/)).toHaveValue("40000");
  // A typed price is kept.
  await dialog.getByLabel(/Total Cost/).fill("35000");
  await dialog.getByLabel("Treatment Type").selectOption("Crown");
  await expect(dialog.getByLabel(/Total Cost/)).toHaveValue("35000");
});

test("print a treatment estimate for a patient", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00004");
  await waitForData(page);
  await page.getByRole("tab", { name: /Treatment Plans/ }).click();
  await page.getByRole("link", { name: "Print estimate" }).click();
  await expect(page.getByRole("heading", { name: "Treatment Estimate" })).toBeVisible();
  await waitForData(page);
  // عباس مهدي: implant (250,000 left) and bridge (600,000 left).
  await expect(page.getByRole("cell", { name: "Implant" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Bridge" })).toBeVisible();
  await expect(page.getByText("Left to pay").locator("..")).toContainText("IQD 850,000");
  await expect(page.getByRole("button", { name: "Print" })).toBeEnabled();
});
