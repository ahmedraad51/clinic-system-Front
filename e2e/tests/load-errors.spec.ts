import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import { navigate, waitForData } from "../helpers";

/** Makes the dummy data fail every read of these doctypes, like a lost connection (see failIfAsked in mockData.ts). */
async function failReads(page: Page, doctypes: string[]) {
  await page.evaluate((list) => {
    (window as unknown as { __mockFail?: string[] }).__mockFail = list;
  }, doctypes);
}

const LOST = "Cannot reach the server. Check the internet connection and try again.";

test("a list that could not load says so and can try again", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  await failReads(page, ["Patient"]);
  await navigate(page, "/patients");

  const table = page.getByRole("table");
  await expect(table.getByRole("alert")).toContainText(LOST);
  // Not "No patients yet", and no record count.
  await expect(page.getByText("No patients yet.")).toHaveCount(0);
  await expect(page.getByText(/\d+ records?$/)).toHaveCount(0);

  await failReads(page, []);
  await table.getByRole("button", { name: "Try Again" }).click();
  await expect(page.getByRole("link", { name: "Zahraa Hussein" })).toBeVisible();
  await expect(page.getByText("12 records")).toBeVisible();
});

test("a search with no match offers to clear the filters", async ({ page }) => {
  await page.goto("/patients");
  await waitForData(page);
  const search = page.getByRole("searchbox");
  await search.fill("no such patient");
  await expect(page.getByText("No patients match your search.")).toBeVisible();
  await page.getByRole("button", { name: "Clear Filters" }).click();
  await expect(search).toHaveValue("");
  await expect(page.getByRole("link", { name: "Zahraa Hussein" })).toBeVisible();
});

test("the dashboard shows an error instead of zeros", async ({ page }) => {
  await page.goto("/payments");
  await waitForData(page);
  await failReads(page, ["Patient"]);
  await navigate(page, "/dashboard");
  await expect(page.getByRole("alert").filter({ hasText: LOST })).toBeVisible();
  await expect(page.getByText("Revenue this month")).toHaveCount(0);

  await failReads(page, []);
  await page.getByRole("button", { name: "Try Again" }).click();
  await expect(page.getByText("Revenue this month")).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: LOST })).toHaveCount(0);
});

test("the Today board and the recall list do not pretend nothing is there", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  await failReads(page, ["Appointment"]);

  await navigate(page, "/today");
  await expect(page.getByRole("alert").filter({ hasText: LOST })).toBeVisible();
  await expect(page.getByText("Still to come")).toHaveCount(0);

  await navigate(page, "/recall");
  await expect(page.getByRole("table").getByRole("alert")).toContainText(LOST);
  await expect(page.getByText(/Nobody is due/)).toHaveCount(0);

  await failReads(page, []);
  await page.getByRole("button", { name: "Try Again" }).click();
  await expect(page.getByRole("row", { name: /Suha Majeed/ })).toBeVisible();

  await navigate(page, "/today");
  await expect(page.getByText("Still to come")).toBeVisible();
});

test("the bell says when today's appointments could not load", async ({ page }) => {
  await page.goto("/patients");
  await waitForData(page);
  await failReads(page, ["Appointment"]);
  await page.getByRole("button", { name: /Today's appointments/ }).click();
  await expect(page.getByText("Could not load today's appointments.")).toBeVisible();
  await expect(page.getByText("Nothing left for today.")).toHaveCount(0);

  await failReads(page, []);
  await page.getByRole("button", { name: "Try Again" }).click();
  await expect(page.getByText("Could not load today's appointments.")).toHaveCount(0);
  // The bell entry starts with the time (the patient list has a plain "Mustafa Jabbar" link too).
  await expect(page.getByRole("link", { name: /PM\s*Mustafa Jabbar/ })).toBeVisible();
});

test("the patient page, the day report and reports say when they could not load", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  await failReads(page, ["Payment"]);

  // The patient's details load; the timeline of visits and payments says it could not.
  await navigate(page, "/patients/PAT-2026-00001");
  await expect(page.getByRole("heading", { name: "Zahraa Hussein" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: LOST })).toBeVisible();

  await navigate(page, "/payments/day");
  await expect(page.getByRole("alert").filter({ hasText: LOST })).toBeVisible();
  await expect(page.getByText("No payments on this day")).toHaveCount(0);

  await navigate(page, "/reports");
  await expect(page.getByRole("alert").filter({ hasText: LOST })).toBeVisible();

  await failReads(page, []);
  await page.getByRole("button", { name: "Try Again" }).click();
  await expect(page.getByText("Revenue by Treatment")).toBeVisible();
});
