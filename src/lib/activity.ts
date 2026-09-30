/**
 * The activity log: who added, changed and deleted which record, newest first, from three places Frappe already
 * keeps: each record's owner and creation (added), the Version records (changed; Track Changes) and the Deleted
 * Document records (deleted, with a copy to restore). Pure functions: the Activity page loads the rows.
 */
import { label, messages } from "@/i18n";
import { formatDate } from "./format";
import { readableChanges, type HistoryChange } from "./history";
import { appointmentHref, doctorHref, patientHref, paymentHref, prescriptionHref, treatmentHref } from "./links";
import type { BaseDoc, DocValue } from "./types";

/** The records the log covers. */
export const ACTIVITY_DOCTYPES = [
  "Patient", "Appointment", "Treatment Plan", "Payment", "Expense", "Prescription", "Dental Image", "Doctor",
] as const;
export type ActivityDoctype = (typeof ACTIVITY_DOCTYPES)[number];

export const ACTIVITY_KINDS = ["added", "changed", "deleted"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/** The fields that name a record in the log ("Zahraa Hussein · 20 Aug 2026"). */
export const TITLE_FIELDS: Record<ActivityDoctype, string[]> = {
  Patient: ["full_name"],
  Appointment: ["patient_name", "appointment_date"],
  "Treatment Plan": ["patient_name", "treatment_type", "tooth_number"],
  Payment: ["patient_name", "payment_date"],
  Expense: ["description", "category", "expense_date"],
  Prescription: ["patient_name", "prescription_date"],
  "Dental Image": ["patient_name", "image_type"],
  Doctor: ["full_name"],
};

export interface DeletedDocument extends BaseDoc {
  deleted_doctype: string;
  deleted_name: string;
  /** The whole record as it was, as JSON. */
  data: string;
  restored?: number;
  /** The name it came back under. */
  new_name?: string;
}

export interface VersionDoc extends BaseDoc {
  ref_doctype: string;
  docname: string;
  data: string | { changed?: unknown };
}

type AnyRecord = BaseDoc & Record<string, unknown>;

export interface ActivityEntry {
  key: string;
  kind: ActivityKind;
  doctype: string;
  name: string;
  /** "2026-09-21 09:05:00" */
  at: string;
  user: string;
  /** How the record reads, when it is known. */
  title: string;
  changes: HistoryChange[];
  deleted?: DeletedDocument;
}

/** A record's name in words, in the current language; empty when nothing names it. */
export function recordTitle(doctype: string, doc: Record<string, unknown> | undefined): string {
  if (!doc) return "";
  const t = messages();
  const text = (field: string) => (typeof doc[field] === "string" || typeof doc[field] === "number" ? String(doc[field]) : "");
  const date = (field: string) => (text(field) ? formatDate(text(field)) : "");
  const join = (...parts: string[]) => parts.filter(Boolean).join(t.common.dot);
  switch (doctype) {
    case "Patient":
    case "Doctor":
      return text("full_name");
    case "Appointment":
      return join(text("patient_name"), date("appointment_date"));
    case "Treatment Plan":
      return join(
        text("patient_name"),
        text("treatment_type") && label(t.enums.treatmentType, text("treatment_type")),
        text("tooth_number") && `${t.treatments.tooth} ${text("tooth_number")}`,
      );
    case "Payment":
      return join(text("patient_name"), date("payment_date"));
    case "Expense":
      return join(text("description") || (text("category") && label(t.enums.expenseCategory, text("category"))), date("expense_date"));
    case "Prescription":
      return join(text("patient_name"), date("prescription_date"));
    case "Dental Image":
      return join(text("patient_name"), text("image_type") && label(t.enums.imageType, text("image_type")));
    default:
      return "";
  }
}

/** Where a record opens; null for records without a page of their own. */
export function recordHref(doctype: string, name: string): string | null {
  switch (doctype) {
    case "Patient":
      return patientHref(name);
    case "Appointment":
      return appointmentHref(name);
    case "Treatment Plan":
      return treatmentHref(name);
    case "Payment":
      return paymentHref(name);
    case "Prescription":
      return prescriptionHref(name);
    case "Doctor":
      return doctorHref(name);
    case "Dental Image":
      return `/xrays/${encodeURIComponent(name)}`;
    case "Expense":
      return "/expenses";
    default:
      return null;
  }
}

/** The copy kept in a Deleted Document, or undefined when it cannot be read. */
export function deletedRecord(deleted: DeletedDocument): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(deleted.data) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

function versionChanges(doctype: string, data: VersionDoc["data"]): HistoryChange[] {
  let parsed: { changed?: unknown } = {};
  try {
    parsed = typeof data === "string" ? (JSON.parse(data) as { changed?: unknown }) : data ?? {};
  } catch {
    return [];
  }
  const rows = Array.isArray(parsed.changed)
    ? parsed.changed
        .filter((row): row is [string, DocValue, DocValue] => Array.isArray(row) && typeof row[0] === "string")
        .map(([field, from, to]) => ({ field, from, to }))
    : [];
  return readableChanges(doctype, rows);
}

/**
 * The three sources as one list, newest first, at most `limit` long. `added` holds recent records of each doctype
 * (with their title fields), which also name the records in the changes; with `showAdded` false they only do that.
 */
export function mergeActivity(
  added: Array<{ doctype: string; rows: AnyRecord[] }>,
  versions: VersionDoc[],
  deleted: DeletedDocument[],
  limit: number,
  showAdded = true,
): ActivityEntry[] {
  const known = new Map<string, AnyRecord>();
  added.forEach(({ doctype, rows }) => rows.forEach((row) => known.set(`${doctype}|${row.name}`, row)));
  const entries: ActivityEntry[] = [
    ...(showAdded ? added : []).flatMap(({ doctype, rows }) =>
      rows.map((row) => ({
        key: `added|${doctype}|${row.name}`,
        kind: "added" as const,
        doctype,
        name: row.name,
        at: row.creation ?? "",
        user: row.owner ?? "",
        title: recordTitle(doctype, row),
        changes: [],
      })),
    ),
    ...versions.map((version) => ({
      key: `changed|${version.name}`,
      kind: "changed" as const,
      doctype: version.ref_doctype,
      name: version.docname,
      at: version.creation ?? "",
      user: version.owner ?? "",
      title: recordTitle(version.ref_doctype, known.get(`${version.ref_doctype}|${version.docname}`)),
      changes: versionChanges(version.ref_doctype, version.data),
    })),
    ...deleted.map((row) => ({
      key: `deleted|${row.name}`,
      kind: "deleted" as const,
      doctype: row.deleted_doctype,
      name: row.deleted_name,
      at: row.creation ?? "",
      user: row.owner ?? "",
      title: recordTitle(row.deleted_doctype, deletedRecord(row)),
      changes: [],
      deleted: row,
    })),
  ];
  // A change that shows nothing readable (only fields the server works out) is left out.
  return entries
    .filter((entry) => entry.kind !== "changed" || entry.changes.length > 0)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
