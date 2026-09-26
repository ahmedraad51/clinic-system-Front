/**
 * The doctypes as the front end uses them, plus every list of allowed values.
 * Field names are Frappe fieldnames. Forms post their state objects unchanged,
 * so a form's keys must match these names exactly.
 */

/** A field value as the Frappe REST API returns it. */
export type DocValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | DocValue[]
  | { [key: string]: DocValue };

export interface BaseDoc {
  name: string;
}

/** Any doc, when the exact doctype does not matter. */
export interface Doc extends BaseDoc {
  [field: string]: DocValue;
}

/* ------------------------------------------------------- allowed values -- */

export const GENDERS = ["Male", "Female", "Other"] as const;

export const APPOINTMENT_STATUSES = ["Scheduled", "Confirmed", "Completed", "Cancelled", "No Show"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const TREATMENT_STATUSES = ["Planned", "In Progress", "Completed", "Cancelled"] as const;
export type TreatmentStatus = (typeof TREATMENT_STATUSES)[number];

export const TREATMENT_TYPES = [
  "Filling", "Root Canal", "Crown", "Bridge", "Extraction", "Implant", "Cleaning", "Whitening",
] as const;

export const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SESSION_STATUSES = ["Scheduled", "Completed", "Cancelled"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const CLINIC_ROLES = ["Clinic Manager", "Clinic Doctor", "Clinic Receptionist"] as const;
export type ClinicRole = (typeof CLINIC_ROLES)[number];

export const WHATSAPP_TRIGGERS = ["24 Hours Before", "2 Hours Before", "Manual"] as const;
export type WhatsAppTrigger = (typeof WHATSAPP_TRIGGERS)[number];

export const WHATSAPP_STATUSES = ["Sent", "Failed", "Pending"] as const;
export type WhatsAppStatus = (typeof WHATSAPP_STATUSES)[number];

/** Appointment lengths offered in the form, in minutes. */
export const DURATIONS = [15, 30, 45, 60, 90, 120] as const;

/** Currencies offered on the settings page. Any ISO 4217 code works in formatMoney. */
export const CURRENCIES = ["IQD", "USD", "EUR", "EGP", "SAR", "AED", "JOD", "KWD", "TRY", "GBP"] as const;

/** FDI tooth numbers, the way the dental chart lays them out (patient's right on the left of the screen). */
export const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
export const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;
/** Child (primary) teeth, FDI 51–85. */
export const CHILD_UPPER_TEETH = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65] as const;
export const CHILD_LOWER_TEETH = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75] as const;

/* ---------------------------------------------------------- dental chart -- */

/** Tooth surfaces: Mesial, Occlusal (incisal on front teeth), Distal, Buccal (labial), Lingual (palatal). */
export const TOOTH_SURFACES = ["M", "O", "D", "B", "L"] as const;
export type ToothSurface = (typeof TOOTH_SURFACES)[number];

/** What can be marked on one surface. */
export const SURFACE_FINDINGS = ["caries", "filling"] as const;
export type SurfaceFinding = (typeof SURFACE_FINDINGS)[number];

/** What can be marked on the whole tooth. A tooth with nothing marked is healthy. */
export const TOOTH_CONDITIONS = ["crown", "root_canal", "implant", "bridge", "missing", "extract"] as const;
export type ToothCondition = (typeof TOOTH_CONDITIONS)[number];

/** The two marks of the first chart version, still read so old charts keep their meaning. */
export type LegacyToothStatus = "treated" | "pending";

export interface ToothRecord {
  conditions?: ToothCondition[];
  surfaces?: Partial<Record<ToothSurface, SurfaceFinding>>;
  note?: string;
  /** From a chart saved before version 2 ("Has treatment" / "Pending treatment"). Cleared by marking the tooth healthy. */
  legacy?: LegacyToothStatus;
}

/**
 * Patient.dental_chart, version 2: { "version": 2, "teeth": { "36": { "conditions": ["root_canal", "crown"] } } }.
 * Only teeth with something marked are stored. Read it with parseDentalChart() in src/lib/dentalChart.ts,
 * which also understands the old flat shape { "36": "treated", "37": "pending" }.
 */
export interface DentalChartData {
  version: 2;
  teeth: Record<string, ToothRecord>;
}

/* ------------------------------------------------------------- doctypes -- */

export interface Patient extends BaseDoc {
  full_name: string;
  gender?: string;
  date_of_birth?: string;
  age?: number;
  phone_number: string;
  secondary_phone?: string;
  email?: string;
  address?: string;
  allergies?: string;
  current_medications?: string;
  chronic_diseases?: string;
  medical_history?: string;
  notes?: string;
  /** JSON field. Frappe may send it as a string, and old records use the first shape; read it with parseDentalChart(). */
  dental_chart?: DentalChartData | Record<string, string> | string | null;
  total_appointments?: number;
  total_treatments?: number;
  total_paid?: number;
  total_remaining?: number;
}

export interface Doctor extends BaseDoc {
  full_name: string;
  specialization?: string;
  phone_number?: string;
  email?: string;
  is_active?: number;
}

export interface Appointment extends BaseDoc {
  patient: string;
  /** Read-only, fetched from the patient. */
  patient_name?: string;
  doctor: string;
  /** Read-only, fetched from the doctor. */
  doctor_name?: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes?: number;
  status: AppointmentStatus;
  reason_for_visit?: string;
  notes?: string;
}

export interface TreatmentPlan extends BaseDoc {
  patient: string;
  patient_name?: string;
  doctor?: string;
  doctor_name?: string;
  treatment_type: string;
  tooth_number?: string;
  status: TreatmentStatus;
  diagnosis?: string;
  treatment_notes?: string;
  total_cost: number;
  /** Read-only, computed by the server. */
  paid_amount?: number;
  /** Read-only, computed by the server. */
  remaining_amount?: number;
}

export interface TreatmentSession extends BaseDoc {
  patient: string;
  patient_name?: string;
  treatment_plan: string;
  doctor?: string;
  doctor_name?: string;
  session_date: string;
  session_time?: string;
  status: SessionStatus;
  notes?: string;
}

export interface Payment extends BaseDoc {
  patient: string;
  patient_name?: string;
  treatment_plan?: string;
  /** Read-only, fetched from the treatment plan. */
  treatment_type?: string;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  notes?: string;
}

export interface UserRole {
  role: string;
}

export interface User extends BaseDoc {
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  enabled?: number;
  roles?: UserRole[];
}

export interface ClinicSettings extends BaseDoc {
  clinic_name?: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
  currency?: string;
  tax_number?: string;
  opening_time?: string;
  closing_time?: string;
  theme_color?: string;
  enable_whatsapp?: number;
  enable_patient_portal?: number;
  enable_financial_reports?: number;
}

export interface WhatsAppTemplate extends BaseDoc {
  template_name: string;
  trigger: WhatsAppTrigger;
  message: string;
  is_active?: number;
}

export interface WhatsAppLog extends BaseDoc {
  patient?: string;
  patient_name?: string;
  appointment?: string;
  phone_number?: string;
  status: WhatsAppStatus;
  sent_at?: string;
  message?: string;
  error_message?: string;
}

/* ---------------------------------------------------------- permissions -- */

export const PERMISSION_GROUPS = [
  {
    group: "Patients",
    items: [
      { key: "view_patients", label: "View Patients" },
      { key: "add_patients", label: "Add Patients" },
      { key: "edit_patients", label: "Edit Patients" },
      { key: "delete_patients", label: "Delete Patients" },
    ],
  },
  {
    group: "Appointments",
    items: [
      { key: "view_appointments", label: "View Appointments" },
      { key: "add_appointments", label: "Add Appointments" },
      { key: "edit_appointments", label: "Edit Appointments" },
    ],
  },
  {
    group: "Treatments",
    items: [
      { key: "view_treatments", label: "View Treatments" },
      { key: "add_treatments", label: "Add Treatments" },
      { key: "edit_treatments", label: "Edit Treatments" },
    ],
  },
  {
    group: "Finance",
    items: [
      { key: "view_payments", label: "View Payments" },
      { key: "add_payments", label: "Add Payments" },
      { key: "view_reports", label: "View Reports" },
    ],
  },
  {
    group: "System",
    items: [{ key: "manage_users", label: "Manage Users" }],
  },
] as const;

export type PermissionKey = (typeof PERMISSION_GROUPS)[number]["items"][number]["key"];

export const PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap((group) =>
  group.items.map((item) => item.key),
);

export type ClinicPermission = BaseDoc & { user: string } & Partial<Record<PermissionKey, number>>;

/** Starting points for the permission screen. They only fill the switches; nothing is saved until you press Save. */
export const ROLE_PRESETS: Record<ClinicRole, PermissionKey[]> = {
  "Clinic Manager": [...PERMISSION_KEYS],
  "Clinic Doctor": [
    "view_patients", "edit_patients",
    "view_appointments", "add_appointments", "edit_appointments",
    "view_treatments", "add_treatments", "edit_treatments",
    "view_payments",
  ],
  "Clinic Receptionist": [
    "view_patients", "add_patients", "edit_patients",
    "view_appointments", "add_appointments", "edit_appointments",
    "view_treatments",
    "view_payments", "add_payments",
  ],
};
