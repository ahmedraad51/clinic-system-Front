import { test, type Page } from "@playwright/test";
import { waitForData } from "../helpers";

/**
 * The pictures in README.md. Run `npm run screenshots:readme` after a visible change and commit
 * docs/screenshots. Desktop size, showing the dummy data.
 */
test.use({ viewport: { width: 1440, height: 900 } });

const OUT = "docs/screenshots";
const userId = (email: string) => encodeURIComponent(Buffer.from(email).toString("base64"));

async function shot(page: Page, path: string, name: string) {
  await page.goto(path);
  await waitForData(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

test("readme screenshots", async ({ page }) => {
  await shot(page, "/dashboard", "dashboard");
  await shot(page, "/today", "today");
  await shot(page, "/patients", "patients");
  await shot(page, "/patients/PAT-2026-00008", "patient");
  await shot(page, "/appointments?view=day", "appointments");
  await shot(page, "/treatments", "treatments");
  await shot(page, "/payments", "payments");
  await shot(page, "/reports", "reports");
  await shot(page, `/users/${userId("ahmed.ezzat@dentclinic.test")}`, "permissions");
  await shot(page, `/users/${userId("mariam.saeed@dentclinic.test")}`, "permissions-partial");
  await shot(page, "/users", "users");

  // The outstanding balances further down the reports page.
  await page.goto("/reports");
  await waitForData(page);
  await page.getByRole("heading", { name: "Outstanding Balances" }).evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.mouse.wheel(0, -80);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/reports-outstanding.png` });

  // The dental chart with a tooth open.
  await page.goto("/patients/PAT-2026-00001");
  await waitForData(page);
  await page.getByRole("tab", { name: "Dental Chart" }).click();
  await page.getByRole("button", { name: /^Tooth 36,/ }).click();
  await page.getByRole("heading", { name: "Dental Chart" }).evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.mouse.wheel(0, -90);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/dental-chart.png` });
});
