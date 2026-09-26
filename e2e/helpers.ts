import { expect, type Page } from "@playwright/test";
import { FIXED_NOW } from "./fixtures";

/**
 * The dummy data lives in the browser's memory and is reset by a full page load.
 * So a test opens the app once with `page.goto` and then moves around by clicking links,
 * or with `navigate()` below, which uses the app's own router (no reload).
 */

/** Waits until no "Loading..." spinner is left on the page. */
export async function waitForData(page: Page) {
  await expect(page.getByText("Loading...", { exact: true })).toHaveCount(0, { timeout: 15_000 });
}

/** Client-side navigation, the same as clicking a link. Keeps the dummy data in memory. */
export async function navigate(page: Page, path: string) {
  await page.evaluate((href) => {
    const next = (window as unknown as { next?: { router?: { push: (url: string) => void } } }).next;
    if (!next?.router) throw new Error("The Next.js router is not ready.");
    next.router.push(href);
  }, path);
  await page.waitForURL((url) => url.pathname + url.search === path);
  await waitForData(page);
}

/** Clicks a link in the sidebar menu. */
export async function openFromMenu(page: Page, label: string) {
  await page.getByRole("navigation").getByRole("link", { name: label, exact: true }).click();
  await waitForData(page);
}

/** Picks a record in a searchable Link field (the patient picker). */
export async function pickLink(page: Page, fieldLabel: string, search: string, optionText: string) {
  const field = page.locator("label").filter({ hasText: fieldLabel }).first();
  await field.getByRole("button").first().click();
  await page.locator('input[role="combobox"]').fill(search);
  await page.getByRole("listbox").getByRole("button", { name: new RegExp(optionText) }).click();
}

/** The tests' fixed "today" (see fixtures.ts) as YYYY-MM-DD, like the app's todayISO(). */
export function today() {
  const d = FIXED_NOW;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
