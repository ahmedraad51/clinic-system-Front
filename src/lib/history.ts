/**
 * Record history: who created a record and who changed what, and when. Frappe keeps a Version record for each
 * save of a doctype with "Track Changes" on, and `frappe.desk.form.load.getdoc` returns the latest ones with the
 * document (see getDocHistory() in frappe.ts). This file turns them into readable lines.
 */
import { formatDate, formatTime } from "./format";
import type { DocValue } from "./types";

/** The doctypes whose history is shown. The back end must turn on Track Changes for each. */
export const TRACKED_DOCTYPES = ["Patient", "Appointment", "Treatment Plan", "Payment"] as const;

/** Frappe returns this many versions with a document. */
export const HISTORY_LIMIT = 10;

export interface HistoryChange {
  field: string;
  from: DocValue;
  to: DocValue;
}

export interface HistoryEntry {
  name: string;
  user: string;
  /** The user's full name, or the user ID when the name is not known. */
  userName: string;
  /** "2026-08-20 10:15:32.123456" */
  at: string;
  changes: HistoryChange[];
}

export interface DocHistory {
  createdBy: string;
  createdByName: string;
  createdAt: string;
  /** Newest first. */
  entries: HistoryEntry[];
}

/** What getdoc returns in `docinfo`, as far as the history needs it. */
export interface RawDocInfo {
  versions?: Array<{ name: string; owner: string; creation: string; data: string | { changed?: unknown } }>;
  user_info?: Record<string, { fullname?: string } | undefined>;
}

/**
 * Reads the document's owner and creation and its versions into a DocHistory. getdoc names the document's
 * owner, its last editor and the users in the versions (`user_info`); anyone it does not name shows as their
 * user ID.
 */
export function parseDocHistory(
  doc: { owner?: string; creation?: string } | undefined,
  docinfo: RawDocInfo | undefined,
): DocHistory {
  const nameOf = (user: string) => docinfo?.user_info?.[user]?.fullname || user;
  const entries = (docinfo?.versions ?? [])
    .map((version) => {
      let data: { changed?: unknown } = {};
      try {
        data = typeof version.data === "string" ? (JSON.parse(version.data) as { changed?: unknown }) : version.data ?? {};
      } catch {
        // An unreadable version is left out.
      }
      const changes = Array.isArray(data.changed)
        ? data.changed
            .filter((row): row is [string, DocValue, DocValue] => Array.isArray(row) && typeof row[0] === "string")
            .map(([field, from, to]) => ({ field, from, to }))
        : [];
      return { name: version.name, user: version.owner, userName: nameOf(version.owner), at: version.creation, changes };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
  const createdBy = doc?.owner ?? "";
  return { createdBy, createdByName: createdBy ? nameOf(createdBy) : "", createdAt: doc?.creation ?? "", entries };
}

/** Field labels in the words the screens use. Fields not listed get their name with spaces. */
const LABELS: Record<string, Record<string, string>> = {
  Patient: {
    full_name: "Name", date_of_birth: "Date of birth", phone_number: "Phone", secondary_phone: "Second phone",
    current_medications: "Current medications", chronic_diseases: "Chronic diseases", medical_history: "Medical history",
    dental_chart: "Dental chart", next_recall_date: "Next check-up", recall_interval_months: "Check-up every (months)",
    no_recall: "No recall",
  },
  Appointment: {
    appointment_date: "Date", appointment_time: "Time", duration_minutes: "Length (minutes)", reason_for_visit: "Reason",
  },
  "Treatment Plan": {
    treatment_type: "Treatment", tooth_number: "Tooth", total_cost: "Total cost", treatment_notes: "Notes",
    lab_name: "Lab", lab_sent_date: "Sent to the lab", lab_due_date: "Due back from the lab",
    lab_received_date: "Back from the lab",
  },
  Payment: { treatment_plan: "Treatment plan", payment_date: "Date", payment_method: "Method" },
};

/** Fields the server works out or copies from another record: their changes follow from the ones shown. */
const HIDDEN = new Set([
  "name", "owner", "creation", "modified", "modified_by", "idx", "docstatus",
  "patient_name", "doctor_name", "paid_amount", "remaining_amount",
  "total_appointments", "total_treatments", "total_paid", "total_remaining",
]);
/** Hidden for one doctype only: a Payment's treatment_type is copied from its plan. */
const HIDDEN_FOR: Record<string, string[]> = { Payment: ["treatment_type"] };

const MONEY_FIELDS = new Set(["amount", "total_cost"]);
const CHECK_FIELDS = new Set(["no_recall", "is_active", "enabled"]);
/** Too long or not text: say it changed, without the values. */
const WITHOUT_VALUES = new Set(["dental_chart"]);

export function isShownChange(doctype: string, field: string): boolean {
  return !HIDDEN.has(field) && !(HIDDEN_FOR[doctype] ?? []).includes(field);
}

/**
 * A Link field holds an ID (DOC-00002); the name is in the field copied from it, which Frappe records in the same
 * version when it changes (doctor_name, patient_name; a Payment's treatment_type from its plan).
 */
const LINK_LABELS: Record<string, string> = { doctor: "doctor_name", patient: "patient_name" };
const LINK_LABELS_FOR: Record<string, Record<string, string>> = { Payment: { treatment_plan: "treatment_type" } };

/**
 * The changes of one version as they should be shown: without the fields the server works out, and with names
 * instead of IDs for Link fields when the version has them (the ID only when it does not).
 */
export function readableChanges(doctype: string, changes: HistoryChange[]): HistoryChange[] {
  const labels = { ...LINK_LABELS, ...(LINK_LABELS_FOR[doctype] ?? {}) };
  const byField = new Map(changes.map((change) => [change.field, change]));
  return changes
    .filter((change) => isShownChange(doctype, change.field))
    .map((change) => {
      const label = labels[change.field] ? byField.get(labels[change.field]) : undefined;
      if (!label) return change;
      return {
        field: change.field,
        from: isEmptyValue(label.from) ? change.from : label.from,
        to: isEmptyValue(label.to) ? change.to : label.to,
      };
    });
}

export function fieldLabel(doctype: string, field: string): string {
  const label = LABELS[doctype]?.[field];
  if (label) return label;
  const words = field.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function showsValues(field: string): boolean {
  return !WITHOUT_VALUES.has(field);
}

export function isEmptyValue(value: DocValue): boolean {
  return value === null || value === undefined || value === "";
}

/**
 * A number the way a Version may hold it. Frappe writes the values of a Version as formatted text (its
 * `get_formatted`), so an amount arrives as "150,000.00" or "IQD 150,000.00"; the dummy data keeps numbers.
 * Null when the text is not a number.
 */
function numberOf(value: DocValue): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!/^\D*-?[\d,]+(\.\d+)?\D*$/.test(text)) return null;
  const parsed = Number(text.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

/** A Check field as a Version may hold it: 1 or "1" (the dummy data), or Frappe's formatted "Yes" / "✔". */
function isYes(value: DocValue): boolean {
  if (typeof value === "number") return value !== 0;
  if (typeof value === "boolean") return value;
  return !/^(0|no|✗|✘|false)$/i.test(String(value).trim());
}

/**
 * One value the way the screens show it: money, yes/no, times and ISO dates are formatted; a line break that
 * Frappe wrote as "<br>" becomes a real one; anything else (a date in the site's own format, "20-08-2026") is
 * shown as it came. "—" for empty.
 */
export function historyValue(field: string, value: DocValue, money: (amount: number | string) => string): string {
  if (isEmptyValue(value)) return "—";
  if (MONEY_FIELDS.has(field)) {
    const amount = numberOf(value);
    return amount === null ? String(value) : money(amount);
  }
  if (CHECK_FIELDS.has(field)) return isYes(value) ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value).replace(/<br\s*\/?>/gi, "\n");
  if (field.endsWith("_time")) return formatTime(text);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return formatDate(text);
  return text;
}
