/**
 * Who is due for a check-up, and the recall date the dentist chooses. Used by the Recall page, the dashboard's
 * "Needs attention" card, the patient page and the "What was done in this visit?" dialog.
 *
 * The dentist's choice wins: a patient with `next_recall_date` is due on that date, and one marked `no_recall`
 * never is. Everyone else is due when no completed visit falls within the chosen period. Nobody with a visit
 * booked from today on is due.
 */
import { messages } from "@/i18n";
import { addMonths } from "./format";
import type { Appointment, Patient } from "./types";

/** Fields to load for dueForRecall(). */
export const RECALL_APPOINTMENT_FIELDS = ["patient", "appointment_date", "status"];
export const RECALL_PATIENT_FIELDS = ["name", "next_recall_date", "recall_interval_months", "no_recall"];

/** The months offered on the Recall page and to the dentist; 6 is the usual check-up interval. */
export const RECALL_PERIODS = [3, 6, 9, 12] as const;
export const DEFAULT_RECALL_MONTHS = 6;

type RecallFields = Pick<Patient, "name"> & Partial<Pick<Patient, "next_recall_date" | "recall_interval_months" | "no_recall">>;

export interface RecallDue<P extends RecallFields = Patient> {
  patient: P;
  /** The last completed visit, or "" when the patient has never been seen. */
  lastVisit: string;
  /** When the check-up was due: the dentist's date, or the last visit plus the period ("" if never seen). */
  dueDate: string;
  /** True when the dentist chose the date. */
  byDentist: boolean;
}

/** The date that is `months` months before `iso`. */
export function monthsBefore(iso: string, months: number): string {
  return addMonths(iso, -months);
}

/** Patients due for a check-up, longest overdue first and never-seen patients last. */
export function dueForRecall<P extends RecallFields>(
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
  const due: Array<RecallDue<P>> = [];
  patients.forEach((patient) => {
    if (booked.has(patient.name) || Number(patient.no_recall) === 1) return;
    const lastVisit = last.get(patient.name) ?? "";
    if (patient.next_recall_date) {
      if (patient.next_recall_date <= today) due.push({ patient, lastVisit, dueDate: patient.next_recall_date, byDentist: true });
    } else if (lastVisit < cutoff) {
      due.push({ patient, lastVisit, dueDate: lastVisit ? addMonths(lastVisit, months) : "", byDentist: false });
    }
  });
  return due.sort((x, y) => (x.dueDate || "9999").localeCompare(y.dueDate || "9999"));
}

/**
 * The dentist's choice as one value for a select: "" (not set: the usual rule), "none" (no recall), or the
 * number of months.
 */
export type RecallChoice = string;

export function recallChoiceOf(patient: Partial<Pick<Patient, "recall_interval_months" | "no_recall">>): RecallChoice {
  if (Number(patient.no_recall) === 1) return "none";
  const months = Number(patient.recall_interval_months) || 0;
  return months > 0 ? String(months) : "";
}

/** The options for a recall select, in order, with labels in the current language. Call it while drawing. */
export function recallChoices(): Array<{ value: RecallChoice; label: string }> {
  const t = messages().recall;
  return [
    { value: "", label: t.choiceUsual },
    ...RECALL_PERIODS.map((m) => ({ value: String(m), label: t.choiceEvery(m) })),
    { value: "none", label: t.choiceNone },
  ];
}

/**
 * The same options as recallChoices(), kept for older callers: each label is read in the current language when
 * it is used. Prefer recallChoices().
 */
export const RECALL_CHOICES: ReadonlyArray<{ readonly value: RecallChoice; readonly label: string }> = [
  { value: "", get label() { return messages().recall.choiceUsual; } },
  ...RECALL_PERIODS.map((m) => ({ value: String(m), get label() { return messages().recall.choiceEvery(m); } })),
  { value: "none", get label() { return messages().recall.choiceNone; } },
];

/**
 * The Patient fields to save for a choice. `date` is the next check-up for an interval (counted from the visit
 * by the caller); it is ignored for "" and "none".
 */
export function recallUpdate(
  choice: RecallChoice,
  date: string,
): Pick<Patient, "recall_interval_months" | "no_recall" | "next_recall_date"> {
  if (choice === "none") return { no_recall: 1, recall_interval_months: 0, next_recall_date: null };
  const months = Number(choice) || 0;
  if (!months) return { no_recall: 0, recall_interval_months: 0, next_recall_date: null };
  return { no_recall: 0, recall_interval_months: months, next_recall_date: date || null };
}

/** The next check-up for an interval, counted from a visit. */
export function recallDateFrom(visit: string, choice: RecallChoice): string {
  const months = Number(choice) || 0;
  return months > 0 ? addMonths(visit, months) : "";
}
