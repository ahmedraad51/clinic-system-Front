import { expect, test } from "../fixtures";
import { formDialog, openFromMenu, openSaved, pickLink } from "../helpers";

test("a new payment picks the only open plan and pays the full balance in one tap", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Payments");
  await page.getByRole("button", { name: "Add Payment" }).first().click();
  const dialog = formDialog(page, "New Payment");
  await expect(dialog).toBeVisible();

  // يوسف ستار has one plan with money left: his filling, 25,000 of 50,000.
  await pickLink(page, "Patient", "يوسف", "يوسف ستار", dialog);
  await expect(dialog.getByLabel("Treatment Plan")).toHaveValue("TRT-2026-00015");
  await dialog.getByRole("button", { name: "Pay full balance" }).click();
  await expect(dialog.getByLabel(/Amount/)).toHaveValue("25000");
  await dialog.getByRole("button", { name: "Save Payment" }).click();
  await expect(dialog).toBeHidden();

  // The list behind shows it, and the message opens the receipt.
  await expect(page.getByRole("link", { name: "يوسف ستار" }).first()).toBeVisible();
  await openSaved(page, "Payment recorded.");
  await expect(page.getByRole("heading", { name: "Payment Receipt" })).toBeVisible();
});

test("a patient with several open plans still chooses the plan", async ({ page }) => {
  await page.goto("/payments/new");
  // عباس مهدي has an implant and a bridge still to pay.
  await pickLink(page, "Patient", "عباس", "عباس مهدي");
  await expect(page.getByLabel("Treatment Plan")).toBeEnabled();
  // Wait until both plans are offered (plus "No plan"), then check none was picked.
  await expect(page.getByLabel("Treatment Plan").locator("option")).toHaveCount(3);
  await expect(page.getByLabel("Treatment Plan")).toHaveValue("");
});
