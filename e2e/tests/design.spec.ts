import { expect, test } from "../fixtures";
import { navigate, openFromMenu, waitForData } from "../helpers";
import { avatarKind, avatarLook, nameSeed } from "../../src/lib/avatar";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("a design option can be tried on this computer, and it stays", async ({ page }) => {
  await page.goto("/profile");
  await waitForData(page);
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-design", "a");

  const options = page.getByRole("radiogroup", { name: "Design option" });
  await expect(options.getByRole("radio", { name: /Fresh Mint/ })).toHaveAttribute("aria-checked", "true");
  await options.getByRole("radio", { name: /Midnight/ }).click();
  await expect(html).toHaveAttribute("data-design", "b");
  await expect(options.getByRole("radio", { name: /Midnight/ })).toHaveAttribute("aria-checked", "true");
  // Arrow keys move through the options like any radio group.
  await page.keyboard.press("ArrowRight");
  await expect(html).toHaveAttribute("data-design", "c");
  await expect(options.getByRole("radio", { name: /Sunrise/ })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(html).toHaveAttribute("data-design", "b");
  // Each option has its own font.
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain("Manrope");

  // Kept while moving around, and after the page is loaded again.
  await navigate(page, "/dashboard");
  await expect(html).toHaveAttribute("data-design", "b");
  await page.reload();
  await waitForData(page);
  await expect(html).toHaveAttribute("data-design", "b");

  // No clinic colour chosen: the design's own colour is used, and Settings says so.
  await navigate(page, "/settings");
  await expect(page.getByRole("button", { name: "Colour of the design" })).toHaveAttribute("aria-pressed", "true");
  const brand = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--brand").trim());
  expect(brand).toBe("#4f46e5");
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
  // The welcome banner sums up the day.
  await expect(page.getByText("2 appointments today, 2 still to come.")).toBeVisible();
});

test("patients and doctors get friendly drawn avatars", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Patients");
  await waitForData(page);
  const row = (name: string) => page.getByRole("row").filter({ has: page.getByRole("link", { name, exact: true }) });
  // Fatima is 9: drawn as a girl. Grown-ups as a man or a woman.
  await expect(row("Fatima Salman").locator("[data-avatar]")).toHaveAttribute("data-avatar", "girl");
  await expect(row("Zahraa Hussein").locator("[data-avatar]")).toHaveAttribute("data-avatar", "woman");
  await expect(row("Mustafa Jabbar").locator("[data-avatar]")).toHaveAttribute("data-avatar", "man");

  // The Today board shows each doctor with their picture.
  await navigate(page, "/today");
  await waitForData(page);
  const rusul = page.locator("section").filter({ has: page.getByRole("heading", { name: "Dr. Rusul Kareem" }) });
  await expect(rusul.getByRole("heading").locator("[data-avatar]")).toHaveAttribute("data-avatar", "woman");
});

test("a doctor's photo can be uploaded and replaces the drawing", async ({ page }) => {
  await page.goto("/doctors");
  await waitForData(page);
  const row = page.getByRole("row").filter({ has: page.getByRole("button", { name: "Dr. Ali Al-Jubouri" }) });
  await expect(row.locator("[data-avatar]")).toHaveAttribute("data-avatar", "man");
  await row.getByRole("button", { name: "Edit" }).click();

  const dialog = page.getByRole("dialog", { name: "Edit Doctor" });
  await dialog.getByLabel("Doctor photo").setInputFiles({ name: "ali.png", mimeType: "image/png", buffer: PNG });
  await expect(dialog.getByRole("button", { name: "Change Photo" })).toBeVisible();
  await expect(dialog.locator("[data-avatar]").first()).toHaveAttribute("data-avatar", "photo");
  await dialog.getByRole("button", { name: "Save Doctor" }).click();
  await expect(dialog).toBeHidden();
  await expect(row.locator("[data-avatar]")).toHaveAttribute("data-avatar", "photo");

  // Removing it brings the drawing back.
  await row.getByRole("button", { name: "Edit" }).click();
  await dialog.getByRole("button", { name: "Remove Photo" }).click();
  await dialog.getByRole("button", { name: "Save Doctor" }).click();
  await expect(dialog).toBeHidden();
  await expect(row.locator("[data-avatar]")).toHaveAttribute("data-avatar", "man");
});

test("an avatar's drawing follows gender and age, and a name always gets the same one", () => {
  expect(avatarKind("Female", 9)).toBe("girl");
  expect(avatarKind("Male", "12")).toBe("boy");
  expect(avatarKind("Male", 13)).toBe("man");
  expect(avatarKind("Female", undefined)).toBe("woman");
  expect(avatarKind("Male", "")).toBe("man");
  // 0 is how an empty age comes back: not a baby.
  expect(avatarKind("Male", 0)).toBe("man");
  expect(avatarKind(undefined, 30)).toBe("person");
  expect(nameSeed("Zahraa Hussein")).toBe(nameSeed("  zahraa hussein "));
  expect(avatarLook("Zahraa Hussein", "Female", 35)).toEqual(avatarLook("Zahraa Hussein", "Female", 35));
  // Only men get beards; only women get headscarves; older people get grey hair.
  expect(avatarLook("Zahraa Hussein", "Female", 35).beard).toBe(false);
  expect(avatarLook("Saad Nouri", "Male", 64).hijab).toBe(false);
  expect(avatarLook("Saad Nouri", "Male", 64).hair).toBe("#b9b4ae");
});
