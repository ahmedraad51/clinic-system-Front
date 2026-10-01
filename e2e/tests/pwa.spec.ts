import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";

test("the app has a manifest and icons, so it can be installed", async ({ page, request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as {
    name: string;
    start_url: string;
    display: string;
    icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    shortcuts: Array<{ url: string }>;
  };
  expect(manifest.name).toBe("DentClinic");
  expect(manifest.start_url).toBe("/dashboard");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  expect(manifest.shortcuts.map((shortcut) => shortcut.url)).toContain("/today");
  for (const icon of manifest.icons) {
    const file = await request.get(icon.src);
    expect(file.ok(), icon.src).toBe(true);
    expect(file.headers()["content-type"]).toContain(icon.type);
  }

  await page.goto("/dashboard");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/icons/apple-touch-icon.png");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#6a5fdd");
});

test("the service worker shows a friendly page when there is no connection", async ({ page, context }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  // The production build registers it.
  const script = await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.scriptURL ?? "");
  expect(script).toMatch(/\/sw\.js$/);

  await context.setOffline(true);
  await page.goto("/patients").catch(() => undefined);
  await expect(page.getByRole("heading", { name: "You are offline" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "لا يوجد اتصال بالإنترنت" })).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("button", { name: /Try Again/ }).click();
  await expect(page).toHaveURL(/\/patients$/);
  await waitForData(page);
  await expect(page.getByRole("heading", { name: "Patients" })).toBeVisible();
});

test("the profile page offers to install the app", async ({ page }) => {
  await page.goto("/profile");
  await waitForData(page);
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: "Install DentClinic" }) });
  // No offer from the browser here: it says how.
  await expect(card.getByTestId("install-state")).toContainText("use the install icon");

  // When the browser offers it, one button installs.
  await page.evaluate(() => {
    const offer = new Event("beforeinstallprompt", { cancelable: true }) as Event & { prompt?: () => Promise<void>; userChoice?: Promise<unknown> };
    offer.prompt = async () => {
      (window as unknown as { __prompted?: boolean }).__prompted = true;
    };
    offer.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(offer);
  });
  await card.getByRole("button", { name: "Install the App" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __prompted?: boolean }).__prompted)).toBe(true);
  await expect(card.getByRole("button", { name: "Install the App" })).toHaveCount(0);
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the install card in Arabic", async ({ page }) => {
    await page.goto("/profile");
    await waitForData(page);
    await expect(page.getByRole("heading", { name: "تثبيت DentClinic" })).toBeVisible();
  });
});
