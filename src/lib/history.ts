/**
 * Record history: who created a record and who changed what, and when. Frappe keeps a Version record for each
 * save of a doctype with "Track Changes" on, and `frappe.desk.form.load.getdoc` returns the latest ones with the
 * document (see getDocHistory() in frappe.ts). This file turns them into readable lines.
 */
import { label, localDigits, messages, type Messages } from "@/i18n";
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
/** Fields that hold a fixed value saved in English: shown with its label in the current language. */
const ENUM_FIELDS: Record<string, keyof Messages["enums"]> = {
  gender: "gender",
  payment_method: "paymentMethod",
  treatment_type: "treatmentType",
  // A Payment's plan is shown by its treatment type (readableChanges); an ID is left as it is.
  treatment_plan: "treatmentType",
};
const STATUS_ENUMS: Record<string, keyof Messages["enums"]> = {
  Appointment: "appointmentStatus",
  "Treatment Plan": "treatmentStatus",
  "Treatment Session": "sessionStatus",
};
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
      const named = labels[change.field] ? byField.get(labels[change.field]) : undefined;
      if (!named) return change;
      return {
        field: change.field,
        from: isEmptyValue(named.from) ? change.from : named.from,
        to: isEmptyValue(named.to) ? change.to : named.to,
      };
    });
}

/**
 * A field's name in the words the screens use (the translations: history.fieldsFor, then history.fields). Fields
 * not listed get their name with spaces.
 */
export function fieldLabel(doctype: string, field: string): string {
  const t = messages().history;
  const name = t.fieldsFor[doctype]?.[field] ?? t.fields[field];
  if (name) return name;
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
 * One value the way the screens show it, in the current language: money, yes/no, times and ISO dates are
 * formatted, fixed values (a status, a payment method …) get their label, and numbers follow the digit setting; a
 * line break that Frappe wrote as "<br>" becomes a real one; anything else (a date in the site's own format,
 * "20-08-2026") is shown as it came. "—" for empty. `doctype` picks the right status labels.
 */
export function historyValue(
  field: string,
  value: DocValue,
  money: (amount: number | string) => string,
  doctype?: string,
): string {
  const t = messages();
  if (isEmptyValue(value)) return t.common.dash;
  if (MONEY_FIELDS.has(field)) {
    const amount = numberOf(value);
    return amount === null ? String(value) : money(amount);
  }
  if (CHECK_FIELDS.has(field)) return isYes(value) ? t.common.yes : t.common.no;
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "number") return localDigits(String(value));
  const list = field === "status" && doctype ? STATUS_ENUMS[doctype] : ENUM_FIELDS[field];
  if (list) return label(t.enums[list] as Record<string, string>, String(value));
  const text = String(value).replace(/<br\s*\/?>/gi, "\n");
  if (field.endsWith("_time")) return formatTime(text);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return formatDate(text);
  return text;
}
