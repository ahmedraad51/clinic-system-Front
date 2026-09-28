import { expect, test } from "../fixtures";
import { openFromMenu } from "../helpers";

test("the recall list shows patients due for a check-up", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Recall");
  await expect(page.getByRole("heading", { name: "Recall" })).toBeVisible();

  // Suha Majeed (last seen Dec 2025) and Muhannad Taha (Feb 2026) are over six months; Zahraa Hussein is not.
  const suha = page.getByRole("row", { name: /Suha Majeed/ });
  await expect(suha).toContainText("10 Dec 2025");
  await expect(page.getByRole("row", { name: /Muhannad Taha/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Zahraa Hussein/ })).toHaveCount(0);
  // Ruqaya Adnan only ever cancelled, so she has never been seen.
  await expect(page.getByRole("row", { name: /Ruqaya Adnan/ })).toContainText("No visit yet");

  // A ready-made WhatsApp reminder and one tap to book.
  await expect(suha.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /wa\.me\/9647718764410\?text=Hello%20Suha%20Majeed/);
  await suha.getByRole("link", { name: "Book" }).click();
  await expect(page.getByRole("heading", { name: "New Appointment" })).toBeVisible();
  await expect(page.getByText("Suha Majeed").first()).toBeVisible();
});

test("a longer period shows fewer patients", async ({ page }) => {
  await page.goto("/recall");
  await page.getByLabel("Not seen for").selectOption("9");
  await expect(page.getByRole("row", { name: /Suha Majeed/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Muhannad Taha/ })).toHaveCount(0);
});
