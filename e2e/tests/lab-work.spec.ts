import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";

test("late lab work shows on the Today board and is marked received on the plan", async ({ page }) => {
  await page.goto("/today");
  const lab = page.locator("section").filter({ has: page.getByRole("heading", { name: /Lab work due/ }) });
  // Abbas Mahdi's implant crown was due back two days ago; Zahraa Hussein's crown is due in three days (not listed yet).
  await expect(lab.getByRole("heading")).toHaveText("Lab work due (1)");
  await expect(lab).toContainText("Abbas Mahdi");
  await expect(lab).toContainText("Late from the lab");

  await lab.getByRole("link", { name: /Abbas Mahdi/ }).click();
  await expect(page.getByRole("heading", { name: "Implant · Tooth 46" })).toBeVisible();
  await waitForData(page);
  const card = page.locator("section").filter({ hasText: "Lab Work" }).first();
  await card.getByRole("button", { name: "Received today" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Lab work marked as received." })).toBeVisible();
  await expect(card).toContainText("Back from the lab");
});

test("send a crown to the lab", async ({ page }) => {
  // Saad Nouri's crown on 37 has not been sent yet.
  await page.goto("/treatments/TRT-2026-00013");
  await waitForData(page);
  await page.getByRole("button", { name: "Send to lab" }).click();
  const dialog = page.getByRole("dialog", { name: "Lab Work" });
  await dialog.getByLabel("Lab").fill("Al-Mansour Dental Lab");
  await dialog.getByLabel("Due back").fill("2026-10-05");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("section").filter({ hasText: "Lab Work" }).first()).toContainText("At the lab");
});
