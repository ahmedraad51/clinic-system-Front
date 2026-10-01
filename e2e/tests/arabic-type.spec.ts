import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";
import { joinParts, setLocale } from "../../src/i18n/runtime";

/** Computed style of the first element matching `selector`. */
const styleOf = (selector: string, property: string) => (page: import("@playwright/test").Page) =>
  page.evaluate(([sel, prop]) => getComputedStyle(document.querySelector(sel) as Element).getPropertyValue(prop), [selector, property]);

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("Arabic text gets its own font, size, line height and no letter spacing", async ({ page }) => {
    await page.goto("/patients/PAT-2026-00008");
    await waitForData(page);
    // IBM Plex Sans Arabic for both scripts in the text (its Latin letters match its Arabic ones).
    const body = await styleOf("body", "font-family")(page);
    expect(body.split(",")[0]).toContain("IBM Plex Sans Arabic");
    // A step larger than English, with taller lines: 16 px text on 27 px lines, 14 px small text on 24 px lines.
    const sm = await page.evaluate(() => {
      const el = document.querySelector(".text-sm") as Element;
      const style = getComputedStyle(el);
      return [style.fontSize, style.lineHeight];
    });
    expect(sm).toEqual(["16px", "27px"]);
    const xs = await page.evaluate(() => {
      const style = getComputedStyle(document.querySelector(".text-xs") as Element);
      return [style.fontSize, style.lineHeight];
    });
    expect(xs).toEqual(["14px", "24px"]);
    // Letter spacing would pull joined letters apart: none, even on a label styled "tracking-wide".
    expect(await styleOf(".tracking-wide", "letter-spacing")(page)).toMatch(/^(normal|0px)$/);
  });

  test("a Latin ID and an Arabic age keep their order", async ({ page }) => {
    await page.goto("/patients");
    await waitForData(page);
    const meta = page.getByRole("row", { name: /Abbas Mahdi/ }).locator("span.block.text-xs").first();
    // Each part isolated, so "53 سنة" stays together after the ID.
    await expect(meta).toHaveText("⁨PAT-2026-00004⁩ · ⁨53 سنة⁩ · ⁨ذكر⁩");
  });
});

test("English keeps its own type", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00008");
  await waitForData(page);
  expect((await styleOf("body", "font-family")(page)).split(",")[0]).toMatch(/^"?IBM Plex Sans"?$/);
  const sm = await page.evaluate(() => getComputedStyle(document.querySelector(".text-sm") as Element).fontSize);
  expect(sm).toBe("15px");
});

test("joined parts are isolated only on right-to-left screens", () => {
  setLocale("en", false);
  expect(joinParts(["PAT-2026-00004", "53 years", "", null, "Male"], " · ")).toBe("PAT-2026-00004 · 53 years · Male");
  setLocale("ar", false);
  try {
    expect(joinParts(["PAT-2026-00004", "53 سنة"], " · ")).toBe("⁨PAT-2026-00004⁩ · ⁨53 سنة⁩");
  } finally {
    setLocale("en", false);
  }
});
