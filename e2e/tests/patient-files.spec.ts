import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";

// A 1×1 pixel PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("attach an X-ray to a patient, view it and delete it", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00001");
  await waitForData(page);
  await page.getByRole("tab", { name: "X-rays & Photos" }).click();
  await expect(page.getByText("No X-rays or photos yet")).toBeVisible();

  // "Add Files" opens the file picker; set the file on it directly.
  await page.locator('input[type="file"][multiple]').setInputFiles({ name: "bitewing-left.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("status").filter({ hasText: "File added." })).toBeVisible();
  const tile = page.getByRole("button", { name: /bitewing-left\.png/ });
  await expect(tile).toBeVisible();

  await tile.click();
  const viewer = page.getByRole("dialog", { name: "bitewing-left.png" });
  await expect(viewer.getByRole("img", { name: "bitewing-left.png" })).toBeVisible();
  await viewer.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog", { name: "Delete this file?" }).getByRole("button", { name: "Delete File" }).click();
  await expect(page.getByText("No X-rays or photos yet")).toBeVisible();
});
