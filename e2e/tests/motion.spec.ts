import { expect, test } from "../fixtures";
import { navigate, waitForData } from "../helpers";

test("a new page fades in, and nothing is left moved once it has", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  await navigate(page, "/patients");
  const wrapper = page.locator("#main > div[class*='animate-page-in']");
  await expect(wrapper).toHaveCSS("animation-name", "page-in");
  // A transform left on the page would make dialogs inside it (position: fixed) cover only the page.
  await expect.poll(() => wrapper.evaluate((el) => getComputedStyle(el).transform)).toBe("none");

  // People who ask their computer for less motion get none.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await navigate(page, "/appointments?view=list");
  await expect(wrapper).toHaveCSS("animation-name", "none");
});
