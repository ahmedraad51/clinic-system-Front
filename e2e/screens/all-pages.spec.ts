import { test } from "@playwright/test";
import { waitForData } from "../helpers";

/**
 * Takes a full-page screenshot of every screen at three sizes and saves them to screenshots/<size>/.
 * Run with `npm run screenshots`. PAGES=dashboard,patients limits it to some pages.
 * Detail pages use records from the dummy data.
 */
const SIZES = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "phone", width: 390, height: 844 },
];

const MANAGER_ID = encodeURIComponent(Buffer.from("laith.hamid@dentclinic.test").toString("base64"));

const PAGES: Array<[string, string]> = [
  ["dashboard", "/dashboard"],
  ["today", "/today"],
  ["patients", "/patients"],
  ["recall", "/recall"],
  ["patient-new", "/patients/new"],
  ["patient-detail", "/patients/PAT-2026-00001"],
  ["patient-edit", "/patients/PAT-2026-00001/edit"],
  ["patient-estimate", "/patients/PAT-2026-00004/estimate"],
  ["patient-statement", "/patients/PAT-2026-00001/statement"],
  ["patient-chart", "/patients/PAT-2026-00001/chart"],
  ["appointments", "/appointments"],
  ["appointment-new", "/appointments/new"],
  ["appointment-detail", "/appointments/APT-2026-00001"],
  ["appointment-edit", "/appointments/APT-2026-00001/edit"],
  ["appointment-card", "/appointments/APT-2026-00001/card"],
  ["treatments", "/treatments"],
  ["treatment-new", "/treatments/new"],
  ["treatment-detail", "/treatments/TRT-2026-00002"],
  ["treatment-edit", "/treatments/TRT-2026-00002/edit"],
  ["prescription-new", "/prescriptions/new?patient=PAT-2026-00008&doctor=DOC-00004"],
  ["prescription-detail", "/prescriptions/RX-2026-00002"],
  ["prescription-own-paper", "/prescriptions/RX-2026-00001"],
  ["prescription-edit", "/prescriptions/RX-2026-00002/edit"],
  ["payments", "/payments"],
  ["payment-new", "/payments/new"],
  ["payment-day-report", "/payments/day"],
  ["payment-detail", "/payments/PAY-2026-00001"],
  ["payment-edit", "/payments/PAY-2026-00001/edit"],
  ["expenses", "/expenses"],
  ["waiting-room", "/waiting-room"],
  ["activity", "/activity"],
  ["patient-card", "/patients/PAT-2026-00001/card"],
  ["patient-file", "/patients/PAT-2026-00001/file"],
  ["patient-chart-print", "/patients/PAT-2026-00001/chart"],
  ["reports", "/reports"],
  ["doctors", "/doctors"],
  ["medicines", "/medicines"],
  ["users", "/users"],
  ["user-detail", `/users/${MANAGER_ID}`],
  ["whatsapp", "/whatsapp"],
  ["settings", "/settings"],
  ["profile", "/profile"],
  ["not-found", "/no-such-page"],
];

const only = process.env.PAGES?.split(",").map((p) => p.trim()).filter(Boolean);

for (const size of SIZES) {
  test.describe(size.name, () => {
    test.use({ viewport: { width: size.width, height: size.height } });
    for (const [name, path] of PAGES) {
      if (only && !only.includes(name)) continue;
      test(name, async ({ page }) => {
        await page.goto(path);
        await waitForData(page);
        await page.waitForTimeout(400);
        await page.screenshot({ path: `screenshots/${size.name}/${name}.png`, fullPage: true });
      });
    }
  });
}
