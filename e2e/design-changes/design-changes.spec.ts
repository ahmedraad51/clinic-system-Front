import type { Page } from "@playwright/test";
import { test } from "../fixtures";
import { waitForData } from "../helpers";

/**
 * Before-and-after pictures of the redesign (Phase 2), in English: the main screens at desktop, tablet and phone
 * size, saved to docs/design-changes/<SHOTS>/<size>/<screen>.png. SHOTS is "after" by default; the "before"
 * pictures were taken the same way from the plain design (commit 147e676). Run with `npm run screenshots:design`.
 */
const SHOTS = process.env.SHOTS || "after";

const SIZES = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "phone", width: 390, height: 844 },
];

const SCREENS: Array<[string, string]> = [
  ["dashboard", "/dashboard"],
  ["today", "/today"],
  ["patients", "/patients"],
  ["patient", "/patients/PAT-2026-00001"],
  ["appointments", "/appointments?view=day"],
  ["appointment-new", "/appointments/new"],
  ["treatments", "/treatments"],
  ["treatment", "/treatments/TRT-2026-00002"],
  ["payments", "/payments"],
  ["receipt", "/payments/PAY-2026-00001"],
  ["reports", "/reports"],
  ["settings", "/settings"],
];

/** The whole page: the window is made as tall as the page so the fixed menu reaches the bottom (not the calendar). */
async function shoot(page: Page, path: string, whole: boolean) {
  await page.waitForTimeout(700);
  const size = page.viewportSize() ?? { width: 1440, height: 900 };
  if (whole) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: size.width, height: Math.max(size.height, height) });
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path });
  await page.setViewportSize(size);
}

for (const size of SIZES) {
  test(`design ${SHOTS}, ${size.name}`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: size.width, height: size.height });
    for (const [name, path] of SCREENS) {
      await page.goto(path);
      await waitForData(page);
      await shoot(page, `docs/design-changes/${SHOTS}/${size.name}/${name}.png`, !path.startsWith("/appointments?"));
    }
  });
}
