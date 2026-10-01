import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import { navigate, waitForData } from "../helpers";

/** The dummy Administrator has the Platform Owner role. Today is 26 Sep 2026 (e2e/fixtures.ts). */
async function openPlatform(page: Page) {
  await page.goto("/dashboard");
  await waitForData(page);
  await page.getByRole("navigation").getByRole("link", { name: "Platform", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Platform", exact: true })).toBeVisible();
}

const row = (page: Page, address: string) => page.locator(`tr[data-clinic="${address}"]`);

test("the platform owner sees every clinic with its plan, status, use and renewal", async ({ page }) => {
  await openPlatform(page);
  await expect(page.locator("tr[data-clinic]")).toHaveCount(5);

  const alnoor = row(page, "alnoor");
  await expect(alnoor).toContainText("alnoor.dentclinic.example");
  await expect(alnoor).toContainText("Clinic Server + Cloud copy");
  await expect(alnoor).toContainText("Active");
  await expect(alnoor).toContainText("Doctors 6 / 10");
  await expect(alnoor).toContainText("Files 8.2 GB of 500 GB");
  await expect(alnoor).toContainText("Paid until 31 Mar 2027");

  // A trial that ends in 5 days, a plan that ended 3 days ago, a suspended clinic.
  await expect(row(page, "basma")).toContainText("Free trial");
  await expect(row(page, "basma")).toContainText("in 5 days");
  await expect(row(page, "basma")).toContainText("Trial until 1 Oct 2026");
  await expect(row(page, "smile-erbil")).toContainText("Ended");
  await expect(row(page, "smile-erbil")).toContainText("View-only from 1 Oct 2026");
  await expect(row(page, "rafidain")).toContainText("Suspended");

  await page.getByLabel("Status").selectOption("suspended");
  await expect(page.locator("tr[data-clinic]")).toHaveCount(1);
  await page.getByPlaceholder("Search by clinic, web address or email").fill("alnoor");
  await expect(page.getByText("No clinic matches.")).toBeVisible();
  await page.getByRole("button", { name: "Clear Filters" }).click();
  await expect(page.locator("tr[data-clinic]")).toHaveCount(5);
});

test("creating a clinic starts its free trial", async ({ page }) => {
  await openPlatform(page);
  await page.getByRole("button", { name: "New Clinic" }).click();
  const dialog = page.getByRole("dialog", { name: "New Clinic" });
  await dialog.getByLabel("Clinic name").fill("Hayat Dental");
  await dialog.getByLabel("Manager's email").fill("manager@hayat.example");

  // The address rule is checked first, then whether it is taken.
  await dialog.getByLabel("Web address").fill("1hayat");
  await dialog.getByRole("button", { name: "Create Clinic" }).click();
  await expect(dialog).toContainText("The web address must be 3 to 30 English letters");
  await dialog.getByLabel("Web address").fill("alnoor");
  await dialog.getByRole("button", { name: "Create Clinic" }).click();
  await expect(dialog).toContainText("The web address alnoor is taken.");

  await dialog.getByLabel("Web address").fill("Hayat");
  await expect(dialog.getByLabel("Web address")).toHaveValue("hayat");
  await dialog.getByRole("button", { name: "Create Clinic" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: "Hayat Dental is ready at hayat.dentclinic.example. Free trial until 10 Oct 2026." })).toBeVisible();
  await expect(row(page, "hayat")).toContainText("Free trial");
  await expect(row(page, "hayat")).toContainText("Trial until 10 Oct 2026");
});

test("recording a payment moves the clinic's paid-until day on", async ({ page }) => {
  await openPlatform(page);
  // Smile Dental Erbil's plan ended on 23 Sep: two months from the payment's day.
  await row(page, "smile-erbil").getByRole("button", { name: "Record Payment" }).click();
  const dialog = page.getByRole("dialog", { name: "Record a Payment" });
  await expect(dialog).toContainText("Smile Dental Erbil");
  await dialog.getByLabel("Paid by").selectOption("Zain Cash");
  await dialog.getByLabel("Months it pays for").fill("2");
  await expect(dialog.getByLabel("Amount")).toHaveValue("90000");
  await expect(dialog.getByTestId("paid-until-preview")).toHaveText("Paid until 25 Nov 2026 after this payment.");
  await dialog.getByLabel("Receipt or transfer number").fill("ZC-90210");
  await dialog.getByRole("button", { name: "Record Payment" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: "Payment recorded. Smile Dental Erbil is paid until 25 Nov 2026." })).toBeVisible();
  await expect(row(page, "smile-erbil")).toContainText("Active");

  await page.getByRole("tab", { name: /Payments/ }).click();
  const first = page.locator("tbody tr").first();
  await expect(first).toContainText("Smile Dental Erbil");
  await expect(first).toContainText("Zain Cash");
  await expect(first).toContainText("2 months");
  await expect(first).toContainText("ZC-90210");
});

test("suspending a clinic makes it view-only, and reactivating it brings it back", async ({ page }) => {
  await openPlatform(page);
  // The clinic this app runs as is "demo" (DentClinic), so its banner shows here.
  await row(page, "demo").getByRole("button", { name: "Suspend" }).click();
  const confirm = page.getByRole("dialog", { name: "Suspend this clinic?" });
  await expect(confirm).toContainText("Nothing is deleted.");
  await confirm.getByRole("button", { name: "Suspend" }).click();
  await expect(page.getByRole("status").filter({ hasText: "DentClinic is suspended." })).toBeVisible();
  await expect(page.getByTestId("read-only-banner")).toHaveAttribute("data-reason", "suspended");
  await expect(row(page, "demo")).toContainText("Suspended");

  await row(page, "demo").getByRole("button", { name: "Reactivate" }).click();
  await expect(page.getByRole("status").filter({ hasText: "DentClinic is active again." })).toBeVisible();
  await expect(page.getByTestId("read-only-banner")).toHaveCount(0);
});

test("a free-trial request becomes a clinic in two clicks", async ({ page }) => {
  await openPlatform(page);
  await page.getByRole("tab", { name: /Requests/ }).click();
  const request = page.locator('[data-request="TRQ-00001"]');
  await expect(request).toContainText("karrada.dentclinic.example");
  await expect(page.locator('[data-request="PCR-00001"]')).toContainText("Cloud → Clinic Server + Cloud copy");
  await request.getByRole("button", { name: "Create Clinic" }).click();
  const dialog = page.getByRole("dialog", { name: "New Clinic" });
  await expect(dialog.getByLabel("Web address")).toHaveValue("karrada");
  await expect(dialog.getByLabel("Manager's email")).toHaveValue("sara.jameel@example.com");
  await dialog.getByRole("button", { name: "Create Clinic" }).click();
  await expect(dialog).toBeHidden();
  await expect(row(page, "karrada")).toBeVisible();
  await page.getByRole("tab", { name: /Requests/ }).click();
  await expect(page.locator('[data-request="TRQ-00001"]')).toContainText("Started");
});

test("only the platform owner has it: not a clinic manager", async ({ page }) => {
  await page.goto("/profile");
  await waitForData(page);
  await page.getByLabel("View the app as").selectOption({ label: "ليث حامد" });
  await expect(page.getByText("Clinic Manager").first()).toBeVisible();
  await waitForData(page);
  await expect(page.getByRole("navigation").getByRole("link", { name: "Platform", exact: true })).toHaveCount(0);
  await navigate(page, "/platform");
  await expect(page.getByText("You do not have access to this page")).toBeVisible();
});

test("a clinic server has no platform menu", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("demo_deployment_mode", "clinic-server"));
  await page.goto("/dashboard");
  await waitForData(page);
  await expect(page.getByRole("navigation").getByRole("link", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link", { name: "Platform", exact: true })).toHaveCount(0);
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the platform in Arabic", async ({ page }) => {
    await page.goto("/platform");
    await waitForData(page);
    await expect(page.getByRole("heading", { name: "المنصة", exact: true })).toBeVisible();
    await expect(row(page, "rafidain")).toContainText("موقوفة");
    await expect(row(page, "alnoor")).toContainText("مدفوعة حتى");
    await expect(page.getByRole("navigation").getByRole("link", { name: "المنصة", exact: true })).toBeVisible();
  });
});
