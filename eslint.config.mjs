import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Hover hints are the app's own (tooltip() in the UI kit), never the browser's title tooltip.
      "react/forbid-dom-props": [
        "error",
        { forbid: [{ propName: "title", message: "Use {...tooltip(text)} from the UI kit, not the browser's title hint." }] },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright output (see playwright.config.ts).
    "test-results/**",
    "playwright-report/**",
    "screenshots/**",
  ]),
]);

export default eslintConfig;
