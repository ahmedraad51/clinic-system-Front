import { expect, test } from "../fixtures";
import { openFromMenu, pickLink } from "../helpers";

test("a new payment picks the only open plan and pays the full balance in one tap", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Payments");
  await page.getByRole("link", { name: "Add Payment" }).first().click();
  await expect(page.getByRole("heading", { name: "New Payment" })).toBeVisible();

  // Yousif Sattar has one plan with money left: his filling, 25,000 of 50,000.
  await pickLink(page, "Patient", "Yousif", "Yousif Sattar");
  await expect(page.getByLabel("Treatment Plan")).toHaveValue("TRT-2026-00015");
  await page.getByRole("button", { name: "Pay full balance" }).click();
  await expect(page.getByLabel(/Amount/)).toHaveValue("25000");
  await page.getByRole("button", { name: "Save Payment" }).click();
  await expect(page.getByRole("heading", { name: "Payment Receipt" })).toBeVisible();
});

test("a patient with several open plans still chooses the plan", async ({ page }) => {
  await page.goto("/payments/new");
  // Abbas Mahdi has an implant and a bridge still to pay.
  await pickLink(page, "Patient", "Abbas", "Abbas Mahdi");
  await expect(page.getByLabel("Treatment Plan")).toBeEnabled();
  // Wait until both plans are offered (plus "No plan"), then check none was picked.
  await expect(page.getByLabel("Treatment Plan").locator("option")).toHaveCount(3);
  await expect(page.getByLabel("Treatment Plan")).toHaveValue("");
});
