import { num } from "../runtime";

/** The History card (RecordHistory) and the field names in it (src/lib/history.ts). */
export const history = {
  title: "History",
  showHistory: "Show History",
  intro: "Who added this record, and who changed what and when.",
  loadFailed: "Could not load the history.",
  loading: "Loading...",
  changedIt: "changed it",
  addedIt: "added it",
  /** Between "changed it" and the time: "changed it · 8 Sep 2026, 10:00 AM". */
  at: (when: string) => ` · ${when}`,
  someone: "Someone",
  updated: "updated",
  /** Between the old and the new value. */
  arrow: " → ",
  nothingInLast: (limit: number) =>
    `Nothing to show in the last ${num(limit)} saves (they only updated totals); earlier changes are not shown.`,
  onlyLast: (limit: number) => `Only the last ${num(limit)} saves are looked at; earlier changes are not shown.`,
  noChanges: "No changes since then.",
  /** The "Leave without saving?" question of a form with unsaved changes (UnsavedChangesGuard). */
  leaveTitle: "Leave without saving?",
  leaveText: "Your changes on this page have not been saved. If you leave now, they will be lost.",
  leaveConfirm: "Leave without saving",
  /** Field names used on any record. Fields not listed anywhere get their name with spaces ("Some new field"). */
  fields: {
    patient: "Patient",
    doctor: "Doctor",
    status: "Status",
    notes: "Notes",
    gender: "Gender",
    age: "Age",
    email: "Email",
    address: "Address",
    allergies: "Allergies",
    diagnosis: "Diagnosis",
    amount: "Amount",
  } as Record<string, string>,
  /** Field names of one record type, in the words its screens use. */
  fieldsFor: {
    Patient: {
      full_name: "Name",
      date_of_birth: "Date of birth",
      phone_number: "Phone",
      secondary_phone: "Second phone",
      current_medications: "Current medications",
      chronic_diseases: "Chronic diseases",
      medical_history: "Medical history",
      dental_chart: "Dental chart",
      chart_sketch: "Sketch on the chart",
      next_recall_date: "Next check-up",
      recall_interval_months: "Check-up every (months)",
      no_recall: "No recall",
    },
    Appointment: {
      appointment_date: "Date",
      appointment_time: "Time",
      duration_minutes: "Length (minutes)",
      reason_for_visit: "Reason",
    },
    "Treatment Plan": {
      treatment_type: "Treatment",
      tooth_number: "Tooth",
      total_cost: "Total cost",
      treatment_notes: "Notes",
      lab_name: "Lab",
      lab_sent_date: "Sent to the lab",
      lab_due_date: "Due back from the lab",
      lab_received_date: "Back from the lab",
    },
    Payment: {
      treatment_plan: "Treatment plan",
      payment_date: "Date",
      payment_method: "Method",
    },
  } as Record<string, Record<string, string>>,
};
