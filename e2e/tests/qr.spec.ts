import type { Page } from "@playwright/test";
import jsQR from "jsqr";
import { expect, test } from "../fixtures";
import { navigate, waitForData } from "../helpers";
import { patientIdFromScan, patientQrValue, qrMatrix } from "../../src/lib/qr";

/**
 * A stand-in camera for the scanner: getUserMedia gives a canvas stream, and the browser's QR reader
 * (BarcodeDetector) reports whatever the test puts in window.__scanValue. With `camera: false` there is none.
 */
async function fakeCamera(page: Page, camera = true) {
  await page.addInitScript((withCamera) => {
    const w = window as unknown as { __scanValue?: string; BarcodeDetector?: unknown };
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          if (!withCamera) throw new DOMException("No camera", "NotFoundError");
          const canvas = document.createElement("canvas");
          canvas.width = 320;
          canvas.height = 240;
          const context = canvas.getContext("2d");
          setInterval(() => {
            context?.fillRect(0, 0, 10, 10);
          }, 100);
          return canvas.captureStream(10);
        },
      },
    });
    w.BarcodeDetector = class {
      async detect() {
        return w.__scanValue ? [{ rawValue: w.__scanValue }] : [];
      }
    };
  }, camera);
}

test("a QR code made for a patient reads back to that patient", () => {
  const value = patientQrValue("PAT-2026-00003", "https://clinic.example/");
  expect(value).toBe("https://clinic.example/patients/PAT-2026-00003");
  // Draw the modules as pixels, 4 per module with a white margin, and read them like a camera frame.
  const matrix = qrMatrix(value);
  const scale = 4;
  const margin = 4 * scale;
  const size = matrix.length * scale + margin * 2;
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (!dark) return;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const at = ((margin + y * scale + dy) * size + margin + x * scale + dx) * 4;
          pixels[at] = pixels[at + 1] = pixels[at + 2] = 0;
        }
      }
    }),
  );
  expect(jsQR(pixels, size, size)?.data).toBe(value);
  expect(patientIdFromScan(jsQR(pixels, size, size)?.data ?? "")).toBe("PAT-2026-00003");
});

test("scanned text is read as a patient ID only when it is one", () => {
  expect(patientIdFromScan("https://clinic.example/patients/PAT-2026-00003")).toBe("PAT-2026-00003");
  expect(patientIdFromScan("http://localhost:3000/patients/PAT-2026-00003/chart")).toBe("PAT-2026-00003");
  expect(patientIdFromScan(" pat-2026-00010 ")).toBe("PAT-2026-00010");
  expect(patientIdFromScan("https://clinic.example/appointments/APT-2026-00001")).toBeNull();
  expect(patientIdFromScan("https://example.com/patients/<script>")).toBeNull();
  expect(patientIdFromScan("hello")).toBeNull();
});

test("the patient ID card and the printed chart carry the patient's QR code", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00001");
  await waitForData(page);
  await page.getByRole("link", { name: "ID Card" }).click();
  await expect(page.getByRole("heading", { name: "Patient ID Card" })).toBeVisible();
  await waitForData(page);
  const card = page.getByTestId("patient-card");
  await expect(card).toContainText("زهراء حسين");
  await expect(card).toContainText("PAT-2026-00001");
  const code = card.getByRole("img", { name: "QR code of the file of زهراء حسين" });
  await expect(code).toHaveAttribute("data-qr-value", /\/patients\/PAT-2026-00001$/);
  // A bank card's size: 85.6 × 54 mm.
  const box = await card.boundingBox();
  expect(Math.round(box?.width ?? 0)).toBe(324);
  expect(Math.round(box?.height ?? 0)).toBe(204);

  await navigate(page, "/patients/PAT-2026-00001/chart");
  await expect(page.getByRole("img", { name: "QR code of the file of زهراء حسين" })).toBeVisible();
  await expect(page.getByText("Scan to open the patient file")).toBeVisible();
});

test("Scan opens the patient whose card is held to the camera", async ({ page }) => {
  await fakeCamera(page);
  await page.goto("/dashboard");
  await waitForData(page);
  await page.getByRole("button", { name: "Scan a patient card" }).click();
  const dialog = page.getByRole("dialog", { name: "Scan a Patient Card" });
  await expect(dialog).toBeVisible();

  // A code that is not a patient card says so and keeps looking.
  await page.evaluate(() => ((window as unknown as { __scanValue?: string }).__scanValue = "https://example.com/menu"));
  await expect(dialog.getByText("This QR code is not a DentClinic patient card.")).toBeVisible();
  await page.evaluate(() => ((window as unknown as { __scanValue?: string }).__scanValue = `${location.origin}/patients/PAT-2026-00003`));
  await expect(page).toHaveURL(/\/patients\/PAT-2026-00003$/);
  await expect(page.getByRole("heading", { name: "هبة كاظم" })).toBeVisible();
  await expect(dialog).toBeHidden();
});

test("without a camera, the patient ID can be typed", async ({ page }) => {
  await fakeCamera(page, false);
  await page.goto("/dashboard");
  await waitForData(page);
  await page.getByRole("button", { name: "Scan a patient card" }).click();
  const dialog = page.getByRole("dialog", { name: "Scan a Patient Card" });
  await expect(dialog.getByText(/The camera cannot be used here/)).toBeVisible();
  await dialog.getByLabel("Or type the patient ID").fill("hello");
  await dialog.getByRole("button", { name: "Open Patient" }).click();
  await expect(dialog.getByText("Type an ID such as PAT-2026-00001.")).toBeVisible();
  await dialog.getByLabel("Or type the patient ID").fill("pat-2026-00005");
  await dialog.getByRole("button", { name: "Open Patient" }).click();
  await expect(page.getByRole("heading", { name: "فاطمة سلمان" })).toBeVisible();
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the ID card in Arabic", async ({ page }) => {
    await page.goto("/patients/PAT-2026-00001/card");
    await waitForData(page);
    await expect(page.getByRole("heading", { name: "بطاقة المريض" })).toBeVisible();
    await expect(page.getByTestId("patient-card")).toContainText("رقم المريض");
  });
});
