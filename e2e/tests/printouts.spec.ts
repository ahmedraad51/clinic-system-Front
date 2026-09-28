import { expect, test } from "../fixtures";
import { openFromMenu, waitForData } from "../helpers";

test("end-of-day report adds up today's payments by method", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Payments");
  await page.getByRole("link", { name: "End-of-Day Report" }).click();
  await expect(page.getByRole("heading", { name: "End-of-Day Report" })).toBeVisible();
  await waitForData(page);
  // The dummy data has two payments today: 50,000 cash and 200,000 by card.
  await expect(page.getByText("Total", { exact: true }).locator("..")).toContainText("IQD 250,000");
  await expect(page.getByText("Cash", { exact: true }).first().locator("..")).toContainText("IQD 50,000");
  await expect(page.getByText("Cash payments", { exact: true }).locator("..")).toContainText("IQD 50,000");
  // With no opening float typed, the drawer should hold the day's cash.
  await expect(page.getByText("Should be in the drawer", { exact: true }).locator("..")).toContainText("IQD 50,000");
});

test("patient statement and appointment card", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00001");
  await waitForData(page);
  await page.getByRole("tab", { name: /Payments/ }).click();
  await page.getByRole("link", { name: "Print statement" }).click();
  await expect(page.getByRole("heading", { name: "Patient Statement" })).toBeVisible();
  await waitForData(page);
  // Zahraa Hussein: root canal 150,000 and crown 200,000; 250,000 paid; 100,000 left.
  await expect(page.getByText("Total for treatments").locator("..")).toContainText("IQD 350,000");
  await expect(page.getByText("Total paid").locator("..")).toContainText("IQD 250,000");
  await expect(page.getByText("Balance", { exact: true }).locator("..")).toContainText("IQD 100,000");

  await page.goto("/appointments/APT-2026-00001");
  await waitForData(page);
  await page.getByRole("link", { name: "Print Card" }).click();
  await expect(page.getByRole("heading", { name: "Appointment Card" })).toBeVisible();
  await expect(page.getByText("Tuesday, 8 September 2026")).toBeVisible();
  await expect(page.getByText("with Dr. Zainab Al-Hashimi")).toBeVisible();
});
