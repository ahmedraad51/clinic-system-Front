import type { Page } from "@playwright/test";
import { test } from "../fixtures";
import { waitForData } from "../helpers";

/**
 * Before-and-after pictures of the fourth change (docs/design-changes/4-controls): the app's own dropdowns, date and
 * time pickers, checkboxes, file buttons and fonts instead of the browser's. SHOTS is "before" or "after" (default).
 * Run with `SHOTS=after npx playwright test --project=design-changes controls`. "After" also opens the new pickers
 * (the browser's own lists cannot be photographed).
 */
const SHOTS = process.env.SHOTS || "after";
const DIR = `docs/design-changes/4-controls/${SHOTS}`;
const AFTER = SHOTS === "after";

const SIZES = [
  { name: "desktop", width: 1440, height: 900, lang: "en" as const, dark: false },
  { name: "desktop-ar", width: 1440, height: 900, lang: "ar" as const, dark: false },
  { name: "desktop-dark", width: 1440, height: 900, lang: "en" as const, dark: true },
  { name: "phone", width: 390, height: 844, lang: "en" as const, dark: false },
  { name: "phone-ar", width: 390, height: 844, lang: "ar" as const, dark: false },
];

const userPath = "/users/" + encodeURIComponent(Buffer.from("dalia.jawad@dentclinic.test").toString("base64"));

/** Opens one of the new pickers by the data-picker attribute of its field (after only). */
async function openPicker(page: Page, name: string) {
  await page.locator(`[data-picker="${name}"]`).first().click();
  await page.waitForTimeout(300);
}

/** A screen: where to go, what to click to reach the form, and (after) which picker to open. */
const SCREENS: Array<{ name: string; path: string; open?: (page: Page) => Promise<void>; then?: (page: Page) => Promise<void> }> = [
  {
    name: "new-treatment",
    path: "/patients/PAT-2026-00001",
    open: (page) => page.getByTestId("open-new-treatment").click(),
    then: (page) => openPicker(page, "doctor"),
  },
  {
    name: "new-appointment",
    path: "/patients/PAT-2026-00001",
    open: (page) => page.getByTestId("open-new-appointment").click(),
    then: (page) => openPicker(page, "appointment_date"),
  },
  {
    name: "new-appointment-time",
    path: "/patients/PAT-2026-00001",
    open: (page) => page.getByTestId("open-new-appointment").click(),
    then: (page) => openPicker(page, "appointment_time"),
  },
  {
    name: "new-payment",
    path: "/treatments/TRT-2026-00002",
    open: (page) => page.getByTestId("open-new-payment").click(),
    then: (page) => openPicker(page, "payment_method"),
  },
  {
    name: "add-patient",
    path: "/patients",
    open: (page) => page.getByTestId("open-new-patient").click(),
    then: (page) => openPicker(page, "gender"),
  },
  {
    name: "expense",
    path: "/expenses",
    open: (page) => page.getByRole("button", { name: /^(Add Expense|إضافة مصروف)$/ }).click(),
    then: (page) => openPicker(page, "category"),
  },
  { name: "patients-filters", path: "/patients", then: (page) => openPicker(page, "balance") },
  { name: "settings-hours", path: "/settings", open: (page) => page.getByRole("tab", { name: /^(Working Hours|ساعات العمل)$/ }).click() },
  {
    name: "settings-colour",
    path: "/settings",
    open: (page) => page.getByRole("tab", { name: /^(Features|الميزات)$/ }).click(),
    then: async (page) => {
      await page.getByRole("button", { name: /^(Choose any colour|اختر أي لون)$/ }).click();
      await page.waitForTimeout(300);
    },
  },
  {
    name: "address-suggestions",
    path: "/patients",
    open: (page) => page.getByTestId("open-new-patient").click(),
    then: async (page) => {
      await page.locator("input[name='address']").fill("ب");
      await page.waitForTimeout(300);
    },
  },
  { name: "permissions", path: userPath },
  { name: "patient-file", path: "/patients/PAT-2026-00001/file" },
  { name: "patient", path: "/patients/PAT-2026-00008" },
];

for (const size of SIZES) {
  test.describe(size.name, () => {
    test.use({ lang: size.lang });
    test(`controls ${SHOTS}, ${size.name}`, async ({ page }) => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width: size.width, height: size.height });
      if (size.dark) await page.addInitScript(() => localStorage.setItem("appearance", JSON.stringify({ mode: "dark" })));
      for (const screen of SCREENS) {
        await page.goto(screen.path);
        await waitForData(page);
        if (screen.open) {
          await screen.open(page);
          await page.waitForTimeout(500);
        }
        if (AFTER && screen.then) await screen.then(page);
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${DIR}/${size.name}/${screen.name}.png` });
      }
    });
  });
}
