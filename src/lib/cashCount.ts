/** The end-of-day cash count: what should be in the drawer against what was counted. */

import { messages } from "@/i18n";

export type CashState = "matched" | "short" | "over";

/** Differences smaller than half a fils/cent are rounding, not money. */
const TOLERANCE = 0.005;

/** Rounds to 2 decimals, so 0.1 + 0.2 counts as 0.3. */
export const roundMoney = (value: number) => Math.round(value * 100) / 100;

/** Matched, short (less cash than expected) or over, and by how much (counted minus expected). */
export function compareCash(expected: number, counted: number): { state: CashState; difference: number } {
  const difference = roundMoney(counted - expected);
  if (Math.abs(difference) < TOLERANCE) return { state: "matched", difference: 0 };
  return { state: difference < 0 ? "short" : "over", difference };
}

/** "Matched", "Short by IQD 10,000", "Over by IQD 5,000", with the money already formatted by the caller. */
export function cashStateLabel(state: CashState, amount: string): string {
  const t = messages().cash;
  if (state === "matched") return t.matched;
  return state === "short" ? t.shortBy(amount) : t.overBy(amount);
}
