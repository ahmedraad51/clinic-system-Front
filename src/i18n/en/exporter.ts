import { num, plural } from "../runtime";

/** Exporting all of the clinic's data in one ZIP (/export, the manager only). */
export const exporter = {
  title: "Export Data",
  subtitle: "All of the clinic's patients, appointments, treatment plans and payments, as files in one ZIP.",
  cardTitle: "Download All Data",
  text:
    "A copy of the clinic's records, to keep, to open in Excel or to move to another program. Every row is included. Dates are written as year-month-day, statuses and payment methods as saved, and amounts as numbers.",
  format: "Format",
  formats: { xlsx: "Excel (.xlsx)", csv: "CSV" },
  formatHint: "Excel: one workbook for each kind of record. CSV: one plain file for each, for any program.",
  download: "Download ZIP",
  preparing: "Preparing the files…",
  kinds: { patients: "Patients", appointments: "Appointments", plans: "Treatment plans", payments: "Payments" },
  /** "230 rows" */
  rows: (n: number) => plural(n, { one: "# row", other: "# rows" }),
  waiting: "Waiting",
  failed: "The export did not finish. Nothing was downloaded.",
  done: "The ZIP was downloaded.",
  id: "ID",
  privacyNote: "The file holds patients' medical and personal details: keep it somewhere safe, and do not send it by WhatsApp or email.",
  // The note inside the ZIP
  readmeName: "README.txt",
  readme: (clinic: string, when: string, by: string, counts: string) =>
    `${clinic}: all data, exported ${when} by ${by}.\n\n${counts}\n\nDates are year-month-day. Statuses, types and payment methods are written as saved (in English). Amounts are numbers; "currency" says which currency (empty: the clinic's own).\n`,
  /** "Patients: 12 rows" */
  readmeLine: (kind: string, rows: number) => `${kind}: ${num(rows)}`,
};
