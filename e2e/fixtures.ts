import { test as base, expect } from "@playwright/test";

/**
 * Every test runs on the same day and time, so results do not depend on when the tests are run
 * (the dummy data has dates in September 2026, and the clinic is closed on Fridays).
 * Import `test` and `expect` from here instead of "@playwright/test".
 */
export const FIXED_NOW = new Date("2026-09-26T08:30:00");

export const test = base.extend({
  // Named "provide", not Playwright's usual "use", so the React hooks lint rule does not mistake it for a hook.
  page: async ({ page }, provide) => {
    await page.clock.setFixedTime(FIXED_NOW);
    await provide(page);
  },
});

export { expect };
