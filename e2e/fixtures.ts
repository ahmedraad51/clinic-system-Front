import { test as base, expect } from "@playwright/test";
import { setLocale, type Lang } from "../src/i18n/runtime";

/**
 * Every test runs on the same day and time, so results do not depend on when the tests are run
 * (the dummy data has dates in September 2026, and the clinic is closed on Fridays).
 * Import `test` and `expect` from here instead of "@playwright/test".
 *
 * The app starts in English for the tests (Arabic is the app's default): the texts they look for are English.
 * A test about Arabic sets `test.use({ lang: "ar" })`. Helpers the tests call directly (outside the browser)
 * answer in English too.
 */
export const FIXED_NOW = new Date("2026-09-26T08:30:00");

setLocale("en", false);

export const test = base.extend<{ lang: Lang }>({
  lang: ["en", { option: true }],
  // Named "provide", not Playwright's usual "use", so the React hooks lint rule does not mistake it for a hook.
  page: async ({ page, lang }, provide) => {
    await page.clock.setFixedTime(FIXED_NOW);
    // The language chosen on this computer (and shown last, for the first paint). Only on the first page: a test
    // that switches the language keeps its choice across reloads.
    await page.addInitScript((value) => {
      if (localStorage.getItem("language_choice")) return;
      localStorage.setItem("language_choice", value);
      localStorage.setItem("language", value);
    }, lang);
    await provide(page);
  },
});

export { expect };
