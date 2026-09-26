import { expect, test } from "../fixtures";
import { today, waitForData } from "../helpers";

function tomorrow() {
  const [y, m, d] = today().split("-").map(Number);
  const date = new Date(y, m - 1, d + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** One minute is 1.6 px in the calendar and the day starts at 9:00. */
const PX = 1.6;

test("drag an appointment to another doctor and time", async ({ page }) => {
  await page.goto(`/appointments?view=day&day=${tomorrow()}`);
  await waitForData(page);

  // Tomorrow Dina Rashad sees Dr. Sarah Mansour at 11:00. Move her to Dr. Leila Haddad at 9:30.
  const block = page.getByRole("link", { name: /11:00 AM, Dina Rashad, Dr\. Sarah Mansour/ });
  const box = await block.boundingBox();
  const column = await page.locator('[data-column="DOC-00003"]').boundingBox();
  if (!box || !column) throw new Error("calendar not drawn");

  const grab = 8; // pixels below the top of the block
  await page.mouse.move(box.x + box.width / 2, box.y + grab);
  await page.mouse.down();
  await page.mouse.move(column.x + column.width / 2, column.y + (30 * PX + grab), { steps: 8 });
  await page.mouse.up();

  const dialog = page.getByRole("dialog", { name: "Move this appointment?" });
  await expect(dialog).toContainText("9:30 AM");
  await expect(dialog).toContainText("with Dr. Leila Haddad");
  await dialog.getByRole("button", { name: "Move", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Dina Rashad moved to 9:30 AM." })).toBeVisible();
  await expect(page.getByRole("link", { name: /9:30 AM, Dina Rashad, Dr\. Leila Haddad/ })).toBeVisible();

  // A plain click still opens the appointment.
  await page.getByRole("link", { name: /9:30 AM, Dina Rashad/ }).click();
  await expect(page.getByRole("heading", { name: "Dina Rashad" })).toBeVisible();
  await expect(page.getByText("Dr. Leila Haddad").first()).toBeVisible();
});
