import type { Page } from "@playwright/test";
import { test } from "../fixtures";
import { waitForData } from "../helpers";

/**
 * The main screens in Arabic at desktop, tablet and phone size, saved to docs/arabic/<size>/<screen>.png.
 * Run with `npm run screenshots:arabic`. Dummy data, 26 September 2026.
 */
test.use({ lang: "ar" });

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
  ["treatment", "/treatments/TRT-2026-00002"],
  ["payments", "/payments"],
  ["receipt", "/payments/PAY-2026-00001"],
  ["expenses", "/expenses"],
  ["reports", "/reports"],
  ["prescription", "/prescriptions/RX-2026-00002"],
  ["settings", "/settings"],
];

/**
 * A picture of the whole page. The window is made as tall as the page, so the menu (fixed to the window) reaches
 * the bottom too; the calendar keeps the window's height (it scrolls inside).
 */
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
  test(`arabic screens, ${size.name}`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: size.width, height: size.height });
    for (const [name, path] of SCREENS) {
      await page.goto(path);
      await waitForData(page);
      await shoot(page, `docs/arabic/${size.name}/${name}.png`, !path.startsWith("/appointments?"));
    }
    // The dental chart with a tooth open.
    await page.goto("/patients/PAT-2026-00001");
    await waitForData(page);
    await page.getByRole("tab", { name: "مخطط الأسنان" }).click();
    await page.getByRole("button", { name: /^السن 36/ }).click();
    await shoot(page, `docs/arabic/${size.name}/dental-chart.png`, true);
  });
}
