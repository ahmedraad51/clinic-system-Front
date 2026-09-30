import { expect, test } from "../fixtures";
import { navigate, openFromMenu, waitForData } from "../helpers";
import { initials } from "../../src/components/Avatar";
import { DEFAULT_THEME_COLOR, readableBrand } from "../../src/lib/theme";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("the app is violet with the Poppins font until the clinic picks its own colour", async ({ page }) => {
  await page.goto("/settings");
  await waitForData(page);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain("Poppins");
  const brand = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--brand").trim());
  expect(await brand()).toBe(DEFAULT_THEME_COLOR);
  // The clinic colour is on the Features tab.
  await page.getByRole("tab", { name: "Features" }).click();
  await expect(page.getByRole("button", { name: "Default colour" })).toHaveAttribute("aria-pressed", "true");

  // A colour chosen and saved is used at once (darkened for readable white text); the default can be chosen again.
  await page.getByRole("button", { name: "Rose" }).click();
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect.poll(brand).toBe(readableBrand("#ff4c51"));
  await page.getByRole("button", { name: "Default colour" }).click();
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect.poll(brand).toBe(DEFAULT_THEME_COLOR);
  await navigate(page, "/dashboard");
  expect(await brand()).toBe(DEFAULT_THEME_COLOR);
});

test("the dashboard shows revenue, visits and treatments as charts", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  const revenue = page.getByRole("img", { name: /^Revenue in IQD, last 6 months/ });
  await expect(revenue).toBeVisible();
  // Two payments are dated today (26 Sep 2026): IQD 250,000 this month.
  await expect(revenue).toHaveAttribute("aria-label", /Sep 2026 250K/);
  await expect(page.getByRole("img", { name: /^Visits, last 6 months/ })).toBeVisible();
  const types = page.getByRole("img", { name: /^Treatment plans by type/ });
  await expect(types).toBeVisible();
  await expect(types).toHaveAttribute("aria-label", /Filling \d+ \(\d+%\)/);
  // The welcome card sums up the day.
  await expect(page.getByText("2 appointments today, 2 still to come.")).toBeVisible();
});

test("people are shown by their initials, or by a photo when one is uploaded", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Patients");
  await waitForData(page);
  const patient = page.getByRole("row").filter({ has: page.getByRole("link", { name: "Zahraa Hussein", exact: true }) });
  await expect(patient.locator("[data-avatar]")).toHaveAttribute("data-avatar", "initials");
  await expect(patient.locator("[data-avatar]")).toHaveText("ZH");

  await navigate(page, "/doctors");
  await waitForData(page);
  const row = page.getByRole("row").filter({ has: page.getByRole("link", { name: "Dr. Ali Al-Jubouri" }) });
  await expect(row.locator("[data-avatar]")).toHaveText("AJ");
  await row.getByRole("button", { name: "Edit" }).click();

  const dialog = page.getByRole("dialog", { name: "Edit Doctor" });
  await dialog.getByLabel("Doctor photo").setInputFiles({ name: "ali.png", mimeType: "image/png", buffer: PNG });
  await expect(dialog.getByRole("button", { name: "Change Photo" })).toBeVisible();
  await expect(dialog.locator("[data-avatar]").first()).toHaveAttribute("data-avatar", "photo");
  await dialog.getByRole("button", { name: "Save Doctor" }).click();
  await expect(dialog).toBeHidden();
  await expect(row.locator("[data-avatar]")).toHaveAttribute("data-avatar", "photo");

  // Removing it brings the initials back.
  await row.getByRole("button", { name: "Edit" }).click();
  await dialog.getByRole("button", { name: "Remove Photo" }).click();
  await dialog.getByRole("button", { name: "Save Doctor" }).click();
  await expect(dialog).toBeHidden();
  await expect(row.locator("[data-avatar]")).toHaveAttribute("data-avatar", "initials");
});

test("initials come from the first and last names", () => {
  expect(initials("Zahraa Hussein")).toBe("ZH");
  expect(initials("Dr. Noor Al-Saadi")).toBe("NS");
  expect(initials("Administrator")).toBe("A");
  expect(initials("زهراء حسين")).toBe("زح");
  expect(initials("  ")).toBe("");
});

test("dark mode and a collapsed menu are chosen on this computer and kept", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  const html = page.locator("html");
  await expect(html).not.toHaveClass(/\bdark\b/);

  // The theme menu in the top bar.
  await page.getByRole("button", { name: "Theme" }).click();
  await page.getByRole("button", { name: "Dark" }).click();
  await expect(html).toHaveClass(/\bdark\b/);
  const surface = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--surface").trim());
  expect(await surface()).toBe("#2f3349");

  // The pin in the menu collapses it to icons; the page moves over.
  const menu = page.locator("aside");
  await page.getByRole("button", { name: "Collapse the menu to icons" }).click();
  await expect(html).toHaveClass(/\bnav-collapsed\b/);
  // Pointing at the menu, or a focused button inside it, opens it again: move away and let go of the focus.
  await page.mouse.move(900, 500);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect.poll(async () => (await menu.boundingBox())?.width).toBeLessThan(80);

  // Both are kept after the page is loaded again, before the first paint.
  await page.reload();
  await waitForData(page);
  await expect(html).toHaveClass(/\bdark\b/);
  await expect(html).toHaveClass(/\bnav-collapsed\b/);

  // The Appearance panel: back to light, the menu open, a bordered skin.
  await page.getByRole("button", { name: "Appearance" }).click();
  const panel = page.getByRole("dialog", { name: "Appearance" });
  await panel.getByRole("group", { name: "Theme" }).getByRole("button", { name: "Light" }).click();
  await panel.getByRole("group", { name: "Menu" }).getByRole("button", { name: "Open" }).click();
  await panel.getByRole("group", { name: "Skin" }).getByRole("button", { name: "Bordered" }).click();
  await expect(html).not.toHaveClass(/\bdark\b/);
  await expect(html).not.toHaveClass(/\bnav-collapsed\b/);
  await expect(html).toHaveClass(/\bskin-bordered\b/);
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  // The built CSS may write white as #fff.
  expect(["#fff", "#ffffff"]).toContain(await surface());
});

test("the semi-dark menu is dark from the first paint, and a clicked link does not keep a collapsed menu open", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("appearance", JSON.stringify({ semiDark: true, collapsed: true })));
  await page.goto("/dashboard");
  const menu = page.locator("aside");
  await expect.poll(() => menu.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(47, 51, 73)");
  await waitForData(page);

  // Point at the menu to open it, click a link, move away: it closes again (the focus from a click does not hold it).
  await menu.hover();
  await expect.poll(async () => (await menu.boundingBox())?.width).toBeGreaterThan(200);
  await menu.getByRole("link", { name: "Patients", exact: true }).click();
  await expect(page).toHaveURL(/\/patients$/);
  await page.mouse.move(900, 500);
  await expect.poll(async () => (await menu.boundingBox())?.width).toBeLessThan(80);
});
