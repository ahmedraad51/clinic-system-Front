/**
 * The doctypes as the front end uses them, plus every list of allowed values.
 * Field names are Frappe fieldnames. Forms post their state objects unchanged,
 * so a form's keys must match these names exactly.
 */

import type { ExchangeRate } from "./currency";

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
  /** Set by Frappe on every doc: who added it and when, and when it was last saved. */
  owner?: string;
  creation?: string;
  modified?: string;
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

/** Doctor.specialization options (a Select field on the back end). */
export const DOCTOR_SPECIALIZATIONS = [
  "General Dentist", "Orthodontist", "Endodontist", "Periodontist", "Oral Surgeon", "Pediatric Dentist", "Prosthodontist",
] as const;

/** Week days in Date.getDay() order (0 = Sunday), as saved in Clinic Settings → working_days. */
export const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

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
  /** Free drawing on top of the dental chart: JSON (SketchData, see src/lib/sketch.ts). */
  chart_sketch?: string | object | null;
  /** The next check-up the dentist chose; empty means the usual rule (see src/lib/recall.ts). */
  next_recall_date?: string | null;
  /** How often the dentist wants to see the patient, in months; 0 when not chosen. */
  recall_interval_months?: number;
  /** 1 when the dentist said the patient needs no recall (moved away, treated elsewhere). */
  no_recall?: number;
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
  /** Working hours, "09:00:00". Empty means the clinic hours. */
  start_time?: string;
  end_time?: string;
  is_active?: number;
  /** "Male" or "Female": picks the drawn avatar when there is no photo. */
  gender?: string;
  /** An uploaded photo (file URL), shown instead of the drawn avatar. */
  photo?: string;
  /** The doctor's prescription paper (src/lib/rxPaper.ts): "A5" (default) or "A4". */
  rx_paper_size?: string;
  /** 1 when the paper already has the header and footer printed on it. */
  rx_preprinted?: number;
  /** Room left for a pre-printed header and footer, in mm. */
  rx_top_mm?: number;
  rx_bottom_mm?: number;
  /** Lines under the name on the prescription ("BDS, MSc …"). */
  rx_qualifications?: string;
  rx_footer?: string;
  /** File URLs: an own logo for the prescription, and a signature or stamp image. */
  rx_logo?: string | null;
  rx_signature?: string | null;
}

export interface Appointment extends BaseDoc {
  /** When the patient reported at the front desk (the waiting room), "YYYY-MM-DD HH:mm:ss"; empty until then. */
  arrived_at?: string | null;
  /** When the patient was called into the chair; empty until then. */
  in_chair_at?: string | null;
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
  /** The plan's currency: the clinic's own (empty) or the second one (Clinic Settings). Cost, paid and left are in it. */
  currency?: string;
  total_cost: number;
  /** Read-only, computed by the server: the plan's payments, each in the plan's currency (Payment.plan_amount). */
  paid_amount?: number;
  /** Read-only, computed by the server. */
  remaining_amount?: number;
  /** Lab work (crowns, bridges, implant crowns): the lab, and when the work was sent, is due and came back. */
  lab_name?: string;
  lab_sent_date?: string;
  lab_due_date?: string;
  lab_received_date?: string;
}

/** Treatment types that usually need lab work; the plan page offers the Lab Work card for these. */
export const LAB_TREATMENT_TYPES = ["Crown", "Bridge", "Implant", "Whitening"] as const;

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
  /** In the payment's currency. */
  amount: number;
  /** The currency the patient paid in: the clinic's own (empty) or the second one. */
  currency?: string;
  /** How many of the clinic's own units one unit of the second currency was worth that day (1 USD = 1,460 IQD). */
  exchange_rate?: number;
  /** Read-only, worked out by the server: the amount in the plan's currency (what it takes off the plan). */
  plan_amount?: number;
  /** Read-only, worked out by the server: the amount in the clinic's own currency, for totals. */
  base_amount?: number;
  payment_method: PaymentMethod;
  notes?: string;
}

/** What the clinic spends money on. Saved in English; the labels are in enums.expenseCategory. */
export const EXPENSE_CATEGORIES = [
  "Rent",
  "Salaries",
  "Dental Supplies",
  "Lab Fees",
  "Equipment",
  "Utilities",
  "Maintenance",
  "Marketing",
  "Other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Money the clinic paid out: rent, salaries, supplies, a lab's bill. With a doctor, it counts against that doctor. */
export interface Expense extends BaseDoc {
  expense_date: string;
  category: ExpenseCategory;
  /** In the expense's currency. */
  amount: number;
  /** The clinic's own currency (empty) or the second one. */
  currency?: string;
  /** Read-only, set by the server: the rate of the expense's day when it is in the second currency. */
  exchange_rate?: number;
  /** Read-only, worked out by the server: the amount in the clinic's own currency, for totals. */
  base_amount?: number;
  /** Optional: the doctor this cost belongs to (their lab work, their assistant). Empty: the whole clinic's. */
  doctor?: string;
  /** Read-only, fetched from the doctor. */
  doctor_name?: string;
  description?: string;
  /** Who was paid: the landlord, the lab, the supplier. */
  paid_to?: string;
  payment_method?: PaymentMethod;
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
  /** Frappe's own User fields, for the avatar: "Male" / "Female", and an uploaded photo. */
  gender?: string;
  user_image?: string;
  /** Frappe's own User field: the language this user chose ("ar" or "en"). Empty: the clinic's default. */
  language?: string;
}

/** One row of Clinic Settings → treatment_prices (a child table). */
export interface TreatmentPrice {
  treatment_type: string;
  price: number;
}

export interface ClinicSettings extends BaseDoc {
  clinic_name?: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
  currency?: string;
  /** A second currency the clinic also takes ("USD"), or empty for one currency only. */
  second_currency?: string;
  /** The rate of the second currency, each from its date on (a child table). */
  exchange_rates?: ExchangeRate[];
  tax_number?: string;
  opening_time?: string;
  closing_time?: string;
  theme_color?: string;
  enable_whatsapp?: number;
  enable_patient_portal?: number;
  enable_financial_reports?: number;
  /** The usual price of each treatment type; fills in Treatment Plan.total_cost. */
  treatment_prices?: TreatmentPrice[];
  /** The days the clinic is open, e.g. "Saturday,Sunday,Monday". Empty means every day. */
  working_days?: string;
  /** Country calling code added to local numbers for WhatsApp links, digits only ("964" for Iraq). Empty means 964. */
  phone_country_code?: string;
  /** The clinic's language for users who have not chosen one: "ar" (the default when empty) or "en". */
  default_language?: string;
  /** 1: Arabic screens write numbers ٠-٩ instead of 0-9. */
  arabic_digits?: number;
}

export interface WhatsAppTemplate extends BaseDoc {
  template_name: string;
  trigger: WhatsAppTrigger;
  message: string;
  is_active?: number;
  /** The language the message is written in: "ar" or "en". Empty: any language. */
  language?: string;
}

/** One day's cash count at the front desk (the end-of-day report). One per day. */
export interface CashCount extends BaseDoc {
  count_date: string;
  /** Money put in the drawer at the start of the day, for change. */
  opening_float?: number;
  /** The day's Cash payments when the count was saved (worked out by the server). */
  cash_payments?: number;
  /** opening_float + cash_payments. */
  expected_cash?: number;
  cash_counted: number;
  /** cash_counted - expected_cash: below 0 is short, above 0 is over. */
  difference?: number;
  /** Why the cash was short or over (required then). */
  note?: string;
  counted_by?: string;
  counted_by_name?: string;
  counted_at?: string;
}

/* -------------------------------------------------------- prescriptions -- */

/** Dental Image.image_type: what kind of X-ray or photo it is. */
export const IMAGE_TYPES = [
  "Periapical", "Bitewing", "Panoramic (OPG)", "Cephalometric", "CBCT screenshot", "Intraoral photo", "Other",
] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

/**
 * An X-ray, photo or scan of a patient. The file itself (`image`, a private Frappe file attached to this record)
 * is never changed: drawings on it are kept in `annotations` (see src/lib/sketch.ts).
 */
export interface DentalImage extends BaseDoc {
  patient: string;
  /** Read-only, fetched from the patient. */
  patient_name?: string;
  /** The file's URL. Empty for a moment while a new image is being uploaded. */
  image?: string;
  file_name?: string;
  image_type: ImageType;
  /** "YYYY-MM-DD". */
  taken_on: string;
  description?: string;
  /** The FDI teeth it shows, comma-separated: "36,37". */
  teeth?: string;
  /** The drawing layer: JSON (SketchData), empty when nothing is drawn. */
  annotations?: string | object | null;
}

export const MEDICINE_FORMS = ["Tablet", "Capsule", "Suspension", "Syrup", "Mouthwash", "Gel", "Drops", "Injection", "Other"] as const;
export const MEDICINE_GROUPS = ["Antibiotic", "Painkiller", "Mouthwash", "Antifungal", "Other"] as const;

/** One medicine on the clinic's list: its usual prescription, and the flags the safety warnings use. */
export interface DentalMedicine extends BaseDoc {
  medicine_name: string;
  /** "500 mg", "0.12%". */
  strength?: string;
  dosage_form?: string;
  medicine_group?: string;
  default_dose?: string;
  default_frequency?: string;
  default_duration_days?: number;
  default_instructions?: string;
  /** Words in a patient's allergies that mean this medicine must not be given: "penicillin, amoxicillin". */
  allergy_words?: string;
  /** Warns when the patient takes a blood thinner. */
  is_nsaid?: number;
  avoid_in_pregnancy?: number;
  /** The usual maximum a day in mg; 0 means no check. */
  max_daily_mg?: number;
  /** Shown when the patient is a child: how the dose is worked out. */
  child_note?: string;
  is_active?: number;
}

/** One row of a prescription (the child table Prescription Medicine). */
export interface PrescriptionMedicine {
  medicine: string;
  /** Copied from the medicine when saved, so the printed paper does not change with the list. */
  medicine_name?: string;
  dose?: string;
  frequency?: string;
  duration_days?: number;
  instructions?: string;
}

export interface Prescription extends BaseDoc {
  patient: string;
  patient_name?: string;
  doctor: string;
  doctor_name?: string;
  appointment?: string | null;
  prescription_date: string;
  notes?: string;
  medicines: PrescriptionMedicine[];
  /** Read-only, worked out by the server: the medicine names, comma-separated, for lists. */
  summary?: string;
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

/** The permission switches by group. Their labels are in the translation files (enums.permission). */
export const PERMISSION_GROUPS = [
  { group: "patients", items: ["view_patients", "add_patients", "edit_patients", "delete_patients"] },
  { group: "appointments", items: ["view_appointments", "add_appointments", "edit_appointments"] },
  { group: "treatments", items: ["view_treatments", "add_treatments", "edit_treatments"] },
  { group: "finance", items: ["view_payments", "add_payments", "view_expenses", "add_expenses", "view_reports"] },
  { group: "system", items: ["manage_users"] },
] as const;

export type PermissionKey = (typeof PERMISSION_GROUPS)[number]["items"][number];
export type PermissionGroupKey = (typeof PERMISSION_GROUPS)[number]["group"];

export const PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap((group) => [...group.items]);

export type ClinicPermission = BaseDoc & { user: string } & Partial<Record<PermissionKey, number>>;

/** The columns of the permissions table (Manage User). */
export const PERMISSION_ACTIONS = ["view", "add", "edit", "delete"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/**
 * The rows of the permissions table: one per section, with the permission of each action that exists there. An action
 * a section does not have is an empty cell. Every PermissionKey is in exactly one cell.
 */
export const PERMISSION_MATRIX: Array<{
  row: "patients" | "appointments" | "treatments" | "payments" | "expenses" | "reports" | "setup";
  cells: Partial<Record<PermissionAction, PermissionKey>>;
}> = [
  { row: "patients", cells: { view: "view_patients", add: "add_patients", edit: "edit_patients", delete: "delete_patients" } },
  { row: "appointments", cells: { view: "view_appointments", add: "add_appointments", edit: "edit_appointments" } },
  { row: "treatments", cells: { view: "view_treatments", add: "add_treatments", edit: "edit_treatments" } },
  { row: "payments", cells: { view: "view_payments", add: "add_payments" } },
  // add_expenses also changes and deletes them, the way add_payments does for payments.
  { row: "expenses", cells: { view: "view_expenses", add: "add_expenses" } },
  { row: "reports", cells: { view: "view_reports" } },
  // Users, doctors, medicines, WhatsApp and settings: one permission that allows changing them all.
  { row: "setup", cells: { edit: "manage_users" } },
];

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
