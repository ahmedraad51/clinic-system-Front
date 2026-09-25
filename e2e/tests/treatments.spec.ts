import { expect, test } from "@playwright/test";
import { openFromMenu, pickLink, waitForData } from "../helpers";

test("create a treatment plan and pay part of it", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Treatments");
  await page.getByRole("link", { name: "New Treatment" }).first().click();
  await expect(page.getByRole("heading", { name: "New Treatment Plan" })).toBeVisible();

  await pickLink(page, "Patient", "Dina", "Dina Rashad");
  await page.getByLabel("Treatment Type").selectOption("Filling");
  await page.getByLabel("Tooth").selectOption("26");
  await page.getByLabel(/Total Cost/).fill("1000");
  await page.getByRole("button", { name: "Save Treatment" }).click();

  // The plan opens with the whole cost still to pay.
  await expect(page.getByRole("heading", { name: "Filling · Tooth 26" })).toBeVisible();
  await waitForData(page);
  await expect(page.getByTestId("plan-remaining")).toHaveText("$1,000");

  // Pay 400 of it.
  await page.getByRole("link", { name: "Add Payment" }).first().click();
  await expect(page.getByRole("heading", { name: "New Payment" })).toBeVisible();
  await expect(page.getByLabel("Treatment Plan")).toHaveValue(/TRT-/);
  await page.getByLabel(/Amount/).fill("400");
  await page.getByRole("button", { name: "Save Payment" }).click();
  await expect(page.getByRole("heading", { name: "Payment Receipt" })).toBeVisible();
  await waitForData(page);

  // Back on the plan, the balance went down.
  await page.getByRole("link", { name: /Filling \(TRT-/ }).click();
  await expect(page.getByRole("heading", { name: "Filling · Tooth 26" })).toBeVisible();
  await waitForData(page);
  await expect(page.getByTestId("plan-paid")).toHaveText("$400");
  await expect(page.getByTestId("plan-remaining")).toHaveText("$600");
  await expect(page.getByText("40% paid")).toBeVisible();
});

test("a payment cannot be more than what is left on the plan", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Treatments");
  await page.getByRole("searchbox").fill("Bassel");
  await page.getByRole("link", { name: "Filling" }).first().click();
  await waitForData(page);
  // Bassel's filling costs 1,000 and 500 is paid.
  await page.getByRole("link", { name: "Add Payment" }).first().click();
  await expect(page.getByLabel("Treatment Plan")).toHaveValue(/TRT-/);
  await page.getByLabel(/Amount/).fill("700");
  await page.getByRole("button", { name: "Save Payment" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "only has $500 left" })).toBeVisible();
});
