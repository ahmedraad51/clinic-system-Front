import { AxiosError, type AxiosProgressEvent, type InternalAxiosRequestConfig } from "axios";
import { expect, test } from "../fixtures";
import { errorMessage, REQUEST_TIMEOUT_MS, UPLOAD_TIMEOUT_MS, uploadRequestConfig } from "../../src/lib/frappe";

test("uploads get minutes, not the 15 seconds of a normal request", () => {
  expect(UPLOAD_TIMEOUT_MS).toBe(10 * 60_000);
  expect(UPLOAD_TIMEOUT_MS).toBeGreaterThan(REQUEST_TIMEOUT_MS);
  expect(uploadRequestConfig().timeout).toBe(UPLOAD_TIMEOUT_MS);
  expect(uploadRequestConfig().onUploadProgress).toBeUndefined();
});

test("upload progress is reported from 0 to 1", () => {
  const seen: number[] = [];
  const config = uploadRequestConfig({ onProgress: (fraction) => seen.push(fraction) });
  const report = (loaded: number, total?: number) =>
    config.onUploadProgress?.({ loaded, total, bytes: 0, lengthComputable: total !== undefined } as AxiosProgressEvent);
  report(0, 400);
  report(100, 400);
  report(400, 400);
  // Without a total there is nothing to show.
  report(50);
  expect(seen).toEqual([0, 0.25, 1]);
});

test("an upload that runs out of time says so", () => {
  const upload = { method: "post", url: "/frappe/api/method/upload_file", headers: {} } as InternalAxiosRequestConfig;
  expect(errorMessage(new AxiosError("timeout", "ECONNABORTED", upload))).toBe(
    "The upload took more than 10 minutes and was stopped. Check the internet connection, or try a smaller file.",
  );
});

test("the clinic logo upload shows its progress", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("button", { name: "Upload Logo" })).toBeVisible();
  // About 1.5 MB, under the 2 MB limit for a logo.
  const logo = Buffer.alloc(1536 * 1024);
  await page.locator('input[type="file"][accept="image/*"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: logo });
  await expect(page.getByRole("progressbar", { name: "Uploading logo" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Logo uploaded. Press Save Settings to keep it." })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Uploading logo" })).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Clinic logo" })).toBeVisible();
});
