import fs from "node:fs";
import { strFromU8, unzipSync } from "fflate";
import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import { openFromMenu, waitForData } from "../helpers";

/** Presses Download ZIP and returns the files inside it. */
async function downloadZip(page: Page) {
  const waiting = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download ZIP|تنزيل ZIP/ }).click();
  const download = await waiting;
  expect(download.suggestedFilename()).toBe("dentclinic-2026-09-26.zip");
  return unzipSync(new Uint8Array(fs.readFileSync((await download.path())!)));
}

test("the manager downloads all the data as CSV files in one ZIP", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  await openFromMenu(page, "Export Data");
  await expect(page.getByRole("heading", { name: "Export Data" })).toBeVisible();
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  const files = await downloadZip(page);
  expect(Object.keys(files).sort()).toEqual(["README.txt", "appointments.csv", "patients.csv", "payments.csv", "plans.csv"]);

  const patients = strFromU8(files["patients.csv"]);
  // A BOM, so Excel shows Arabic right; the headers in the screen's language; every patient.
  expect(Array.from(files["patients.csv"].slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
  expect(patients).toMatch(/^ID,/);
  expect(patients).toContain("PAT-2026-00001,زهراء حسين,Female,1991-04-12");
  expect(patients.trim().split("\r\n")).toHaveLength(1 + 12);
  expect(strFromU8(files["payments.csv"])).toContain("PAY-2026-00016");
  expect(strFromU8(files["README.txt"])).toContain("Patients: 12");

  const progress = page.getByTestId("export-progress");
  await expect(progress).toContainText("12 rows");
  await expect(page.getByText("The ZIP was downloaded.")).toBeVisible();
});

test("the Excel export holds one workbook for each kind of record", async ({ page }) => {
  await page.goto("/export");
  await waitForData(page);
  const files = await downloadZip(page);
  expect(Object.keys(files).sort()).toEqual(["README.txt", "appointments.xlsx", "patients.xlsx", "payments.xlsx", "plans.xlsx"]);
  const book = unzipSync(files["plans.xlsx"]);
  const sheet = strFromU8(book["xl/worksheets/sheet1.xml"]);
  expect(sheet).toContain("TRT-2026-00016");
  // Amounts are numbers, not text.
  expect(sheet).toMatch(/<c r="J\d+"><v>700<\/v><\/c>/);
});

test("only the manager can export", async ({ page }) => {
  await page.goto("/profile");
  await waitForData(page);
  await page.getByLabel("View the app as").selectOption("dalia.jawad@dentclinic.test");
  await expect(page.getByRole("link", { name: "Export Data" })).toHaveCount(0);
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the export in Arabic: Arabic headers, sheets from right to left", async ({ page }) => {
    await page.goto("/export");
    await waitForData(page);
    await expect(page.getByRole("heading", { name: "تصدير البيانات" })).toBeVisible();
    const files = await downloadZip(page);
    const sheet = strFromU8(unzipSync(files["patients.xlsx"])["xl/worksheets/sheet1.xml"]);
    expect(sheet).toContain('rightToLeft="1"');
    expect(sheet).toContain("زهراء حسين");
    expect(strFromU8(files["README.txt"])).toContain("المرضى: 12");
  });
});
