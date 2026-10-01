import fs from "node:fs";
import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";

/** Opens Settings → Server & Backup (as the dummy Administrator), in a mode and with the pretend switches. */
async function openServerPage(page: Page, { mode, noInternet }: { mode?: string; noInternet?: boolean } = {}) {
  await page.addInitScript(
    ({ mode, noInternet }) => {
      if (mode) localStorage.setItem("demo_deployment_mode", mode);
      if (noInternet) localStorage.setItem("demo_no_internet", "1");
      // Backups are made in half a second; the browser's "Save as" window is not there, so saving downloads.
      (window as unknown as { __mockBackupMs: number }).__mockBackupMs = 500;
      Object.defineProperty(window, "showSaveFilePicker", { value: undefined, configurable: true });
    },
    { mode, noInternet },
  );
  await page.goto("/settings");
  await waitForData(page);
  await page.getByRole("link", { name: "Server & Backup" }).click();
  await expect(page).toHaveURL(/\/settings\/server$/);
  await expect(page.locator("tr[data-backup]").first()).toBeVisible();
}

test("the manager sees the server and a week of nightly backups", async ({ page }) => {
  await openServerPage(page);
  await expect(page.getByTestId("server-reach")).toHaveText("Connected");
  await expect(page.getByText("DentClinic cloud")).toBeVisible();
  await expect(page.getByText("DentClinic backs up your clinic every night at 02:00")).toBeVisible();
  await expect(page.locator("tr[data-backup]")).toHaveCount(7);
  const failed = page.locator('tr[data-backup="BKP-2026-09-23-0200"]');
  await expect(failed).toContainText("Failed");
  await expect(failed).toContainText("The backup disk was full.");
  // In the cloud there is no cloud copy.
  await expect(page.getByRole("heading", { name: "Cloud Copy" })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Online too" })).toHaveCount(0);
});

test("Back up now makes a backup, and says when it is done", async ({ page }) => {
  await openServerPage(page);
  await page.getByRole("button", { name: "Back Up Now" }).click();
  const first = page.locator("tr[data-backup]").first();
  await expect(first).toContainText("By hand");
  await expect(first).toContainText("by Administrator");
  await expect(page.getByRole("status").filter({ hasText: "Backup made." })).toBeVisible();
  await expect(first).toContainText("Done");
  await expect(page.locator("tr[data-backup]")).toHaveCount(8);
});

test("Save a Backup to USB saves the latest backup's file", async ({ page }) => {
  await openServerPage(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save a Backup to USB" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("dentclinic-backup-2026-09-26-0200.zip");
  const bytes = fs.readFileSync(await file.path());
  expect(bytes.subarray(0, 2).toString()).toBe("PK");
  await expect(page.getByRole("status").filter({ hasText: "Downloads folder" })).toBeVisible();
  // An older one, from its own row.
  const older = page.waitForEvent("download");
  await page.getByRole("button", { name: /Save the backup of 24 Sep 2026/ }).click();
  expect((await older).suggestedFilename()).toBe("dentclinic-backup-2026-09-24-0200.zip");
});

test("a clinic server shows its internet, its disk and the cloud copy", async ({ page }) => {
  await openServerPage(page, { mode: "clinic-server" });
  await expect(page.getByText("Clinic server", { exact: true })).toBeVisible();
  await expect(page.getByText("Free space on the backup disk: 182.4 GB of 238.5 GB.")).toBeVisible();
  await expect(page.getByTestId("copy-status")).toHaveText("Up to date");
  await expect(page.getByText("12 minutes ago")).toBeVisible();
  await expect(page.locator("tr[data-backup]").first()).toContainText("Yes");
});

test("without internet, the cloud copy says it was not updated and why", async ({ page }) => {
  await openServerPage(page, { mode: "clinic-server", noInternet: true });
  await expect(page.getByText("No internet", { exact: true })).toBeVisible();
  await expect(page.getByTestId("copy-status")).toHaveText("Not updated");
  await expect(page.getByText("The clinic server has no internet, so the cloud copy could not be updated.").last()).toBeVisible();
  await expect(page.locator("tr[data-backup]").first()).toContainText("Not yet");
});

test("the view-only copy can save a backup but not make one", async ({ page }) => {
  await openServerPage(page, { mode: "cloud-copy" });
  await expect(page.getByText("This is the online copy")).toBeVisible();
  await expect(page.getByRole("button", { name: "Back Up Now" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save a Backup to USB" })).toBeVisible();
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("Server & Backup in Arabic", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("demo_deployment_mode", "clinic-server"));
    await page.goto("/settings/server");
    await waitForData(page);
    await expect(page.getByRole("link", { name: "الخادم والنسخ الاحتياطي" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("copy-status")).toHaveText("محدَّثة");
    await expect(page.getByRole("button", { name: "احفظ نسخة على USB" })).toBeVisible();
  });
});
