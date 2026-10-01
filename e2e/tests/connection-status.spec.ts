import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";

async function inMode(page: Page, mode: string, flags: string[] = []) {
  await page.addInitScript(
    ({ mode, flags }) => {
      localStorage.setItem("demo_deployment_mode", mode);
      for (const flag of flags) localStorage.setItem(flag, "1");
    },
    { mode, flags },
  );
}

const icon = (page: Page) => page.getByTestId("connection-status");

test("in the cloud the icon says online, and its panel leads to Server & Backup", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  await expect(icon(page)).toHaveAttribute("data-health", "good");
  await expect(icon(page)).toHaveAccessibleName("Online");
  await icon(page).click();
  const panel = page.getByTestId("connection-panel");
  await expect(panel).toContainText("Connected");
  await panel.getByRole("link", { name: "Server & Backup" }).click();
  await expect(page).toHaveURL(/\/settings\/server$/);
  await expect(panel).toHaveCount(0);
});

test("a clinic server shows the server, the internet and the cloud copy", async ({ page }) => {
  await inMode(page, "clinic-server");
  await page.goto("/dashboard");
  await waitForData(page);
  await expect(icon(page)).toHaveAccessibleName("Connected to the clinic server");
  await icon(page).click();
  const panel = page.getByTestId("connection-panel");
  await expect(panel).toContainText("Internet");
  await expect(panel).toContainText("Up to date");
  await expect(panel).toContainText("12 minutes ago");
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
});

test("a clinic server without internet says so", async ({ page }) => {
  await inMode(page, "clinic-server", ["demo_no_internet"]);
  await page.goto("/dashboard");
  await waitForData(page);
  await expect(icon(page)).toHaveAttribute("data-health", "warn");
  await expect(icon(page)).toHaveAccessibleName("Clinic server connected, no internet");
  await icon(page).click();
  await expect(page.getByTestId("connection-panel")).toContainText("Not updated");
});

test("the online copy says whether it is up to date", async ({ page }) => {
  await inMode(page, "cloud-copy");
  await page.goto("/dashboard");
  await waitForData(page);
  await expect(icon(page)).toHaveAccessibleName("Cloud copy up to date (12 minutes ago)");
});

test("a server that cannot be reached, and a computer with no network", async ({ page, context }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  await context.setOffline(true);
  await expect(icon(page)).toHaveAccessibleName("Offline: this computer has no network");
  await expect(icon(page)).toHaveAttribute("data-health", "bad");
  await context.setOffline(false);
  await expect(icon(page)).toHaveAttribute("data-health", "good");
});

test("the server down shows on the icon", async ({ page }) => {
  await inMode(page, "clinic-server", ["demo_server_down"]);
  await page.goto("/dashboard");
  await expect(icon(page)).toHaveAccessibleName("Cannot reach the server");
});

test("on a phone the icon fits in the bar (the theme is in Appearance)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await waitForData(page);
  await expect(icon(page)).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("button", { name: "Theme" })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the status icon in Arabic", async ({ page }) => {
    await inMode(page, "clinic-server", ["demo_no_internet"]);
    await page.goto("/dashboard");
    await waitForData(page);
    await expect(icon(page)).toHaveAccessibleName("متصل بخادم العيادة، بلا إنترنت");
  });
});
