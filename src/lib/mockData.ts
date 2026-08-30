/**
 * TEMPORARY: in-memory dummy data so the UI can be built without a live Frappe
 * backend. Everything here is fake. Turn it off with MOCK_DATA in src/lib/frappe.ts.
 *
 * The store mimics the Frappe REST shape: every doc has a "name" (its ID), link
 * fields hold the linked doc's name, and list queries only return the fields
 * that were asked for.
 */

export type MockValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, string>
  | Array<Record<string, string>>;

export interface MockDoc {
  name: string;
  [field: string]: MockValue;
}

type Store = Record<string, MockDoc[]>;

/* ------------------------------------------------------------------ seed -- */

const doctors: MockDoc[] = [
  { name: "Dr. Sarah Mansour", full_name: "Dr. Sarah Mansour", specialization: "General Dentistry", email: "sarah.mansour@dentclinic.test", phone_number: "+20 100 111 2233" },
  { name: "Dr. Omar Khalil", full_name: "Dr. Omar Khalil", specialization: "Orthodontics", email: "omar.khalil@dentclinic.test", phone_number: "+20 100 111 4455" },
  { name: "Dr. Leila Haddad", full_name: "Dr. Leila Haddad", specialization: "Endodontics", email: "leila.haddad@dentclinic.test", phone_number: "+20 100 111 6677" },
  { name: "Dr. Youssef Nabil", full_name: "Dr. Youssef Nabil", specialization: "Oral Surgery", email: "youssef.nabil@dentclinic.test", phone_number: "+20 100 111 8899" },
  { name: "Dr. Hana Aziz", full_name: "Dr. Hana Aziz", specialization: "Pediatric Dentistry", email: "hana.aziz@dentclinic.test", phone_number: "+20 100 222 1010" },
];

const patients: MockDoc[] = [
  {
    name: "Nadia Samir", full_name: "Nadia Samir", gender: "Female",
    date_of_birth: "1991-04-12", age: 35,
    phone_number: "+20 100 234 5678", secondary_phone: "+20 122 908 1145",
    email: "nadia.samir@example.com", address: "14 El Nasr St, Heliopolis, Cairo",
    allergies: "Penicillin", current_medications: "None", chronic_diseases: "None",
    medical_history: "Root canal on tooth 36 (June 2026). No prior surgeries.",
    notes: "Prefers morning appointments.",
    dental_chart: { "36": "treated", "37": "pending" },
  },
  {
    name: "Karim Fouad", full_name: "Karim Fouad", gender: "Male",
    date_of_birth: "1984-09-03", age: 41,
    phone_number: "+20 111 447 2093", secondary_phone: "",
    email: "karim.fouad@example.com", address: "8 Gamal Abdel Nasser St, Giza",
    allergies: "None", current_medications: "Metformin 500mg", chronic_diseases: "Type 2 Diabetes",
    medical_history: "Composite filling on 24 and extraction of 48 (June 2026).",
    notes: "Diabetic - confirm blood sugar before any surgical work.",
    dental_chart: { "24": "treated", "48": "treated" },
  },
  {
    name: "Mona Adel", full_name: "Mona Adel", gender: "Female",
    date_of_birth: "1997-06-21", age: 29,
    phone_number: "+20 106 332 8814", secondary_phone: "",
    email: "mona.adel@example.com", address: "22 Ahmed Orabi St, Mohandessin, Giza",
    allergies: "Latex", current_medications: "None", chronic_diseases: "None",
    medical_history: "Routine cleanings only.",
    notes: "Interested in whitening, waiting on a quote.",
    dental_chart: {},
  },
  {
    name: "Tarek Hassan", full_name: "Tarek Hassan", gender: "Male",
    date_of_birth: "1973-01-17", age: 53,
    phone_number: "+20 128 771 4520", secondary_phone: "+20 100 118 9032",
    email: "tarek.hassan@example.com", address: "5 El Merghany St, Heliopolis, Cairo",
    allergies: "None", current_medications: "Amlodipine 5mg", chronic_diseases: "Hypertension",
    medical_history: "Implant placed on tooth 46 (August 2026). Bridge planned for 45.",
    notes: "Check blood pressure before long sessions.",
    dental_chart: { "46": "treated", "45": "pending" },
  },
  {
    name: "Salma Ibrahim", full_name: "Salma Ibrahim", gender: "Female",
    date_of_birth: "2006-11-30", age: 19,
    phone_number: "+20 115 660 3374", secondary_phone: "",
    email: "salma.ibrahim@example.com", address: "31 El Hegaz St, Nasr City, Cairo",
    allergies: "None", current_medications: "None", chronic_diseases: "None",
    medical_history: "First visit July 2026 - one filling on tooth 16.",
    notes: "Student, afternoon slots only.",
    dental_chart: { "16": "treated" },
  },
  {
    name: "Hossam Nour", full_name: "Hossam Nour", gender: "Male",
    date_of_birth: "1980-03-08", age: 46,
    phone_number: "+20 109 285 7761", secondary_phone: "",
    email: "hossam.nour@example.com", address: "12 Port Said St, Maadi, Cairo",
    allergies: "Ibuprofen", current_medications: "None", chronic_diseases: "None",
    medical_history: "Root canal in progress on tooth 27.",
    notes: "Sensitive to cold, use a warm rinse.",
    dental_chart: { "27": "pending" },
  },
  {
    name: "Dina Rashad", full_name: "Dina Rashad", gender: "Female",
    date_of_birth: "1988-08-25", age: 38,
    phone_number: "+20 100 554 1287", secondary_phone: "",
    email: "dina.rashad@example.com", address: "7 El Thawra St, Dokki, Giza",
    allergies: "None", current_medications: "None", chronic_diseases: "None",
    medical_history: "Scaling and polishing (July 2026).",
    notes: "Six-month recall due January 2027.",
    dental_chart: {},
  },
  {
    name: "Amir Zaki", full_name: "Amir Zaki", gender: "Male",
    date_of_birth: "1962-05-14", age: 64,
    phone_number: "+20 122 340 9915", secondary_phone: "+20 101 776 2288",
    email: "amir.zaki@example.com", address: "60 El Horreya Rd, Alexandria",
    allergies: "Aspirin", current_medications: "Warfarin 3mg", chronic_diseases: "Atrial fibrillation",
    medical_history: "Wisdom tooth 38 extracted (July 2026). Crown planned for 37.",
    notes: "On anticoagulants - coordinate with his physician before extractions.",
    dental_chart: { "38": "treated", "37": "pending" },
  },
  {
    name: "Yara Mostafa", full_name: "Yara Mostafa", gender: "Female",
    date_of_birth: "2001-12-02", age: 24,
    phone_number: "+20 114 908 6602", secondary_phone: "",
    email: "yara.mostafa@example.com", address: "19 Syria St, Mohandessin, Giza",
    allergies: "None", current_medications: "None", chronic_diseases: "None",
    medical_history: "No treatment completed yet.",
    notes: "Cancelled her whitening appointment in August.",
    dental_chart: {},
  },
  {
    name: "Bassel Ramy", full_name: "Bassel Ramy", gender: "Male",
    date_of_birth: "1994-07-19", age: 32,
    phone_number: "+20 127 445 0091", secondary_phone: "",
    email: "bassel.ramy@example.com", address: "3 El Obour Buildings, Salah Salem, Cairo",
    allergies: "None", current_medications: "None", chronic_diseases: "None",
    medical_history: "Composite filling on tooth 14 in progress.",
    notes: "Missed his follow-up on 24 Aug 2026.",
    dental_chart: { "14": "pending" },
  },
];

const appointments: MockDoc[] = [
  { name: "APT-0001", patient: "Nadia Samir", doctor: "Dr. Sarah Mansour", appointment_date: "2026-09-08", appointment_time: "10:00", status: "Scheduled", duration_minutes: 45, reason_for_visit: "Crown fitting follow-up", notes: "" },
  { name: "APT-0002", patient: "Mona Adel", doctor: "Dr. Omar Khalil", appointment_date: "2026-09-03", appointment_time: "12:30", status: "Confirmed", duration_minutes: 30, reason_for_visit: "Whitening consultation", notes: "Bring the shade guide." },
  { name: "APT-0003", patient: "Tarek Hassan", doctor: "Dr. Youssef Nabil", appointment_date: "2026-09-02", appointment_time: "09:00", status: "Scheduled", duration_minutes: 60, reason_for_visit: "Implant second stage", notes: "" },
  { name: "APT-0004", patient: "Hossam Nour", doctor: "Dr. Leila Haddad", appointment_date: "2026-09-01", appointment_time: "16:00", status: "Confirmed", duration_minutes: 60, reason_for_visit: "Root canal session 2", notes: "" },
  { name: "APT-0005", patient: "Amir Zaki", doctor: "Dr. Sarah Mansour", appointment_date: "2026-09-14", appointment_time: "11:00", status: "Scheduled", duration_minutes: 45, reason_for_visit: "Crown impression for tooth 37", notes: "" },
  { name: "APT-0006", patient: "Yara Mostafa", doctor: "Dr. Omar Khalil", appointment_date: "2026-08-27", appointment_time: "15:00", status: "Cancelled", duration_minutes: 30, reason_for_visit: "Whitening session", notes: "Patient cancelled the day before." },
  { name: "APT-0007", patient: "Bassel Ramy", doctor: "Dr. Sarah Mansour", appointment_date: "2026-08-24", appointment_time: "13:00", status: "No Show", duration_minutes: 30, reason_for_visit: "Filling follow-up", notes: "Did not answer the reminder call." },
  { name: "APT-0008", patient: "Nadia Samir", doctor: "Dr. Sarah Mansour", appointment_date: "2026-08-20", appointment_time: "10:30", status: "Completed", duration_minutes: 60, reason_for_visit: "Crown preparation", notes: "" },
  { name: "APT-0009", patient: "Bassel Ramy", doctor: "Dr. Sarah Mansour", appointment_date: "2026-08-18", appointment_time: "09:30", status: "Completed", duration_minutes: 45, reason_for_visit: "Composite filling on tooth 14", notes: "" },
  { name: "APT-0010", patient: "Tarek Hassan", doctor: "Dr. Youssef Nabil", appointment_date: "2026-08-11", appointment_time: "08:30", status: "Completed", duration_minutes: 90, reason_for_visit: "Implant placement", notes: "Healing well at the one-week check." },
  { name: "APT-0011", patient: "Hossam Nour", doctor: "Dr. Leila Haddad", appointment_date: "2026-08-06", appointment_time: "17:00", status: "Completed", duration_minutes: 60, reason_for_visit: "Root canal session 1", notes: "" },
  { name: "APT-0012", patient: "Dina Rashad", doctor: "Dr. Sarah Mansour", appointment_date: "2026-07-30", appointment_time: "11:30", status: "Completed", duration_minutes: 30, reason_for_visit: "Scaling and polishing", notes: "" },
  { name: "APT-0013", patient: "Amir Zaki", doctor: "Dr. Youssef Nabil", appointment_date: "2026-07-22", appointment_time: "14:00", status: "Completed", duration_minutes: 60, reason_for_visit: "Wisdom tooth extraction", notes: "Anticoagulant paused per physician note." },
  { name: "APT-0014", patient: "Salma Ibrahim", doctor: "Dr. Hana Aziz", appointment_date: "2026-07-15", appointment_time: "10:00", status: "Completed", duration_minutes: 30, reason_for_visit: "Cavity filling on tooth 16", notes: "" },
  { name: "APT-0015", patient: "Mona Adel", doctor: "Dr. Sarah Mansour", appointment_date: "2026-07-09", appointment_time: "12:00", status: "Completed", duration_minutes: 30, reason_for_visit: "Routine cleaning", notes: "" },
  { name: "APT-0016", patient: "Karim Fouad", doctor: "Dr. Youssef Nabil", appointment_date: "2026-06-25", appointment_time: "15:30", status: "Completed", duration_minutes: 45, reason_for_visit: "Lower molar extraction", notes: "" },
  { name: "APT-0017", patient: "Nadia Samir", doctor: "Dr. Leila Haddad", appointment_date: "2026-06-18", appointment_time: "09:00", status: "Completed", duration_minutes: 90, reason_for_visit: "Root canal treatment", notes: "" },
  { name: "APT-0018", patient: "Karim Fouad", doctor: "Dr. Sarah Mansour", appointment_date: "2026-06-11", appointment_time: "13:30", status: "Completed", duration_minutes: 30, reason_for_visit: "Composite filling", notes: "" },
  { name: "APT-0019", patient: "Tarek Hassan", doctor: "Dr. Sarah Mansour", appointment_date: "2026-06-04", appointment_time: "16:30", status: "Completed", duration_minutes: 30, reason_for_visit: "Bridge consultation", notes: "" },
];

const treatmentPlans: MockDoc[] = [
  { name: "TRT-0001", patient: "Nadia Samir", doctor: "Dr. Leila Haddad", treatment_type: "Root Canal", tooth_number: "36", status: "Completed", total_cost: 4500, diagnosis: "Irreversible pulpitis on the lower left first molar.", treatment_notes: "Three canals obturated. Patient tolerated the session well." },
  { name: "TRT-0002", patient: "Nadia Samir", doctor: "Dr. Sarah Mansour", treatment_type: "Crown", tooth_number: "36", status: "In Progress", total_cost: 6000, diagnosis: "Post-endodontic restoration required.", treatment_notes: "Zirconia crown, impression taken 20 Aug 2026." },
  { name: "TRT-0003", patient: "Karim Fouad", doctor: "Dr. Sarah Mansour", treatment_type: "Filling", tooth_number: "24", status: "Completed", total_cost: 900, diagnosis: "Occlusal caries.", treatment_notes: "Composite restoration, shade A2." },
  { name: "TRT-0004", patient: "Karim Fouad", doctor: "Dr. Youssef Nabil", treatment_type: "Extraction", tooth_number: "48", status: "Completed", total_cost: 1200, diagnosis: "Impacted third molar with recurrent pericoronitis.", treatment_notes: "Surgical extraction, two sutures placed." },
  { name: "TRT-0005", patient: "Mona Adel", doctor: "Dr. Sarah Mansour", treatment_type: "Cleaning", tooth_number: "", status: "Completed", total_cost: 600, diagnosis: "Generalised mild calculus.", treatment_notes: "Ultrasonic scaling and polishing." },
  { name: "TRT-0006", patient: "Mona Adel", doctor: "Dr. Omar Khalil", treatment_type: "Whitening", tooth_number: "", status: "Planned", total_cost: 3500, diagnosis: "Extrinsic staining, patient request.", treatment_notes: "In-office session plus take-home trays." },
  { name: "TRT-0007", patient: "Tarek Hassan", doctor: "Dr. Youssef Nabil", treatment_type: "Implant", tooth_number: "46", status: "In Progress", total_cost: 18000, diagnosis: "Missing lower right first molar.", treatment_notes: "Fixture placed 11 Aug 2026, healing abutment at 12 weeks." },
  { name: "TRT-0008", patient: "Tarek Hassan", doctor: "Dr. Sarah Mansour", treatment_type: "Bridge", tooth_number: "45", status: "Planned", total_cost: 12000, diagnosis: "Three-unit bridge planned once the implant integrates.", treatment_notes: "" },
  { name: "TRT-0009", patient: "Salma Ibrahim", doctor: "Dr. Hana Aziz", treatment_type: "Filling", tooth_number: "16", status: "Completed", total_cost: 850, diagnosis: "Occlusal caries on the upper right first molar.", treatment_notes: "Composite restoration." },
  { name: "TRT-0010", patient: "Hossam Nour", doctor: "Dr. Leila Haddad", treatment_type: "Root Canal", tooth_number: "27", status: "In Progress", total_cost: 4800, diagnosis: "Necrotic pulp with apical periodontitis.", treatment_notes: "Session 1 complete, calcium hydroxide dressing in place." },
  { name: "TRT-0011", patient: "Dina Rashad", doctor: "Dr. Sarah Mansour", treatment_type: "Cleaning", tooth_number: "", status: "Completed", total_cost: 600, diagnosis: "Routine six-month recall.", treatment_notes: "Scaling and polishing, oral hygiene advice given." },
  { name: "TRT-0012", patient: "Amir Zaki", doctor: "Dr. Youssef Nabil", treatment_type: "Extraction", tooth_number: "38", status: "Completed", total_cost: 1500, diagnosis: "Partially erupted third molar, repeated infection.", treatment_notes: "Extraction under local anaesthetic, uneventful healing." },
  { name: "TRT-0013", patient: "Amir Zaki", doctor: "Dr. Sarah Mansour", treatment_type: "Crown", tooth_number: "37", status: "Planned", total_cost: 6500, diagnosis: "Cracked cusp on the lower left second molar.", treatment_notes: "" },
  { name: "TRT-0014", patient: "Yara Mostafa", doctor: "Dr. Omar Khalil", treatment_type: "Whitening", tooth_number: "", status: "Cancelled", total_cost: 3500, diagnosis: "Patient request.", treatment_notes: "Cancelled before the first session." },
  { name: "TRT-0015", patient: "Bassel Ramy", doctor: "Dr. Sarah Mansour", treatment_type: "Filling", tooth_number: "14", status: "In Progress", total_cost: 1000, diagnosis: "Interproximal caries on the upper right first premolar.", treatment_notes: "Temporary restoration placed, final composite pending." },
];

const payments: MockDoc[] = [
  { name: "PAY-0001", patient: "Nadia Samir", treatment_plan: "TRT-0002", payment_date: "2026-08-20", amount: 3000, payment_method: "Bank Transfer", notes: "Deposit for the zirconia crown." },
  { name: "PAY-0002", patient: "Bassel Ramy", treatment_plan: "TRT-0015", payment_date: "2026-08-18", amount: 500, payment_method: "Cash", notes: "" },
  { name: "PAY-0003", patient: "Tarek Hassan", treatment_plan: "TRT-0007", payment_date: "2026-08-11", amount: 4000, payment_method: "Card", notes: "Second instalment on the implant." },
  { name: "PAY-0004", patient: "Hossam Nour", treatment_plan: "TRT-0010", payment_date: "2026-08-06", amount: 2000, payment_method: "Card", notes: "" },
  { name: "PAY-0005", patient: "Dina Rashad", treatment_plan: "TRT-0011", payment_date: "2026-07-30", amount: 600, payment_method: "Cash", notes: "" },
  { name: "PAY-0006", patient: "Amir Zaki", treatment_plan: "TRT-0012", payment_date: "2026-07-22", amount: 1500, payment_method: "Cash", notes: "" },
  { name: "PAY-0007", patient: "Salma Ibrahim", treatment_plan: "TRT-0009", payment_date: "2026-07-15", amount: 850, payment_method: "Cash", notes: "" },
  { name: "PAY-0008", patient: "Mona Adel", treatment_plan: "TRT-0005", payment_date: "2026-07-09", amount: 600, payment_method: "Cash", notes: "" },
  { name: "PAY-0009", patient: "Tarek Hassan", treatment_plan: "TRT-0007", payment_date: "2026-07-02", amount: 5000, payment_method: "Bank Transfer", notes: "Down payment on the implant." },
  { name: "PAY-0010", patient: "Karim Fouad", treatment_plan: "TRT-0004", payment_date: "2026-06-25", amount: 1200, payment_method: "Card", notes: "" },
  { name: "PAY-0011", patient: "Nadia Samir", treatment_plan: "TRT-0001", payment_date: "2026-06-20", amount: 2500, payment_method: "Card", notes: "Balance of the root canal." },
  { name: "PAY-0012", patient: "Nadia Samir", treatment_plan: "TRT-0001", payment_date: "2026-06-18", amount: 2000, payment_method: "Cash", notes: "" },
  { name: "PAY-0013", patient: "Karim Fouad", treatment_plan: "TRT-0003", payment_date: "2026-06-11", amount: 900, payment_method: "Cash", notes: "" },
];

const users: MockDoc[] = [
  { name: "Administrator", full_name: "Administrator", first_name: "Administrator", email: "admin@dentclinic.test", enabled: 1, roles: [{ role: "System Manager" }] },
  { name: "Guest", full_name: "Guest", first_name: "Guest", email: "guest@dentclinic.test", enabled: 1, roles: [] },
  { name: "ahmed.ezzat@dentclinic.test", full_name: "Ahmed Ezzat", first_name: "Ahmed", email: "ahmed.ezzat@dentclinic.test", enabled: 1, roles: [{ role: "Clinic Manager" }] },
  { name: "mariam.saeed@dentclinic.test", full_name: "Mariam Saeed", first_name: "Mariam", email: "mariam.saeed@dentclinic.test", enabled: 1, roles: [{ role: "Clinic Receptionist" }] },
  { name: "sarah.mansour@dentclinic.test", full_name: "Dr. Sarah Mansour", first_name: "Sarah", email: "sarah.mansour@dentclinic.test", enabled: 1, roles: [{ role: "Clinic Doctor" }] },
  { name: "omar.khalil@dentclinic.test", full_name: "Dr. Omar Khalil", first_name: "Omar", email: "omar.khalil@dentclinic.test", enabled: 1, roles: [{ role: "Clinic Doctor" }] },
  { name: "leila.haddad@dentclinic.test", full_name: "Dr. Leila Haddad", first_name: "Leila", email: "leila.haddad@dentclinic.test", enabled: 1, roles: [{ role: "Clinic Doctor" }] },
  { name: "youssef.nabil@dentclinic.test", full_name: "Dr. Youssef Nabil", first_name: "Youssef", email: "youssef.nabil@dentclinic.test", enabled: 1, roles: [{ role: "Clinic Doctor" }] },
  { name: "hana.aziz@dentclinic.test", full_name: "Dr. Hana Aziz", first_name: "Hana", email: "hana.aziz@dentclinic.test", enabled: 0, roles: [{ role: "Clinic Doctor" }] },
];

const clinicPermissions: MockDoc[] = [
  {
    name: "ahmed.ezzat@dentclinic.test", user: "ahmed.ezzat@dentclinic.test",
    view_patients: 1, add_patients: 1, edit_patients: 1, delete_patients: 1,
    view_appointments: 1, add_appointments: 1, edit_appointments: 1,
    view_treatments: 1, add_treatments: 1, edit_treatments: 1,
    view_payments: 1, add_payments: 1, view_reports: 1, manage_users: 1,
  },
  {
    name: "mariam.saeed@dentclinic.test", user: "mariam.saeed@dentclinic.test",
    view_patients: 1, add_patients: 1, edit_patients: 1, delete_patients: 0,
    view_appointments: 1, add_appointments: 1, edit_appointments: 1,
    view_treatments: 1, add_treatments: 0, edit_treatments: 0,
    view_payments: 1, add_payments: 1, view_reports: 0, manage_users: 0,
  },
  {
    name: "sarah.mansour@dentclinic.test", user: "sarah.mansour@dentclinic.test",
    view_patients: 1, add_patients: 0, edit_patients: 1, delete_patients: 0,
    view_appointments: 1, add_appointments: 1, edit_appointments: 1,
    view_treatments: 1, add_treatments: 1, edit_treatments: 1,
    view_payments: 1, add_payments: 0, view_reports: 0, manage_users: 0,
  },
];

const store: Store = {
  Patient: patients,
  Doctor: doctors,
  Appointment: appointments,
  "Treatment Plan": treatmentPlans,
  Payment: payments,
  User: users,
  "Clinic Permission": clinicPermissions,
};

/* ------------------------------------------------------------- internals -- */

/** Doctypes named after one of their own fields, the way the Frappe "field:" autoname works. */
const NAME_FIELD: Record<string, string> = {
  Patient: "full_name",
  Doctor: "full_name",
  User: "email",
  "Clinic Permission": "user",
};

/** Doctypes named from a counter, the way a Frappe naming series works. */
const NAME_SERIES: Record<string, string> = {
  Appointment: "APT",
  "Treatment Plan": "TRT",
  Payment: "PAY",
};

const num = (value: MockValue): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Rebuild every field the real backend would compute, so the data stays self-consistent. */
function recalculate(): void {
  store["Treatment Plan"].forEach((plan) => {
    const paid = store.Payment
      .filter((pay) => pay.treatment_plan === plan.name)
      .reduce((sum, pay) => sum + num(pay.amount), 0);
    plan.paid_amount = paid;
    plan.remaining_amount =
      plan.status === "Cancelled" ? 0 : Math.max(0, num(plan.total_cost) - paid);
  });

  store.Patient.forEach((patient) => {
    const plans = store["Treatment Plan"].filter((plan) => plan.patient === patient.name);
    patient.total_treatments = plans.length;
    patient.total_appointments = store.Appointment.filter((a) => a.patient === patient.name).length;
    patient.total_paid = store.Payment
      .filter((pay) => pay.patient === patient.name)
      .reduce((sum, pay) => sum + num(pay.amount), 0);
    patient.total_remaining = plans.reduce((sum, plan) => sum + num(plan.remaining_amount), 0);
  });
}

function collection(doctype: string): MockDoc[] {
  if (!store[doctype]) store[doctype] = [];
  return store[doctype];
}

function compare(value: MockValue, operator: string, expected: unknown): boolean {
  const left = value === null || value === undefined ? "" : String(value);

  switch (operator.toLowerCase()) {
    case "=":
    case "==":
      return left === String(expected);
    case "!=":
      return left !== String(expected);
    case "in":
      return Array.isArray(expected) && expected.map(String).includes(left);
    case "not in":
      return Array.isArray(expected) && !expected.map(String).includes(left);
    case "like": {
      const needle = String(expected).replace(/%/g, "").toLowerCase();
      return left.toLowerCase().includes(needle);
    }
    case ">":
      return left > String(expected);
    case "<":
      return left < String(expected);
    case ">=":
      return left >= String(expected);
    case "<=":
      return left <= String(expected);
    default:
      return true;
  }
}

/** Supports the two filter shapes the app uses: [[field, op, value]] and {field: value}. */
function matches(doc: MockDoc, filters?: unknown): boolean {
  if (!filters) return true;

  if (Array.isArray(filters)) {
    return filters.every((filter) => {
      if (!Array.isArray(filter)) return true;
      const [field, operator, expected] = filter as [string, string, unknown];
      return compare(doc[field], operator, expected);
    });
  }

  if (typeof filters === "object") {
    return Object.entries(filters as Record<string, unknown>)
      .every(([field, expected]) => compare(doc[field], "=", expected));
  }

  return true;
}

/** Return only the requested fields, the way the Frappe list API does. */
function project(doc: MockDoc, fields?: string[]): MockDoc {
  if (!fields || fields.length === 0 || fields.includes("*")) return { ...doc };
  const picked: MockDoc = { name: doc.name };
  fields.forEach((field) => {
    if (field !== "name") picked[field] = doc[field];
  });
  return picked;
}

function nextName(doctype: string, data: Record<string, MockValue>): string {
  const field = NAME_FIELD[doctype];
  if (field && data[field]) {
    const base = String(data[field]);
    let candidate = base;
    let suffix = 1;
    while (collection(doctype).some((doc) => doc.name === candidate)) {
      suffix += 1;
      candidate = base + " " + suffix;
    }
    return candidate;
  }

  const prefix = NAME_SERIES[doctype] || doctype.toUpperCase().slice(0, 3);
  const highest = collection(doctype).reduce((max, doc) => {
    const parsed = Number(String(doc.name).split("-").pop());
    return Number.isFinite(parsed) && parsed > max ? parsed : max;
  }, 0);
  return prefix + "-" + String(highest + 1).padStart(4, "0");
}

function ageFrom(dateOfBirth: MockValue): number {
  if (!dateOfBirth) return 0;
  const born = new Date(String(dateOfBirth));
  if (Number.isNaN(born.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const monthDelta = today.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < born.getDate())) age -= 1;
  return age;
}

/** A short pause so loading states behave like they will against the real backend. */
const latency = () => new Promise((resolve) => setTimeout(resolve, 150));

recalculate();

/* ------------------------------------------------------------------ api --- */

export async function mockGetList(
  doctype: string,
  fields?: string[],
  filters?: unknown,
): Promise<MockDoc[]> {
  await latency();
  return collection(doctype)
    .filter((doc) => matches(doc, filters))
    .map((doc) => project(doc, fields));
}

export async function mockGetDoc(doctype: string, name: string): Promise<MockDoc> {
  await latency();
  const doc = collection(doctype).find((candidate) => candidate.name === name);
  if (!doc) throw new Error(doctype + " " + name + " not found");
  return { ...doc };
}

export async function mockCreateDoc(
  doctype: string,
  data: Record<string, MockValue>,
): Promise<MockDoc> {
  await latency();
  const doc: MockDoc = { ...data, name: nextName(doctype, data) };

  if (doctype === "Patient") {
    doc.age = data.age ? num(data.age) : ageFrom(data.date_of_birth);
    doc.dental_chart = {};
  }
  if (doctype === "User") {
    doc.full_name = data.full_name || String(data.first_name || data.email || "");
    if (doc.enabled === undefined) doc.enabled = 1;
  }
  if (doc.total_cost !== undefined) doc.total_cost = num(doc.total_cost);
  if (doc.amount !== undefined) doc.amount = num(doc.amount);

  collection(doctype).unshift(doc);
  recalculate();
  return { ...doc };
}

export async function mockUpdateDoc(
  doctype: string,
  name: string,
  data: Record<string, MockValue>,
): Promise<MockDoc> {
  await latency();
  const doc = collection(doctype).find((candidate) => candidate.name === name);
  if (!doc) throw new Error(doctype + " " + name + " not found");
  Object.assign(doc, data);
  recalculate();
  return { ...doc };
}

export async function mockDeleteDoc(doctype: string, name: string): Promise<void> {
  await latency();
  const docs = collection(doctype);
  const index = docs.findIndex((candidate) => candidate.name === name);
  if (index === -1) throw new Error(doctype + " " + name + " not found");
  docs.splice(index, 1);
  recalculate();
}
