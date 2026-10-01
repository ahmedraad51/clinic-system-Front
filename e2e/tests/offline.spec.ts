import { expect, test } from "../fixtures";
import { formDialog, navigate, openFromMenu, waitForData } from "../helpers";

/*
 * Offline viewing: when the connection is lost, the last copy of what was loaded keeps showing (the Today board,
 * today's appointments, patients' basics), nothing can be changed, and everything loads again when it is back.
 * context.setOffline() takes this computer's network away; the dummy data then fails like a real server.
 */

test("the Today board keeps showing offline, view-only, and refreshes when the network is back", async ({ page, context }) => {
  await page.goto("/patients");
  await waitForData(page);
  await openFromMenu(page, "Today");
  const zainab = page.locator("section").filter({ has: page.getByRole("heading", { name: "د. زينب الهاشمي" }) });
  await expect(zainab).toContainText("مصطفى جبار");
  await expect(zainab.getByRole("button", { name: "Confirm" })).toBeVisible();

  await context.setOffline(true);
  const banner = page.getByTestId("read-only-banner");
  await expect(banner).toHaveAttribute("data-reason", "offline");
  await expect(banner).toContainText("Offline: you are seeing the last copy");
  await expect(banner).toContainText("This computer has no network.");
  await expect(banner).toContainText("What was loaded up to 8:30 AM is shown");
  // The day is still there, without the buttons that change it.
  await expect(zainab).toContainText("مصطفى جبار");
  await expect(zainab.getByRole("button", { name: "Confirm" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Walk-in" })).toHaveCount(0);

  // Pages loaded before come back from the copy.
  await openFromMenu(page, "Patients");
  await expect(page.getByRole("link", { name: "مصطفى جبار" }).first()).toBeVisible();
  await expect(page.getByTestId("open-new-patient")).toHaveCount(0);
  await openFromMenu(page, "Today");
  await expect(zainab).toContainText("مصطفى جبار");

  await context.setOffline(false);
  await expect(banner).toHaveCount(0);
  await expect(zainab.getByRole("button", { name: "Confirm" })).toBeVisible();
});

test("a patient opened before still opens offline, even when the browser loads the page whole", async ({ page, context }) => {
  await page.goto("/patients");
  await waitForData(page);
  // The service worker keeps the app's files and the pages opened.
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await navigate(page, "/patients/PAT-2026-00001");
  await expect(page.getByRole("heading", { name: "زهراء حسين" })).toBeVisible();
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match("/patients/PAT-2026-00001")))).toBe(true);
  await navigate(page, "/today");
  await waitForData(page);
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match("/today")))).toBe(true);

  await context.setOffline(true);
  // A full load of the page, as the browser does when the app's own navigation cannot reach the server.
  await page.reload();
  await expect(page.getByTestId("read-only-banner")).toHaveAttribute("data-reason", "offline");
  await expect(page.getByText("مصطفى جبار").first()).toBeVisible();
  await page.goto("/patients/PAT-2026-00001");
  await expect(page.getByRole("heading", { name: "زهراء حسين" })).toBeVisible();
  // Her penicillin allergy (medical alerts never hide offline).
  await expect(page.getByText(/البنسلين/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit", exact: true })).toHaveCount(0);
  await context.setOffline(false);
});

test("a page never opened says it needs the connection", async ({ page, context }) => {
  await page.goto("/today");
  await waitForData(page);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.goto("/patients/PAT-2026-00002").catch(() => undefined);
  await expect(page.getByText("You are offline")).toBeVisible();
  await context.setOffline(false);
});

test("a form being filled in stays open during a break, and Save says why it cannot", async ({ page, context }) => {
  await page.goto("/payments");
  await waitForData(page);
  await page.getByRole("button", { name: "Add Payment" }).click();
  const dialog = formDialog(page, "New Payment");
  await dialog.getByLabel("Notes").fill("Paid at the desk");
  await context.setOffline(true);
  await expect(page.getByTestId("read-only-banner")).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Notes")).toHaveValue("Paid at the desk");
  await context.setOffline(false);
  await expect(page.getByTestId("read-only-banner")).toHaveCount(0);
  await expect(dialog.getByLabel("Notes")).toHaveValue("Paid at the desk");
});

test("the server out of reach is told apart from no network, and Try Again brings it back", async ({ page }) => {
  await page.goto("/today");
  await waitForData(page);
  // The pretend switch of My Profile: every request fails as if the clinic server were off.
  await page.evaluate(() => localStorage.setItem("demo_server_down", "1"));
  await page.getByRole("button", { name: "Refresh" }).click();
  const banner = page.getByTestId("read-only-banner");
  await expect(banner).toContainText("The server cannot be reached.");
  await expect(page.getByText("مصطفى جبار").first()).toBeVisible();
  await page.evaluate(() => localStorage.removeItem("demo_server_down"));
  await banner.getByRole("button", { name: "Try Again" }).click();
  await expect(banner).toHaveCount(0);
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the offline banner in Arabic", async ({ page, context }) => {
    await page.goto("/today");
    await waitForData(page);
    await context.setOffline(true);
    await expect(page.getByTestId("read-only-banner")).toContainText("غير متصل: تعرض الشاشة آخر نسخة");
    await context.setOffline(false);
  });
});
