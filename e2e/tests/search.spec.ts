import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";

test("find a patient by phone from any page with Ctrl+K", async ({ page }) => {
  await page.goto("/payments");
  await waitForData(page);
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("combobox").fill("908 6602");
  await expect(dialog.getByRole("option", { name: /رقية عدنان/ })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "رقية عدنان" })).toBeVisible();
  await expect(dialog).toBeHidden();
});

test("quick actions from the search box", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  await page.getByRole("button", { name: "Search patients and actions" }).click();
  await page.getByRole("dialog", { name: "Search" }).getByRole("combobox").fill("book");
  await page.getByRole("option", { name: /New Appointment/ }).click();
  await expect(page.getByRole("heading", { name: "New Appointment" })).toBeVisible();
});
