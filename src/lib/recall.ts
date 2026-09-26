/**
 * Who is due for a check-up: no completed visit within the period, and nothing booked from today on.
 * Used by the Recall page and the dashboard's "Needs attention" card.
 */
import type { Appointment, Patient } from "./types";

/** Fields to load for dueForRecall(). */
export const RECALL_APPOINTMENT_FIELDS = ["patient", "appointment_date", "status"];

/** The months offered on the Recall page; 6 is the usual check-up interval. */
export const RECALL_PERIODS = [3, 6, 9, 12] as const;
export const DEFAULT_RECALL_MONTHS = 6;

export interface RecallDue<P extends Pick<Patient, "name"> = Patient> {
  patient: P;
  /** The last completed visit, or "" when the patient has never been seen. */
  lastVisit: string;
}

/** The date that is `months` months before `iso`. */
export function monthsBefore(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1 - months, d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Patients due for a check-up, longest wait first and never-seen patients last. */
export function dueForRecall<P extends Pick<Patient, "name">>(
  patients: P[],
  appointments: Array<Pick<Appointment, "patient" | "appointment_date" | "status">>,
  today: string,
  months: number,
): Array<RecallDue<P>> {
  const cutoff = monthsBefore(today, months);
  const last = new Map<string, string>();
  const booked = new Set<string>();
  appointments.forEach((a) => {
    if (a.appointment_date >= today && (a.status === "Scheduled" || a.status === "Confirmed")) booked.add(a.patient);
    if (a.appointment_date <= today && a.status === "Completed" && a.appointment_date > (last.get(a.patient) ?? "")) {
      last.set(a.patient, a.appointment_date);
    }
  });
  return patients
    .filter((p) => !booked.has(p.name) && (last.get(p.name) ?? "") < cutoff)
    .map((patient) => ({ patient, lastVisit: last.get(patient.name) ?? "" }))
    .sort((x, y) => (x.lastVisit || "9999").localeCompare(y.lastVisit || "9999"));
}
