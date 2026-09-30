/**
 * Profit: what came in (payments, in the clinic's currency) minus what went out (expenses), for the whole clinic and
 * per doctor, and the plain sentences that sum it up on the Reports page. Pure functions: no data loading here.
 */
import { label, messages } from "@/i18n";
import { baseAmount } from "./currency";
import type { Expense, Payment } from "./types";

/** A doctor's share of the period. `doctor` is "" for the whole clinic (shared costs, payments without a doctor). */
export interface DoctorProfit {
  doctor: string;
  name: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface Profit {
  revenue: number;
  expenses: number;
  profit: number;
  /** Profit as a whole percentage of what came in; null when nothing came in. */
  margin: number | null;
  /** Expense category and amount, biggest first. */
  byCategory: Array<[string, number]>;
  /** Doctors by what they brought in, biggest first; the whole clinic's row last. */
  byDoctor: DoctorProfit[];
}

export interface ProfitInput {
  payments: Array<Pick<Payment, "amount" | "base_amount" | "treatment_plan">>;
  expenses: Array<Pick<Expense, "amount" | "base_amount" | "category" | "doctor" | "doctor_name">>;
  /** Each treatment plan's doctor (ID and name), so a payment counts for the doctor of its plan. */
  planDoctors: Record<string, { doctor: string; name: string }>;
}

/** Everything in the clinic's currency: a payment or expense in the other one counts at the rate of its day. */
export function computeProfit({ payments, expenses, planDoctors }: ProfitInput): Profit {
  const rows = new Map<string, DoctorProfit>();
  const row = (doctor: string, name: string) => {
    let found = rows.get(doctor);
    if (!found) {
      found = { doctor, name, revenue: 0, expenses: 0, profit: 0 };
      rows.set(doctor, found);
    }
    if (!found.name && name) found.name = name;
    return found;
  };
  let revenue = 0;
  payments.forEach((payment) => {
    const amount = baseAmount(payment);
    revenue += amount;
    const plan = payment.treatment_plan ? planDoctors[payment.treatment_plan] : undefined;
    row(plan?.doctor ?? "", plan?.name ?? "").revenue += amount;
  });
  let spent = 0;
  const categories = new Map<string, number>();
  expenses.forEach((expense) => {
    const amount = baseAmount(expense);
    spent += amount;
    categories.set(expense.category, (categories.get(expense.category) ?? 0) + amount);
    row(expense.doctor || "", expense.doctor_name || "").expenses += amount;
  });
  rows.forEach((doctor) => {
    doctor.profit = doctor.revenue - doctor.expenses;
  });
  const profit = revenue - spent;
  return {
    revenue,
    expenses: spent,
    profit,
    margin: revenue > 0 ? Math.round((profit / revenue) * 100) : null,
    byCategory: [...categories.entries()].sort((a, b) => b[1] - a[1]),
    byDoctor: [...rows.values()].sort((a, b) => (a.doctor === "" ? 1 : b.doctor === "" ? -1 : b.revenue - a.revenue)),
  };
}

/** The period of the same length just before [from, to] (both ISO dates), as [from, to, days]. */
export function previousPeriod(from: string, to: string): [string, string, number] {
  const day = 24 * 60 * 60 * 1000;
  const start = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const end = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  const days = Math.round((end - start) / day) + 1;
  const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
  return [iso(start - days * day), iso(start - day), days];
}

export interface SummaryInput {
  profit: Profit;
  /** "From 1 Sep 2026 to 26 Sep 2026", or "So far". */
  when: string;
  money: (amount: number) => string;
  /** The period just before, when the chosen one has a start and an end. */
  previous?: { profit: number; days: number; range: string };
  /** What patients still owe on their plans, already formatted; empty when nothing. */
  owed?: string;
}

/** The report in a few plain sentences, in the screen's language. */
export function profitSummary({ profit, when, money, previous, owed }: SummaryInput): string[] {
  const t = messages();
  const p = t.reports.profit;
  const sentences: string[] = [];
  if (profit.revenue === 0 && profit.expenses === 0) {
    sentences.push(p.nothing(when));
  } else if (profit.profit > 0) {
    sentences.push(p.made(when, money(profit.revenue), money(profit.expenses), money(profit.profit), profit.margin ?? 0));
  } else if (profit.profit < 0) {
    sentences.push(p.lost(when, money(profit.revenue), money(profit.expenses), money(-profit.profit)));
  } else {
    sentences.push(p.even(when, money(profit.revenue)));
  }
  if (profit.expenses === 0 && profit.revenue > 0) sentences.push(p.noCosts);
  if (previous) {
    const days = p.days(previous.days);
    const change = previous.profit > 0 && profit.profit >= 0 ? Math.round(((profit.profit - previous.profit) / previous.profit) * 100) : null;
    if (change === null) sentences.push(p.was(days, previous.range, money(previous.profit)));
    else if (change > 0) sentences.push(p.up(change, days, previous.range, money(previous.profit)));
    else if (change < 0) sentences.push(p.down(-change, days, previous.range, money(previous.profit)));
    else sentences.push(p.same(days, previous.range));
  }
  const [category, amount] = profit.byCategory[0] ?? [];
  if (category && amount && profit.expenses > 0) {
    sentences.push(p.biggestCost(label(t.enums.expenseCategory, category), money(amount), Math.round((amount / profit.expenses) * 100)));
  }
  const best = profit.byDoctor.find((row) => row.doctor !== "" && row.revenue > 0);
  if (best) sentences.push(p.bestDoctor(best.name || best.doctor, money(best.revenue), money(best.profit)));
  if (owed) sentences.push(p.owed(owed));
  return sentences;
}
