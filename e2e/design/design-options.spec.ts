import type { Page } from "@playwright/test";
import { test } from "../fixtures";
import { waitForData } from "../helpers";

/**
 * Pictures of the three design options (A, B, C) for the owner to choose from: the dashboard, a patient page,
 * the calendar and the Today board, plus the dashboard on a phone. Saved to docs/design-options/option-<x>/.
 * Run with `npm run screenshots:designs`.
 */
const OPTIONS = ["a", "b", "c"] as const;

/**
 * A picture of the page. A whole page is taken by making the window as tall as the page, so the menu (fixed to the
 * window) reaches the bottom too, then the window gets its size back.
 */
async function shoot(page: Page, path: string, whole: boolean) {
  // Let the cards and chart bars finish rising into place.
  await page.waitForTimeout(900);
  const size = page.viewportSize() ?? { width: 1440, height: 900 };
  if (whole) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: size.width, height: Math.max(size.height, height) });
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path });
  await page.setViewportSize(size);
}

const PAGES = [
  { name: "dashboard", path: "/dashboard", fullPage: true },
  { name: "patient", path: "/patients/PAT-2026-00001", fullPage: true },
  { name: "calendar", path: "/appointments?view=day", fullPage: false },
  { name: "today", path: "/today", fullPage: true },
];

for (const option of OPTIONS) {
  test(`design option ${option}`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.addInitScript((value) => localStorage.setItem("design_option", value), option);
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const shot of PAGES) {
      await page.goto(shot.path);
      await waitForData(page);
      await shoot(page, `docs/design-options/option-${option}/${shot.name}.png`, shot.fullPage);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    await waitForData(page);
    await shoot(page, `docs/design-options/option-${option}/dashboard-phone.png`, true);
  });
}
