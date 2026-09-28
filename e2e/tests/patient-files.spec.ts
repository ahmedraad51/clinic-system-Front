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

test("a big file shows how far the upload is", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00001");
  await waitForData(page);
  await page.getByRole("tab", { name: "X-rays & Photos" }).click();
  await expect(page.getByText("No X-rays or photos yet")).toBeVisible();

  // About 6 MB: the dummy upload takes a second and a half, reporting progress on the way.
  const big = Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)]);
  await page.locator('input[type="file"][multiple]').setInputFiles([
    { name: "panoramic.png", mimeType: "image/png", buffer: big },
    { name: "bitewing-right.png", mimeType: "image/png", buffer: PNG },
  ]);
  const bar = page.getByRole("progressbar", { name: "Uploading 1 of 2: panoramic.png" });
  await expect(bar).toBeVisible();
  await expect(page.getByRole("button", { name: "Take Photo" })).toBeDisabled();
  await expect.poll(async () => Number(await bar.getAttribute("aria-valuenow"))).toBeGreaterThan(0);

  await expect(page.getByRole("status").filter({ hasText: "2 files added." })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /panoramic\.png/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /bitewing-right\.png/ })).toBeVisible();
});
