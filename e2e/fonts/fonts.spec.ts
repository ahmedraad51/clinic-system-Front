import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures";
import { waitForData } from "../helpers";

/**
 * The font comparison for the owner: the dashboard and a patient page in each candidate font, in Arabic and in
 * English, saved to docs/fonts/. Run `npm run screenshots:fonts` (SKIP_BUILD=1 works too).
 * The candidates are loaded from Google Fonts for these pictures only; the chosen one is then put in public/fonts/
 * like the current one (see src/app/fonts.css).
 */
test.use({ viewport: { width: 1440, height: 900 } });

const FONTS: Array<{ slug: string; family: string; google?: string }> = [
  // The current fonts (IBM Plex Sans in English, IBM Plex Sans Arabic in Arabic), from public/fonts/.
  { slug: "1-ibm-plex-sans-arabic", family: "IBM Plex Sans Arabic" },
  { slug: "2-cairo", family: "Cairo", google: "Cairo:wght@400;500;600" },
  { slug: "3-tajawal", family: "Tajawal", google: "Tajawal:wght@400;500;700" },
  { slug: "4-readex-pro", family: "Readex Pro", google: "Readex+Pro:wght@400;500;600" },
];

const PAGES: Array<[string, string]> = [
  ["dashboard", "/dashboard"],
  ["patient", "/patients/PAT-2026-00001"],
];

async function applyFont(page: Page, font: (typeof FONTS)[number]) {
  if (!font.google) return;
  await page.addStyleTag({ url: `https://fonts.googleapis.com/css2?family=${font.google}&display=block` });
  // The same family for both languages: each candidate has Arabic and Latin letters.
  await page.addStyleTag({ content: `html:root { --font-plex: "${font.family}"; --font-arabic: "${font.family}"; }` });
}

for (const lang of ["ar", "en"] as const) {
  test.describe(lang, () => {
    test.use({ lang });
    for (const font of FONTS) {
      test(font.slug, async ({ page }) => {
        for (const [name, path] of PAGES) {
          await page.goto(path);
          await waitForData(page);
          await applyFont(page, font);
          await page.evaluate(() => document.fonts.ready);
          const family = lang === "ar" || font.google ? font.family : "IBM Plex Sans";
          expect(await page.evaluate((f) => document.fonts.check(`16px "${f}"`), family)).toBe(true);
          await page.waitForTimeout(500);
          await page.screenshot({ path: `docs/fonts/${font.slug}-${lang}-${name}.png` });
        }
      });
    }
  });
}
