import { expect, test } from "../fixtures";
import { formDialog, openFromMenu, openSaved, pickLink, waitForData } from "../helpers";

test("create a treatment plan and pay part of it", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Treatments");
  await page.getByRole("button", { name: "New Treatment" }).first().click();
  const dialog = formDialog(page, "New Treatment Plan");
  await expect(dialog).toBeVisible();

  await pickLink(page, "Patient", "Shahad", "Shahad Qasim", dialog);
  await dialog.getByLabel("Treatment Type").selectOption("Filling");
  await dialog.getByLabel("Tooth").selectOption("26");
  await dialog.getByLabel(/Total Cost/).fill("100000");
  await dialog.getByRole("button", { name: "Save Treatment" }).click();
  await expect(dialog).toBeHidden();

  // The message opens the plan, with the whole cost still to pay.
  await openSaved(page, "Treatment plan created.");
  await expect(page.getByRole("heading", { name: "Filling · Tooth 26" })).toBeVisible();
  await expect(page.getByTestId("plan-remaining")).toHaveText("IQD 100,000");

  // Pay 40,000 of it, without leaving the plan.
  await page.getByRole("button", { name: "Add Payment" }).first().click();
  const payment = formDialog(page, "New Payment");
  await expect(payment).toBeVisible();
  await expect(payment.getByLabel("Treatment Plan")).toHaveValue(/TRT-/);
  await payment.getByLabel(/Amount/).fill("40000");
  await payment.getByRole("button", { name: "Save Payment" }).click();
  await expect(payment).toBeHidden();

  // The plan behind loads again: the balance went down.
  await expect(page.getByRole("heading", { name: "Filling · Tooth 26" })).toBeVisible();
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
  await page.getByRole("button", { name: "Add Payment" }).first().click();
  const dialog = formDialog(page, "New Payment");
  await expect(dialog.getByLabel("Treatment Plan")).toHaveValue(/TRT-/);
  await dialog.getByLabel(/Amount/).fill("30000");
  await dialog.getByRole("button", { name: "Save Payment" }).click();
  await expect(dialog.getByRole("alert").filter({ hasText: "only has IQD 25,000 left" })).toBeVisible();
});

test("book the next visit from a treatment plan", async ({ page }) => {
  await page.goto("/treatments/TRT-2026-00002");
  await waitForData(page);
  await page.getByRole("button", { name: "Book Visit" }).click();
  const dialog = formDialog(page, "New Appointment");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Zahraa Hussein").first()).toBeVisible();
  await expect(dialog.getByLabel("Doctor")).toHaveValue("DOC-00001");
  await expect(dialog.getByLabel("Reason for Visit")).toHaveValue("Crown · tooth 36");
});
