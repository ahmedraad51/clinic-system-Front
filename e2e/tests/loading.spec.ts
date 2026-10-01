import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";

test("a record page keeps its shape while it loads", async ({ page }) => {
  await page.goto("/dashboard");
  await waitForData(page);
  // Slow dummy data (see latency in mockData.ts), so the loading state stays on screen for a moment.
  await page.evaluate(() => ((window as unknown as { __mockLatency: number }).__mockLatency = 1500));
  // Not navigate(): that waits for the data, and this test looks at the page before it arrives.
  await page.evaluate(() =>
    (window as unknown as { next: { router: { push: (url: string) => void } } }).next.router.push("/patients/PAT-2026-00001"),
  );

  const loading = page.getByRole("status").filter({ hasText: "Loading..." });
  await expect(loading).toBeVisible();
  // An outline of the page, not a spinner in an empty page.
  await expect(loading.locator(".animate-pulse")).toBeVisible();
  await expect(page.getByRole("heading", { name: "زهراء حسين" })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".animate-pulse")).toHaveCount(0);
});
