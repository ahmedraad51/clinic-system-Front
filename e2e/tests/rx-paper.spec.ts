import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import { navigate, waitForData } from "../helpers";
import { rxPageCss, rxPaperOf, rxPaperPayload } from "../../src/lib/rxPaper";

/** The text of every <style> on the page (a hidden element has no text for toHaveText). */
const pageStyles = (page: Page) => page.evaluate(() => [...document.querySelectorAll("style")].map((style) => style.textContent).join(" "));

test("a prescription prints on its doctor's own heading", async ({ page }) => {
  // RX-2026-00001 is Dr. Noor Al-Saadi's: her name, qualifications and footer, on A5.
  await page.goto("/prescriptions/RX-2026-00001");
  await waitForData(page);
  const header = page.getByTestId("rx-header");
  await expect(header).toContainText("Dr. Noor Al-Saadi");
  await expect(header).toContainText("BDS, MSc Endodontics (University of Baghdad)");
  await expect(header).toContainText("DentClinic");
  await expect(page.getByTestId("rx-footer")).toContainText("Sat–Thu 9 AM–6 PM");
  await expect(page.getByTestId("rx-prints-on")).toHaveText("Prints on Dr. Noor Al-Saadi's paper (A5).");
  await expect.poll(() => pageStyles(page)).toContain("size: A5; margin: 10mm 10mm 10mm");
});

test("on pre-printed paper the header and footer are left blank", async ({ page }) => {
  // RX-2026-00002 is Dr. Haider Al-Obaidi's, whose pads have 45 mm printed at the top and 25 mm at the bottom.
  await page.goto("/prescriptions/RX-2026-00002");
  await waitForData(page);
  await expect(page.getByTestId("rx-header-area")).toHaveText("Printed header on the paper (45 mm)");
  await expect(page.getByTestId("rx-footer-area")).toHaveText("Printed footer on the paper (25 mm)");
  await expect(page.getByTestId("rx-header")).toHaveCount(0);
  await expect.poll(() => pageStyles(page)).toContain("margin: 45mm 10mm 25mm");
  // On paper the dashed boxes are not printed: the page margins leave the room instead.
  await page.emulateMedia({ media: "print" });
  await expect(page.getByTestId("rx-header-area")).toBeHidden();
  // The patient on the prescription itself (the back link above it is not printed).
  await expect(page.getByText("Saad Nouri").last()).toBeVisible();
});

test("the doctor's page sets the prescription paper, with a preview", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  await navigate(page, "/doctors/DOC-00001");
  await expect(page.getByTestId("rx-paper-summary")).toHaveText("A5 paper with the clinic letterhead.");

  await page.getByRole("button", { name: "Edit Paper" }).click();
  const dialog = page.getByRole("dialog", { name: "Prescription Paper: Dr. Zainab Al-Hashimi" });
  await dialog.getByLabel("Paper size").selectOption("A4");
  await dialog.getByLabel("Qualifications").fill("BDS (University of Baghdad)\nMSc Restorative Dentistry");
  const preview = dialog.getByTestId("rx-preview");
  await expect(preview).toContainText("MSc Restorative Dentistry");
  await expect(preview).toContainText("A4");

  // Pre-printed paper needs the room for its header in mm.
  await dialog.getByRole("switch", { name: /already has the header/ }).click();
  await dialog.getByLabel("Space for the printed header (mm)").fill("");
  await dialog.getByRole("button", { name: "Save Paper" }).click();
  await expect(dialog.getByText("Enter a number of mm from 0 to 120.")).toBeVisible();
  await dialog.getByLabel("Space for the printed header (mm)").fill("50");
  await expect(preview.getByTestId("rx-header-area")).toHaveText("Printed header on the paper (50 mm)");
  await dialog.getByRole("switch", { name: /already has the header/ }).click();
  await dialog.getByRole("button", { name: "Save Paper" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: "Prescription paper saved for Dr. Zainab Al-Hashimi." })).toBeVisible();
  await expect(page.getByTestId("rx-paper-summary")).toHaveText("A4 paper with the doctor's own heading.");
});

test.describe("in Arabic", () => {
  test.use({ lang: "ar" });

  test("the paper texts in Arabic", async ({ page }) => {
    await page.goto("/prescriptions/RX-2026-00002");
    await waitForData(page);
    await expect(page.getByTestId("rx-header-area")).toHaveText("الترويسة المطبوعة على الورقة (45 ملم)");
  });
});

test("paper settings have safe defaults and limits", () => {
  expect(rxPaperOf(null)).toEqual({
    size: "A5", preprinted: false, topMm: 40, bottomMm: 20, qualifications: "", footer: "", logo: "", signature: "",
  });
  const paper = rxPaperOf({ rx_paper_size: "A4", rx_preprinted: 1, rx_top_mm: 500, rx_bottom_mm: -3 });
  expect([paper.size, paper.preprinted, paper.topMm, paper.bottomMm]).toEqual(["A4", true, 120, 0]);
  expect(rxPaperOf({ rx_paper_size: "Letter" }).size).toBe("A5");
  expect(rxPageCss(paper)).toContain("@page { size: A4; margin: 120mm 10mm 0mm; }");
  expect(rxPaperPayload({ ...paper, qualifications: "  BDS  ", logo: "" })).toMatchObject({
    rx_paper_size: "A4", rx_preprinted: 1, rx_qualifications: "BDS", rx_logo: null,
  });
});
