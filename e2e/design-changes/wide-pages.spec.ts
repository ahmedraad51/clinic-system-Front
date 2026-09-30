import type { Page } from "@playwright/test";
import { test } from "../fixtures";
import { waitForData } from "../helpers";

/**
 * Before-and-after pictures of the third change (docs/design-changes/3-dialogs-wide): full-width detail pages with a
 * profile card, the permissions table, and new / edit forms in dialogs. SHOTS is "before" or "after" (default).
 * Run with `SHOTS=after npx playwright test --project=design-changes wide-pages`.
 */
const SHOTS = process.env.SHOTS || "after";
const DIR = `docs/design-changes/3-dialogs-wide/${SHOTS}`;

const SIZES = [
  { name: "desktop", width: 1440, height: 900, lang: "en" as const, dark: false },
  { name: "tablet", width: 1024, height: 768, lang: "en" as const, dark: false },
  { name: "phone", width: 390, height: 844, lang: "en" as const, dark: false },
  { name: "desktop-ar", width: 1440, height: 900, lang: "ar" as const, dark: false },
  ...(SHOTS === "after" ? [{ name: "desktop-dark", width: 1440, height: 900, lang: "en" as const, dark: true }] : []),
];

/** A screen: where to go, and (after the change) what to click to open a dialog there. */
const SCREENS: Array<{ name: string; path: string; open?: (page: Page) => Promise<void> }> = [
  { name: "user", path: "/users/" + encodeURIComponent(Buffer.from("dalia.jawad@dentclinic.test").toString("base64")) },
  { name: "profile", path: "/profile" },
  { name: "settings", path: "/settings" },
  { name: "patient", path: "/patients/PAT-2026-00001" },
  { name: "appointment", path: "/appointments/APT-2026-00001" },
  { name: "treatment", path: "/treatments/TRT-2026-00002" },
  { name: "payment", path: "/payments/PAY-2026-00001" },
  { name: "doctor", path: "/doctors" },
  // New with this change: a page for each doctor.
  ...(SHOTS === "after" ? [{ name: "doctor-page", path: "/doctors/DOC-00001" }] : []),
];

/** The new / edit forms: before, their own pages; after, dialogs over the page they are opened from. */
const FORMS: Array<{ name: string; before: string; after: string; open: (page: Page) => Promise<void> }> = [
  {
    name: "new-treatment",
    before: "/treatments/new?patient=PAT-2026-00001",
    after: "/patients/PAT-2026-00001",
    open: (page) => page.getByTestId("open-new-treatment").first().click(),
  },
  {
    name: "new-payment",
    before: "/payments/new?patient=PAT-2026-00001&treatment=TRT-2026-00002",
    after: "/treatments/TRT-2026-00002",
    open: (page) => page.getByTestId("open-new-payment").first().click(),
  },
  {
    name: "new-appointment",
    before: "/appointments/new?patient=PAT-2026-00001",
    after: "/patients/PAT-2026-00001",
    open: (page) => page.getByTestId("open-new-appointment").first().click(),
  },
  {
    name: "add-patient",
    before: "/patients/new",
    after: "/patients",
    open: (page) => page.getByTestId("open-new-patient").first().click(),
  },
];

async function shot(page: Page, path: string) {
  await page.waitForTimeout(700);
  await page.screenshot({ path });
}

for (const size of SIZES) {
  test.describe(size.name, () => {
    test.use({ lang: size.lang });
    test(`wide pages ${SHOTS}, ${size.name}`, async ({ page }) => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width: size.width, height: size.height });
      if (size.dark) await page.addInitScript(() => localStorage.setItem("appearance", JSON.stringify({ mode: "dark" })));
      for (const screen of SCREENS) {
        await page.goto(screen.path);
        await waitForData(page);
        await shot(page, `${DIR}/${size.name}/${screen.name}.png`);
      }
      for (const form of FORMS) {
        await page.goto(SHOTS === "after" ? form.after : form.before);
        await waitForData(page);
        if (SHOTS === "after") {
          await form.open(page);
          await page.waitForTimeout(500);
        }
        await shot(page, `${DIR}/${size.name}/${form.name}.png`);
      }
    });
  });
}
