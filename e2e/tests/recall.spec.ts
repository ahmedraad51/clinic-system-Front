import { expect, test } from "../fixtures";
import { navigate, openFromMenu, waitForData } from "../helpers";

test("the recall list shows patients due for a check-up", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Recall");
  await expect(page.getByRole("heading", { name: "Recall" })).toBeVisible();

  // سهى مجيد (last seen Dec 2025) and مهند طه (Feb 2026) are over six months; زهراء حسين is not.
  const suha = page.getByRole("row", { name: /سهى مجيد/ });
  await expect(suha).toContainText("10 Dec 2025");
  await expect(page.getByRole("row", { name: /مهند طه/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /زهراء حسين/ })).toHaveCount(0);
  // رقية عدنان only ever cancelled, so she has never been seen.
  await expect(page.getByRole("row", { name: /رقية عدنان/ })).toContainText("No visit yet");

  // A ready-made WhatsApp reminder and one tap to book.
  await expect(suha.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /wa\.me\/9647718764410\?text=Hello%20%D8%B3%D9%87%D9%89%20%D9%85%D8%AC%D9%8A%D8%AF/);
  await suha.getByRole("button", { name: "Book" }).click();
  const dialog = page.getByRole("dialog", { name: "New Appointment" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("سهى مجيد").first()).toBeVisible();

  // Once booked, she leaves the list at once.
  await dialog.getByLabel("Doctor").selectOption({ label: "د. زينب الهاشمي · General Dentist" });
  await dialog.getByLabel("Date").fill("2026-10-05");
  await dialog.getByLabel("Time").fill("10:00");
  await dialog.getByRole("button", { name: "Book Appointment" }).click();
  await expect(dialog).toBeHidden();
  await expect(suha).toHaveCount(0);
});

test("a longer period shows fewer patients", async ({ page }) => {
  await page.goto("/recall");
  await page.getByLabel("Not seen for").selectOption("9");
  await expect(page.getByRole("row", { name: /سهى مجيد/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /مهند طه/ })).toHaveCount(0);
});

test("the date the dentist chose comes before the usual rule", async ({ page }) => {
  await page.goto("/recall");
  await waitForData(page);
  // هبة كاظم was seen in July, but her dentist wants her back every 3 months, from 23 Sep.
  const hiba = page.getByRole("row", { name: /هبة كاظم/ });
  await expect(hiba).toContainText("23 Sep 2026");
  await expect(hiba).toContainText("Dentist: every 3 months");
  // شهد قاسم's check-up is set for January, so she is not due.
  await expect(page.getByRole("row", { name: /شهد قاسم/ })).toHaveCount(0);
  // Even with a longer period, the dentist's date still counts.
  await page.getByLabel("Not seen for").selectOption("12");
  await expect(hiba).toBeVisible();
});

test("the dentist sets the next check-up on the patient page", async ({ page }) => {
  await page.goto("/patients/PAT-2025-00002");
  await waitForData(page);
  const nextCheckUp = page.getByRole("definition").filter({ has: page.getByRole("button", { name: /Change the next check-up/ }) });
  await expect(nextCheckUp).toContainText("Usual rule");

  // مهند طه moved away: no recall.
  await page.getByRole("button", { name: /Change the next check-up/ }).click();
  const dialog = page.getByRole("dialog", { name: "Next check-up" });
  await dialog.getByLabel(/^Check-up/).selectOption({ label: "No recall" });
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(nextCheckUp).toContainText("No recall");
  await navigate(page, "/recall");
  await expect(page.getByRole("row", { name: /سهى مجيد/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /مهند طه/ })).toHaveCount(0);

  // سهى مجيد every 3 months: counted from her last visit (10 Dec 2025), so she is overdue.
  await page.getByRole("link", { name: "سهى مجيد" }).click();
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
  // فاطمة سلمان has no open treatment plan: the dialog still asks about her check-up.
  const rusul = page.locator("section").filter({ has: page.getByRole("heading", { name: "د. رسل كريم" }) });
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
