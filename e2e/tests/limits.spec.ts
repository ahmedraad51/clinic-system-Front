import fs from "node:fs";
import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import { navigate, waitForData } from "../helpers";

/** Changes the dummy clinic's plan before the app loads (test-only switches of src/lib/mockPlatform.ts). */
async function withPlan(page: Page, { limits, subscription }: { limits?: object; subscription?: object }) {
  await page.addInitScript(
    ({ limits, subscription }) => {
      const w = window as unknown as { __mockPlanLimits?: object; __mockSubscription?: object };
      if (limits) w.__mockPlanLimits = limits;
      if (subscription) w.__mockSubscription = subscription;
    },
    { limits, subscription },
  );
}

test("adding a doctor beyond the plan's limit explains why and offers an upgrade", async ({ page }) => {
  // The dummy clinic has 5 active doctors.
  await withPlan(page, { limits: { doctors: 5 } });
  await page.goto("/doctors");
  await waitForData(page);
  await page.getByRole("button", { name: "Add Doctor" }).click();
  const dialog = page.getByRole("dialog", { name: "Your plan's limit" });
  await expect(dialog).toContainText("Your plan (Cloud) has room for 5 active doctors, and all are in use.");
  await expect(page.getByRole("dialog", { name: "Add Doctor" })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Request an Upgrade" }).click();
  const ask = page.getByRole("dialog", { name: "Request a Plan Change" });
  await ask.getByRole("button", { name: "Send Request" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Request sent." })).toBeVisible();
});

test("adding a user, or switching one on, beyond the limit is explained", async ({ page }) => {
  // 6 staff users can log in.
  await withPlan(page, { limits: { users: 6 } });
  await page.goto("/users");
  await waitForData(page);
  await page.getByRole("button", { name: "Add User" }).click();
  await expect(page.getByTestId("limit-dialog")).toHaveAttribute("data-kind", "users");
  await expect(page.getByTestId("limit-dialog")).toContainText("has room for 6 staff logins");
  await page.getByTestId("limit-dialog").getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByTestId("limit-dialog")).toHaveCount(0);
});

test("X-rays that would go over the plan's storage are not added", async ({ page }) => {
  // 6 demo images take about 14 MB; the plan has room for about 10 MB.
  await withPlan(page, { limits: { storageGb: 0.01 } });
  await page.goto("/patients/PAT-2026-00001");
  await waitForData(page);
  await page.getByRole("tab", { name: /X-rays & Photos/ }).click();
  await page.locator('input[type="file"]:not([capture])').first().setInputFiles({
    name: "opg.png",
    mimeType: "image/png",
    buffer: fs.readFileSync("public/icons/icon-192.png"),
  });
  await expect(page.getByTestId("limit-dialog")).toHaveAttribute("data-kind", "storage");
  await expect(page.getByRole("dialog", { name: /Add 1 image/ })).toHaveCount(0);
});

test("a plan that ends soon is shown to the manager, who can close it for the day", async ({ page }) => {
  await withPlan(page, { subscription: { paid_until: "2026-10-03" } });
  await page.goto("/dashboard");
  await waitForData(page);
  const notice = page.getByTestId("plan-notice");
  await expect(notice).toContainText("Your DentClinic plan ends on 3 Oct 2026 (7 days left).");
  await notice.getByRole("button", { name: "Close" }).click();
  await expect(notice).toHaveCount(0);
  await navigate(page, "/patients");
  await expect(page.getByTestId("plan-notice")).toHaveCount(0);
});

test("an ended plan warns everyone during its grace days, then the app becomes view-only", async ({ page }) => {
  // Ended 3 days ago: changes are still possible until the 7 grace days are over.
  await withPlan(page, { subscription: { status: "ended", paid_until: "2026-09-23" } });
  await page.goto("/patients");
  await waitForData(page);
  await expect(page.getByTestId("plan-notice")).toContainText("Your DentClinic plan ended on 23 Sep 2026. Renew it before 1 Oct 2026");
  await expect(page.getByTestId("open-new-patient")).toBeVisible();
});

test("after the grace days nothing can be changed, and nothing is lost", async ({ page }) => {
  await withPlan(page, { subscription: { status: "ended", paid_until: "2026-09-10" } });
  await page.goto("/patients");
  await waitForData(page);
  const banner = page.getByTestId("read-only-banner");
  await expect(banner).toHaveAttribute("data-reason", "subscription");
  await expect(banner).toContainText("View-only: the plan has ended");
  await expect(banner).toContainText("No data is lost.");
  await expect(page.getByTestId("open-new-patient")).toHaveCount(0);
  // The manager can still renew.
  await banner.getByRole("link", { name: "Renew" }).click();
  await expect(page).toHaveURL(/\/settings\/plan$/);
  await expect(page.getByTestId("current-plan")).toContainText("View-only");
  await expect(page.getByRole("button", { name: "Request an Upgrade" })).toBeVisible();
});

test("a suspended clinic is view-only", async ({ page }) => {
  await withPlan(page, { subscription: { status: "suspended" } });
  await page.goto("/dashboard");
  await waitForData(page);
  const banner = page.getByTestId("read-only-banner");
  await expect(banner).toHaveAttribute("data-reason", "suspended");
  await expect(banner).toContainText("this clinic is suspended");
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the view-only banner of an ended plan, in Arabic", async ({ page }) => {
    await withPlan(page, { subscription: { status: "ended", paid_until: "2026-09-10" } });
    await page.goto("/dashboard");
    await waitForData(page);
    await expect(page.getByTestId("read-only-banner")).toContainText("للعرض فقط: انتهت الباقة");
  });
});
