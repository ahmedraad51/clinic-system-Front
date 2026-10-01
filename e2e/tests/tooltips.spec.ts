import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import { navigate, waitForData } from "../helpers";

/** Every element that would show the browser's own hint (an iframe's title is its name, not a hint). */
async function browserHints(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("[title]:not(iframe)")).map((el) => `${el.tagName} ${el.getAttribute("title")}`),
  );
}

/** The brightness (0 dark … 255 light) of a CSS colour. */
async function lightness(page: Page, selector: string, property: "backgroundColor" | "color") {
  return page.locator(selector).evaluate((el, prop) => {
    const canvas = document.createElement("canvas");
    const g = canvas.getContext("2d")!;
    g.fillStyle = getComputedStyle(el)[prop];
    g.fillRect(0, 0, 1, 1);
    const [r, gr, b] = g.getImageData(0, 0, 1, 1).data;
    return (r + gr + b) / 3;
  }, property);
}

test("a hint shows on hover, next to its button, and goes when the mouse leaves", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  const scan = page.getByRole("button", { name: "Scan a patient card" });
  const hint = page.getByRole("tooltip");

  await scan.hover();
  await expect(hint).toHaveText("Scan a patient card");
  // Our own: the app's font, not the browser's yellow box; placed under or over the button, centred on it.
  expect(await hint.evaluate((el) => getComputedStyle(el).fontFamily)).toContain("IBM Plex Sans");
  const button = (await scan.boundingBox())!;
  const box = (await hint.boundingBox())!;
  expect(Math.abs(box.x + box.width / 2 - (button.x + button.width / 2))).toBeLessThan(button.width);
  expect(box.y > button.y + button.height || box.y + box.height < button.y).toBe(true);
  // The text repeats the button's name, so it is not read twice.
  await expect(scan).not.toHaveAttribute("aria-describedby", /app-tooltip/);

  await page.mouse.move(5, 600);
  await expect(hint).toHaveCount(0);
});

test("a hint shows on keyboard focus, and Escape closes it without closing the dialog", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00001");
  await waitForData(page);
  await page.getByRole("tab", { name: /X-rays & Photos/ }).click();
  await page.getByRole("button", { name: "Open Bitewing · 20 Aug 2026 · Teeth 26, 27, 36, 37" }).click();
  const viewer = page.getByRole("dialog", { name: "Bitewing · 20 Aug 2026 · Teeth 26, 27, 36, 37" });
  await expect(viewer).toBeVisible();

  // A focus from the keyboard (Tab moves it, then it is put on the button).
  await page.keyboard.press("Tab");
  await viewer.getByRole("button", { name: "Zoom in" }).focus();
  const hint = page.getByRole("tooltip");
  await expect(hint).toHaveText("Zoom in");

  await page.keyboard.press("Escape");
  await expect(hint).toHaveCount(0);
  await expect(viewer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
});

test("a hint with more than the name describes its element while it shows", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00001");
  await waitForData(page);
  await page.getByRole("tab", { name: "Dental Chart" }).click();
  const tooth = page.getByRole("button", { name: /^Tooth 36,/ });
  await tooth.hover();
  const hint = page.getByRole("tooltip");
  await expect(hint).toContainText("36");
  await expect(tooth).toHaveAttribute("aria-describedby", "app-tooltip");
  await page.mouse.move(5, 5);
  await expect(hint).toHaveCount(0);
  await expect(tooth).not.toHaveAttribute("aria-describedby", /.+/);
});

test("no page uses the browser's own hint", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  expect(await browserHints(page)).toEqual([]);
  for (const path of ["/patients", "/today", "/appointments?view=day", "/appointments/APT-2026-00001", "/payments/PAY-2026-00001", "/settings", "/whatsapp"]) {
    await navigate(page, path);
    await waitForData(page);
    expect(await browserHints(page), path).toEqual([]);
  }
  await navigate(page, "/patients/PAT-2026-00001");
  await waitForData(page);
  for (const tab of ["Dental Chart", /X-rays & Photos/]) {
    await page.getByRole("tab", { name: tab }).click();
    await waitForData(page);
    expect(await browserHints(page), String(tab)).toEqual([]);
  }
  await page.getByRole("button", { name: "Open Bitewing · 20 Aug 2026 · Teeth 26, 27, 36, 37" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await browserHints(page), "the X-ray viewer").toEqual([]);
});

test("the hint is dark on a light page and light on a dark one", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  await page.getByRole("button", { name: "Appearance" }).hover();
  await expect(page.getByRole("tooltip")).toBeVisible();
  expect(await lightness(page, "[role=tooltip]", "backgroundColor")).toBeLessThan(90);
  expect(await lightness(page, "[role=tooltip]", "color")).toBeGreaterThan(200);

  await page.evaluate(() => localStorage.setItem("appearance", JSON.stringify({ mode: "dark" })));
  await page.reload();
  await waitForData(page);
  await page.getByRole("button", { name: "Appearance" }).hover();
  await expect(page.getByRole("tooltip")).toBeVisible();
  expect(await lightness(page, "[role=tooltip]", "backgroundColor")).toBeGreaterThan(160);
  expect(await lightness(page, "[role=tooltip]", "color")).toBeLessThan(90);
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the hint reads right to left, in Arabic", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForData(page);
    await page.getByRole("button", { name: "مسح بطاقة مريض" }).hover();
    const hint = page.getByRole("tooltip");
    await expect(hint).toHaveText("مسح بطاقة مريض");
    expect(await hint.evaluate((el) => getComputedStyle(el).direction)).toBe("rtl");
    expect(await hint.evaluate((el) => getComputedStyle(el).fontFamily)).toContain("IBM Plex Sans Arabic");
  });
});
