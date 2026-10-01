import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests and screenshots. They run against a production build on its own port,
 * so they never clash with a `npm run dev` that is already running on port 3000.
 *
 *   npm run test:e2e      the tests in e2e/tests
 *   npm run screenshots   every page at desktop, tablet and phone size, saved to screenshots/
 *   npm run screenshots:readme   the pictures in README.md, saved to docs/screenshots/
 *   npm run screenshots:arabic   the main screens in Arabic at three sizes, saved to docs/arabic/
 *   npm run screenshots:design   the redesign's "after" pictures, saved to docs/design-changes/after/
 *   npm run screenshots:fonts    the font comparison (dashboard and patient page per font), saved to docs/fonts/
 */
const PORT = Number(process.env.E2E_PORT || 3100);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  outputDir: "test-results",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "e2e",
      testDir: "e2e/tests",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "screens",
      testDir: "e2e/screens",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "arabic",
      testDir: "e2e/arabic",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "design-changes",
      testDir: "e2e/design-changes",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "readme",
      testDir: "e2e/readme",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "fonts",
      testDir: "e2e/fonts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // SKIP_BUILD=1 reuses the last `npm run build`.
    command: `${process.env.SKIP_BUILD ? "" : "npm run build && "}npx next start -p ${PORT}`,
    url: BASE_URL,
    timeout: 300_000,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
  },
});
