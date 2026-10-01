import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import { navigate, waitForData } from "../helpers";

/** Shows the app as the cloud copy of a clinic server (the dummy data's preview). */
async function asCloudCopy(page: Page) {
  await page.addInitScript(() => localStorage.setItem("demo_deployment_mode", "cloud-copy"));
}

test("the cloud copy says it is view-only, and when it was last updated", async ({ page }) => {
  await asCloudCopy(page);
  await page.goto("/dashboard");
  await waitForData(page);
  const banner = page.getByTestId("read-only-banner");
  await expect(banner).toContainText("View-only copy");
  // The copy was brought up to date 12 minutes before 08:30 (the dummy data).
  await expect(banner).toContainText("Last updated 26 Sep 2026, 8:18 AM.");
  await expect(banner).toContainText("Changes are made at the clinic");
  // The quick actions that add something are gone.
  await expect(page.getByRole("link", { name: /New Appointment/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Add Patient/ })).toHaveCount(0);
});

test("on the cloud copy no screen offers to add, change or delete", async ({ page }) => {
  await asCloudCopy(page);
  await page.goto("/patients");
  await waitForData(page);
  await expect(page.getByTestId("open-new-patient")).toHaveCount(0);

  await navigate(page, "/patients/PAT-2026-00001");
  await waitForData(page);
  await expect(page.getByRole("heading", { name: "زهراء حسين" }).first()).toBeVisible();
  for (const name of ["Edit", "New Appointment", "Delete patient"]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  }
  await page.getByRole("tab", { name: "Dental Chart" }).click();
  await expect(page.getByRole("button", { name: "Sketch" })).toHaveCount(0);

  await navigate(page, "/today");
  await waitForData(page);
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  for (const name of ["Confirm", "Arrived", "Walk-in", "Add Payment"]) {
    await expect(page.getByRole("button", { name })).toHaveCount(0);
  }

  await navigate(page, "/payments");
  await waitForData(page);
  await expect(page.getByRole("button", { name: "Add Payment" })).toHaveCount(0);

  await navigate(page, "/doctors");
  await waitForData(page);
  await expect(page.getByRole("button", { name: "Add Doctor" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);

  await navigate(page, "/whatsapp");
  await waitForData(page);
  await expect(page.getByRole("button", { name: "New Template" })).toHaveCount(0);

  await navigate(page, "/activity");
  await waitForData(page);
  await expect(page.getByRole("button", { name: /^Restore/ })).toHaveCount(0);
});

test("on the cloud copy Settings and a user's permissions can be read, not changed", async ({ page }) => {
  await asCloudCopy(page);
  await page.goto("/settings");
  await waitForData(page);
  await expect(page.getByLabel("Clinic Name")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save Settings" })).toHaveCount(0);
  // The tabs still switch.
  await page.getByRole("tab", { name: "Working Hours" }).click();
  await expect(page.getByRole("tab", { name: "Working Hours" })).toHaveAttribute("aria-selected", "true");

  await navigate(page, "/users");
  await waitForData(page);
  await expect(page.getByRole("button", { name: "Add User" })).toHaveCount(0);
  await page.getByRole("link", { name: /Dalia Jawad|داليا جواد/ }).first().click();
  await expect(page.getByRole("heading", { name: "Permissions" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Permissions" })).toHaveCount(0);
  await expect(page.getByRole("checkbox").first()).toBeDisabled();

  await navigate(page, "/profile");
  await waitForData(page);
  await expect(page.getByText("Passwords are changed at the clinic, not on the view-only copy.")).toBeVisible();
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the view-only banner in Arabic", async ({ page }) => {
    await asCloudCopy(page);
    await page.goto("/dashboard");
    await waitForData(page);
    const banner = page.getByTestId("read-only-banner");
    await expect(banner).toContainText("نسخة للعرض فقط");
    await expect(banner).toContainText("تُجرى التغييرات في العيادة");
  });
});
