import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";

test("the whole patient file prints on one page, with the parts chosen", async ({ page }) => {
  // Zahraa Hussein: a root canal and a crown on 36, a prescription, three payments and five images.
  await page.goto("/patients/PAT-2026-00001");
  await waitForData(page);
  await page.getByRole("link", { name: "Print File" }).click();
  await expect(page.getByRole("heading", { name: "Patient File" })).toBeVisible();
  await waitForData(page);

  await expect(page.getByRole("heading", { name: "Patient details" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Penicillin" })).toBeVisible();
  await expect(page.getByTestId("file-treatments")).toContainText("Root Canal");
  await expect(page.getByTestId("file-treatments")).toContainText("Crown preparation and impression.");
  await expect(page.getByTestId("file-appointments")).toContainText("Crown preparation");
  await expect(page.getByTestId("file-prescriptions")).toContainText("Clindamycin 300 mg, Ibuprofen 400 mg");
  await expect(page.getByTestId("file-total-paid")).toHaveText("IQD 250,000");
  await expect(page.getByTestId("file-balance")).toHaveText("IQD 100,000");
  await expect(page.getByRole("heading", { name: "Dental Chart", exact: true })).toBeVisible();

  // X-rays are left out at first, and can be added; any part can be left out.
  await expect(page.getByTestId("file-images")).toHaveCount(0);
  await page.getByRole("checkbox", { name: "X-rays and photos" }).check();
  await expect(page.getByTestId("file-images").locator("figure")).toHaveCount(5);
  await page.getByRole("checkbox", { name: "Payments" }).uncheck();
  await expect(page.getByTestId("file-payments")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Print" })).toBeEnabled();
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the patient file in Arabic", async ({ page }) => {
    await page.goto("/patients/PAT-2026-00001/file");
    await waitForData(page);
    await expect(page.getByRole("heading", { name: "ملف المريض" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "المعلومات الطبية" })).toBeVisible();
    await expect(page.getByTestId("file-balance")).toContainText("100,000");
  });
});
