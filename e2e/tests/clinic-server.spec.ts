import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import { navigate, waitForData } from "../helpers";

/** Shows the app as a clinic server (the dummy data's preview), with or without the internet. */
async function asClinicServer(page: Page, { internet }: { internet: boolean }) {
  await page.addInitScript((noInternet) => {
    localStorage.setItem("demo_deployment_mode", "clinic-server");
    if (noInternet) localStorage.setItem("demo_no_internet", "1");
    else localStorage.removeItem("demo_no_internet");
  }, !internet);
}

test("with no internet, a WhatsApp reminder says so and stays in its list", async ({ page }) => {
  await asClinicServer(page, { internet: false });
  await page.goto("/today");
  await waitForData(page);
  const reminders = page.getByRole("heading", { name: "Tomorrow's reminders (1 to send)" });
  await expect(reminders).toBeVisible();
  await expect(page.getByText("No internet at the clinic right now")).toBeVisible();
  await expect(page.getByText("The reminders stay in this list until the internet is back.", { exact: false })).toBeVisible();

  const send = page.getByRole("button", { name: /Send reminder/ });
  await expect(send).toHaveAttribute("aria-disabled", "true");
  await expect(send).toContainText("Needs internet");
  // A person can still press it (it is only marked disabled): nothing happens.
  await send.click({ force: true });
  // Nothing opened, nothing marked: still one to send.
  await expect(reminders).toBeVisible();
  await expect(page.getByText("Reminder opened")).toHaveCount(0);

  // The same on the patient page and in the Send Message dialog.
  await navigate(page, "/patients/PAT-2026-00001");
  await waitForData(page);
  await expect(page.getByRole("button", { name: /WhatsApp/ }).first()).toContainText("Needs internet");
  await navigate(page, "/appointments/APT-2026-00001");
  await waitForData(page);
  await page.getByRole("button", { name: "Send Message" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("WhatsApp needs the internet, and the clinic has none right now.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Needs internet" })).toBeDisabled();
  await expect(dialog.getByRole("link", { name: "Open WhatsApp" })).toHaveCount(0);
});

test("with the internet, a clinic server opens WhatsApp as usual", async ({ page }) => {
  await asClinicServer(page, { internet: true });
  await page.goto("/today");
  await waitForData(page);
  await expect(page.getByText("No internet at the clinic right now")).toHaveCount(0);
  const send = page.getByRole("link", { name: "Send reminder" });
  await expect(send).toHaveAttribute("href", /^https:\/\/wa\.me\//);
});

test("a clinic server asks nothing from other websites: no fonts, scripts, images or data", async ({ page }) => {
  await asClinicServer(page, { internet: false });
  const outside: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname) && !url.protocol.startsWith("data") && !url.protocol.startsWith("blob")) {
      outside.push(request.url());
    }
  });
  await page.goto("/dashboard");
  await waitForData(page);
  for (const path of ["/today", "/patients/PAT-2026-00001", "/appointments?view=day", "/payments/PAY-2026-00001", "/reports", "/settings", "/site"]) {
    await navigate(page, path);
    await waitForData(page);
  }
  // The fonts are the app's own.
  expect(await page.evaluate(() => document.fonts.check("16px 'IBM Plex Sans Arabic'"))).toBe(true);
  expect(outside).toEqual([]);
});
