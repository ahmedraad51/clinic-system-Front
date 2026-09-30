import { currentLang, intlLocale, localDigits, messages, num } from "@/i18n";
import { toLatinDigits } from "./phone";

/**
 * Currencies shown without decimals. IQD has 3 decimal places on paper (fils) and browsers disagree about
 * it, but Iraqi prices are whole dinars, so it is pinned to none.
 */
const WHOLE_UNIT_CURRENCIES = new Set(["IQD"]);

/**
 * Formats money in the clinic currency (IQD when none is given), e.g. formatMoney(1250000, "IQD") →
 * "IQD 1,250,000" and formatMoney(4500, "USD") → "$4,500"; on Arabic screens "1,250,000 د.ع". Digits are 0-9,
 * or ٠-٩ on Arabic screens when the clinic chose Arabic digits.
 */
export function formatMoney(amount: number | string | null | undefined, currency?: string | null, maxDecimals?: number): string {
  const value = Number(amount) || 0;
  const code = (currency || "IQD").toUpperCase();
  // An exchange rate may have more decimals than the currency's amounts (1 IQD = $0.000685).
  const decimals = maxDecimals ?? (WHOLE_UNIT_CURRENCIES.has(code) ? 0 : 2);
  if (currentLang() === "ar") {
    const symbol = messages().dates.currencySymbols[code] ?? code;
    return `${num(value, { minimumFractionDigits: 0, maximumFractionDigits: decimals })} ${symbol}`;
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    return `${code} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals }).format(value)}`;
  }
}

/** How many decimals amounts in this currency have on screen and in number boxes: 0 for IQD, 2 otherwise. */
export function currencyDecimals(currency?: string | null): number {
  return WHOLE_UNIT_CURRENCIES.has((currency || "IQD").toUpperCase()) ? 0 : 2;
}

/**
 * What a number box keeps of the typed text. Arabic-keyboard digits become 0-9 and the Arabic decimal mark (٫)
 * becomes "."; thousands separators, spaces and letters are dropped. A "." only counts next to a digit (so
 * "د.ع 25,000" → "25000"), and two or more of them are thousands separators ("1.250.000" → "1250000").
 * With `decimals` off every "." is a separator: "1.500" → "1500" (whole dinars, ages).
 */
export function cleanNumberText(value: string, decimals = true): string {
  const text = toLatinDigits(value).replace(/٫/g, ".");
  let kept = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char >= "0" && char <= "9") kept += char;
    else if (char === "." && decimals && (/\d/.test(text[i - 1] ?? "") || /\d/.test(text[i + 1] ?? ""))) kept += ".";
  }
  return kept.split(".").length > 2 ? kept.replace(/\./g, "") : kept;
}

const DATE_PARTS = /^(\d{4})-(\d{2})-(\d{2})/;

/** "2026-09-08" → "8 Sep 2026" ("8 أيلول 2026"). Works on the date part only, so time zones cannot shift the day. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const match = DATE_PARTS.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  const d = messages().dates;
  return localDigits(d.date(String(Number(day)), d.monthsShort[Number(month) - 1] ?? month, year));
}

/** Like formatDate, but without the year when it is this year: "27 Sep" (or "3 Jan 2027"). */
export function formatShortDate(value: string | null | undefined): string {
  const match = value ? DATE_PARTS.exec(value) : null;
  if (!match || Number(match[1]) !== new Date().getFullYear()) return formatDate(value);
  const d = messages().dates;
  return localDigits(d.dayMonth(String(Number(match[3])), d.monthsShort[Number(match[2]) - 1] ?? match[2]));
}

/** "14:30:00" → "2:30 PM" ("2:30 م"). */
export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  const d = messages().dates;
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return localDigits(d.time(String(hour12), match[2], hours >= 12 ? d.pm : d.am));
}

/** "2026-09-07 10:00:00" → "7 Sep 2026, 10:00 AM". */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const [date, time] = value.split(/[ T]/);
  return time ? messages().dates.dateTime(formatDate(date), formatTime(time)) : formatDate(date);
}

/** "10:30" → 630. */
export function toMinutes(time: string | null | undefined): number {
  const match = /^(\d{1,2}):(\d{2})/.exec(time || "");
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A Date as "YYYY-MM-DD" in local time. (toISOString() would use UTC and can give the wrong day.) */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return toISODate(new Date(year, month - 1, day + days));
}

/**
 * The same day `months` months later (earlier when negative). A day the target month does not have becomes its
 * last day: 31 Aug + 6 months is 28 Feb, not 3 Mar.
 */
export function addMonths(iso: string, months: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const lastDay = new Date(year, month - 1 + months + 1, 0).getDate();
  return toISODate(new Date(year, month - 1 + months, Math.min(day, lastDay)));
}

const localDate = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
};

/** "2026-09-26" → "Saturday, 26 September 2026" ("السبت، 26 أيلول 2026"). */
export function formatLongDate(iso: string): string {
  const date = localDate(iso);
  const d = messages().dates;
  return localDigits(d.longDate(d.daysLong[date.getDay()], String(date.getDate()), d.monthsLong[date.getMonth()], String(date.getFullYear())));
}

/** "2026-09-26" → "Sat" ("سبت"). */
export function weekdayShort(iso: string): string {
  return messages().dates.daysShort[localDate(iso).getDay()];
}

/** "2026-09-26" → "Saturday" ("السبت"). */
export function weekdayLong(iso: string): string {
  return messages().dates.daysLong[localDate(iso).getDay()];
}

/** The day the calendar week starts on: 0 is Sunday (the working week in most of the region), 1 is Monday. */
export const WEEK_STARTS_ON = 0;

/** The first day of the week that holds the given date. */
export function weekStart(iso: string): string {
  return addDays(iso, -((localDate(iso).getDay() - WEEK_STARTS_ON + 7) % 7));
}

/** 0 (Sunday) to 6 (Saturday) for "YYYY-MM-DD". */
export function weekdayIndex(iso: string): number {
  return localDate(iso).getDay();
}

/** 630 → "10:30". */
export function fromMinutes(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** First day of the month that is `offset` months away from the given date. */
export function monthStart(iso: string, offset = 0): string {
  const [year, month] = iso.split("-").map(Number);
  return toISODate(new Date(year, month - 1 + offset, 1));
}

/** "2026-09" → "Sep 2026" ("أيلول 2026"). */
export function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  const d = messages().dates;
  return localDigits(d.monthYear(d.monthsShort[Number(month) - 1] ?? month, year));
}

/** "2026-09" → "Sep" ("أيلول"), for chart labels. */
export function formatMonthName(yearMonth: string): string {
  const month = Number(yearMonth.split("-")[1]);
  return messages().dates.monthsShort[month - 1] ?? String(month);
}

/** A short number for charts: 450000 → "450K" ("450 ألف"), 1250000 → "1.3M", 36 → "36". */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat(intlLocale(), { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

/** Shows a dash for empty values. */
export function display(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

/** True for text that says nothing, like "", "None" or "-". Used to decide whether to show a medical alert. */
export function isBlankMedical(value: string | null | undefined): boolean {
  const text = (value || "").trim().toLowerCase();
  return text === "" || text === "none" || text === "no" || text === "nil" || text === "-" || text === "n/a";
}

/** A CSV cell that a spreadsheet cannot run as a formula: "=HYPERLINK(…)" → "'=HYPERLINK(…)". */
export function csvSafe(cell: string | number | null | undefined): string {
  if (typeof cell === "number") return String(cell);
  const text = String(cell ?? "");
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

/** Joins class names and drops the empty ones. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Turns rows into a CSV file and downloads it. A text cell that starts with = + - @ (or a tab or line break)
 * gets a leading ' so a spreadsheet shows it as text instead of running it as a formula; numbers stay numbers.
 */
export function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number>>): void {
  const escape = (cell: string | number) => {
    const text = csvSafe(cell);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
