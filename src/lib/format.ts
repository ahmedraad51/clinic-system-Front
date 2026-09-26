const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats money in the clinic currency, e.g. formatMoney(4500, "USD") → "$4,500". */
export function formatMoney(amount: number | string | null | undefined, currency?: string | null): string {
  const value = Number(amount) || 0;
  const code = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${code} ${value.toLocaleString("en-US")}`;
  }
}

/** "2026-09-08" → "8 Sep 2026". Works on the date part only, so time zones cannot shift the day. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? month} ${year}`;
}

/** "14:30:00" → "2:30 PM". */
export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${match[2]} ${suffix}`;
}

/** "2026-09-07 10:00:00" → "7 Sep 2026, 10:00 AM". */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const [date, time] = value.split(/[ T]/);
  return time ? `${formatDate(date)}, ${formatTime(time)}` : formatDate(date);
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

const localDate = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
};

/** "2026-09-26" → "Saturday, 26 September 2026". */
export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    localDate(iso),
  );
}

/** "2026-09-26" → "Sat". */
export function weekdayShort(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(localDate(iso));
}

/** The day the calendar week starts on: 0 is Sunday (the working week in most of the region), 1 is Monday. */
export const WEEK_STARTS_ON = 0;

/** The first day of the week that holds the given date. */
export function weekStart(iso: string): string {
  return addDays(iso, -((localDate(iso).getDay() - WEEK_STARTS_ON + 7) % 7));
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

/** "2026-09" → "Sep 2026". */
export function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${MONTHS[Number(month) - 1] ?? month} ${year}`;
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

/** Joins class names and drops the empty ones. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Turns rows into a CSV file and downloads it. */
export function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number>>): void {
  const escape = (cell: string | number) => {
    const text = String(cell ?? "");
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
