import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";
import { buildReceiptSlip, DEFAULT_SLIP_PAPER, normalizeSlipPaper, type SlipData } from "../../src/lib/receiptSlip";

const sample: SlipData = {
  clinicName: "DentClinic",
  clinicPhone: "0770 123 4567",
  receiptNo: "PAY-2026-00001",
  date: "20 Aug 2026",
  printedAt: "26 Sep 2026, 10:42 AM",
  patient: "Zahraa <b>Hussein</b>",
  forWhat: "Crown",
  method: "Cash",
  amount: "IQD 3,000",
  balance: { label: "Left on this treatment", amount: "IQD 3,000" },
  printedBy: "داليا جواد",
};

test("the slip is sized for the paper roll and escapes what it prints", () => {
  const html = buildReceiptSlip(sample, DEFAULT_SLIP_PAPER);
  // The page size is set when printing, from the slip's measured length.
  expect(html).toContain("@page { margin: 0; }");
  expect(html).toContain("body { width: 80mm;");
  expect(html).toContain("Zahraa &lt;b&gt;Hussein&lt;/b&gt;");
  expect(html).not.toContain("<b>Hussein</b>");
  expect(html).toContain("Left on this treatment");
  expect(html).toContain("Printed 26 Sep 2026, 10:42 AM by داليا جواد");

  const narrow = buildReceiptSlip({ ...sample, balance: undefined }, { widthMm: 58, marginMm: 2, textSize: "large" });
  expect(narrow).toContain("body { width: 58mm;");
  expect(narrow).not.toContain("Left on this treatment");
  // Large text is 18% bigger: 12px becomes 14.16px.
  expect(narrow).toContain("font-size: 14.16px");
});

test("paper settings stay within what a receipt printer can do", () => {
  expect(normalizeSlipPaper({ widthMm: 200, marginMm: 25, textSize: "huge" })).toEqual({ widthMm: 120, marginMm: 10, textSize: "normal" });
  expect(normalizeSlipPaper({ widthMm: -5, marginMm: -1 })).toEqual(DEFAULT_SLIP_PAPER);
  expect(normalizeSlipPaper(null)).toEqual(DEFAULT_SLIP_PAPER);
  expect(normalizeSlipPaper({ widthMm: "58", marginMm: "2.5", textSize: "small" })).toEqual({ widthMm: 58, marginMm: 2.5, textSize: "small" });
});

test("print a receipt slip and set this computer's paper width", async ({ page }) => {
  // Record what each hidden print frame prints, instead of opening the print dialog.
  await page.addInitScript(() => {
    const view = window as unknown as { __printed?: string[] };
    if (window === window.top) {
      view.__printed = [];
    } else {
      // Like a real browser: the page is printed, then "afterprint" says the dialog closed.
      window.print = () => {
        (window.top as unknown as { __printed: string[] }).__printed.push(document.documentElement.outerHTML);
        window.dispatchEvent(new Event("afterprint"));
      };
    }
  });
  const printed = () => page.evaluate(() => (window as unknown as { __printed: string[] }).__printed);

  await page.goto("/payments/PAY-2026-00001");
  await waitForData(page);
  await expect(page.getByText("Receipt slip for a receipt printer (80 mm paper)")).toBeVisible();
  await page.getByRole("button", { name: "Print Slip" }).click();
  await expect.poll(async () => (await printed()).length).toBe(1);
  const first = (await printed())[0];
  expect(first).toContain("PAY-2026-00001");
  expect(first).toContain("زهراء حسين");
  expect(first).toContain("Bank Transfer");
  expect(first).toContain("width: 80mm");
  // Sized to the slip when printed: 80 mm wide and as long as the content.
  expect(first).toMatch(/@page \{ size: 80mm \d+mm; margin: 0; \}/);
  // Zahraa's crown costs IQD 200,000 and this was the first 100,000.
  expect(first).toContain("Left on this treatment");
  expect(first).toMatch(/Left on this treatment<\/span><span class="value">IQD(?:\s|&nbsp;)100,000/);
  expect(first).toMatch(/Printed .* by Administrator/);

  // A 58 mm printer on this computer.
  await page.getByRole("button", { name: "Slip Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Receipt Slip Settings" });
  await dialog.getByRole("button", { name: "58 mm" }).click();
  await dialog.getByRole("button", { name: "Print Test Slip" }).click();
  await expect.poll(async () => (await printed()).length).toBe(2);
  expect((await printed())[1]).toContain("TEST SLIP");
  expect((await printed())[1]).toContain("width: 58mm");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Receipt slip for a receipt printer (58 mm paper)")).toBeVisible();

  // Remembered after the page is opened again.
  await page.reload();
  await waitForData(page);
  await expect(page.getByText("Receipt slip for a receipt printer (58 mm paper)")).toBeVisible();
  await page.getByRole("button", { name: "Print Slip" }).click();
  await expect.poll(async () => (await printed()).length).toBe(1);
  expect((await printed())[0]).toContain("width: 58mm");
});

test("a reprinted slip shows what was left right after that payment", async ({ page }) => {
  await page.addInitScript(() => {
    const view = window as unknown as { __printed?: string[] };
    if (window === window.top) view.__printed = [];
    else
      window.print = () => {
        (window.top as unknown as { __printed: string[] }).__printed.push(document.documentElement.outerHTML);
        window.dispatchEvent(new Event("afterprint"));
      };
  });
  // Abbas's implant costs IQD 1,000,000. This 300,000 down payment (2 Jul) left 700,000, even though he has paid more since.
  await page.goto("/payments/PAY-2026-00009");
  await waitForData(page);
  await page.getByRole("button", { name: "Print Slip" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __printed: string[] }).__printed.length)).toBe(1);
  const html = await page.evaluate(() => (window as unknown as { __printed: string[] }).__printed[0]);
  expect(html).toMatch(/Left on this treatment<\/span><span class="value">IQD(?:\s|&nbsp;)700,000/);
});

test("slip settings refuse a width a receipt printer cannot have", async ({ page }) => {
  await page.goto("/payments/PAY-2026-00001");
  await waitForData(page);
  await page.getByRole("button", { name: "Slip Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Receipt Slip Settings" });
  await dialog.getByRole("button", { name: "Other" }).click();
  await dialog.getByLabel("Width (mm)").fill("200");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Enter a paper width between 40 and 120 mm.")).toBeVisible();
  await expect(dialog).toBeVisible();
});
