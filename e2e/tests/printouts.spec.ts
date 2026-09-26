import { expect, test } from "../fixtures";
import { openFromMenu, waitForData } from "../helpers";

test("end-of-day report adds up today's payments by method", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Payments");
  await page.getByRole("link", { name: "End-of-Day Report" }).click();
  await expect(page.getByRole("heading", { name: "End-of-Day Report" })).toBeVisible();
  await waitForData(page);
  // The dummy data has two payments today: 800 cash and 3,000 by card.
  await expect(page.getByText("Total", { exact: true }).locator("..")).toContainText("$3,800");
  await expect(page.getByText("Cash", { exact: true }).first().locator("..")).toContainText("$800");
  await expect(page.getByText(/Cash that should be in the drawer/).locator("..")).toContainText("$800");
});

test("patient statement and appointment card", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00001");
  await waitForData(page);
  await page.getByRole("tab", { name: /Payments/ }).click();
  await page.getByRole("link", { name: "Print statement" }).click();
  await expect(page.getByRole("heading", { name: "Patient Statement" })).toBeVisible();
  await waitForData(page);
  // Nadia Samir: root canal 4,500 and crown 6,000; 7,500 paid; 3,000 left.
  await expect(page.getByText("Total for treatments").locator("..")).toContainText("$10,500");
  await expect(page.getByText("Total paid").locator("..")).toContainText("$7,500");
  await expect(page.getByText("Balance", { exact: true }).locator("..")).toContainText("$3,000");

  await page.goto("/appointments/APT-2026-00001");
  await waitForData(page);
  await page.getByRole("link", { name: "Print Card" }).click();
  await expect(page.getByRole("heading", { name: "Appointment Card" })).toBeVisible();
  await expect(page.getByText("Tuesday, 8 September 2026")).toBeVisible();
  await expect(page.getByText("with Dr. Sarah Mansour")).toBeVisible();
});
