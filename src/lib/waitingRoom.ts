/**
 * The waiting room: where an open appointment of today stands (not here yet, waiting, in the chair), and the short
 * names shown on the waiting room screen, where other patients can read them.
 */
import type { Appointment } from "./types";

export type VisitStep = "waiting" | "in_chair" | null;

const isOpen = (a: Pick<Appointment, "status">) => a.status === "Scheduled" || a.status === "Confirmed";

/** Waiting (arrived, not called in) or in the chair; null before arriving and once the visit is closed. */
export function visitStep(a: Pick<Appointment, "status" | "arrived_at" | "in_chair_at">): VisitStep {
  if (!isOpen(a)) return null;
  if (a.in_chair_at) return "in_chair";
  if (a.arrived_at) return "waiting";
  return null;
}

/** Whole minutes from a Frappe Datetime ("2026-09-26 10:05:00", local time) to now, never below 0. */
export function minutesSince(datetime: string | null | undefined, now: Date): number {
  if (!datetime) return 0;
  const [date, time = "00:00:00"] = datetime.split(/[ T]/);
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss] = time.split(":").map(Number);
  const then = new Date(y, m - 1, d, hh || 0, mm || 0, Math.floor(ss || 0));
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / 60000));
}

/** "Zahraa Hussein" → "Zahraa H.": enough to be called, too little for others to know who it is. */
export function shortName(fullName: string | null | undefined): string {
  const words = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words[0] ?? "";
  const last = words[words.length - 1];
  return `${words[0]} ${Array.from(last)[0]}.`;
}
