import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import { navigate, waitForData } from "../helpers";

/** Makes the dummy clinic brand new: its first-run setup never started. */
async function newClinic(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __mockNewClinic: boolean }).__mockNewClinic = true;
  });
}

test("a new clinic sends its manager to the setup wizard once", async ({ page }) => {
  await newClinic(page);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByRole("heading", { name: "Set Up Your Clinic" })).toBeVisible();
  // Going back to the dashboard in the same visit does not send them again; the card offers it instead.
  await navigate(page, "/dashboard");
  await waitForData(page);
  await expect(page.getByTestId("setup-card")).toContainText("A few steps set the clinic's name, hours, doctors, prices and staff.");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("a set-up clinic shows no setup card, and Settings opens the wizard again", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  await expect(page.getByTestId("setup-card")).toHaveCount(0);
  await navigate(page, "/settings");
  await waitForData(page);
  await page.getByRole("link", { name: "Setup Wizard" }).click();
  await expect(page.getByRole("heading", { name: "Set Up Your Clinic" })).toBeVisible();
  await expect(page.getByTestId("setup-step")).toHaveText("Step 1 of 6");
  // It starts from what is saved.
  await expect(page.getByLabel("Clinic Name")).toHaveValue("DentClinic");
});

test("the wizard saves each step, can be skipped, and comes back where it stopped", async ({ page }) => {
  await newClinic(page);
  await page.goto("/setup");
  await waitForData(page);
  await expect(page.getByTestId("setup-step")).toHaveText("Step 1 of 6");

  // 1. The clinic: the name is required.
  await page.getByLabel("Clinic Name").fill("");
  await page.getByRole("button", { name: "Save and Continue" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /name/i })).toBeVisible();
  await page.getByLabel("Clinic Name").fill("عيادة النور");
  await page.getByRole("button", { name: "Save and Continue" }).click();

  // 2. The currency.
  await expect(page.getByTestId("setup-step")).toHaveText("Step 2 of 6");
  await page.getByRole("button", { name: "Save and Continue" }).click();

  // 3. Open days: none ticked is refused.
  await expect(page.getByTestId("setup-step")).toHaveText("Step 3 of 6");
  const ticked = page.getByRole("group", { name: "Open on" }).getByRole("button", { pressed: true });
  while ((await ticked.count()) > 0) await ticked.first().click();
  await page.getByRole("button", { name: "Save and Continue" }).click();
  await expect(page.getByText("Choose at least one day the clinic is open.")).toBeVisible();
  await page.getByRole("group", { name: "Open on" }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Save and Continue" }).click();

  // 4. Doctors: the clinic's are listed; skip for now.
  await expect(page.getByTestId("setup-step")).toHaveText("Step 4 of 6");
  await expect(page.getByText("د. زينب الهاشمي")).toBeVisible();
  await page.getByRole("button", { name: "Skip for Now" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  // The new name is in the menu, and the dashboard offers to finish.
  await expect(page.getByText("عيادة النور").first()).toBeVisible();
  const card = page.getByTestId("setup-card");
  await expect(card).toContainText("Finish setting up your clinic");
  await expect(card).toContainText("You stopped at Doctors (step 4 of 6).");

  // Back where it stopped; then to the end.
  await card.getByRole("link", { name: "Continue Setup" }).click();
  await expect(page.getByTestId("setup-step")).toHaveText("Step 4 of 6");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByTestId("setup-step")).toHaveText("Step 5 of 6");
  await page.getByLabel("Filling").fill("45000");
  await page.getByRole("button", { name: "Save and Continue" }).click();
  await expect(page.getByTestId("setup-step")).toHaveText("Step 6 of 6");
  await expect(page.getByText("داليا جواد")).toBeVisible();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("heading", { name: "Your clinic is ready" })).toBeVisible();
  await page.getByRole("link", { name: "Go to the Dashboard" }).click();
  await expect(page.getByTestId("setup-card")).toHaveCount(0);
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the wizard in Arabic", async ({ page }) => {
    await page.goto("/setup");
    await waitForData(page);
    await expect(page.getByRole("heading", { name: "إعداد عيادتك" })).toBeVisible();
    await expect(page.getByTestId("setup-step")).toHaveText("الخطوة 1 من 6");
    await expect(page.getByRole("button", { name: "حفظ ومتابعة" })).toBeVisible();
  });
});

