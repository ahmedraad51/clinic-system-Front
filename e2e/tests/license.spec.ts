import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import { navigate, waitForData } from "../helpers";

/** A clinic server (or another mode) whose licence is changed before the app loads. Today is 26 Sep 2026. */
async function asClinicServer(page: Page, { mode = "clinic-server", license }: { mode?: string; license?: object } = {}) {
  await page.addInitScript(
    ({ mode, license }) => {
      localStorage.setItem("demo_deployment_mode", mode);
      if (license) (window as unknown as { __mockLicense: object }).__mockLicense = license;
    },
    { mode, license },
  );
}

test("a clinic server shows its license: key, plan, last day and this server's ID", async ({ page }) => {
  await asClinicServer(page);
  await page.goto("/settings");
  await waitForData(page);
  await page.getByRole("link", { name: "License", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/license$/);
  await expect(page.getByTestId("license-status")).toHaveText("Valid");
  await expect(page.getByText("DCL-4F2A-••••-••••-9C1E")).toBeVisible();
  await expect(page.getByTestId("license-expires")).toHaveText("20 Nov 2026");
  await expect(page.getByText("55 days left")).toBeVisible();
  await expect(page.getByText("Clinic Server + Cloud copy")).toBeVisible();
  await expect(page.getByText("SRV-7Q2M-K9XA")).toBeVisible();
  await expect(page.getByText("For 7 days everything keeps working")).toBeVisible();
  await expect(page.getByTestId("license-notice")).toHaveCount(0);
});

test("14 days before it ends, the manager is warned here and across the app", async ({ page }) => {
  await asClinicServer(page, { license: { expires_on: "2026-10-06" } });
  await page.goto("/dashboard");
  await waitForData(page);
  const notice = page.getByTestId("plan-notice");
  await expect(notice).toContainText("ends on 6 Oct 2026 (10 days left)");
  await notice.getByRole("link", { name: "Renew" }).click();
  await expect(page).toHaveURL(/\/settings\/license$/);
  const warning = page.getByTestId("license-notice");
  await expect(warning).toHaveAttribute("data-state", "ending");
  await expect(warning).toContainText("Your license ends soon");
  await expect(warning).toContainText("It is valid until 6 Oct 2026 (10 days left).");
});

test("an ended license makes the app view-only until a new key is entered", async ({ page }) => {
  await asClinicServer(page, { license: { expires_on: "2026-09-10" } });
  await page.goto("/patients");
  await waitForData(page);
  await expect(page.getByTestId("read-only-banner")).toHaveAttribute("data-reason", "subscription");
  await expect(page.getByTestId("read-only-banner")).toContainText("View-only: the license has ended");
  await expect(page.getByTestId("open-new-patient")).toHaveCount(0);

  await navigate(page, "/settings/license");
  await expect(page.getByTestId("license-notice")).toContainText("The app is view-only until a new key is entered.");
  const key = page.getByLabel("New license key");
  // Not the shape of a key, then a key for another computer, then the right one typed loosely.
  await key.fill("DCL-1234");
  await page.getByRole("button", { name: "Activate" }).click();
  await expect(page.getByText("It looks like DCL-XXXX-XXXX-XXXX-XXXX.")).toBeVisible();
  await key.fill("DCL-AAAA-BBBB-CCCC-0000");
  await page.getByRole("button", { name: "Activate" }).click();
  await expect(page.getByText("This license key is not right for this server.")).toBeVisible();
  await key.fill("dcl aaaa bbbb cccc dddd");
  await page.getByRole("button", { name: "Activate" }).click();
  await expect(page.getByRole("status").filter({ hasText: "License activated. Valid until 26 Sep 2027." })).toBeVisible();
  await expect(page.getByTestId("license-status")).toHaveText("Valid");
  await expect(page.getByText("DCL-AAAA-••••-••••-DDDD")).toBeVisible();
  await expect(page.getByTestId("read-only-banner")).toHaveCount(0);
});

test("the cloud needs no license", async ({ page }) => {
  await page.goto("/settings");
  await waitForData(page);
  await expect(page.getByRole("link", { name: "Server & Backup" })).toBeVisible();
  await expect(page.getByRole("link", { name: "License", exact: true })).toHaveCount(0);
  await navigate(page, "/settings/license");
  await expect(page.getByText("needs no license")).toBeVisible();
});

test("the online copy shows the license but cannot take a key", async ({ page }) => {
  await asClinicServer(page, { mode: "cloud-copy" });
  await page.goto("/settings/license");
  await waitForData(page);
  await expect(page.getByTestId("license-status")).toHaveText("Valid");
  await expect(page.getByLabel("New license key")).toHaveCount(0);
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the license in Arabic", async ({ page }) => {
    await asClinicServer(page, { license: { expires_on: "2026-10-06" } });
    await page.goto("/settings/license");
    await waitForData(page);
    await expect(page.getByTestId("license-notice")).toContainText("ترخيصك ينتهي قريبًا");
    await expect(page.getByTestId("license-status")).toHaveText("ينتهي قريبًا");
  });
});
