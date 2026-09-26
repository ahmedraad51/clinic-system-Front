import { expect, test } from "../fixtures";
import { openFromMenu, waitForData } from "../helpers";

test("mark a tooth on the dental chart and save it", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromMenu(page, "Patients");
  await page.getByRole("link", { name: "Mona Adel" }).click();
  await waitForData(page);
  await page.getByRole("tab", { name: "Dental Chart" }).click();
  await expect(page.getByText("Nothing marked. All teeth are recorded as healthy.")).toBeVisible();

  // Tooth 46: caries on the occlusal and mesial surfaces, and a root canal.
  await page.getByRole("button", { name: /^Tooth 46,/ }).click();
  await expect(page.getByText("Lower right first molar")).toBeVisible();
  await page.getByRole("button", { name: "Occlusal surface: healthy" }).click();
  // The surface buttons are clipped shapes on one square, so tap where the surface is drawn:
  // on 46 (patient's right) mesial is the right-hand side of the 144 px square.
  await page.getByRole("button", { name: "Mesial surface: healthy" }).click({ position: { x: 130, y: 72 } });
  await page.getByRole("button", { name: "Root canal", exact: true }).click();
  await page.getByLabel("Note").fill("Deep caries, sensitive to cold");
  await page.getByRole("button", { name: "Save Chart" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Dental chart saved." })).toBeVisible();

  // Leave the patient and come back: the chart was stored.
  await openFromMenu(page, "Patients");
  await page.getByRole("link", { name: "Mona Adel" }).click();
  await waitForData(page);
  await page.getByRole("tab", { name: "Dental Chart" }).click();
  const finding = page.getByRole("button", { name: /^46\s/ });
  await expect(finding).toContainText("Root canal · caries M, O");
  await expect(finding).toContainText("Deep caries, sensitive to cold");

  // From the tooth, start a treatment plan with the tooth filled in.
  await finding.click();
  await page.getByRole("link", { name: "New treatment for this tooth" }).click();
  await expect(page.getByRole("heading", { name: "New Treatment Plan" })).toBeVisible();
  await expect(page.getByLabel("Tooth")).toHaveValue("46");
});

test("a chart saved in the old format still loads", async ({ page }) => {
  await page.goto("/patients/PAT-2026-00002");
  await waitForData(page);
  await page.getByRole("tab", { name: "Dental Chart" }).click();
  await expect(page.getByRole("button", { name: /^24\s/ })).toContainText("Has treatment (old chart)");
  await page.getByRole("button", { name: /^Tooth 24,/ }).click();
  await expect(page.getByText(/The old chart marked this tooth/)).toBeVisible();
});

test("a treatment plan shows the chart at its tooth, and the chart prints", async ({ page }) => {
  // Nadia Samir's crown on tooth 36.
  await page.goto("/treatments/TRT-2026-00002");
  await waitForData(page);
  await expect(page.getByText("Lower left first molar")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Tooth 36,/ })).toHaveAttribute("aria-pressed", "true");
  // Read only here: no marking buttons.
  await expect(page.getByRole("button", { name: "Root canal", exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "Print", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dental Chart" })).toBeVisible();
  await waitForData(page);
  await expect(page.getByRole("button", { name: /^36\s/ })).toContainText("Crown, root canal");
});

test("on a phone the chart scrolls to the chosen tooth", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Amir Zaki's crown on tooth 37, at the far end of the lower jaw.
  await page.goto("/treatments/TRT-2026-00013");
  await waitForData(page);
  const tooth = page.getByRole("button", { name: /^Tooth 37,/ });
  // Scroll the page only (not the chart) so the test sees what the app did.
  await page.getByRole("heading", { name: "Dental Chart" }).scrollIntoViewIfNeeded();
  await expect(tooth).toHaveAttribute("aria-pressed", "true");
  await expect(tooth).toBeInViewport({ ratio: 0.9 });
});
