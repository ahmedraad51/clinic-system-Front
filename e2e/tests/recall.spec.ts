import { expect, test } from "@playwright/test";
import { openFromMenu } from "../helpers";

test("the recall list shows patients due for a check-up", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Recall");
  await expect(page.getByRole("heading", { name: "Recall" })).toBeVisible();

  // Rania Fawzy (last seen Dec 2025) and Sherif Adel (Feb 2026) are over six months; Nadia Samir is not.
  const rania = page.getByRole("row", { name: /Rania Fawzy/ });
  await expect(rania).toContainText("10 Dec 2025");
  await expect(page.getByRole("row", { name: /Sherif Adel/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Nadia Samir/ })).toHaveCount(0);
  // Yara Mostafa only ever cancelled, so she has never been seen.
  await expect(page.getByRole("row", { name: /Yara Mostafa/ })).toContainText("No visit yet");

  // A ready-made WhatsApp reminder and one tap to book.
  await expect(rania.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /wa\.me\/201008764410\?text=Hello%20Rania%20Fawzy/);
  await rania.getByRole("link", { name: "Book" }).click();
  await expect(page.getByRole("heading", { name: "New Appointment" })).toBeVisible();
  await expect(page.getByText("Rania Fawzy").first()).toBeVisible();
});

test("a longer period shows fewer patients", async ({ page }) => {
  await page.goto("/recall");
  await page.getByLabel("Not seen for").selectOption("9");
  await expect(page.getByRole("row", { name: /Rania Fawzy/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Sherif Adel/ })).toHaveCount(0);
});
