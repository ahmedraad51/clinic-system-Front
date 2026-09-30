import { expect, test } from "../fixtures";
import { openFromMenu } from "../helpers";

test("the front desk marks today's patients from the Today board", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Today");
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();

  // Today's two appointments, each under its doctor.
  const rusul = page.locator("section").filter({ has: page.getByRole("heading", { name: "Dr. Rusul Kareem" }) });
  const zainab = page.locator("section").filter({ has: page.getByRole("heading", { name: "Dr. Zainab Al-Hashimi" }) });
  await expect(rusul).toContainText("Fatima Salman");
  await expect(zainab).toContainText("Mustafa Jabbar");

  // One tap to confirm, one to complete.
  await zainab.getByRole("button", { name: "Confirm" }).click();
  await expect(zainab.getByText("Confirmed", { exact: true })).toBeVisible();
  await rusul.getByRole("button", { name: "Completed" }).click();
  // Fatima has no open treatment plan, so the visit dialog offers to start one (and her next check-up); skip it.
  await page.getByRole("dialog", { name: "What was done in this visit?" }).getByRole("button", { name: "Skip" }).click();
  await expect(rusul.getByText("Completed", { exact: true })).toBeVisible();
  await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible();

  // A mistake can be undone.
  await rusul.getByRole("button", { name: "Undo" }).click();
  await expect(rusul.getByRole("button", { name: "Completed" })).toBeVisible();

  // Quick payment for the patient.
  await zainab.getByRole("button", { name: "Add Payment" }).click();
  const dialog = page.getByRole("dialog", { name: "New Payment" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Mustafa Jabbar").first()).toBeVisible();
});

test("past appointments without an outcome are listed to be closed", async ({ page }) => {
  await page.goto("/today");
  const earlier = page.locator("section").filter({ has: page.getByRole("heading", { name: /Earlier, still open/ }) });
  // In the dummy data five September appointments were never marked Completed or No Show.
  await expect(earlier.getByRole("heading")).toHaveText("Earlier, still open (5)");
  const abbas = earlier.getByRole("listitem").filter({ hasText: "Abbas Mahdi" });
  await abbas.getByRole("button", { name: "No show" }).click();
  await expect(earlier.getByRole("heading")).toHaveText("Earlier, still open (4)");
  await expect(earlier.getByText("Abbas Mahdi")).toHaveCount(0);
});

test("tomorrow's reminders open WhatsApp with the message ready", async ({ page, context }) => {
  // Never leave the test machine: the WhatsApp page itself is not needed.
  await context.route("https://wa.me/**", (route) => route.abort());
  await page.goto("/today");
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: /Tomorrow's reminders/ }) });
  // Tomorrow: Shahad Qasim with Dr. Zainab Al-Hashimi at 11:00.
  await expect(card.getByRole("heading")).toHaveText("Tomorrow's reminders (1 to send)");
  const send = card.getByRole("link", { name: "Send reminder" });
  await expect(send).toHaveAttribute("href", /^https:\/\/wa\.me\/9647705541287\?text=Hello%20Shahad%20Qasim%2C%20this%20is%20a%20reminder/);
  const popup = context.waitForEvent("page");
  await send.click();
  await (await popup).close();
  await expect(card.getByText("Reminder opened")).toBeVisible();
  await expect(card.getByRole("heading")).toHaveText("Tomorrow's reminders (0 to send)");
});
