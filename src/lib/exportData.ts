/**
 * The whole clinic as files (/export): one table per kind of record, every row, the fields below in this order. The
 * values are as saved (dates as YYYY-MM-DD, statuses in English, amounts as numbers), so the files can be read back
 * by another program; only the column headers follow the screen's language.
 */
export interface ExportKind {
  key: "patients" | "appointments" | "plans" | "payments";
  doctype: string;
  fields: string[];
  orderBy: string;
}

export const EXPORTS: ExportKind[] = [
  {
    key: "patients",
    doctype: "Patient",
    orderBy: "name asc",
    fields: [
      "name", "full_name", "gender", "date_of_birth", "age", "phone_number", "secondary_phone", "email", "address", "allergies",
      "current_medications", "chronic_diseases", "medical_history", "notes", "total_paid", "total_remaining", "creation",
    ],
  },
  {
    key: "appointments",
    doctype: "Appointment",
    orderBy: "appointment_date asc, appointment_time asc",
    fields: [
      "name", "patient", "patient_name", "doctor", "doctor_name", "appointment_date", "appointment_time", "duration_minutes", "status",
      "reason_for_visit", "notes",
    ],
  },
  {
    key: "plans",
    doctype: "Treatment Plan",
    orderBy: "name asc",
    fields: [
      "name", "patient", "patient_name", "doctor", "doctor_name", "treatment_type", "tooth_number", "status", "currency", "total_cost",
      "paid_amount", "remaining_amount", "diagnosis", "treatment_notes", "creation",
    ],
  },
  {
    key: "payments",
    doctype: "Payment",
    orderBy: "payment_date asc, name asc",
    fields: [
      "name", "patient", "patient_name", "treatment_plan", "treatment_type", "payment_date", "amount", "currency", "exchange_rate",
      "base_amount", "payment_method", "notes",
    ],
  },
];

/** The number fields: written as numbers, so a spreadsheet can add them up. */
export const NUMBER_FIELDS = new Set([
  "age", "total_paid", "total_remaining", "duration_minutes", "total_cost", "paid_amount", "remaining_amount", "amount", "exchange_rate",
  "base_amount",
]);
