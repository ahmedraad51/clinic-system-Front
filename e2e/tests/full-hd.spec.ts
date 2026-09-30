import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";

/*
 * On a 1920 × 1080 screen at 100 % (Windows taskbar, Chrome's tabs and address bar: about 1920 × 940 of page), the
 * whole menu fits without scrolling, and the dashboard shows "Needs attention" and today's appointments without
 * scrolling, in English and in Arabic.
 */
for (const lang of ["en", "ar"] as const) {
  test.describe(lang, () => {
    test.use({ lang });

    test(`a full HD screen shows the whole menu and the day's work without scrolling (${lang})`, async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 940 });
      await page.goto("/dashboard");
      await waitForData(page);
      const nav = page.locator("aside nav");
      const { scroll, client } = await nav.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
      expect(scroll).toBeLessThanOrEqual(client);
      // The last menu item is on screen.
      await expect(nav.getByRole("link").last()).toBeInViewport({ ratio: 1 });

      const card = (name: RegExp) => page.locator("section").filter({ has: page.getByRole("heading", { name }) });
      const attention = card(lang === "en" ? /^Needs attention$/ : /^بحاجة إلى متابعة$/);
      const today = card(lang === "en" ? /^Today$/ : /^اليوم$/);
      await expect(attention).toBeInViewport({ ratio: 1 });
      await expect(today).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });
  });
}
