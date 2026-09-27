import { expect, test } from "../fixtures";
import { waitForData } from "../helpers";
import { compareCash } from "../../src/lib/cashCount";

test("the drawer is matched, short or over", () => {
  expect(compareCash(1000, 1000)).toEqual({ state: "matched", difference: 0 });
  expect(compareCash(1000, 950)).toEqual({ state: "short", difference: -50 });
  expect(compareCash(1000, 1020)).toEqual({ state: "over", difference: 20 });
  // Rounding noise is not money.
  expect(compareCash(0.3, 0.1 + 0.2).state).toBe("matched");
});

test("count today's cash, with a note when it is short, and update it", async ({ page }) => {
  // Today (26 Sep) has one Cash payment of $800.
  await page.goto("/payments/day");
  await waitForData(page);
  await expect(page.getByText("Not counted yet.")).toBeVisible();
  await page.getByLabel("Opening float").fill("200");
  await page.getByLabel("Cash counted").fill("950");
  await expect(page.getByText("Short by $50").first()).toBeVisible();

  // Short or over needs a note.
  await page.getByRole("button", { name: "Save Count" }).click();
  await expect(page.getByText("Write a note saying why the cash is short or over.")).toBeVisible();
  await page.getByLabel("Note").fill("Gave change twice.");
  await page.getByRole("button", { name: "Save Count" }).click();
  await expect(page.getByText("Cash count saved.")).toBeVisible();
  await expect(page.getByText(/^Counted by Administrator/)).toBeVisible();

  // It is in the list of recent counts, with the note.
  const recent = page.getByRole("row", { name: /26 Sep 2026/ });
  await expect(recent).toContainText("Short by $50");
  await expect(recent).toContainText("Gave change twice.");

  // Counted again: now it matches.
  await page.getByLabel("Cash counted").fill("1000");
  await expect(page.getByText("Matched").first()).toBeVisible();
  await page.getByRole("button", { name: "Update Count" }).click();
  await expect(page.getByRole("row", { name: /26 Sep 2026/ })).toContainText("Matched");
});

test("a manager looks back at past counts", async ({ page }) => {
  await page.goto("/payments/day");
  await waitForData(page);
  await expect(page.getByRole("row", { name: /30 Jul 2026/ })).toContainText("Short by $50");
  await expect(page.getByRole("row", { name: /30 Jul 2026/ })).toContainText("Change was given twice to one patient.");

  await page.getByRole("link", { name: "18 Aug 2026" }).click();
  await expect(page).toHaveURL(/date=2026-08-18/);
  await waitForData(page);
  await expect(page.getByLabel("Cash counted")).toHaveValue("720");
  await expect(page.getByText("Over by $20").first()).toBeVisible();
  await expect(page.getByText(/^Counted by Mariam Saeed/)).toBeVisible();
});
