import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";

test("the dashboard lists what needs attention today", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: "Needs attention" }) });
  await expect(card).toContainText("5 past appointments to close");
  await expect(card).toContainText("1 reminder to send for tomorrow");
  await expect(card).toContainText("3 patients due for a check-up");
  await expect(card).toContainText("6 patients owe money");

  await card.getByRole("link", { name: /patients owe money/ }).click();
  await expect(page.getByLabel("Balance")).toHaveValue("owing");
  await expect(page.getByText("6 records")).toBeVisible();
});
