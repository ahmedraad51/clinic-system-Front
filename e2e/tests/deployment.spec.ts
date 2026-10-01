import type { NextConfig } from "next";
import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";

test("with the dummy data, the profile page previews another way of installing", async ({ page }) => {
  await page.goto("/profile");
  await waitForData(page);
  const mode = page.getByLabel("Installed as");
  // Built as the cloud (the default).
  await expect(mode).toHaveValue("cloud");
  await expect(page.locator('[data-picker="deployment_mode"]')).toContainText("Cloud (built in)");

  // Choosing reloads the page.
  await Promise.all([page.waitForEvent("load"), mode.selectOption("clinic-server")]);
  await waitForData(page);
  await expect(page.getByLabel("Installed as")).toHaveValue("clinic-server");
  expect(await page.evaluate(() => localStorage.getItem("demo_deployment_mode"))).toBe("clinic-server");

  // Back to the built one: nothing is kept.
  await Promise.all([page.waitForEvent("load"), page.getByLabel("Installed as").selectOption("cloud")]);
  await waitForData(page);
  expect(await page.evaluate(() => localStorage.getItem("demo_deployment_mode"))).toBeNull();
});

test("in the cloud each clinic's requests go to its own Frappe site, and the main address to the platform's", async () => {
  process.env.DEPLOYMENT_MODE = "cloud";
  process.env.CLOUD_DOMAIN = "dentclinic.example";
  process.env.CLINIC_SITE_URL = "https://{clinic}.sites.example";
  process.env.PLATFORM_SITE_URL = "https://platform.sites.example";
  // Loaded as CommonJS, so the config may sit one "default" deeper.
  const loaded = (await import("../../next.config")) as unknown as { default: NextConfig & { default?: NextConfig } };
  const config: NextConfig = loaded.default.default ?? loaded.default;
  const rules = (await config.rewrites!()) as Array<{ source: string; destination: string; has?: Array<{ value: string }> }>;
  expect(config.env).toMatchObject({ DEPLOYMENT_MODE: "cloud", CLOUD_DOMAIN: "dentclinic.example" });

  const [clinic, platform] = rules;
  expect(clinic.destination).toBe("https://:clinic.sites.example/:path*");
  expect(platform.destination).toBe("https://platform.sites.example/:path*");
  // Next.js matches the host name (no port) against the whole pattern.
  const host = new RegExp(`^${clinic.has![0].value}$`);
  expect("alnoor.dentclinic.example".match(host)?.groups?.clinic).toBe("alnoor");
  expect("al-noor2.dentclinic.example".match(host)?.groups?.clinic).toBe("al-noor2");
  for (const other of ["dentclinic.example", "www.dentclinic.example", "app.dentclinic.example", "a.dentclinic.example", "alnoor.other.example"]) {
    expect(host.test(other), other).toBe(false);
  }
  expect(host.test("apple.dentclinic.example")).toBe(true);
});

test("the clinic is read from the web address", async () => {
  const { clinicFromHost, isMainAddress, isValidClinicAddress } = await import("../../src/lib/deployment");
  expect(clinicFromHost("alnoor.dentclinic.example", "dentclinic.example")).toBe("alnoor");
  expect(clinicFromHost("ALNOOR.dentclinic.example:3000", "dentclinic.example")).toBe("alnoor");
  expect(clinicFromHost("www.dentclinic.example", "dentclinic.example")).toBeNull();
  expect(clinicFromHost("dentclinic.example", "dentclinic.example")).toBeNull();
  expect(clinicFromHost("alnoor.dentclinic.example", "")).toBeNull();
  expect(isMainAddress("www.dentclinic.example", "dentclinic.example")).toBe(true);
  expect(isMainAddress("alnoor.dentclinic.example", "dentclinic.example")).toBe(false);
  expect(isValidClinicAddress("al-noor")).toBe(true);
  for (const bad of ["ab", "1noor", "noor-", "Noor", "noor clinic", "www", "a".repeat(31)]) expect(isValidClinicAddress(bad), bad).toBe(false);
});

test("the public website opens with no login and no menu", async ({ page }) => {
  await page.goto("/site");
  await expect(page.getByRole("heading", { level: 1, name: "DentClinic" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Patients", exact: true })).toHaveCount(0);
  // This build serves one clinic (no CLOUD_DOMAIN): the website opens it.
  await expect(page.getByText("This copy of DentClinic serves one clinic.")).toBeVisible();
  await page.getByRole("link", { name: "Open the Clinic" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
