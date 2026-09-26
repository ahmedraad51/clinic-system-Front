/**
 * TEMPORARY: in-memory dummy data so the UI can be built without a live Frappe
 * backend. Everything here is fake. Turn it off with MOCK_DATA in src/lib/frappe.ts.
 *
 * The store mimics the Frappe REST shape: every doc has a "name" (its ID), IDs use
 * the same naming series as the real doctypes (PAT-2026-00001), link fields hold the
 * linked doc's name, list queries only return the fields that were asked for, and
 * the read-only fields the server computes are rebuilt after every write.
 */

import type { DocValue } from "./types";
import { addDays, todayISO } from "./format";

export type MockValue = DocValue;

export interface MockDoc {
  name: string;
  [field: string]: MockValue;
}

type Store = Record<string, MockDoc[]>;
type FilterRow = [string, string, unknown];

export interface MockListOptions {
  filters?: unknown;
  orFilters?: unknown;
  orderBy?: string;
  /** 0 or undefined means every row. */
  limit?: number;
  start?: number;
}

/* ------------------------------------------------------------------ seed -- */

const P = {
  nadia: "PAT-2026-00001", karim: "PAT-2026-00002", mona: "PAT-2026-00003", tarek: "PAT-2026-00004",
  salma: "PAT-2026-00005", hossam: "PAT-2026-00006", dina: "PAT-2026-00007", amir: "PAT-2026-00008",
  yara: "PAT-2026-00009", bassel: "PAT-2026-00010",
  // Two long-standing patients, last seen more than six months ago, for the recall list.
  rania: "PAT-2025-00001", sherif: "PAT-2025-00002",
};

const D = {
  sarah: "DOC-00001", omar: "DOC-00002", leila: "DOC-00003", youssef: "DOC-00004", hana: "DOC-00005",
};

const T = (n: number) => "TRT-2026-" + String(n).padStart(5, "0");
const A = (n: number) => "APT-2026-" + String(n).padStart(5, "0");

const doctors: MockDoc[] = [
  { name: D.sarah, full_name: "Dr. Sarah Mansour", specialization: "General Dentist", email: "sarah.mansour@dentclinic.test", phone_number: "+20 100 111 2233", start_time: "09:00", end_time: "17:00", is_active: 1 },
  { name: D.omar, full_name: "Dr. Omar Khalil", specialization: "Orthodontist", email: "omar.khalil@dentclinic.test", phone_number: "+20 100 111 4455", start_time: "12:00", end_time: "18:00", is_active: 1 },
  { name: D.leila, full_name: "Dr. Leila Haddad", specialization: "Endodontist", email: "leila.haddad@dentclinic.test", phone_number: "+20 100 111 6677", start_time: "09:00", end_time: "18:00", is_active: 1 },
  { name: D.youssef, full_name: "Dr. Youssef Nabil", specialization: "Oral Surgeon", email: "youssef.nabil@dentclinic.test", phone_number: "+20 100 111 8899", start_time: "08:00", end_time: "14:00", is_active: 1 },
  { name: D.hana, full_name: "Dr. Hana Aziz", specialization: "Pediatric Dentist", email: "hana.aziz@dentclinic.test", phone_number: "+20 100 222 1010", start_time: "10:00", end_time: "16:00", is_active: 1 },
];

const patients: MockDoc[] = [
  {
    name: P.nadia, full_name: "Nadia Samir", gender: "Female",
    date_of_birth: "1991-04-12", age: 35,
    phone_number: "+20 100 234 5678", secondary_phone: "+20 122 908 1145",
    email: "nadia.samir@example.com", address: "14 El Nasr St, Heliopolis, Cairo",
    allergies: "Penicillin", current_medications: "None", chronic_diseases: "None",
    medical_history: "Root canal on tooth 36 (June 2026). No prior surgeries.",
    notes: "Prefers morning appointments.",
    // The current chart shape (version 2).
    dental_chart: {
      version: 2,
      teeth: {
        "36": { conditions: ["root_canal", "crown"], note: "Zirconia crown being made." },
        "37": { surfaces: { O: "caries", D: "caries" } },
        "26": { surfaces: { O: "filling" } },
      },
    },
  },
  {
    name: P.karim, full_name: "Karim Fouad", gender: "Male",
    date_of_birth: "1984-09-03", age: 42,
    phone_number: "+20 111 447 2093", secondary_phone: "",
    email: "karim.fouad@example.com", address: "8 Gamal Abdel Nasser St, Giza",
    allergies: "None", current_medications: "Metformin 500mg", chronic_diseases: "Type 2 Diabetes",
    medical_history: "Composite filling on 24 and extraction of 48 (June 2026).",
    notes: "Diabetic - confirm blood sugar before any surgical work.",
    // The first chart shape, kept on purpose: old records must still load.
    dental_chart: { "24": "treated", "48": "treated" },
  },
  {
    name: P.mona, full_name: "Mona Adel", gender: "Female",
    date_of_birth: "1997-06-21", age: 29,
    phone_number: "+20 106 332 8814", secondary_phone: "",
    email: "mona.adel@example.com", address: "22 Ahmed Orabi St, Mohandessin, Giza",
    allergies: "Latex", current_medications: "None", chronic_diseases: "None",
    medical_history: "Routine cleanings only.",
    notes: "Interested in whitening, waiting on a quote.",
    dental_chart: {},
  },
  {
    name: P.tarek, full_name: "Tarek Hassan", gender: "Male",
    date_of_birth: "1973-01-17", age: 53,
    phone_number: "+20 128 771 4520", secondary_phone: "+20 100 118 9032",
    email: "tarek.hassan@example.com", address: "5 El Merghany St, Heliopolis, Cairo",
    allergies: "None", current_medications: "Amlodipine 5mg", chronic_diseases: "Hypertension",
    medical_history: "Implant placed on tooth 46 (August 2026). Bridge planned for 45.",
    notes: "Check blood pressure before long sessions.",
    dental_chart: {
      version: 2,
      teeth: {
        "46": { conditions: ["implant"], note: "Fixture placed 11 Aug 2026." },
        "45": { conditions: ["bridge"], note: "Three-unit bridge planned once the implant integrates." },
        "17": { surfaces: { O: "filling", M: "filling" } },
      },
    },
  },
  {
    name: P.salma, full_name: "Salma Ibrahim", gender: "Female",
    date_of_birth: "2006-11-30", age: 19,
    phone_number: "+20 115 660 3374", secondary_phone: "",
    email: "salma.ibrahim@example.com", address: "31 El Hegaz St, Nasr City, Cairo",
    allergies: "None", current_medications: "None", chronic_diseases: "None",
    medical_history: "First visit July 2026 - one filling on tooth 16.",
    notes: "Student, afternoon slots only.",
    dental_chart: { "16": "treated" },
  },
  {
    name: P.hossam, full_name: "Hossam Nour", gender: "Male",
    date_of_birth: "1980-03-08", age: 46,
    phone_number: "+20 109 285 7761", secondary_phone: "",
    email: "hossam.nour@example.com", address: "12 Port Said St, Maadi, Cairo",
    allergies: "Ibuprofen", current_medications: "None", chronic_diseases: "None",
    medical_history: "Root canal in progress on tooth 27.",
    notes: "Sensitive to cold, use a warm rinse.",
    dental_chart: { version: 2, teeth: { "27": { conditions: ["root_canal"], note: "Session 2 done; filling the canals next." } } },
  },
  {
    name: P.dina, full_name: "Dina Rashad", gender: "Female",
    date_of_birth: "1988-08-25", age: 38,
    phone_number: "+20 100 554 1287", secondary_phone: "",
    email: "dina.rashad@example.com", address: "7 El Thawra St, Dokki, Giza",
    allergies: "None", current_medications: "None", chronic_diseases: "None",
    medical_history: "Scaling and polishing (July 2026).",
    notes: "Six-month recall due January 2027.",
    dental_chart: {},
  },
  {
    name: P.amir, full_name: "Amir Zaki", gender: "Male",
    date_of_birth: "1962-05-14", age: 64,
    phone_number: "+20 122 340 9915", secondary_phone: "+20 101 776 2288",
    email: "amir.zaki@example.com", address: "60 El Horreya Rd, Alexandria",
    allergies: "Aspirin", current_medications: "Warfarin 3mg", chronic_diseases: "Atrial fibrillation",
    medical_history: "Wisdom tooth 38 extracted (July 2026). Crown planned for 37.",
    notes: "On anticoagulants - coordinate with his physician before extractions.",
    dental_chart: {
      version: 2,
      teeth: {
        "38": { conditions: ["missing"] },
        "37": { surfaces: { O: "caries", B: "caries" }, note: "Cracked cusp, crown planned." },
        "48": { conditions: ["extract"], note: "Coordinate with his physician first (warfarin)." },
      },
    },
  },
  {
    name: P.yara, full_name: "Yara Mostafa", gender: "Female",
    date_of_birth: "2001-12-02", age: 24,
    phone_number: "+20 114 908 6602", secondary_phone: "",
    email: "yara.mostafa@example.com", address: "19 Syria St, Mohandessin, Giza",
    allergies: "None", current_medications: "None", chronic_diseases: "None",
    medical_history: "No treatment completed yet.",
    notes: "Cancelled her whitening appointment in August.",
    dental_chart: {},
  },
  {
    name: P.bassel, full_name: "Bassel Ramy", gender: "Male",
    date_of_birth: "1994-07-19", age: 32,
    phone_number: "+20 127 445 0091", secondary_phone: "",
    email: "bassel.ramy@example.com", address: "3 El Obour Buildings, Salah Salem, Cairo",
    allergies: "None", current_medications: "None", chronic_diseases: "None",
    medical_history: "Composite filling on tooth 14 in progress.",
    notes: "Missed his follow-up on 24 Aug 2026.",
    dental_chart: { "14": "pending" },
  },
  {
    name: P.rania, full_name: "Rania Fawzy", gender: "Female",
    date_of_birth: "1979-02-11", age: 47,
    phone_number: "+20 100 876 4410", secondary_phone: "",
    email: "rania.fawzy@example.com", address: "9 Abbas El Akkad St, Nasr City, Cairo",
    allergies: "None", current_medications: "None", chronic_diseases: "None",
    medical_history: "Regular cleanings since 2023.",
    notes: "Due for her six-month cleaning.",
    dental_chart: {},
  },
  {
    name: P.sherif, full_name: "Sherif Adel", gender: "Male",
    date_of_birth: "1990-10-05", age: 35,
    phone_number: "+20 122 615 7730", secondary_phone: "",
    email: "sherif.adel@example.com", address: "15 Mourad St, Giza",
    allergies: "None", current_medications: "None", chronic_diseases: "None",
    medical_history: "Check-up and cleaning in February 2026.",
    notes: "",
    dental_chart: {},
  },
];

const TODAY = todayISO();

const appointments: MockDoc[] = [
  // Three appointments relative to today, so the dashboard and the bell always have something to show.
  { name: A(20), patient: P.salma, doctor: D.hana, appointment_date: TODAY, appointment_time: "10:00", status: "Confirmed", duration_minutes: 30, reason_for_visit: "Check-up and fluoride", notes: "" },
  { name: A(21), patient: P.karim, doctor: D.sarah, appointment_date: TODAY, appointment_time: "12:30", status: "Scheduled", duration_minutes: 30, reason_for_visit: "Six-month check", notes: "Check blood sugar first." },
  { name: A(22), patient: P.dina, doctor: D.sarah, appointment_date: addDays(TODAY, 1), appointment_time: "11:00", status: "Scheduled", duration_minutes: 30, reason_for_visit: "Sensitivity on upper left side", notes: "" },
  { name: A(1), patient: P.nadia, doctor: D.sarah, appointment_date: "2026-09-08", appointment_time: "10:00", status: "Scheduled", duration_minutes: 45, reason_for_visit: "Crown fitting follow-up", notes: "" },
  { name: A(2), patient: P.mona, doctor: D.omar, appointment_date: "2026-09-03", appointment_time: "12:30", status: "Confirmed", duration_minutes: 30, reason_for_visit: "Whitening consultation", notes: "Bring the shade guide." },
  { name: A(3), patient: P.tarek, doctor: D.youssef, appointment_date: "2026-09-02", appointment_time: "09:00", status: "Scheduled", duration_minutes: 60, reason_for_visit: "Implant second stage", notes: "" },
  { name: A(4), patient: P.hossam, doctor: D.leila, appointment_date: "2026-09-01", appointment_time: "16:00", status: "Confirmed", duration_minutes: 60, reason_for_visit: "Root canal session 2", notes: "" },
  { name: A(5), patient: P.amir, doctor: D.sarah, appointment_date: "2026-09-14", appointment_time: "11:00", status: "Scheduled", duration_minutes: 45, reason_for_visit: "Crown impression for tooth 37", notes: "" },
  { name: A(6), patient: P.yara, doctor: D.omar, appointment_date: "2026-08-27", appointment_time: "15:00", status: "Cancelled", duration_minutes: 30, reason_for_visit: "Whitening session", notes: "Patient cancelled the day before." },
  { name: A(7), patient: P.bassel, doctor: D.sarah, appointment_date: "2026-08-24", appointment_time: "13:00", status: "No Show", duration_minutes: 30, reason_for_visit: "Filling follow-up", notes: "Did not answer the reminder call." },
  { name: A(8), patient: P.nadia, doctor: D.sarah, appointment_date: "2026-08-20", appointment_time: "10:30", status: "Completed", duration_minutes: 60, reason_for_visit: "Crown preparation", notes: "" },
  { name: A(9), patient: P.bassel, doctor: D.sarah, appointment_date: "2026-08-18", appointment_time: "09:30", status: "Completed", duration_minutes: 45, reason_for_visit: "Composite filling on tooth 14", notes: "" },
  { name: A(10), patient: P.tarek, doctor: D.youssef, appointment_date: "2026-08-11", appointment_time: "08:30", status: "Completed", duration_minutes: 90, reason_for_visit: "Implant placement", notes: "Healing well at the one-week check." },
  { name: A(11), patient: P.hossam, doctor: D.leila, appointment_date: "2026-08-06", appointment_time: "17:00", status: "Completed", duration_minutes: 60, reason_for_visit: "Root canal session 1", notes: "" },
  { name: A(12), patient: P.dina, doctor: D.sarah, appointment_date: "2026-07-30", appointment_time: "11:30", status: "Completed", duration_minutes: 30, reason_for_visit: "Scaling and polishing", notes: "" },
  { name: A(13), patient: P.amir, doctor: D.youssef, appointment_date: "2026-07-22", appointment_time: "14:00", status: "Completed", duration_minutes: 60, reason_for_visit: "Wisdom tooth extraction", notes: "Anticoagulant paused per physician note." },
  { name: A(14), patient: P.salma, doctor: D.hana, appointment_date: "2026-07-15", appointment_time: "10:00", status: "Completed", duration_minutes: 30, reason_for_visit: "Cavity filling on tooth 16", notes: "" },
  { name: A(15), patient: P.mona, doctor: D.sarah, appointment_date: "2026-07-09", appointment_time: "12:00", status: "Completed", duration_minutes: 30, reason_for_visit: "Routine cleaning", notes: "" },
  { name: A(16), patient: P.karim, doctor: D.youssef, appointment_date: "2026-06-25", appointment_time: "15:30", status: "Completed", duration_minutes: 45, reason_for_visit: "Lower molar extraction", notes: "" },
  { name: A(17), patient: P.nadia, doctor: D.leila, appointment_date: "2026-06-18", appointment_time: "09:00", status: "Completed", duration_minutes: 90, reason_for_visit: "Root canal treatment", notes: "" },
  { name: A(18), patient: P.karim, doctor: D.sarah, appointment_date: "2026-06-11", appointment_time: "13:30", status: "Completed", duration_minutes: 30, reason_for_visit: "Composite filling", notes: "" },
  { name: "APT-2025-00001", patient: P.rania, doctor: D.sarah, appointment_date: "2025-12-10", appointment_time: "11:00", status: "Completed", duration_minutes: 30, reason_for_visit: "Scaling and polishing", notes: "" },
  { name: A(23), patient: P.sherif, doctor: D.sarah, appointment_date: "2026-02-02", appointment_time: "17:00", status: "Completed", duration_minutes: 30, reason_for_visit: "Check-up and cleaning", notes: "" },
  { name: A(19), patient: P.tarek, doctor: D.sarah, appointment_date: "2026-06-04", appointment_time: "16:30", status: "Completed", duration_minutes: 30, reason_for_visit: "Bridge consultation", notes: "" },
];

const treatmentPlans: MockDoc[] = [
  { name: T(1), patient: P.nadia, doctor: D.leila, treatment_type: "Root Canal", tooth_number: "36", status: "Completed", total_cost: 4500, diagnosis: "Irreversible pulpitis on the lower left first molar.", treatment_notes: "Three canals obturated. Patient tolerated the session well." },
  { name: T(2), patient: P.nadia, doctor: D.sarah, treatment_type: "Crown", tooth_number: "36", status: "In Progress", total_cost: 6000, diagnosis: "Post-endodontic restoration required.", treatment_notes: "Zirconia crown, impression taken 20 Aug 2026." },
  { name: T(3), patient: P.karim, doctor: D.sarah, treatment_type: "Filling", tooth_number: "24", status: "Completed", total_cost: 900, diagnosis: "Occlusal caries.", treatment_notes: "Composite restoration, shade A2." },
  { name: T(4), patient: P.karim, doctor: D.youssef, treatment_type: "Extraction", tooth_number: "48", status: "Completed", total_cost: 1200, diagnosis: "Impacted third molar with recurrent pericoronitis.", treatment_notes: "Surgical extraction, two sutures placed." },
  { name: T(5), patient: P.mona, doctor: D.sarah, treatment_type: "Cleaning", tooth_number: "", status: "Completed", total_cost: 600, diagnosis: "Generalised mild calculus.", treatment_notes: "Ultrasonic scaling and polishing." },
  { name: T(6), patient: P.mona, doctor: D.omar, treatment_type: "Whitening", tooth_number: "", status: "Planned", total_cost: 3500, diagnosis: "Extrinsic staining, patient request.", treatment_notes: "In-office session plus take-home trays." },
  { name: T(7), patient: P.tarek, doctor: D.youssef, treatment_type: "Implant", tooth_number: "46", status: "In Progress", total_cost: 18000, diagnosis: "Missing lower right first molar.", treatment_notes: "Fixture placed 11 Aug 2026, healing abutment at 12 weeks." },
  { name: T(8), patient: P.tarek, doctor: D.sarah, treatment_type: "Bridge", tooth_number: "45", status: "Planned", total_cost: 12000, diagnosis: "Three-unit bridge planned once the implant integrates.", treatment_notes: "" },
  { name: T(9), patient: P.salma, doctor: D.hana, treatment_type: "Filling", tooth_number: "16", status: "Completed", total_cost: 850, diagnosis: "Occlusal caries on the upper right first molar.", treatment_notes: "Composite restoration." },
  { name: T(10), patient: P.hossam, doctor: D.leila, treatment_type: "Root Canal", tooth_number: "27", status: "In Progress", total_cost: 4800, diagnosis: "Necrotic pulp with apical periodontitis.", treatment_notes: "Session 1 complete, calcium hydroxide dressing in place." },
  { name: T(11), patient: P.dina, doctor: D.sarah, treatment_type: "Cleaning", tooth_number: "", status: "Completed", total_cost: 600, diagnosis: "Routine six-month recall.", treatment_notes: "Scaling and polishing, oral hygiene advice given." },
  { name: T(12), patient: P.amir, doctor: D.youssef, treatment_type: "Extraction", tooth_number: "38", status: "Completed", total_cost: 1500, diagnosis: "Partially erupted third molar, repeated infection.", treatment_notes: "Extraction under local anaesthetic, uneventful healing." },
  { name: T(13), patient: P.amir, doctor: D.sarah, treatment_type: "Crown", tooth_number: "37", status: "Planned", total_cost: 6500, diagnosis: "Cracked cusp on the lower left second molar.", treatment_notes: "" },
  { name: T(14), patient: P.yara, doctor: D.omar, treatment_type: "Whitening", tooth_number: "", status: "Cancelled", total_cost: 3500, diagnosis: "Patient request.", treatment_notes: "Cancelled before the first session." },
  { name: T(15), patient: P.bassel, doctor: D.sarah, treatment_type: "Filling", tooth_number: "14", status: "In Progress", total_cost: 1000, diagnosis: "Interproximal caries on the upper right first premolar.", treatment_notes: "Temporary restoration placed, final composite pending." },
];

const sessions: MockDoc[] = [
  { name: "SES-2026-00001", patient: P.nadia, treatment_plan: T(1), doctor: D.leila, session_date: "2026-06-18", session_time: "09:00", status: "Completed", notes: "Access, cleaning and shaping of three canals." },
  { name: "SES-2026-00002", patient: P.nadia, treatment_plan: T(1), doctor: D.leila, session_date: "2026-06-25", session_time: "09:00", status: "Completed", notes: "Obturation and temporary filling." },
  { name: "SES-2026-00003", patient: P.nadia, treatment_plan: T(2), doctor: D.sarah, session_date: "2026-08-20", session_time: "10:30", status: "Completed", notes: "Crown preparation and impression." },
  { name: "SES-2026-00004", patient: P.nadia, treatment_plan: T(2), doctor: D.sarah, session_date: "2026-10-01", session_time: "10:00", status: "Scheduled", notes: "Crown fitting." },
  { name: "SES-2026-00005", patient: P.tarek, treatment_plan: T(7), doctor: D.youssef, session_date: "2026-08-11", session_time: "08:30", status: "Completed", notes: "Fixture placed, primary stability good." },
  { name: "SES-2026-00006", patient: P.tarek, treatment_plan: T(7), doctor: D.youssef, session_date: "2026-11-03", session_time: "09:00", status: "Scheduled", notes: "Healing abutment." },
  { name: "SES-2026-00007", patient: P.hossam, treatment_plan: T(10), doctor: D.leila, session_date: "2026-08-06", session_time: "17:00", status: "Completed", notes: "Access and calcium hydroxide dressing." },
  { name: "SES-2026-00008", patient: P.hossam, treatment_plan: T(10), doctor: D.leila, session_date: "2026-09-01", session_time: "16:00", status: "Completed", notes: "Cleaning and shaping." },
  { name: "SES-2026-00009", patient: P.bassel, treatment_plan: T(15), doctor: D.sarah, session_date: "2026-08-18", session_time: "09:30", status: "Completed", notes: "Caries removed, temporary restoration." },
  { name: "SES-2026-00010", patient: P.bassel, treatment_plan: T(15), doctor: D.sarah, session_date: "2026-08-24", session_time: "13:00", status: "Cancelled", notes: "Patient did not attend." },
];

const payments: MockDoc[] = [
  // Two payments relative to today, so "Revenue this month" is never empty.
  { name: "PAY-2026-00014", patient: P.hossam, treatment_plan: T(10), payment_date: TODAY, amount: 800, payment_method: "Cash", notes: "" },
  { name: "PAY-2026-00015", patient: P.tarek, treatment_plan: T(7), payment_date: TODAY, amount: 3000, payment_method: "Card", notes: "Third instalment on the implant." },
  { name: "PAY-2026-00001", patient: P.nadia, treatment_plan: T(2), payment_date: "2026-08-20", amount: 3000, payment_method: "Bank Transfer", notes: "Deposit for the zirconia crown." },
  { name: "PAY-2026-00002", patient: P.bassel, treatment_plan: T(15), payment_date: "2026-08-18", amount: 500, payment_method: "Cash", notes: "" },
  { name: "PAY-2026-00003", patient: P.tarek, treatment_plan: T(7), payment_date: "2026-08-11", amount: 4000, payment_method: "Card", notes: "Second instalment on the implant." },
  { name: "PAY-2026-00004", patient: P.hossam, treatment_plan: T(10), payment_date: "2026-08-06", amount: 2000, payment_method: "Card", notes: "" },
  { name: "PAY-2026-00005", patient: P.dina, treatment_plan: T(11), payment_date: "2026-07-30", amount: 600, payment_method: "Cash", notes: "" },
  { name: "PAY-2026-00006", patient: P.amir, treatment_plan: T(12), payment_date: "2026-07-22", amount: 1500, payment_method: "Cash", notes: "" },
  { name: "PAY-2026-00007", patient: P.salma, treatment_plan: T(9), payment_date: "2026-07-15", amount: 850, payment_method: "Cash", notes: "" },
  { name: "PAY-2026-00008", patient: P.mona, treatment_plan: T(5), payment_date: "2026-07-09", amount: 600, payment_method: "Cash", notes: "" },
  { name: "PAY-2026-00009", patient: P.tarek, treatment_plan: T(7), payment_date: "2026-07-02", amount: 5000, payment_method: "Bank Transfer", notes: "Down payment on the implant." },
  { name: "PAY-2026-00010", patient: P.karim, treatment_plan: T(4), payment_date: "2026-06-25", amount: 1200, payment_method: "Card", notes: "" },
  { name: "PAY-2026-00011", patient: P.nadia, treatment_plan: T(1), payment_date: "2026-06-20", amount: 2500, payment_method: "Card", notes: "Balance of the root canal." },
  { name: "PAY-2026-00012", patient: P.nadia, treatment_plan: T(1), payment_date: "2026-06-18", amount: 2000, payment_method: "Cash", notes: "" },
  { name: "PAY-2026-00013", patient: P.karim, treatment_plan: T(3), payment_date: "2026-06-11", amount: 900, payment_method: "Cash", notes: "" },
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

const clinicSettings: MockDoc[] = [
  {
    name: "Clinic Settings",
    clinic_name: "DentClinic",
    logo: "",
    phone: "+20 2 2345 6789",
    email: "hello@dentclinic.test",
    address: "Heliopolis, Cairo",
    currency: "USD",
    tax_number: "",
    opening_time: "09:00",
    closing_time: "18:00",
    theme_color: "#0e7c86",
    enable_whatsapp: 1,
    enable_patient_portal: 0,
    enable_financial_reports: 1,
    working_days: "Saturday,Sunday,Monday,Tuesday,Wednesday,Thursday",
    treatment_prices: [
      { treatment_type: "Filling", price: 900 },
      { treatment_type: "Root Canal", price: 4500 },
      { treatment_type: "Crown", price: 6000 },
      { treatment_type: "Bridge", price: 12000 },
      { treatment_type: "Extraction", price: 1200 },
      { treatment_type: "Implant", price: 18000 },
      { treatment_type: "Cleaning", price: 600 },
      { treatment_type: "Whitening", price: 3500 },
    ],
  },
];

const whatsappTemplates: MockDoc[] = [
  {
    name: "WAT-00001", template_name: "Reminder - day before", trigger: "24 Hours Before", is_active: 1,
    message: "Hello {{ patient_name }}, this is a reminder of your appointment at {{ clinic_name }} on {{ appointment_date }} at {{ appointment_time }} with {{ doctor_name }}. Reply to this message if you need to change it.",
  },
  {
    name: "WAT-00002", template_name: "Reminder - same day", trigger: "2 Hours Before", is_active: 1,
    message: "Hi {{ patient_name }}, we look forward to seeing you today at {{ appointment_time }}. {{ clinic_name }}",
  },
  {
    name: "WAT-00003", template_name: "Follow-up after treatment", trigger: "Manual", is_active: 0,
    message: "Hello {{ patient_name }}, how are you feeling after your visit? Call us if you have any pain or questions. {{ clinic_name }}",
  },
];

const whatsappLogs: MockDoc[] = [
  { name: "WAL-2026-00001", patient: P.salma, appointment: A(20), phone_number: "+20 115 660 3374", status: "Pending", sent_at: TODAY + " 08:00:00", message: "Hi Salma Ibrahim, we look forward to seeing you today at 10:00 AM. DentClinic", error_message: "" },
  { name: "WAL-2026-00002", patient: P.amir, appointment: A(5), phone_number: "+20 122 340 9915", status: "Sent", sent_at: "2026-09-13 11:00:00", message: "Hello Amir Zaki, this is a reminder of your appointment at DentClinic on 14 Sep 2026 at 11:00 AM with Dr. Sarah Mansour.", error_message: "" },
  { name: "WAL-2026-00003", patient: P.nadia, appointment: A(1), phone_number: "+20 100 234 5678", status: "Sent", sent_at: "2026-09-07 10:00:00", message: "Hello Nadia Samir, this is a reminder of your appointment at DentClinic on 8 Sep 2026 at 10:00 AM with Dr. Sarah Mansour.", error_message: "" },
  { name: "WAL-2026-00004", patient: P.mona, appointment: A(2), phone_number: "+20 106 332 8814", status: "Sent", sent_at: "2026-09-02 12:30:00", message: "Hello Mona Adel, this is a reminder of your appointment at DentClinic on 3 Sep 2026 at 12:30 PM with Dr. Omar Khalil.", error_message: "" },
  { name: "WAL-2026-00005", patient: P.tarek, appointment: A(3), phone_number: "+20 128 771 4520", status: "Failed", sent_at: "2026-09-01 09:00:00", message: "Hello Tarek Hassan, this is a reminder of your appointment at DentClinic on 2 Sep 2026 at 9:00 AM with Dr. Youssef Nabil.", error_message: "Recipient phone number is not a WhatsApp account." },
  { name: "WAL-2026-00006", patient: P.yara, appointment: A(6), phone_number: "+20 114 908 6602", status: "Sent", sent_at: "2026-08-26 15:00:00", message: "Hello Yara Mostafa, this is a reminder of your appointment at DentClinic on 27 Aug 2026 at 3:00 PM with Dr. Omar Khalil.", error_message: "" },
  { name: "WAL-2026-00007", patient: P.bassel, appointment: A(7), phone_number: "+20 127 445 0091", status: "Failed", sent_at: "2026-08-23 13:00:00", message: "Hello Bassel Ramy, this is a reminder of your appointment at DentClinic on 24 Aug 2026 at 1:00 PM with Dr. Sarah Mansour.", error_message: "Message template was rejected by the WhatsApp provider." },
];

const store: Store = {
  Patient: patients,
  Doctor: doctors,
  Appointment: appointments,
  "Treatment Plan": treatmentPlans,
  "Treatment Session": sessions,
  Payment: payments,
  User: users,
  "Clinic Permission": clinicPermissions,
  "Clinic Settings": clinicSettings,
  "WhatsApp Template": whatsappTemplates,
  "WhatsApp Log": whatsappLogs,
};

/* ------------------------------------------------------------- internals -- */

/** Doctypes named after one of their own fields, the way the Frappe "field:" autoname works. */
const NAME_FIELD: Record<string, string> = {
  User: "email",
  "Clinic Permission": "user",
};

/** Doctypes named from a naming series, matching the real backend. */
const NAME_SERIES: Record<string, { prefix: string; year: boolean }> = {
  Patient: { prefix: "PAT", year: true },
  Doctor: { prefix: "DOC", year: false },
  Appointment: { prefix: "APT", year: true },
  "Treatment Plan": { prefix: "TRT", year: true },
  "Treatment Session": { prefix: "SES", year: true },
  Payment: { prefix: "PAY", year: true },
  "WhatsApp Template": { prefix: "WAT", year: false },
  "WhatsApp Log": { prefix: "WAL", year: true },
};

/** Which doctypes link to which, so a delete can be refused the way Frappe refuses it. */
const LINKED_FROM: Record<string, Array<[doctype: string, field: string]>> = {
  Patient: [
    ["Appointment", "patient"], ["Treatment Plan", "patient"], ["Treatment Session", "patient"],
    ["Payment", "patient"], ["WhatsApp Log", "patient"],
  ],
  Doctor: [["Appointment", "doctor"], ["Treatment Plan", "doctor"], ["Treatment Session", "doctor"]],
  "Treatment Plan": [["Payment", "treatment_plan"], ["Treatment Session", "treatment_plan"]],
  Appointment: [["WhatsApp Log", "appointment"]],
};

const NUMBER_FIELDS = ["total_cost", "amount", "duration_minutes", "age", "enabled", "is_active"];

const num = (value: MockValue): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clone = <T>(value: T): T => structuredClone(value);

function collection(doctype: string): MockDoc[] {
  if (!store[doctype]) store[doctype] = [];
  return store[doctype];
}

function find(doctype: string, name: MockValue): MockDoc | undefined {
  return collection(doctype).find((doc) => doc.name === name);
}

/** Rebuild every field the real backend would compute or fetch, so the data stays self-consistent. */
function recalculate(): void {
  const patientsById = new Map(store.Patient.map((doc) => [doc.name, doc]));
  const doctorsById = new Map(store.Doctor.map((doc) => [doc.name, doc]));
  const plansById = new Map(store["Treatment Plan"].map((doc) => [doc.name, doc]));

  // "Fetch from" fields: link labels copied onto the linking doc.
  ["Appointment", "Treatment Plan", "Treatment Session", "Payment", "WhatsApp Log"].forEach((doctype) => {
    collection(doctype).forEach((doc) => {
      doc.patient_name = patientsById.get(String(doc.patient))?.full_name ?? "";
      if (doctype !== "Payment" && doctype !== "WhatsApp Log") {
        doc.doctor_name = doc.doctor ? doctorsById.get(String(doc.doctor))?.full_name ?? "" : "";
      }
    });
  });
  store.Payment.forEach((pay) => {
    pay.treatment_type = pay.treatment_plan ? plansById.get(String(pay.treatment_plan))?.treatment_type ?? "" : "";
  });

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

function compare(value: MockValue, operator: string, expected: unknown): boolean {
  const left = value === null || value === undefined ? "" : String(value);
  const numeric = typeof value === "number" && expected !== "" && Number.isFinite(Number(expected));
  const cmp = (): number =>
    numeric ? Number(value) - Number(expected) : left < String(expected) ? -1 : left > String(expected) ? 1 : 0;

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
    case "not like": {
      const needle = String(expected).replace(/%/g, "").toLowerCase();
      return !left.toLowerCase().includes(needle);
    }
    case "is":
      return expected === "set" ? left !== "" : left === "";
    case "between":
      return Array.isArray(expected) && left >= String(expected[0]) && left <= String(expected[1]);
    case ">":
      return cmp() > 0;
    case "<":
      return cmp() < 0;
    case ">=":
      return cmp() >= 0;
    case "<=":
      return cmp() <= 0;
    default:
      return true;
  }
}

/** Supports the two filter shapes Frappe accepts: [[field, op, value]] and {field: value}. */
function matchesAll(doc: MockDoc, filters?: unknown): boolean {
  if (!filters) return true;
  if (Array.isArray(filters)) {
    return filters.every((filter) => {
      if (!Array.isArray(filter)) return true;
      const [field, operator, expected] = filter as FilterRow;
      return compare(doc[field], operator, expected);
    });
  }
  if (typeof filters === "object") {
    return Object.entries(filters as Record<string, unknown>)
      .every(([field, expected]) => compare(doc[field], "=", expected));
  }
  return true;
}

function matchesAny(doc: MockDoc, orFilters?: unknown): boolean {
  if (!Array.isArray(orFilters) || orFilters.length === 0) return true;
  return orFilters.some((filter) => {
    if (!Array.isArray(filter)) return false;
    const [field, operator, expected] = filter as FilterRow;
    return compare(doc[field], operator, expected);
  });
}

function compareValues(a: MockValue, b: MockValue): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  const left = a === null || a === undefined ? "" : String(a);
  const right = b === null || b === undefined ? "" : String(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Sorts like SQL "ORDER BY a desc, b asc". */
function sortDocs(docs: MockDoc[], orderBy?: string): MockDoc[] {
  if (!orderBy) return docs;
  const keys = orderBy
    .split(",")
    .map((part) => {
      const [field = "", direction = "asc"] = part.trim().split(/\s+/);
      return { field: field.replace(/`/g, "").replace(/^tab[^.]*\./, ""), desc: direction.toLowerCase() === "desc" };
    })
    .filter((key) => key.field);
  return [...docs].sort((a, b) => {
    for (const key of keys) {
      const result = compareValues(a[key.field], b[key.field]);
      if (result !== 0) return key.desc ? -result : result;
    }
    return 0;
  });
}

function query(doctype: string, filters?: unknown, orFilters?: unknown): MockDoc[] {
  return collection(doctype).filter((doc) => matchesAll(doc, filters) && matchesAny(doc, orFilters));
}

/** Return only the requested fields, the way the Frappe list API does. */
function project(doc: MockDoc, fields?: string[]): MockDoc {
  if (!fields || fields.length === 0 || fields.includes("*")) return clone(doc);
  const picked: MockDoc = { name: doc.name };
  fields.forEach((field) => {
    if (field !== "name") picked[field] = clone(doc[field]);
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

  const series = NAME_SERIES[doctype] ?? { prefix: doctype.toUpperCase().slice(0, 3), year: false };
  const prefix = series.prefix + "-" + (series.year ? new Date().getFullYear() + "-" : "");
  const highest = collection(doctype).reduce((max, doc) => {
    if (!doc.name.startsWith(prefix)) return max;
    const parsed = Number(doc.name.slice(prefix.length));
    return Number.isFinite(parsed) && parsed > max ? parsed : max;
  }, 0);
  return prefix + String(highest + 1).padStart(5, "0");
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

/** A JSON field is stored as sent, like Frappe does: a JSON string is parsed, anything unreadable becomes null. */
function jsonField(value: MockValue): MockValue {
  if (typeof value !== "string") return value ?? null;
  try {
    return JSON.parse(value) as MockValue;
  } catch {
    return null;
  }
}

/** Forms send numbers as strings; the real backend stores them as numbers. */
function normalize(doc: MockDoc): void {
  NUMBER_FIELDS.forEach((field) => {
    if (doc[field] !== undefined && doc[field] !== null && doc[field] !== "") doc[field] = num(doc[field]);
  });
}

/** Mirrors Treatment Plan.validate(): paid can never go above the total cost. */
function checkPayment(payment: MockDoc): void {
  if (num(payment.amount) <= 0) throw new Error("Amount must be more than zero.");
  if (!payment.treatment_plan) return;
  const plan = find("Treatment Plan", payment.treatment_plan);
  if (!plan) throw new Error("Treatment Plan " + payment.treatment_plan + " not found");
  const otherPayments = store.Payment
    .filter((pay) => pay.treatment_plan === plan.name && pay.name !== payment.name)
    .reduce((sum, pay) => sum + num(pay.amount), 0);
  const paid = otherPayments + num(payment.amount);
  if (paid > num(plan.total_cost)) {
    throw new Error(
      `Paid amount (${paid}) cannot be more than the total cost (${num(plan.total_cost)}) of ${plan.name}.`,
    );
  }
}

function checkPlan(plan: MockDoc): void {
  const paid = store.Payment
    .filter((pay) => pay.treatment_plan === plan.name)
    .reduce((sum, pay) => sum + num(pay.amount), 0);
  if (paid > num(plan.total_cost)) {
    throw new Error(`Paid amount (${paid}) cannot be more than the total cost (${num(plan.total_cost)}).`);
  }
}

/** A short pause so loading states behave like they will against the real backend. */
const latency = () => new Promise((resolve) => setTimeout(resolve, 150));

recalculate();

/* ------------------------------------------------------------------ api --- */

export async function mockGetList(
  doctype: string,
  fields?: string[],
  options: MockListOptions = {},
): Promise<MockDoc[]> {
  await latency();
  const { filters, orFilters, orderBy, limit, start = 0 } = options;
  const rows = sortDocs(query(doctype, filters, orFilters), orderBy);
  const page = limit && limit > 0 ? rows.slice(start, start + limit) : rows.slice(start);
  return page.map((doc) => project(doc, fields));
}

export async function mockGetCount(doctype: string, filters?: unknown, orFilters?: unknown): Promise<number> {
  await latency();
  return query(doctype, filters, orFilters).length;
}

export async function mockGetDoc(doctype: string, name: string): Promise<MockDoc> {
  await latency();
  const doc = find(doctype, name);
  if (!doc) throw new Error(doctype + " " + name + " not found");
  return clone(doc);
}

export async function mockCreateDoc(
  doctype: string,
  data: Record<string, MockValue>,
): Promise<MockDoc> {
  await latency();
  const doc: MockDoc = { ...clone(data), name: nextName(doctype, data) };
  normalize(doc);

  if (doctype === "Patient") {
    doc.age = data.age ? num(data.age) : ageFrom(data.date_of_birth);
    doc.dental_chart = jsonField(data.dental_chart);
  }
  if (doctype === "User") {
    doc.full_name = data.full_name || [data.first_name, data.last_name].filter(Boolean).join(" ") || String(data.email || "");
    if (doc.enabled === undefined) doc.enabled = 1;
    delete doc.new_password;
    delete doc.send_welcome_email;
  }
  if (doctype === "Payment") checkPayment(doc);

  collection(doctype).unshift(doc);
  recalculate();
  return clone(doc);
}

export async function mockUpdateDoc(
  doctype: string,
  name: string,
  data: Record<string, MockValue>,
): Promise<MockDoc> {
  await latency();
  const doc = find(doctype, name);
  if (!doc) throw new Error(doctype + " " + name + " not found");

  const next: MockDoc = { ...doc, ...clone(data), name: doc.name };
  normalize(next);
  if (doctype === "Patient") {
    if ("date_of_birth" in data && !("age" in data)) next.age = ageFrom(data.date_of_birth);
    if ("dental_chart" in data) next.dental_chart = jsonField(data.dental_chart);
  }
  if (doctype === "User" && ("first_name" in data || "last_name" in data) && !("full_name" in data)) {
    next.full_name = [next.first_name, next.last_name].filter(Boolean).join(" ");
  }
  if (doctype === "Payment") checkPayment(next);
  if (doctype === "Treatment Plan") checkPlan(next);

  Object.keys(doc).forEach((key) => delete doc[key]);
  Object.assign(doc, next);
  recalculate();
  return clone(doc);
}

export async function mockDeleteDoc(doctype: string, name: string): Promise<void> {
  await latency();
  const docs = collection(doctype);
  const index = docs.findIndex((candidate) => candidate.name === name);
  if (index === -1) throw new Error(doctype + " " + name + " not found");

  for (const [linkedDoctype, field] of LINKED_FROM[doctype] ?? []) {
    const linked = collection(linkedDoctype).find((doc) => doc[field] === name);
    if (linked) {
      throw new Error(
        `Cannot delete ${doctype} ${name} because it is linked with ${linkedDoctype} ${linked.name}.`,
      );
    }
  }
  docs.splice(index, 1);
  recalculate();
}

/** The few whitelisted methods the front end calls. */
export async function mockCall(method: string, args: Record<string, MockValue>): Promise<unknown> {
  await latency();
  if (method === "frappe.core.doctype.user.user.update_password") {
    if (!args.new_password) throw new Error("New password is required.");
    return "ok";
  }
  throw new Error(`The method ${method} is not available with dummy data.`);
}

/** Reads the file into a data URL, which works as an image src in the browser. */
export async function mockUpload(file: File): Promise<string> {
  await latency();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}
