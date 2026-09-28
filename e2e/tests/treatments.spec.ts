import { expect, test } from "../fixtures";
import { openFromMenu, pickLink, waitForData } from "../helpers";

test("create a treatment plan and pay part of it", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Treatments");
  await page.getByRole("link", { name: "New Treatment" }).first().click();
  await expect(page.getByRole("heading", { name: "New Treatment Plan" })).toBeVisible();

  await pickLink(page, "Patient", "Shahad", "Shahad Qasim");
  await page.getByLabel("Treatment Type").selectOption("Filling");
  await page.getByLabel("Tooth").selectOption("26");
  await page.getByLabel(/Total Cost/).fill("100000");
  await page.getByRole("button", { name: "Save Treatment" }).click();

  // The plan opens with the whole cost still to pay.
  await expect(page.getByRole("heading", { name: "Filling · Tooth 26" })).toBeVisible();
  await waitForData(page);
  await expect(page.getByTestId("plan-remaining")).toHaveText("IQD 100,000");

  // Pay 400 of it.
  await page.getByRole("link", { name: "Add Payment" }).first().click();
  await expect(page.getByRole("heading", { name: "New Payment" })).toBeVisible();
  await expect(page.getByLabel("Treatment Plan")).toHaveValue(/TRT-/);
  await page.getByLabel(/Amount/).fill("40000");
  await page.getByRole("button", { name: "Save Payment" }).click();
  await expect(page.getByRole("heading", { name: "Payment Receipt" })).toBeVisible();
  await waitForData(page);

  // Back on the plan, the balance went down.
  await page.getByRole("link", { name: /Filling \(TRT-/ }).click();
  await expect(page.getByRole("heading", { name: "Filling · Tooth 26" })).toBeVisible();
  await waitForData(page);
  await expect(page.getByTestId("plan-paid")).toHaveText("IQD 40,000");
  await expect(page.getByTestId("plan-remaining")).toHaveText("IQD 60,000");
  await expect(page.getByText("40% paid")).toBeVisible();
});

test("a payment cannot be more than what is left on the plan", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Treatments");
  await page.getByRole("searchbox").fill("Yousif");
  await page.getByRole("link", { name: "Filling" }).first().click();
  await waitForData(page);
  // Yousif's filling costs 50,000 and 25,000 is paid.
  await page.getByRole("link", { name: "Add Payment" }).first().click();
  await expect(page.getByRole("heading", { name: "New Payment" })).toBeVisible();
  await expect(page.getByLabel("Treatment Plan")).toHaveValue(/TRT-/);
  await page.getByLabel(/Amount/).fill("30000");
  await page.getByRole("button", { name: "Save Payment" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "only has IQD 25,000 left" })).toBeVisible();
});

test("book the next visit from a treatment plan", async ({ page }) => {
  await page.goto("/treatments/TRT-2026-00002");
  await waitForData(page);
  await page.getByRole("link", { name: "Book Visit" }).click();
  await expect(page.getByRole("heading", { name: "New Appointment" })).toBeVisible();
  await expect(page.getByText("Zahraa Hussein").first()).toBeVisible();
  await expect(page.getByLabel("Doctor")).toHaveValue("DOC-00001");
  await expect(page.getByLabel("Reason for Visit")).toHaveValue("Crown · tooth 36");
});
