import type { Page } from "@playwright/test";
import { test } from "../fixtures";
import { waitForData } from "../helpers";

/**
 * Before-and-after pictures of a redesign, in English: the main screens at desktop, tablet and phone size, saved to
 * docs/design-changes/<DESIGN>/<SHOTS>/<size>/<screen>.png. DESIGN is the current redesign ("2-clean"), SHOTS is
 * "after" by default; the "before" pictures were taken the same way from the design before it. Run with
 * `npm run screenshots:design` (SHOTS=before to retake the other side).
 */
const DESIGN = process.env.DESIGN || "2-clean";
const SHOTS = process.env.SHOTS || "after";

const SIZES = [
  { name: "desktop", width: 1440, height: 900, dark: false },
  { name: "tablet", width: 1024, height: 768, dark: false },
  { name: "phone", width: 390, height: 844, dark: false },
  // The new look has a dark mode too: desktop pictures of it with the "after" ones.
  ...(SHOTS === "after" ? [{ name: "desktop-dark", width: 1440, height: 900, dark: true }] : []),
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
    if (size.dark) await page.addInitScript(() => localStorage.setItem("appearance", JSON.stringify({ mode: "dark" })));
    for (const [name, path] of SCREENS) {
      await page.goto(path);
      await waitForData(page);
      await shoot(page, `docs/design-changes/${DESIGN}/${SHOTS}/${size.name}/${name}.png`, !path.startsWith("/appointments?"));
    }
  });
}
