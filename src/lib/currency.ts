import { currencyDecimals } from "./format";

/**
 * Two currencies: the clinic's own (Clinic Settings → `currency`, IQD) and, when set, a second one
 * (`second_currency`, USD). A treatment plan and a payment each have a `currency` (empty means the clinic's own).
 * The exchange rate says how many of the clinic's own units one unit of the second currency is worth
 * (1 USD = 1,460 IQD), and each rate counts from its date on (`exchange_rates`), so a payment always uses the rate
 * of the day it was made, and keeps it (`Payment.exchange_rate`).
 */
export interface ExchangeRate {
  rate_date: string;
  rate: number;
}

/**
 * How far a payment in another currency may go over what a plan has left: less than one smallest unit of the
 * payment's currency (one cent is IQD 14.6 at 1,460), since a cent more or less cannot be paid. What it takes off the
 * plan is then capped at what was left, so paying "the full balance" in dollars closes a dinar plan.
 */
export function settleTolerance(payCurrency: string, planCurrency: string, rate: number | null | undefined, main: string): number {
  if (payCurrency === planCurrency || !rate || rate <= 0) return 0;
  const unit = 10 ** -currencyDecimals(payCurrency);
  const inPlan = planCurrency === main ? unit * rate : unit / rate;
  // Just under one unit, so a whole unit more is still refused.
  return inPlan * 0.999;
}

/** Totals kept apart by currency: { IQD: 250000, USD: 300 }. */
export type MoneyTotals = Record<string, number>;

/** Rounds an amount to what its currency can hold: whole dinars, cents for dollars. */
export function roundMoney(amount: number, currency?: string | null): number {
  const factor = 10 ** currencyDecimals(currency);
  return Math.round((Number(amount) || 0) * factor) / factor;
}

/** Only the rows with a date and a rate above 0, oldest first. */
export function cleanRates(rates: ExchangeRate[] | null | undefined): ExchangeRate[] {
  return (rates ?? [])
    .map((row) => ({ rate_date: String(row.rate_date || "").slice(0, 10), rate: Number(row.rate) }))
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.rate_date) && row.rate > 0)
    .sort((a, b) => a.rate_date.localeCompare(b.rate_date));
}

/**
 * The rate on a day: the newest one dated on or before it. A day before the first rate uses the first rate
 * (the clinic had one, it just was not written down yet). Null when no rate was ever set.
 */
export function rateOn(rates: ExchangeRate[] | null | undefined, day: string): number | null {
  const list = cleanRates(rates);
  if (!list.length) return null;
  let found = list[0].rate;
  for (const row of list) {
    if (row.rate_date <= day) found = row.rate;
    else break;
  }
  return found;
}

/**
 * Converts an amount between the clinic's currency (`main`) and the second one at `rate`, rounded for the
 * currency it ends in. The same currency comes back as it is; null when a rate is missing.
 */
export function convertMoney(
  amount: number,
  from: string,
  to: string,
  rate: number | null | undefined,
  main: string,
): number | null {
  if (from === to) return Number(amount) || 0;
  if (!rate || rate <= 0) return null;
  if (from === main) return roundMoney((Number(amount) || 0) / rate, to);
  if (to === main) return roundMoney((Number(amount) || 0) * rate, to);
  return null;
}

/** The currency of a plan or payment; empty means the clinic's own. */
export function currencyOf(doc: { currency?: string | null } | null | undefined, main: string): string {
  return (doc?.currency || main).toUpperCase();
}

/** Adds an amount to a set of totals (in place) and returns it. */
export function addMoney(totals: MoneyTotals, currency: string, amount: number): MoneyTotals {
  totals[currency] = roundMoney((totals[currency] ?? 0) + (Number(amount) || 0), currency);
  return totals;
}

/** Totals by currency of a list of rows. */
export function sumByCurrency<T>(rows: T[], amountOf: (row: T) => number, currencyOfRow: (row: T) => string): MoneyTotals {
  return rows.reduce<MoneyTotals>((totals, row) => addMoney(totals, currencyOfRow(row), amountOf(row)), {});
}

/** The currencies of some totals that are not zero, the clinic's own first. */
export function totalsOrder(totals: MoneyTotals, main: string): string[] {
  return Object.keys(totals)
    .filter((code) => Math.abs(totals[code]) >= 0.005)
    .sort((a, b) => (a === main ? -1 : b === main ? 1 : a.localeCompare(b)));
}

/**
 * A payment in the clinic's own currency (Payment.base_amount). A payment saved before there were two currencies has
 * only `amount` (Frappe returns 0 for an empty Currency field, and a payment is never 0, so 0 counts as missing).
 */
export function baseAmount(payment: { amount?: number | string | null; base_amount?: number | string | null }): number {
  return Number(payment.base_amount) || Number(payment.amount) || 0;
}

/** What a payment took off its plan, in the plan's currency (Payment.plan_amount, else its amount). */
export function planAmountOf(payment: { amount?: number | string | null; plan_amount?: number | string | null }): number {
  return Number(payment.plan_amount) || Number(payment.amount) || 0;
}
