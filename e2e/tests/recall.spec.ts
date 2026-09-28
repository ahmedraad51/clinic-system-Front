import { expect, test } from "../fixtures";
import { navigate, openFromMenu, waitForData } from "../helpers";

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

test("the date the dentist chose comes before the usual rule", async ({ page }) => {
  await page.goto("/recall");
  await waitForData(page);
  // Hiba Kadhim was seen in July, but her dentist wants her back every 3 months, from 23 Sep.
  const hiba = page.getByRole("row", { name: /Hiba Kadhim/ });
  await expect(hiba).toContainText("23 Sep 2026");
  await expect(hiba).toContainText("Dentist: every 3 months");
  // Shahad Qasim's check-up is set for January, so she is not due.
  await expect(page.getByRole("row", { name: /Shahad Qasim/ })).toHaveCount(0);
  // Even with a longer period, the dentist's date still counts.
  await page.getByLabel("Not seen for").selectOption("12");
  await expect(hiba).toBeVisible();
});

test("the dentist sets the next check-up on the patient page", async ({ page }) => {
  await page.goto("/patients/PAT-2025-00002");
  await waitForData(page);
  const nextCheckUp = page.getByRole("definition").filter({ has: page.getByRole("button", { name: /Change the next check-up/ }) });
  await expect(nextCheckUp).toContainText("Usual rule");

  // Muhannad Taha moved away: no recall.
  await page.getByRole("button", { name: /Change the next check-up/ }).click();
  const dialog = page.getByRole("dialog", { name: "Next check-up" });
  await dialog.getByLabel(/^Check-up/).selectOption({ label: "No recall" });
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(nextCheckUp).toContainText("No recall");
  await navigate(page, "/recall");
  await expect(page.getByRole("row", { name: /Suha Majeed/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Muhannad Taha/ })).toHaveCount(0);

  // Suha Majeed every 3 months: counted from her last visit (10 Dec 2025), so she is overdue.
  await page.getByRole("link", { name: "Suha Majeed" }).click();
  await waitForData(page);
  await page.getByRole("button", { name: /Change the next check-up/ }).click();
  await dialog.getByLabel(/^Check-up/).selectOption({ label: "Every 3 months" });
  await expect(dialog.getByLabel("Next check-up on")).toHaveValue("2026-03-10");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(nextCheckUp).toContainText("10 Mar 2026 (due)");
  await expect(nextCheckUp).toContainText("Every 3 months");
});

test("finishing a visit sets the next check-up from that visit", async ({ page }) => {
  await page.goto("/today");
  await waitForData(page);
  // Fatima Salman has no open treatment plan: the dialog still asks about her check-up.
  const rusul = page.locator("section").filter({ has: page.getByRole("heading", { name: "Dr. Rusul Kareem" }) });
  await rusul.getByRole("button", { name: "Completed" }).click();
  const dialog = page.getByRole("dialog", { name: "What was done in this visit?" });
  await dialog.getByLabel("Next check-up").selectOption({ label: "Every 6 months" });
  await expect(dialog.getByText("On 26 Mar 2027, counted from this visit.")).toBeVisible();
  await dialog.getByRole("button", { name: "Save Visit" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Next check-up: 26 Mar 2027." })).toBeVisible();

  await navigate(page, "/patients/PAT-2026-00005");
  const nextCheckUp = page.getByRole("definition").filter({ has: page.getByRole("button", { name: /Change the next check-up/ }) });
  await expect(nextCheckUp).toContainText("26 Mar 2027");
  await expect(nextCheckUp).toContainText("Every 6 months");
});
