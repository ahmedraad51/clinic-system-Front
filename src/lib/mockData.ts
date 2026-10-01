/**
 * TEMPORARY: in-memory dummy data so the UI can be built without a live Frappe
 * backend. Everything here is fake. Turn it off with MOCK_DATA in src/lib/frappe.ts.
 *
 * The store mimics the Frappe REST shape: every doc has a "name" (its ID), IDs use
 * the same naming series as the real doctypes (PAT-2026-00001), link fields hold the
 * linked doc's name, list queries only return the fields that were asked for, and
 * the read-only fields the server computes are rebuilt after every write.
 */

import { messages } from "@/i18n";
import type { DocValue } from "./types";
import { addDays, addMonths, todayISO } from "./format";
import { convertMoney, rateOn, roundMoney, settleTolerance, type ExchangeRate } from "./currency";
import { HISTORY_LIMIT, TRACKED_DOCTYPES } from "./history";
import { toLatinDigits } from "./phone";

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
  zahraa: "PAT-2026-00001", mustafa: "PAT-2026-00002", hiba: "PAT-2026-00003", abbas: "PAT-2026-00004",
  fatima: "PAT-2026-00005", hassan: "PAT-2026-00006", shahad: "PAT-2026-00007", saad: "PAT-2026-00008",
  ruqaya: "PAT-2026-00009", yousif: "PAT-2026-00010",
  // Two long-standing patients, last seen more than six months ago, for the recall list.
  suha: "PAT-2025-00001", muhannad: "PAT-2025-00002",
};

const D = {
  zainab: "DOC-00001", ali: "DOC-00002", noor: "DOC-00003", haider: "DOC-00004", rusul: "DOC-00005",
};

const T = (n: number) => "TRT-2026-" + String(n).padStart(5, "0");
const A = (n: number) => "APT-2026-" + String(n).padStart(5, "0");

const doctors: MockDoc[] = [
  { name: D.zainab, full_name: "د. زينب الهاشمي", gender: "Female", specialization: "General Dentist", email: "zainab.alhashimi@dentclinic.test", phone_number: "0770 410 2233", start_time: "09:00", end_time: "17:00", is_active: 1 },
  { name: D.ali, full_name: "د. علي الجبوري", gender: "Male", specialization: "Orthodontist", email: "ali.aljubouri@dentclinic.test", phone_number: "0781 410 4455", start_time: "12:00", end_time: "18:00", is_active: 1 },
  {
    name: D.noor, full_name: "د. نور الساعدي", gender: "Female", specialization: "Endodontist", email: "noor.alsaadi@dentclinic.test", phone_number: "0750 410 6677", start_time: "09:00", end_time: "18:00", is_active: 1,
    // Her own prescription heading, printed by the app on plain A5 paper.
    rx_paper_size: "A5", rx_preprinted: 0,
    rx_qualifications: "BDS, MSc Endodontics (University of Baghdad)\nبكالوريوس طب وجراحة الفم والأسنان، ماجستير علاج الجذور",
    rx_footer: "السبت–الخميس 9 ص–6 م · 0750 410 6677",
  },
  {
    name: D.haider, full_name: "د. حيدر العبيدي", gender: "Male", specialization: "Oral Surgeon", email: "haider.alobaidi@dentclinic.test", phone_number: "0771 410 8899", start_time: "08:00", end_time: "14:00", is_active: 1,
    // Pre-printed A5 pads from the print shop: the app leaves their header and footer blank.
    rx_paper_size: "A5", rx_preprinted: 1, rx_top_mm: 45, rx_bottom_mm: 25,
  },
  { name: D.rusul, full_name: "د. رسل كريم", gender: "Female", specialization: "Pediatric Dentist", email: "rusul.kareem@dentclinic.test", phone_number: "0782 410 1010", start_time: "10:00", end_time: "16:00", is_active: 1 },
];

const patients: MockDoc[] = [
  {
    name: P.zahraa, full_name: "زهراء حسين", gender: "Female",
    date_of_birth: "1991-04-12", age: 35,
    phone_number: "0770 234 5678", secondary_phone: "0781 908 1145",
    email: "zahraa.hussein@example.com", address: "محلة 609، زقاق 12، دار 7، المنصور، بغداد",
    allergies: "البنسلين", current_medications: "لا يوجد", chronic_diseases: "لا يوجد",
    medical_history: "علاج عصب للسن 36 (حزيران 2026). لا عمليات سابقة.",
    notes: "تفضّل المواعيد الصباحية.",
    // The current chart shape (version 2).
    dental_chart: {
      version: 2,
      teeth: {
        "36": { conditions: ["root_canal", "crown"], note: "تاج زركونيا قيد التحضير." },
        "37": { surfaces: { O: "caries", D: "caries" } },
        "26": { surfaces: { O: "filling" } },
      },
    },
  },
  {
    name: P.mustafa, full_name: "مصطفى جبار", gender: "Male",
    date_of_birth: "1984-09-03", age: 42,
    phone_number: "0771 447 2093", secondary_phone: "",
    email: "mustafa.jabbar@example.com", address: "محلة 903، زقاق 5، دار 21، الكرادة، بغداد",
    allergies: "لا يوجد", current_medications: "Metformin 500mg", chronic_diseases: "سكري النوع الثاني",
    medical_history: "حشوة تجميلية للسن 24 وقلع السن 48 (حزيران 2026).",
    notes: "مريض سكري: تأكد من السكر قبل أي عمل جراحي.",
    // The first chart shape, kept on purpose: old records must still load.
    dental_chart: { "24": "treated", "48": "treated" },
  },
  {
    name: P.hiba, full_name: "هبة كاظم", gender: "Female",
    date_of_birth: "1997-06-21", age: 29,
    phone_number: "0780 332 8814", secondary_phone: "",
    email: "hiba.kadhim@example.com", address: "زيونة، قرب شارع الربيعي، بغداد",
    allergies: "اللاتكس", current_medications: "لا يوجد", chronic_diseases: "لا يوجد",
    medical_history: "تنظيف دوري فقط.",
    notes: "مهتمة بالتبييض، تنتظر عرض السعر.",
    dental_chart: {},
    // The dentist wants her back every 3 months for gum care, and that date has come.
    recall_interval_months: 3, next_recall_date: addDays(todayISO(), -3), no_recall: 0,
  },
  {
    name: P.abbas, full_name: "عباس مهدي", gender: "Male",
    date_of_birth: "1973-01-17", age: 53,
    phone_number: "+964 772 771 4520", secondary_phone: "0770 118 9032",
    email: "abbas.mahdi@example.com", address: "محلة 314، زقاق 8، دار 3، الأعظمية، بغداد",
    allergies: "لا يوجد", current_medications: "Amlodipine 5mg", chronic_diseases: "ارتفاع ضغط الدم",
    medical_history: "زرعة للسن 46 (آب 2026). جسر مخطط للسن 45.",
    notes: "قِس الضغط قبل الجلسات الطويلة.",
    dental_chart: {
      version: 2,
      teeth: {
        "46": { conditions: ["implant"], note: "وُضعت الزرعة في 11 آب 2026." },
        "45": { conditions: ["bridge"], note: "جسر من ثلاث وحدات بعد التحام الزرعة." },
        "17": { surfaces: { O: "filling", M: "filling" } },
      },
    },
  },
  {
    name: P.fatima, full_name: "فاطمة سلمان", gender: "Female",
    date_of_birth: "2017-03-14", age: 9,
    phone_number: "0751 660 3374", secondary_phone: "",
    email: "fatima.salman@example.com", address: "الجادرية، قرب جامعة بغداد، بغداد",
    allergies: "لا يوجد", current_medications: "لا يوجد", chronic_diseases: "لا يوجد",
    medical_history: "أول زيارة في تموز 2026: حشوة واحدة للسن 16.",
    notes: "تأتي مع والدتها. مواعيد العصر فقط (المدرسة).",
    dental_chart: { "16": "treated" },
  },
  {
    name: P.hassan, full_name: "حسن فليح", gender: "Male",
    date_of_birth: "1980-03-08", age: 46,
    phone_number: "0782 285 7761", secondary_phone: "",
    email: "hassan.falih@example.com", address: "العشار، البصرة",
    allergies: "الإيبوبروفين", current_medications: "لا يوجد", chronic_diseases: "لا يوجد",
    medical_history: "علاج عصب جارٍ للسن 27.",
    notes: "حساسية من البرد، استخدم مضمضة دافئة.",
    dental_chart: { version: 2, teeth: { "27": { conditions: ["root_canal"], note: "انتهت الجلسة 2، التالي حشو القنوات." } } },
  },
  {
    name: P.shahad, full_name: "شهد قاسم", gender: "Female",
    date_of_birth: "1988-08-25", age: 38,
    phone_number: "0770 554 1287", secondary_phone: "",
    email: "shahad.qasim@example.com", address: "محلة 620، اليرموك، بغداد",
    allergies: "لا يوجد", current_medications: "لا يوجد", chronic_diseases: "لا يوجد",
    medical_history: "تنظيف وتلميع (تموز 2026).",
    notes: "مراجعة الستة أشهر في كانون الثاني 2027.",
    dental_chart: {},
    recall_interval_months: 6, next_recall_date: "2027-01-30", no_recall: 0,
  },
  {
    name: P.saad, full_name: "سعد نوري", gender: "Male",
    date_of_birth: "1962-05-14", age: 64,
    phone_number: "0781 340 9915", secondary_phone: "0750 776 2288",
    email: "saad.nouri@example.com", address: "عنكاوا، أربيل",
    allergies: "الأسبرين", current_medications: "Warfarin 3mg", chronic_diseases: "رجفان أذيني",
    medical_history: "قُلع ضرس العقل 38 (تموز 2026). تاج مخطط للسن 37.",
    notes: "يتناول مميعات الدم: نسّق مع طبيبه قبل أي قلع.",
    dental_chart: {
      version: 2,
      teeth: {
        "38": { conditions: ["missing"] },
        "37": { surfaces: { O: "caries", B: "caries" }, note: "حدبة مكسورة، تاج مخطط." },
        "48": { conditions: ["extract"], note: "نسّق مع طبيبه أولًا (وارفارين)." },
      },
    },
  },
  {
    name: P.ruqaya, full_name: "رقية عدنان", gender: "Female",
    date_of_birth: "2001-12-02", age: 24,
    phone_number: "0772 908 6602", secondary_phone: "",
    email: "ruqaya.adnan@example.com", address: "الكاظمية، بغداد",
    allergies: "لا يوجد", current_medications: "لا يوجد", chronic_diseases: "لا يوجد",
    medical_history: "لم يكتمل أي علاج بعد.",
    notes: "ألغت موعد التبييض في آب.",
    dental_chart: {},
  },
  {
    name: P.yousif, full_name: "يوسف ستار", gender: "Male",
    date_of_birth: "1994-07-19", age: 32,
    phone_number: "07801112233", secondary_phone: "",
    email: "yousif.sattar@example.com", address: "محلة 506، شارع فلسطين، بغداد",
    allergies: "لا يوجد", current_medications: "لا يوجد", chronic_diseases: "لا يوجد",
    medical_history: "حشوة تجميلية للسن 14 قيد العمل.",
    notes: "لم يحضر موعد المتابعة في 24 آب 2026.",
    dental_chart: { "14": "pending" },
  },
  {
    name: P.suha, full_name: "سهى مجيد", gender: "Female",
    date_of_birth: "1979-02-11", age: 47,
    phone_number: "0771 876 4410", secondary_phone: "",
    email: "suha.majeed@example.com", address: "حي الأمير، النجف",
    allergies: "لا يوجد", current_medications: "لا يوجد", chronic_diseases: "لا يوجد",
    medical_history: "تنظيف منتظم منذ 2023.",
    notes: "حان موعد تنظيف الستة أشهر.",
    dental_chart: {},
  },
  {
    name: P.muhannad, full_name: "مهند طه", gender: "Male",
    date_of_birth: "1990-10-05", age: 35,
    phone_number: "0770 123 4567", secondary_phone: "",
    email: "muhannad.taha@example.com", address: "حي الحسين، الحلة، بابل",
    allergies: "لا يوجد", current_medications: "لا يوجد", chronic_diseases: "لا يوجد",
    medical_history: "فحص وتنظيف في شباط 2026.",
    notes: "",
    dental_chart: {},
  },
];

const TODAY = todayISO();

const appointments: MockDoc[] = [
  // Three appointments relative to today, so the dashboard and the bell always have something to show.
  { name: A(20), patient: P.fatima, doctor: D.rusul, appointment_date: TODAY, appointment_time: "10:00", status: "Confirmed", duration_minutes: 30, reason_for_visit: "فحص وفلورايد", notes: "" },
  { name: A(21), patient: P.mustafa, doctor: D.zainab, appointment_date: TODAY, appointment_time: "12:30", status: "Scheduled", duration_minutes: 30, reason_for_visit: "فحص الستة أشهر", notes: "افحص السكر أولًا." },
  { name: A(22), patient: P.shahad, doctor: D.zainab, appointment_date: addDays(TODAY, 1), appointment_time: "11:00", status: "Scheduled", duration_minutes: 30, reason_for_visit: "حساسية في الجهة العليا اليسرى", notes: "" },
  { name: A(1), patient: P.zahraa, doctor: D.zainab, appointment_date: "2026-09-08", appointment_time: "10:00", status: "Scheduled", duration_minutes: 45, reason_for_visit: "متابعة تركيب التاج", notes: "" },
  { name: A(2), patient: P.hiba, doctor: D.ali, appointment_date: "2026-09-03", appointment_time: "12:30", status: "Confirmed", duration_minutes: 30, reason_for_visit: "استشارة تبييض", notes: "أحضر دليل الألوان." },
  { name: A(3), patient: P.abbas, doctor: D.haider, appointment_date: "2026-09-02", appointment_time: "09:00", status: "Scheduled", duration_minutes: 60, reason_for_visit: "المرحلة الثانية من الزرعة", notes: "" },
  { name: A(4), patient: P.hassan, doctor: D.noor, appointment_date: "2026-09-01", appointment_time: "16:00", status: "Confirmed", duration_minutes: 60, reason_for_visit: "علاج العصب، الجلسة 2", notes: "" },
  { name: A(5), patient: P.saad, doctor: D.zainab, appointment_date: "2026-09-14", appointment_time: "11:00", status: "Scheduled", duration_minutes: 45, reason_for_visit: "طبعة تاج للسن 37", notes: "" },
  { name: A(6), patient: P.ruqaya, doctor: D.ali, appointment_date: "2026-08-27", appointment_time: "15:00", status: "Cancelled", duration_minutes: 30, reason_for_visit: "جلسة تبييض", notes: "ألغت المريضة قبل يوم." },
  { name: A(7), patient: P.yousif, doctor: D.zainab, appointment_date: "2026-08-24", appointment_time: "13:00", status: "No Show", duration_minutes: 30, reason_for_visit: "متابعة الحشوة", notes: "لم يرد على اتصال التذكير." },
  { name: A(8), patient: P.zahraa, doctor: D.zainab, appointment_date: "2026-08-20", appointment_time: "10:30", status: "Completed", duration_minutes: 60, reason_for_visit: "تحضير التاج", notes: "" },
  { name: A(9), patient: P.yousif, doctor: D.zainab, appointment_date: "2026-08-18", appointment_time: "09:30", status: "Completed", duration_minutes: 45, reason_for_visit: "حشوة تجميلية للسن 14", notes: "" },
  { name: A(10), patient: P.abbas, doctor: D.haider, appointment_date: "2026-08-11", appointment_time: "08:30", status: "Completed", duration_minutes: 90, reason_for_visit: "وضع الزرعة", notes: "الالتئام جيد في فحص الأسبوع الأول." },
  { name: A(11), patient: P.hassan, doctor: D.noor, appointment_date: "2026-08-06", appointment_time: "17:00", status: "Completed", duration_minutes: 60, reason_for_visit: "علاج العصب، الجلسة 1", notes: "" },
  { name: A(12), patient: P.shahad, doctor: D.zainab, appointment_date: "2026-07-30", appointment_time: "11:30", status: "Completed", duration_minutes: 30, reason_for_visit: "تنظيف وتلميع", notes: "" },
  { name: A(13), patient: P.saad, doctor: D.haider, appointment_date: "2026-07-22", appointment_time: "14:00", status: "Completed", duration_minutes: 60, reason_for_visit: "قلع ضرس العقل", notes: "أُوقف المميع حسب رسالة طبيبه." },
  { name: A(14), patient: P.fatima, doctor: D.rusul, appointment_date: "2026-07-15", appointment_time: "10:00", status: "Completed", duration_minutes: 30, reason_for_visit: "حشوة تسوس للسن 16", notes: "" },
  { name: A(15), patient: P.hiba, doctor: D.zainab, appointment_date: "2026-07-09", appointment_time: "12:00", status: "Completed", duration_minutes: 30, reason_for_visit: "تنظيف دوري", notes: "" },
  { name: A(16), patient: P.mustafa, doctor: D.haider, appointment_date: "2026-06-25", appointment_time: "15:30", status: "Completed", duration_minutes: 45, reason_for_visit: "قلع ضرس سفلي", notes: "" },
  { name: A(17), patient: P.zahraa, doctor: D.noor, appointment_date: "2026-06-18", appointment_time: "09:00", status: "Completed", duration_minutes: 90, reason_for_visit: "علاج عصب", notes: "" },
  { name: A(18), patient: P.mustafa, doctor: D.zainab, appointment_date: "2026-06-11", appointment_time: "13:30", status: "Completed", duration_minutes: 30, reason_for_visit: "حشوة تجميلية", notes: "" },
  { name: "APT-2025-00001", patient: P.suha, doctor: D.zainab, appointment_date: "2025-12-10", appointment_time: "11:00", status: "Completed", duration_minutes: 30, reason_for_visit: "تنظيف وتلميع", notes: "" },
  { name: A(23), patient: P.muhannad, doctor: D.zainab, appointment_date: "2026-02-02", appointment_time: "17:00", status: "Completed", duration_minutes: 30, reason_for_visit: "فحص وتنظيف", notes: "" },
  { name: A(19), patient: P.abbas, doctor: D.zainab, appointment_date: "2026-06-04", appointment_time: "16:30", status: "Completed", duration_minutes: 30, reason_for_visit: "استشارة جسر", notes: "" },
];

/* Prices in Iraqi dinars, as a private clinic in Baghdad charges them in 2026. */
const treatmentPlans: MockDoc[] = [
  { name: T(1), patient: P.zahraa, doctor: D.noor, treatment_type: "Root Canal", tooth_number: "36", status: "Completed", total_cost: 150000, diagnosis: "التهاب لب غير عكوس في الضرس الأول السفلي الأيسر.", treatment_notes: "حُشيت ثلاث قنوات. تحمّلت المريضة الجلسة جيدًا." },
  { name: T(2), patient: P.zahraa, doctor: D.zainab, treatment_type: "Crown", tooth_number: "36", status: "In Progress", total_cost: 200000, diagnosis: "يحتاج ترميمًا بعد علاج العصب.", treatment_notes: "تاج زركونيا، أُخذت الطبعة في 20 آب 2026.", lab_name: "مختبر المنصور للأسنان", lab_sent_date: addDays(TODAY, -8), lab_due_date: addDays(TODAY, 3), lab_received_date: "" },
  { name: T(3), patient: P.mustafa, doctor: D.zainab, treatment_type: "Filling", tooth_number: "24", status: "Completed", total_cost: 40000, diagnosis: "تسوس إطباقي.", treatment_notes: "ترميم تجميلي، اللون A2." },
  { name: T(4), patient: P.mustafa, doctor: D.haider, treatment_type: "Extraction", tooth_number: "48", status: "Completed", total_cost: 75000, diagnosis: "ضرس عقل منطمر مع التهاب متكرر حوله.", treatment_notes: "قلع جراحي، غرزتان." },
  { name: T(5), patient: P.hiba, doctor: D.zainab, treatment_type: "Cleaning", tooth_number: "", status: "Completed", total_cost: 35000, diagnosis: "جير خفيف في كل الفم.", treatment_notes: "تنظيف بالموجات فوق الصوتية وتلميع." },
  { name: T(6), patient: P.hiba, doctor: D.ali, treatment_type: "Whitening", tooth_number: "", status: "Planned", total_cost: 250000, diagnosis: "تصبغات خارجية، بطلب المريضة.", treatment_notes: "جلسة في العيادة مع قوالب للبيت." },
  { name: T(7), patient: P.abbas, doctor: D.haider, treatment_type: "Implant", tooth_number: "46", status: "In Progress", total_cost: 1000000, diagnosis: "الضرس الأول السفلي الأيمن مفقود.", treatment_notes: "وُضعت الزرعة في 11 آب 2026، دعامة الالتئام بعد 12 أسبوعًا.", lab_name: "مختبر المنصور للأسنان", lab_sent_date: addDays(TODAY, -16), lab_due_date: addDays(TODAY, -2), lab_received_date: "" },
  { name: T(8), patient: P.abbas, doctor: D.zainab, treatment_type: "Bridge", tooth_number: "45", status: "Planned", total_cost: 600000, diagnosis: "جسر من ثلاث وحدات بعد التحام الزرعة.", treatment_notes: "" },
  { name: T(9), patient: P.fatima, doctor: D.rusul, treatment_type: "Filling", tooth_number: "16", status: "Completed", total_cost: 40000, diagnosis: "تسوس إطباقي في الضرس الأول العلوي الأيمن.", treatment_notes: "ترميم تجميلي." },
  { name: T(10), patient: P.hassan, doctor: D.noor, treatment_type: "Root Canal", tooth_number: "27", status: "In Progress", total_cost: 175000, diagnosis: "لب متموت مع التهاب حول الذروة.", treatment_notes: "انتهت الجلسة 1، ضماد هيدروكسيد الكالسيوم في مكانه." },
  { name: T(11), patient: P.shahad, doctor: D.zainab, treatment_type: "Cleaning", tooth_number: "", status: "Completed", total_cost: 35000, diagnosis: "مراجعة دورية كل ستة أشهر.", treatment_notes: "تنظيف وتلميع، مع نصائح لنظافة الفم." },
  { name: T(12), patient: P.saad, doctor: D.haider, treatment_type: "Extraction", tooth_number: "38", status: "Completed", total_cost: 75000, diagnosis: "ضرس عقل بازغ جزئيًا، التهاب متكرر.", treatment_notes: "قلع بتخدير موضعي، التئام دون مشاكل." },
  { name: T(13), patient: P.saad, doctor: D.zainab, treatment_type: "Crown", tooth_number: "37", status: "Planned", total_cost: 225000, diagnosis: "حدبة مكسورة في الضرس الثاني السفلي الأيسر.", treatment_notes: "" },
  { name: T(14), patient: P.ruqaya, doctor: D.ali, treatment_type: "Whitening", tooth_number: "", status: "Cancelled", total_cost: 250000, diagnosis: "بطلب المريضة.", treatment_notes: "أُلغي قبل الجلسة الأولى." },
  { name: T(16), patient: P.ruqaya, doctor: D.haider, treatment_type: "Implant", tooth_number: "21", status: "In Progress", currency: "USD", total_cost: 700, diagnosis: "القاطع الأوسط العلوي الأيسر مفقود بعد سقطة.", treatment_notes: "مسعّر بالدولار بطلب المريضة. وُضعت الزرعة في 10 آب 2026." },
  { name: T(15), patient: P.yousif, doctor: D.zainab, treatment_type: "Filling", tooth_number: "14", status: "In Progress", total_cost: 50000, diagnosis: "تسوس بين الأسنان في الضاحك الأول العلوي الأيمن.", treatment_notes: "حشوة مؤقتة، والحشوة التجميلية النهائية لاحقًا." },
];

const sessions: MockDoc[] = [
  { name: "SES-2026-00001", patient: P.zahraa, treatment_plan: T(1), doctor: D.noor, session_date: "2026-06-18", session_time: "09:00", status: "Completed", notes: "فتح وتنظيف وتشكيل ثلاث قنوات." },
  { name: "SES-2026-00002", patient: P.zahraa, treatment_plan: T(1), doctor: D.noor, session_date: "2026-06-25", session_time: "09:00", status: "Completed", notes: "حشو القنوات وحشوة مؤقتة." },
  { name: "SES-2026-00003", patient: P.zahraa, treatment_plan: T(2), doctor: D.zainab, session_date: "2026-08-20", session_time: "10:30", status: "Completed", notes: "تحضير التاج وأخذ الطبعة." },
  { name: "SES-2026-00004", patient: P.zahraa, treatment_plan: T(2), doctor: D.zainab, session_date: "2026-10-01", session_time: "10:00", status: "Scheduled", notes: "تركيب التاج." },
  { name: "SES-2026-00005", patient: P.abbas, treatment_plan: T(7), doctor: D.haider, session_date: "2026-08-11", session_time: "08:30", status: "Completed", notes: "وُضعت الزرعة، الثبات الأولي جيد." },
  { name: "SES-2026-00006", patient: P.abbas, treatment_plan: T(7), doctor: D.haider, session_date: "2026-11-03", session_time: "09:00", status: "Scheduled", notes: "دعامة الالتئام." },
  { name: "SES-2026-00007", patient: P.hassan, treatment_plan: T(10), doctor: D.noor, session_date: "2026-08-06", session_time: "17:00", status: "Completed", notes: "فتح وضماد هيدروكسيد الكالسيوم." },
  { name: "SES-2026-00008", patient: P.hassan, treatment_plan: T(10), doctor: D.noor, session_date: "2026-09-01", session_time: "16:00", status: "Completed", notes: "تنظيف وتشكيل." },
  { name: "SES-2026-00009", patient: P.yousif, treatment_plan: T(15), doctor: D.zainab, session_date: "2026-08-18", session_time: "09:30", status: "Completed", notes: "أُزيل التسوس، حشوة مؤقتة." },
  { name: "SES-2026-00010", patient: P.yousif, treatment_plan: T(15), doctor: D.zainab, session_date: "2026-08-24", session_time: "13:00", status: "Cancelled", notes: "لم يحضر المريض." },
];

const payments: MockDoc[] = [
  // Two payments relative to today, so "Revenue this month" is never empty.
  { name: "PAY-2026-00014", patient: P.hassan, treatment_plan: T(10), payment_date: TODAY, amount: 50000, payment_method: "Cash", notes: "" },
  { name: "PAY-2026-00015", patient: P.abbas, treatment_plan: T(7), payment_date: TODAY, amount: 200000, payment_method: "Card", notes: "القسط الثالث من الزرعة." },
  { name: "PAY-2026-00017", patient: P.ruqaya, treatment_plan: T(16), payment_date: "2026-08-20", amount: 148000, exchange_rate: 1480, payment_method: "Card", notes: "دفعت بالدينار على خطة بالدولار." },
  { name: "PAY-2026-00016", patient: P.ruqaya, treatment_plan: T(16), payment_date: "2026-08-10", amount: 300, currency: "USD", exchange_rate: 1480, payment_method: "Cash", notes: "دفعة أولى بالدولار." },
  { name: "PAY-2026-00001", patient: P.zahraa, treatment_plan: T(2), payment_date: "2026-08-20", amount: 100000, payment_method: "Bank Transfer", notes: "عربون تاج الزركونيا." },
  { name: "PAY-2026-00002", patient: P.yousif, treatment_plan: T(15), payment_date: "2026-08-18", amount: 25000, payment_method: "Cash", notes: "" },
  { name: "PAY-2026-00003", patient: P.abbas, treatment_plan: T(7), payment_date: "2026-08-11", amount: 250000, payment_method: "Card", notes: "القسط الثاني من الزرعة." },
  { name: "PAY-2026-00004", patient: P.hassan, treatment_plan: T(10), payment_date: "2026-08-06", amount: 75000, payment_method: "Card", notes: "" },
  { name: "PAY-2026-00005", patient: P.shahad, treatment_plan: T(11), payment_date: "2026-07-30", amount: 35000, payment_method: "Cash", notes: "" },
  { name: "PAY-2026-00006", patient: P.saad, treatment_plan: T(12), payment_date: "2026-07-22", amount: 75000, payment_method: "Cash", notes: "" },
  { name: "PAY-2026-00007", patient: P.fatima, treatment_plan: T(9), payment_date: "2026-07-15", amount: 40000, payment_method: "Cash", notes: "" },
  { name: "PAY-2026-00008", patient: P.hiba, treatment_plan: T(5), payment_date: "2026-07-09", amount: 35000, payment_method: "Cash", notes: "" },
  { name: "PAY-2026-00009", patient: P.abbas, treatment_plan: T(7), payment_date: "2026-07-02", amount: 300000, payment_method: "Bank Transfer", notes: "دفعة أولى للزرعة." },
  { name: "PAY-2026-00010", patient: P.mustafa, treatment_plan: T(4), payment_date: "2026-06-25", amount: 75000, payment_method: "Card", notes: "" },
  { name: "PAY-2026-00011", patient: P.zahraa, treatment_plan: T(1), payment_date: "2026-06-20", amount: 75000, payment_method: "Card", notes: "باقي مبلغ علاج العصب." },
  { name: "PAY-2026-00012", patient: P.zahraa, treatment_plan: T(1), payment_date: "2026-06-18", amount: 75000, payment_method: "Cash", notes: "" },
  { name: "PAY-2026-00013", patient: P.mustafa, treatment_plan: T(3), payment_date: "2026-06-11", amount: 40000, payment_method: "Cash", notes: "" },
];

const users: MockDoc[] = [
  { name: "Administrator", full_name: "Administrator", first_name: "Administrator", email: "admin@dentclinic.test", enabled: 1, roles: [{ role: "System Manager" }, { role: "Platform Owner" }] },
  { name: "Guest", full_name: "Guest", first_name: "Guest", email: "guest@dentclinic.test", enabled: 1, roles: [] },
  { name: "laith.hamid@dentclinic.test", full_name: "ليث حامد", first_name: "ليث", gender: "Male", email: "laith.hamid@dentclinic.test", enabled: 1, roles: [{ role: "Clinic Manager" }] },
  { name: "dalia.jawad@dentclinic.test", full_name: "داليا جواد", first_name: "داليا", gender: "Female", email: "dalia.jawad@dentclinic.test", enabled: 1, roles: [{ role: "Clinic Receptionist" }] },
  { name: "zainab.alhashimi@dentclinic.test", full_name: "د. زينب الهاشمي", first_name: "زينب", gender: "Female", email: "zainab.alhashimi@dentclinic.test", enabled: 1, roles: [{ role: "Clinic Doctor" }] },
  { name: "ali.aljubouri@dentclinic.test", full_name: "د. علي الجبوري", first_name: "علي", gender: "Male", email: "ali.aljubouri@dentclinic.test", enabled: 1, roles: [{ role: "Clinic Doctor" }] },
  { name: "noor.alsaadi@dentclinic.test", full_name: "د. نور الساعدي", first_name: "نور", gender: "Female", email: "noor.alsaadi@dentclinic.test", enabled: 1, roles: [{ role: "Clinic Doctor" }] },
  { name: "haider.alobaidi@dentclinic.test", full_name: "د. حيدر العبيدي", first_name: "حيدر", gender: "Male", email: "haider.alobaidi@dentclinic.test", enabled: 1, roles: [{ role: "Clinic Doctor" }] },
  { name: "rusul.kareem@dentclinic.test", full_name: "د. رسل كريم", first_name: "رسل", gender: "Female", email: "rusul.kareem@dentclinic.test", enabled: 0, roles: [{ role: "Clinic Doctor" }] },
];

const clinicPermissions: MockDoc[] = [
  {
    name: "laith.hamid@dentclinic.test", user: "laith.hamid@dentclinic.test",
    view_patients: 1, add_patients: 1, edit_patients: 1, delete_patients: 1,
    view_appointments: 1, add_appointments: 1, edit_appointments: 1,
    view_treatments: 1, add_treatments: 1, edit_treatments: 1,
    view_payments: 1, add_payments: 1, view_expenses: 1, add_expenses: 1, view_reports: 1, manage_users: 1,
  },
  {
    name: "dalia.jawad@dentclinic.test", user: "dalia.jawad@dentclinic.test",
    view_patients: 1, add_patients: 1, edit_patients: 1, delete_patients: 0,
    view_appointments: 1, add_appointments: 1, edit_appointments: 1,
    view_treatments: 1, add_treatments: 0, edit_treatments: 0,
    view_payments: 1, add_payments: 1, view_expenses: 0, add_expenses: 0, view_reports: 0, manage_users: 0,
  },
  {
    name: "zainab.alhashimi@dentclinic.test", user: "zainab.alhashimi@dentclinic.test",
    view_patients: 1, add_patients: 0, edit_patients: 1, delete_patients: 0,
    view_appointments: 1, add_appointments: 1, edit_appointments: 1,
    view_treatments: 1, add_treatments: 1, edit_treatments: 1,
    view_payments: 1, add_payments: 0, view_expenses: 0, add_expenses: 0, view_reports: 0, manage_users: 0,
  },
];

const clinicSettings: MockDoc[] = [
  {
    name: "Clinic Settings",
    clinic_name: "DentClinic",
    logo: "",
    phone: "0770 555 1200",
    email: "hello@dentclinic.test",
    address: "14 شارع رمضان، المنصور، بغداد",
    currency: "IQD",
    // Dollars too: 1 USD was 1,480 IQD from January and 1,460 from September.
    second_currency: "USD",
    exchange_rates: [
      { rate_date: "2026-01-01", rate: 1480 },
      { rate_date: "2026-09-01", rate: 1460 },
    ],
    tax_number: "",
    opening_time: "09:00",
    closing_time: "18:00",
    enable_whatsapp: 1,
    enable_patient_portal: 0,
    enable_financial_reports: 1,
    working_days: "Saturday,Sunday,Monday,Tuesday,Wednesday,Thursday",
    phone_country_code: "964",
    default_language: "ar",
    arabic_digits: 0,
    // This clinic went through the first-run setup wizard already.
    setup_status: "done",
    setup_step: 6,
    // The usual price of each treatment, in Iraqi dinars.
    treatment_prices: [
      { treatment_type: "Filling", price: 40000 },
      { treatment_type: "Root Canal", price: 150000 },
      { treatment_type: "Crown", price: 200000 },
      { treatment_type: "Bridge", price: 600000 },
      { treatment_type: "Extraction", price: 30000 },
      { treatment_type: "Implant", price: 1000000 },
      { treatment_type: "Cleaning", price: 35000 },
      { treatment_type: "Whitening", price: 250000 },
    ],
  },
];

const whatsappTemplates: MockDoc[] = [
  {
    name: "WAT-00001", template_name: "Reminder - day before", trigger: "24 Hours Before", is_active: 1, language: "en",
    message: "Hello {{ patient_name }}, this is a reminder of your appointment at {{ clinic_name }} on {{ appointment_date }} at {{ appointment_time }} with {{ doctor_name }}. Reply to this message if you need to change it.",
  },
  {
    name: "WAT-00002", template_name: "Reminder - same day", trigger: "2 Hours Before", is_active: 1, language: "en",
    message: "Hi {{ patient_name }}, we look forward to seeing you today at {{ appointment_time }}. {{ clinic_name }}",
  },
  {
    name: "WAT-00003", template_name: "Follow-up after treatment", trigger: "Manual", is_active: 0, language: "en",
    message: "Hello {{ patient_name }}, how are you feeling after your visit? Call us if you have any pain or questions. {{ clinic_name }}",
  },
  {
    name: "WAT-00004", template_name: "تذكير قبل يوم", trigger: "24 Hours Before", is_active: 1, language: "ar",
    message: "مرحبًا {{ patient_name }}، نذكّركم بموعدكم في {{ clinic_name }} يوم {{ appointment_date }} الساعة {{ appointment_time }} مع {{ doctor_name }}. يرجى الرد على هذه الرسالة إذا أردتم تغيير الموعد.",
  },
  {
    name: "WAT-00005", template_name: "تذكير في يوم الموعد", trigger: "2 Hours Before", is_active: 1, language: "ar",
    message: "أهلًا {{ patient_name }}، بانتظاركم اليوم الساعة {{ appointment_time }}. {{ clinic_name }}",
  },
  {
    name: "WAT-00006", template_name: "متابعة بعد العلاج", trigger: "Manual", is_active: 0, language: "ar",
    message: "مرحبًا {{ patient_name }}، كيف حالكم بعد الزيارة؟ اتصلوا بنا إذا شعرتم بأي ألم أو كان لديكم أي سؤال. {{ clinic_name }}",
  },
];

const whatsappLogs: MockDoc[] = [
  { name: "WAL-2026-00001", patient: P.fatima, appointment: A(20), phone_number: "0751 660 3374", status: "Pending", sent_at: TODAY + " 08:00:00", message: "أهلًا فاطمة سلمان، بانتظاركم اليوم الساعة 10:00 ص. DentClinic", error_message: "" },
  { name: "WAL-2026-00002", patient: P.saad, appointment: A(5), phone_number: "0781 340 9915", status: "Sent", sent_at: "2026-09-13 11:00:00", message: "مرحبًا سعد نوري، نذكّركم بموعدكم في DentClinic يوم 14 أيلول 2026 الساعة 11:00 ص مع د. زينب الهاشمي.", error_message: "" },
  { name: "WAL-2026-00003", patient: P.zahraa, appointment: A(1), phone_number: "0770 234 5678", status: "Sent", sent_at: "2026-09-07 10:00:00", message: "مرحبًا زهراء حسين، نذكّركم بموعدكم في DentClinic يوم 8 أيلول 2026 الساعة 10:00 ص مع د. زينب الهاشمي.", error_message: "" },
  { name: "WAL-2026-00004", patient: P.hiba, appointment: A(2), phone_number: "0780 332 8814", status: "Sent", sent_at: "2026-09-02 12:30:00", message: "مرحبًا هبة كاظم، نذكّركم بموعدكم في DentClinic يوم 3 أيلول 2026 الساعة 12:30 م مع د. علي الجبوري.", error_message: "" },
  { name: "WAL-2026-00005", patient: P.abbas, appointment: A(3), phone_number: "+964 772 771 4520", status: "Failed", sent_at: "2026-09-01 09:00:00", message: "مرحبًا عباس مهدي، نذكّركم بموعدكم في DentClinic يوم 2 أيلول 2026 الساعة 9:00 ص مع د. حيدر العبيدي.", error_message: "رقم المستلم ليس حساب واتساب." },
  { name: "WAL-2026-00006", patient: P.ruqaya, appointment: A(6), phone_number: "0772 908 6602", status: "Sent", sent_at: "2026-08-26 15:00:00", message: "مرحبًا رقية عدنان، نذكّركم بموعدكم في DentClinic يوم 27 آب 2026 الساعة 3:00 م مع د. علي الجبوري.", error_message: "" },
  { name: "WAL-2026-00007", patient: P.yousif, appointment: A(7), phone_number: "07801112233", status: "Failed", sent_at: "2026-08-23 13:00:00", message: "مرحبًا يوسف ستار، نذكّركم بموعدكم في DentClinic يوم 24 آب 2026 الساعة 1:00 م مع د. زينب الهاشمي.", error_message: "رفض مزوّد واتساب قالب الرسالة." },
];

/* Past cash counts, so the manager has days to look back on. Floats of 100,000 plus the day's Cash payments. */
/** Three months of costs (IQD unless said): supplies, electricity, lab bills for two doctors, a dollar purchase. */
const expenses: MockDoc[] = [
  { name: "EXP-2026-00012", expense_date: "2026-09-18", category: "Lab Fees", amount: 40000, doctor: D.haider, description: "دعامة وتاج لزرعة عباس مهدي", paid_to: "مختبر المنصور للأسنان", payment_method: "Cash" },
  { name: "EXP-2026-00011", expense_date: "2026-09-10", category: "Utilities", amount: 45000, description: "اشتراك المولدة والكهرباء، أيلول", paid_to: "مولدة المنصور", payment_method: "Cash" },
  { name: "EXP-2026-00010", expense_date: "2026-09-03", category: "Dental Supplies", amount: 60000, description: "مادة حشو تجميلية، قفازات، كمامات وأمبولات تخدير", paid_to: "مستلزمات بغداد لطب الأسنان", payment_method: "Cash" },
  { name: "EXP-2026-00009", expense_date: "2026-08-31", category: "Salaries", amount: 250000, description: "مساعدة طبيب الأسنان، آب", paid_to: "مساعدة طبيب الأسنان", payment_method: "Cash" },
  { name: "EXP-2026-00008", expense_date: "2026-08-25", category: "Equipment", amount: 150, currency: "USD", exchange_rate: 1480, description: "جهاز تصليب ضوئي LED", paid_to: "محل أجهزة طب الأسنان", payment_method: "Cash" },
  { name: "EXP-2026-00007", expense_date: "2026-08-22", category: "Lab Fees", amount: 120000, doctor: D.zainab, description: "تاج زركونيا لزهراء حسين", paid_to: "مختبر المنصور للأسنان", payment_method: "Bank Transfer" },
  { name: "EXP-2026-00006", expense_date: "2026-08-12", category: "Utilities", amount: 50000, description: "اشتراك المولدة والكهرباء، آب", paid_to: "مولدة المنصور", payment_method: "Cash" },
  { name: "EXP-2026-00005", expense_date: "2026-08-05", category: "Dental Supplies", amount: 150000, description: "مستهلكات طقم الزرعات ومادة الطبعة", paid_to: "مستلزمات بغداد لطب الأسنان", payment_method: "Card" },
  { name: "EXP-2026-00004", expense_date: "2026-07-31", category: "Salaries", amount: 250000, description: "مساعدة طبيب الأسنان، تموز", paid_to: "مساعدة طبيب الأسنان", payment_method: "Cash" },
  { name: "EXP-2026-00003", expense_date: "2026-07-20", category: "Maintenance", amount: 35000, description: "صيانة الضاغطة", paid_to: "خدمات بغداد لأجهزة الأسنان", payment_method: "Cash" },
  { name: "EXP-2026-00002", expense_date: "2026-07-14", category: "Utilities", amount: 55000, description: "اشتراك المولدة والكهرباء، تموز", paid_to: "مولدة المنصور", payment_method: "Cash" },
  { name: "EXP-2026-00001", expense_date: "2026-07-08", category: "Dental Supplies", amount: 90000, description: "مواد حشو ورؤوس حفر", paid_to: "مستلزمات بغداد لطب الأسنان", payment_method: "Cash" },
];

const cashCounts: MockDoc[] = [
  { name: "CC-2026-00003", count_date: "2026-08-18", opening_float: 100000, cash_payments: 25000, expected_cash: 125000, cash_counted: 130000, difference: 5000, note: "تركت مريضة 5,000 زيادة، تُحسب على زيارتها القادمة.", counted_by: "dalia.jawad@dentclinic.test", counted_at: "2026-08-18 18:05:00" },
  { name: "CC-2026-00002", count_date: "2026-07-30", opening_float: 100000, cash_payments: 35000, expected_cash: 135000, cash_counted: 125000, difference: -10000, note: "أُعطي الباقي مرتين لمريض واحد.", counted_by: "dalia.jawad@dentclinic.test", counted_at: "2026-07-30 18:10:00" },
  { name: "CC-2026-00001", count_date: "2026-07-22", opening_float: 100000, cash_payments: 75000, expected_cash: 175000, cash_counted: 175000, difference: 0, note: "", counted_by: "dalia.jawad@dentclinic.test", counted_at: "2026-07-22 18:02:00" },
];

/* The clinic's medicine list, with the usual dental doses. A dentist must check every line before real use. */
const M = {
  amoxicillin: "MED-00001", augmentin: "MED-00002", metronidazole: "MED-00003", clindamycin: "MED-00004", azithromycin: "MED-00005",
  ibuprofen: "MED-00006", diclofenac: "MED-00007", paracetamol: "MED-00008", chlorhexidine: "MED-00009", nystatin: "MED-00010",
};

const medicines: MockDoc[] = [
  { name: M.amoxicillin, medicine_name: "Amoxicillin", strength: "500 mg", dosage_form: "Capsule", medicine_group: "Antibiotic", default_dose: "500 mg", default_frequency: "Three times a day", default_duration_days: 5, default_instructions: "بعد الأكل", allergy_words: "penicillin, amoxicillin, amoxil, augmentin, بنسلين, أموكسيسيلين, اموكسيسيلين, أوجمنتين", is_nsaid: 0, avoid_in_pregnancy: 0, max_daily_mg: 0, child_note: "دون 12 سنة: 25-50 mg/kg في اليوم على 3 جرعات (معلّق 250 mg/5 ml).", is_active: 1 },
  { name: M.augmentin, medicine_name: "Amoxicillin + clavulanic acid", strength: "625 mg", dosage_form: "Tablet", medicine_group: "Antibiotic", default_dose: "625 mg", default_frequency: "Three times a day", default_duration_days: 5, default_instructions: "بعد الأكل", allergy_words: "penicillin, amoxicillin, augmentin, clavulanate, بنسلين, أموكسيسيلين, اموكسيسيلين, أوجمنتين", is_nsaid: 0, avoid_in_pregnancy: 0, max_daily_mg: 0, child_note: "دون 12 سنة: المعلّق حسب الوزن.", is_active: 1 },
  { name: M.metronidazole, medicine_name: "Metronidazole", strength: "500 mg", dosage_form: "Tablet", medicine_group: "Antibiotic", default_dose: "500 mg", default_frequency: "Three times a day", default_duration_days: 5, default_instructions: "بعد الأكل. لا كحول خلال العلاج وليومين بعده.", allergy_words: "metronidazole, flagyl, ميترونيدازول, فلاجيل", is_nsaid: 0, avoid_in_pregnancy: 1, max_daily_mg: 0, child_note: "دون 12 سنة: 7.5 mg/kg للجرعة، 3 مرات في اليوم.", is_active: 1 },
  { name: M.clindamycin, medicine_name: "Clindamycin", strength: "300 mg", dosage_form: "Capsule", medicine_group: "Antibiotic", default_dose: "300 mg", default_frequency: "Four times a day", default_duration_days: 5, default_instructions: "مع كوب ماء كامل", allergy_words: "clindamycin, lincomycin, كليندامايسين", is_nsaid: 0, avoid_in_pregnancy: 0, max_daily_mg: 0, child_note: "دون 12 سنة: 10-20 mg/kg في اليوم على 3-4 جرعات.", is_active: 1 },
  { name: M.azithromycin, medicine_name: "Azithromycin", strength: "500 mg", dosage_form: "Tablet", medicine_group: "Antibiotic", default_dose: "500 mg", default_frequency: "Once a day", default_duration_days: 3, default_instructions: "قبل الأكل بساعة", allergy_words: "azithromycin, erythromycin, macrolide, أزيثرومايسين, ازيثرومايسين, إريثرومايسين", is_nsaid: 0, avoid_in_pregnancy: 0, max_daily_mg: 0, child_note: "دون 12 سنة: 10 mg/kg مرة في اليوم (معلّق 200 mg/5 ml).", is_active: 1 },
  { name: M.ibuprofen, medicine_name: "Ibuprofen", strength: "400 mg", dosage_form: "Tablet", medicine_group: "Painkiller", default_dose: "400 mg", default_frequency: "Three times a day", default_duration_days: 3, default_instructions: "بعد الأكل", allergy_words: "ibuprofen, brufen, nsaid, aspirin, diclofenac, إيبوبروفين, بروفين, أسبرين, اسبرين, ديكلوفيناك", is_nsaid: 1, avoid_in_pregnancy: 1, max_daily_mg: 2400, child_note: "دون 12 سنة: 5-10 mg/kg للجرعة، حتى 3 مرات في اليوم (معلّق 100 mg/5 ml).", is_active: 1 },
  { name: M.diclofenac, medicine_name: "Diclofenac", strength: "50 mg", dosage_form: "Tablet", medicine_group: "Painkiller", default_dose: "50 mg", default_frequency: "Three times a day", default_duration_days: 3, default_instructions: "بعد الأكل", allergy_words: "diclofenac, voltaren, nsaid, aspirin, ibuprofen, ديكلوفيناك, فولتارين, أسبرين, اسبرين, إيبوبروفين", is_nsaid: 1, avoid_in_pregnancy: 1, max_daily_mg: 150, child_note: "لا يُعطى للأطفال دون 12 سنة.", is_active: 1 },
  { name: M.paracetamol, medicine_name: "Paracetamol", strength: "500 mg", dosage_form: "Tablet", medicine_group: "Painkiller", default_dose: "500 mg", default_frequency: "Every 6 hours", default_duration_days: 3, default_instructions: "حتى 8 حبات في اليوم", allergy_words: "paracetamol, acetaminophen, panadol, باراسيتامول, بنادول", is_nsaid: 0, avoid_in_pregnancy: 0, max_daily_mg: 4000, child_note: "دون 12 سنة: 15 mg/kg للجرعة، حتى 4 مرات في اليوم (شراب 120 mg/5 ml).", is_active: 1 },
  { name: M.chlorhexidine, medicine_name: "Chlorhexidine", strength: "0.12%", dosage_form: "Mouthwash", medicine_group: "Mouthwash", default_dose: "10 ml", default_frequency: "Twice a day", default_duration_days: 7, default_instructions: "مضمضة لمدة دقيقة ثم البصق. لا أكل ولا شرب لمدة 30 دقيقة بعدها.", allergy_words: "chlorhexidine, كلورهيكسيدين", is_nsaid: 0, avoid_in_pregnancy: 0, max_daily_mg: 0, child_note: "دون 6 سنوات: لا يُنصح به (قد يُبلع).", is_active: 1 },
  { name: M.nystatin, medicine_name: "Nystatin", strength: "100,000 IU/ml", dosage_form: "Suspension", medicine_group: "Antifungal", default_dose: "1 ml", default_frequency: "Four times a day", default_duration_days: 7, default_instructions: "يُبقى في الفم دقيقة ثم يُبلع", allergy_words: "nystatin, نيستاتين", is_nsaid: 0, avoid_in_pregnancy: 0, max_daily_mg: 0, child_note: "", is_active: 1 },
];

/* Prescriptions written at earlier visits. Each row keeps the medicine's name as it was when it was written. */
const prescriptions: MockDoc[] = [
  {
    name: "RX-2026-00003", patient: P.hassan, doctor: D.noor, appointment: A(11), prescription_date: "2026-08-06", notes: "",
    medicines: [
      { medicine: M.metronidazole, medicine_name: "Metronidazole 500 mg", dose: "500 mg", frequency: "Three times a day", duration_days: 5, instructions: "بعد الأكل. لا كحول خلال العلاج وليومين بعده." },
      { medicine: M.paracetamol, medicine_name: "Paracetamol 500 mg", dose: "500 mg", frequency: "Every 6 hours", duration_days: 3, instructions: "حتى 8 حبات في اليوم" },
    ],
  },
  {
    name: "RX-2026-00002", patient: P.saad, doctor: D.haider, appointment: A(13), prescription_date: "2026-07-22",
    notes: "لا أسبرين ولا إيبوبروفين: المريض يتناول الوارفارين.",
    medicines: [
      { medicine: M.amoxicillin, medicine_name: "Amoxicillin 500 mg", dose: "500 mg", frequency: "Three times a day", duration_days: 5, instructions: "بعد الأكل" },
      { medicine: M.paracetamol, medicine_name: "Paracetamol 500 mg", dose: "500 mg", frequency: "Every 6 hours", duration_days: 3, instructions: "حتى 8 حبات في اليوم" },
      { medicine: M.chlorhexidine, medicine_name: "Chlorhexidine 0.12%", dose: "10 ml", frequency: "Twice a day", duration_days: 7, instructions: "مضمضة لمدة دقيقة ثم البصق. يبدأ في اليوم التالي للقلع." },
    ],
  },
  {
    name: "RX-2026-00001", patient: P.zahraa, doctor: D.noor, appointment: A(17), prescription_date: "2026-06-18", notes: "",
    medicines: [
      { medicine: M.clindamycin, medicine_name: "Clindamycin 300 mg", dose: "300 mg", frequency: "Four times a day", duration_days: 5, instructions: "مع كوب ماء كامل" },
      { medicine: M.ibuprofen, medicine_name: "Ibuprofen 400 mg", dose: "400 mg", frequency: "Three times a day", duration_days: 3, instructions: "بعد الأكل" },
    ],
  },
];

/**
 * Earlier changes, like the Version records Frappe keeps for doctypes with Track Changes on, so the History card
 * has something to show. `data.changed` rows are [field, old value, new value].
 */
const versions: MockDoc[] = [
  {
    name: "VER-00003", ref_doctype: "Payment", docname: "PAY-2026-00001", owner: "laith.hamid@dentclinic.test",
    creation: "2026-08-21 09:12:40",
    data: JSON.stringify({ changed: [["amount", 150000, 100000], ["notes", "", "عربون تاج الزركونيا."]] }),
  },
  {
    name: "VER-00002", ref_doctype: "Payment", docname: "PAY-2026-00001", owner: "dalia.jawad@dentclinic.test",
    creation: "2026-08-20 11:04:05",
    data: JSON.stringify({ changed: [["payment_method", "Cash", "Bank Transfer"]] }),
  },
  {
    name: "VER-00001", ref_doctype: "Treatment Plan", docname: T(2), owner: "zainab.alhashimi@dentclinic.test",
    creation: "2026-08-20 11:40:00",
    data: JSON.stringify({ changed: [["total_cost", 180000, 200000], ["treatment_notes", "", "تاج زركونيا، أُخذت الطبعة في 20 آب 2026."]] }),
  },
];

/** X-rays and photos (the drawn demo pictures in public/demo/xrays). */
const IMG = (n: number) => `IMG-2026-${String(n).padStart(5, "0")}`;
const dentalImages: MockDoc[] = [
  {
    name: IMG(1), patient: P.zahraa, image: "/demo/xrays/periapical-36-before.svg", file_name: "periapical-36-before.png",
    image_type: "Periapical", taken_on: "2026-06-18", teeth: "36",
    description: "تسوس عميق في الجهة البعيدة من 36 قريب من اللب. منطقة داكنة عند ذروة الجذر الأنسي.",
    annotations: JSON.stringify({
      version: 1, aspect: 4 / 3,
      shapes: [
        { kind: "circle", color: "#ef4444", width: 4, center: [0.68, 0.23], radius: 0.1 },
        { kind: "arrow", color: "#facc15", width: 4, from: [0.2, 0.93], to: [0.36, 0.88] },
        { kind: "text", color: "#facc15", at: [0.08, 0.97], text: "آفة", size: 0.06 },
      ],
    }),
  },
  {
    name: IMG(2), patient: P.zahraa, image: "/demo/xrays/panoramic.svg", file_name: "opg-2026-06.png",
    image_type: "Panoramic (OPG)", taken_on: "2026-06-18", teeth: "",
    description: "الفم كاملًا قبل العلاج.",
  },
  {
    name: IMG(3), patient: P.zahraa, image: "/demo/xrays/periapical-36-after.svg", file_name: "periapical-36-after.png",
    image_type: "Periapical", taken_on: "2026-06-25", teeth: "36",
    description: "بعد علاج العصب: القناتان محشوتان حتى الذروة.",
  },
  {
    name: IMG(4), patient: P.zahraa, image: "/demo/xrays/bitewing-left.svg", file_name: "bitewing-left.png",
    image_type: "Bitewing", taken_on: "2026-08-20", teeth: "26,27,36,37",
    description: "الجهة اليسرى. تسوس صغير في 37.",
  },
  {
    name: IMG(5), patient: P.zahraa, image: "/demo/xrays/intraoral-photo.svg", file_name: "photo-36.jpg",
    image_type: "Intraoral photo", taken_on: "2026-08-20", teeth: "36",
    description: "تحضير التاج على 36.",
  },
  {
    name: IMG(6), patient: P.abbas, image: "/demo/xrays/periapical-46-implant.svg", file_name: "implant-46.png",
    image_type: "Periapical", taken_on: "2026-08-11", teeth: "46",
    description: "زرعة في 46، بعد أسبوع من وضعها.",
  },
];

/**
 * Deleted records, the way Frappe keeps them (Deleted Document): the whole record as JSON, who deleted it and when,
 * and whether it was restored. Two seed ones: an appointment booked twice and a payment entered twice.
 */
const deletedDocuments: MockDoc[] = [
  {
    name: "DEL-00002", deleted_doctype: "Payment", deleted_name: "PAY-2026-00018", restored: 0, new_name: "",
    owner: "laith.hamid@dentclinic.test", creation: "2026-09-21 09:05:00", modified: "2026-09-21 09:05:00", modified_by: "laith.hamid@dentclinic.test",
    data: JSON.stringify({
      name: "PAY-2026-00018", doctype: "Payment", patient: P.yousif, patient_name: "يوسف ستار", treatment_plan: T(15), treatment_type: "Filling",
      payment_date: "2026-09-20", amount: 10000, payment_method: "Cash", notes: "أُدخلت مرتين بالخطأ.",
      owner: "dalia.jawad@dentclinic.test", creation: "2026-09-20 11:40:00",
    }),
  },
  {
    name: "DEL-00001", deleted_doctype: "Appointment", deleted_name: "APT-2026-00025", restored: 0, new_name: "",
    owner: "dalia.jawad@dentclinic.test", creation: "2026-09-19 12:10:00", modified: "2026-09-19 12:10:00", modified_by: "dalia.jawad@dentclinic.test",
    data: JSON.stringify({
      name: "APT-2026-00025", doctype: "Appointment", patient: P.hassan, patient_name: "حسن فليح", doctor: D.noor, doctor_name: "د. نور الساعدي",
      appointment_date: "2026-09-29", appointment_time: "11:00", duration_minutes: 30, status: "Scheduled",
      reason_for_visit: "علاج العصب، الجلسة 3", notes: "حُجز مرتين بالخطأ.", arrived_at: null, in_chair_at: null,
      owner: "dalia.jawad@dentclinic.test", creation: "2026-09-19 12:05:00",
    }),
  },
];

/**
 * For tests only: `window.__mockNewClinic = true` (set before the app loads) makes the clinic brand new, its first-run
 * setup never started, so the manager is sent to the setup wizard. Nothing in the app sets it.
 */
if (typeof window !== "undefined" && (window as unknown as { __mockNewClinic?: boolean }).__mockNewClinic) {
  clinicSettings[0].setup_status = "";
  clinicSettings[0].setup_step = 0;
}

const store: Store = {
  Patient: patients,
  Doctor: doctors,
  Appointment: appointments,
  "Treatment Plan": treatmentPlans,
  "Treatment Session": sessions,
  Payment: payments,
  Expense: expenses,
  User: users,
  "Clinic Permission": clinicPermissions,
  "Clinic Settings": clinicSettings,
  "WhatsApp Template": whatsappTemplates,
  "WhatsApp Log": whatsappLogs,
  "Cash Count": cashCounts,
  "Dental Medicine": medicines,
  Prescription: prescriptions,
  "Dental Image": dentalImages,
  Version: versions,
  "Deleted Document": deletedDocuments,
  File: [],
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
  Expense: { prefix: "EXP", year: true },
  "WhatsApp Template": { prefix: "WAT", year: false },
  "WhatsApp Log": { prefix: "WAL", year: true },
  File: { prefix: "FILE", year: false },
  Version: { prefix: "VER", year: false },
  "Cash Count": { prefix: "CC", year: true },
  "Dental Medicine": { prefix: "MED", year: false },
  Prescription: { prefix: "RX", year: true },
  "Dental Image": { prefix: "IMG", year: true },
  "Deleted Document": { prefix: "DEL", year: false },
};

/** Which doctypes link to which, so a delete can be refused the way Frappe refuses it. */
const LINKED_FROM: Record<string, Array<[doctype: string, field: string]>> = {
  Patient: [
    ["Appointment", "patient"], ["Treatment Plan", "patient"], ["Treatment Session", "patient"],
    ["Payment", "patient"], ["WhatsApp Log", "patient"], ["Prescription", "patient"], ["Dental Image", "patient"],
  ],
  Doctor: [["Appointment", "doctor"], ["Treatment Plan", "doctor"], ["Treatment Session", "doctor"], ["Prescription", "doctor"], ["Expense", "doctor"]],
  "Treatment Plan": [["Payment", "treatment_plan"], ["Treatment Session", "treatment_plan"]],
  Appointment: [["WhatsApp Log", "appointment"], ["Prescription", "appointment"]],
};

const NUMBER_FIELDS = [
  "total_cost", "amount", "exchange_rate", "duration_minutes", "age", "enabled", "is_active",
  "opening_float", "cash_payments", "expected_cash", "cash_counted", "difference",
  "recall_interval_months", "no_recall",
  "default_duration_days", "max_daily_mg", "is_nsaid", "avoid_in_pregnancy",
  "rx_preprinted", "rx_top_mm", "rx_bottom_mm",
];

const num = (value: MockValue): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clone = <T>(value: T): T => structuredClone(value);

/** Counts saves, so two in the same second still get different times (Frappe keeps microseconds). */
let saves = 0;

/** Now, the way Frappe writes it: "2026-09-26 08:30:00.000001", different on every call. */
function stamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  saves += 1;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return `${todayISO()} ${time}.${String(saves % 1_000_000).padStart(6, "0")}`;
}

/** The logged-in user, who owns new records and makes the changes (see setSessionUser in frappe.ts). */
let actingUser = "Administrator";

/** Who the dummy back end acts as (setMockUser). */
export function mockActingUser(): string {
  return actingUser;
}

export function setMockUser(user: string | null): void {
  actingUser = user || "Guest";
}

/** Like Frappe, every record has every field: 0 for numbers and checks, null for the rest, unless set. */
const DEFAULTS: Record<string, Record<string, MockValue>> = {
  Patient: { next_recall_date: null, recall_interval_months: 0, no_recall: 0 },
  // The waiting room steps, set on the Today board.
  Appointment: { arrived_at: null, in_chair_at: null },
};

function applyDefaults(doctype: string, doc: MockDoc): void {
  Object.entries(DEFAULTS[doctype] ?? {}).forEach(([field, value]) => {
    if (doc[field] === undefined) doc[field] = value;
  });
}

/** When and by whom the seed records were made: the front desk books and takes payments, the manager the rest. */
function stampSeeds(): void {
  const made: Record<string, (doc: MockDoc) => [string, string]> = {
    Patient: () => ["2025-11-02 09:15:00", "dalia.jawad@dentclinic.test"],
    Appointment: (doc) => [`${addDays(String(doc.appointment_date), -7)} 10:00:00`, "dalia.jawad@dentclinic.test"],
    "Treatment Plan": () => ["2026-06-01 12:00:00", "laith.hamid@dentclinic.test"],
    Payment: (doc) => [`${doc.payment_date} 10:30:00`, "dalia.jawad@dentclinic.test"],
    Expense: (doc) => [`${doc.expense_date} 16:00:00`, "laith.hamid@dentclinic.test"],
    // The doctor who wrote it, at the end of the visit.
    Prescription: (doc) => [
      `${doc.prescription_date} 11:00:00`,
      String(store.Doctor.find((row) => row.name === doc.doctor)?.email ?? "Administrator"),
    ],
  };
  Object.keys(DEFAULTS).forEach((doctype) => store[doctype].forEach((doc) => applyDefaults(doctype, doc)));
  Object.entries(made).forEach(([doctype, when]) => {
    store[doctype].forEach((doc) => {
      if (doc.creation) return;
      const [creation, owner] = when(doc);
      Object.assign(doc, { creation, owner, modified: creation, modified_by: owner });
    });
  });
}

/** Two stored values count as the same when they print the same (null, undefined and "" are all empty). */
const sameValue = (a: MockValue, b: MockValue) => JSON.stringify(a ?? "") === JSON.stringify(b ?? "");

/** Names copied from a Link when it changes; Frappe's diff lists them too. */
const COPIED_LABELS = ["patient_name", "doctor_name", "treatment_type"];

/**
 * Records a save of a tracked doctype the way Frappe's Version does: the fields that were sent and changed, and
 * the names copied from a changed Link. Call it after recalculate(), with a copy of the doc from before the save.
 */
function trackChanges(doctype: string, before: MockDoc, after: MockDoc, sent: Record<string, MockValue>): void {
  if (!(TRACKED_DOCTYPES as readonly string[]).includes(doctype)) return;
  const fields = [...new Set([...Object.keys(sent), ...COPIED_LABELS.filter((field) => field in before || field in after)])];
  const changed = fields
    .filter((field) => field !== "name" && !sameValue(before[field], after[field]))
    .map((field) => [field, clone(before[field] ?? null), clone(after[field] ?? null)]);
  if (changed.length === 0) return;
  collection("Version").unshift({
    name: nextName("Version", {}),
    ref_doctype: doctype,
    docname: before.name,
    owner: actingUser,
    creation: stamp(),
    data: JSON.stringify({ changed }),
  });
}

function collection(doctype: string): MockDoc[] {
  if (!store[doctype]) store[doctype] = [];
  return store[doctype];
}

function find(doctype: string, name: MockValue): MockDoc | undefined {
  return collection(doctype).find((doc) => doc.name === name);
}

/* Two currencies: the clinic's own (Clinic Settings.currency) and a second one, at the rate of the day. */
function settingsDoc(): MockDoc {
  return store["Clinic Settings"][0] ?? {};
}
function mainCurrency(): string {
  return String(settingsDoc().currency || "IQD").toUpperCase();
}
function rates(): ExchangeRate[] {
  return (Array.isArray(settingsDoc().exchange_rates) ? settingsDoc().exchange_rates : []) as unknown as ExchangeRate[];
}
function currencyOfDoc(doc: MockDoc | undefined): string {
  return String(doc?.currency || mainCurrency()).toUpperCase();
}
/** The rate a payment uses: its own (kept from the day it was made), else the day's rate. */
function paymentRate(pay: MockDoc): number | null {
  return num(pay.exchange_rate) > 0 ? num(pay.exchange_rate) : rateOn(rates(), String(pay.payment_date || todayISO()));
}
/** The rate an expense uses: its own, else the rate of its day. */
function expenseRate(expense: MockDoc): number | null {
  return num(expense.exchange_rate) > 0 ? num(expense.exchange_rate) : rateOn(rates(), String(expense.expense_date || todayISO()));
}
/** What a payment takes off its plan, in the plan's currency. */
function planAmount(pay: MockDoc, plan: MockDoc): number {
  return convertMoney(num(pay.amount), currencyOfDoc(pay), currencyOfDoc(plan), paymentRate(pay), mainCurrency()) ?? 0;
}

/** Rebuild every field the real backend would compute or fetch, so the data stays self-consistent. */
function recalculate(): void {
  const patientsById = new Map(store.Patient.map((doc) => [doc.name, doc]));
  const doctorsById = new Map(store.Doctor.map((doc) => [doc.name, doc]));
  const plansById = new Map(store["Treatment Plan"].map((doc) => [doc.name, doc]));

  // "Fetch from" fields: link labels copied onto the linking doc.
  ["Appointment", "Treatment Plan", "Treatment Session", "Payment", "WhatsApp Log", "Prescription", "Dental Image"].forEach((doctype) => {
    collection(doctype).forEach((doc) => {
      doc.patient_name = patientsById.get(String(doc.patient))?.full_name ?? "";
      if (doctype !== "Payment" && doctype !== "WhatsApp Log") {
        doc.doctor_name = doc.doctor ? doctorsById.get(String(doc.doctor))?.full_name ?? "" : "";
      }
    });
  });
  store.Expense.forEach((expense) => {
    expense.doctor_name = expense.doctor ? doctorsById.get(String(expense.doctor))?.full_name ?? "" : "";
    expense.base_amount = convertMoney(num(expense.amount), currencyOfDoc(expense), mainCurrency(), expenseRate(expense), mainCurrency()) ?? 0;
  });
  store["Cash Count"].forEach((count) => {
    const user = store.User.find((row) => row.name === count.counted_by);
    count.counted_by_name = user ? String(user.full_name || user.name) : String(count.counted_by ?? "");
  });
  const main = mainCurrency();
  store.Payment.forEach((pay) => {
    const plan = pay.treatment_plan ? plansById.get(String(pay.treatment_plan)) : undefined;
    pay.treatment_type = plan?.treatment_type ?? "";
    pay.plan_amount = plan ? planAmount(pay, plan) : null;
    pay.base_amount = convertMoney(num(pay.amount), currencyOfDoc(pay), main, paymentRate(pay), main) ?? 0;
  });
  // A payment in another currency that settles a plan may be a little over what was left (a cent cannot be split):
  // it takes off only what was left, in payment order.
  store["Treatment Plan"].forEach((plan) => {
    let running = 0;
    store.Payment
      .filter((pay) => pay.treatment_plan === plan.name)
      .sort((a, b) => String(a.payment_date).localeCompare(String(b.payment_date)) || String(a.name).localeCompare(String(b.name)))
      .forEach((pay) => {
        if (currencyOfDoc(pay) !== currencyOfDoc(plan)) {
          pay.plan_amount = roundMoney(Math.max(0, Math.min(num(pay.plan_amount), num(plan.total_cost) - running)), currencyOfDoc(plan));
        }
        running += num(pay.plan_amount);
      });
  });
  // The medicine names in one line, for lists (Frappe's list API does not return child tables).
  store.Prescription.forEach((rx) => {
    const rows = Array.isArray(rx.medicines) ? (rx.medicines as Array<{ medicine_name?: MockValue }>) : [];
    rx.summary = rows.map((row) => String(row.medicine_name ?? "")).filter(Boolean).join(", ");
  });

  store["Treatment Plan"].forEach((plan) => {
    const code = currencyOfDoc(plan);
    const paid = roundMoney(
      store.Payment.filter((pay) => pay.treatment_plan === plan.name).reduce((sum, pay) => sum + num(pay.plan_amount), 0),
      code,
    );
    plan.paid_amount = paid;
    plan.remaining_amount =
      plan.status === "Cancelled" ? 0 : Math.max(0, roundMoney(num(plan.total_cost) - paid, code));
  });
  // A patient's totals are in the clinic's own currency; what is left on a dollar plan counts at today's rate.
  const today = rateOn(rates(), todayISO());

  store.Patient.forEach((patient) => {
    const plans = store["Treatment Plan"].filter((plan) => plan.patient === patient.name);
    patient.total_treatments = plans.length;
    patient.total_appointments = store.Appointment.filter((a) => a.patient === patient.name).length;
    patient.total_paid = roundMoney(
      store.Payment.filter((pay) => pay.patient === patient.name).reduce((sum, pay) => sum + num(pay.base_amount), 0),
      main,
    );
    patient.total_remaining = roundMoney(
      plans.reduce((sum, plan) => sum + (convertMoney(num(plan.remaining_amount), currencyOfDoc(plan), main, today, main) ?? 0), 0),
      main,
    );
  });
}

/**
 * SQL LIKE, as MariaDB does it for Frappe (utf8mb4_unicode_ci): % is any text, _ is one character, case does
 * not matter, and Arabic digits equal 0-9. Compare it with toLatinDigits(value).
 */
function likePattern(expected: unknown): RegExp {
  const source = toLatinDigits(String(expected))
    .split("")
    .map((char) => (char === "%" ? "[\\s\\S]*" : char === "_" ? "[\\s\\S]" : char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("");
  return new RegExp(`^${source}$`, "i");
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
    case "like":
      return likePattern(expected).test(toLatinDigits(left));
    case "not like":
      return !likePattern(expected).test(toLatinDigits(left));
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
  // Like Frappe's naming series, the counter never goes back: a deleted record's number is not given out again.
  const taken = [
    ...collection(doctype).map((doc) => doc.name),
    ...store["Deleted Document"].filter((deleted) => deleted.deleted_doctype === doctype).map((deleted) => String(deleted.deleted_name)),
  ];
  const highest = taken.reduce((max, name) => {
    if (!name.startsWith(prefix)) return max;
    const parsed = Number(name.slice(prefix.length));
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

/**
 * Mirrors Payment.validate() and Treatment Plan.validate(): a payment in a currency the clinic takes, the day's
 * rate kept on it when two currencies meet, and paid never above the total cost (in the plan's currency).
 * The rate is the server's: the one in Clinic Settings for the payment's day. An edit that keeps the day, the
 * currency and the plan keeps the rate the payment already had.
 */
function checkPayment(payment: MockDoc, before?: MockDoc): void {
  if (num(payment.amount) <= 0) throw new Error(messages().errors.mock.amountAboveZero);
  const main = mainCurrency();
  const second = String(settingsDoc().second_currency || "").toUpperCase();
  const code = currencyOfDoc(payment);
  if (code !== main && code !== second) throw new Error(messages().errors.mock.currencyNotTaken(code));
  if (code === main) payment.currency = "";
  const plan = payment.treatment_plan ? find("Treatment Plan", payment.treatment_plan) : undefined;
  if (payment.treatment_plan && !plan) throw new Error("Treatment Plan " + payment.treatment_plan + " not found");
  // Two currencies meet: the rate of the payment's day, kept for good while its day, currency and plan stay.
  if (code !== main || (plan && currencyOfDoc(plan) !== main)) {
    const keep =
      before &&
      num(before.exchange_rate) > 0 &&
      before.payment_date === payment.payment_date &&
      currencyOfDoc(before) === code &&
      (before.treatment_plan || "") === (payment.treatment_plan || "");
    payment.exchange_rate = keep ? num(before.exchange_rate) : rateOn(rates(), String(payment.payment_date || todayISO()));
    if (!(num(payment.exchange_rate) > 0)) throw new Error(messages().errors.mock.noRate(second || code));
  } else {
    payment.exchange_rate = null;
  }
  // Worked out by the server only.
  delete payment.plan_amount;
  delete payment.base_amount;
  if (!plan) return;
  const planCode = currencyOfDoc(plan);
  const otherPayments = store.Payment
    .filter((pay) => pay.treatment_plan === plan.name && pay.name !== payment.name)
    .reduce((sum, pay) => sum + num(pay.plan_amount), 0);
  const paid = roundMoney(otherPayments + planAmount(payment, plan), planCode);
  const tolerance = settleTolerance(code, planCode, num(payment.exchange_rate), main);
  if (paid > num(plan.total_cost) + tolerance + 0.004) {
    throw new Error(messages().errors.mock.paidAboveCost(String(paid), String(num(plan.total_cost)), String(plan.name)));
  }
}

/**
 * Mirrors what Expense.validate() should do: a date, a category, an amount above zero in a currency the clinic
 * takes, and the rate of its day (kept while the day and currency stay) when it is in the second currency.
 */
function checkExpense(expense: MockDoc, before?: MockDoc): void {
  const e = messages().errors.mock;
  if (!expense.expense_date) throw new Error(e.expenseDate);
  if (!expense.category) throw new Error(e.expenseCategory);
  if (num(expense.amount) <= 0) throw new Error(e.amountAboveZero);
  const main = mainCurrency();
  const second = String(settingsDoc().second_currency || "").toUpperCase();
  const code = currencyOfDoc(expense);
  if (code !== main && code !== second) throw new Error(e.currencyNotTaken(code));
  if (code === main) {
    expense.currency = "";
    expense.exchange_rate = null;
  } else {
    const keep = before && num(before.exchange_rate) > 0 && before.expense_date === expense.expense_date && currencyOfDoc(before) === code;
    expense.exchange_rate = keep ? num(before.exchange_rate) : rateOn(rates(), String(expense.expense_date));
    if (!(num(expense.exchange_rate) > 0)) throw new Error(e.noRate(code));
  }
  if (expense.doctor && !find("Doctor", expense.doctor)) throw new Error("Doctor " + expense.doctor + " not found");
  if (!expense.doctor) expense.doctor = null;
  delete expense.base_amount;
}

/**
 * Mirrors what Cash Count.validate() should do: one count per day, the day's Cash payments and the difference
 * worked out by the server, a note when the cash is short or over, and who counted it.
 */
function checkCashCount(count: MockDoc): void {
  if (!count.count_date) throw new Error(messages().errors.mock.countDay);
  if (count.cash_counted === undefined || count.cash_counted === null || count.cash_counted === "") throw new Error(messages().errors.mock.countCash);
  const sameDay = store["Cash Count"].find((other) => other.count_date === count.count_date && other.name !== count.name);
  if (sameDay) throw new Error(messages().errors.mock.countTwice(String(count.count_date), String(sameDay.name)));
  // The drawer is counted in the clinic's own currency: cash in the second currency is kept apart.
  const cash = store.Payment
    .filter((pay) => pay.payment_date === count.count_date && pay.payment_method === "Cash" && currencyOfDoc(pay) === mainCurrency())
    .reduce((sum, pay) => sum + num(pay.amount), 0);
  count.opening_float = num(count.opening_float);
  count.cash_payments = cash;
  count.expected_cash = num(count.opening_float) + cash;
  count.difference = Math.round((num(count.cash_counted) - num(count.expected_cash)) * 100) / 100;
  if (Math.abs(num(count.difference)) >= 0.005 && !String(count.note ?? "").trim()) {
    throw new Error(messages().errors.mock.countNote);
  }
  const user = store.User.find((row) => row.name === count.counted_by);
  count.counted_by_name = user ? String(user.full_name || user.name) : String(count.counted_by ?? "");
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  count.counted_at = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/**
 * Mirrors what Appointment.on_update should do: a completed visit moves the patient's next check-up to the
 * visit date plus the dentist's interval, never earlier than the date already set.
 */
function rollRecall(appointment: MockDoc, before?: MockDoc): void {
  if (appointment.status !== "Completed" || before?.status === "Completed" || !appointment.appointment_date) return;
  const patient = find("Patient", appointment.patient);
  const months = num(patient?.recall_interval_months ?? 0);
  if (!patient || months <= 0 || num(patient.no_recall ?? 0) === 1) return;
  const next = addMonths(String(appointment.appointment_date), months);
  if (patient.next_recall_date && next <= String(patient.next_recall_date)) return;
  // A real change to the patient, saved and recorded like any other (the totals are not; see recalculate).
  const wasPatient = clone(patient);
  patient.next_recall_date = next;
  patient.modified = stamp();
  patient.modified_by = actingUser;
  trackChanges("Patient", wasPatient, patient, { next_recall_date: next });
}

function checkPlan(plan: MockDoc, before?: MockDoc): void {
  // The clinic's own currency (kept as "") or its second one.
  const code = currencyOfDoc(plan);
  const second = String(settingsDoc().second_currency || "").toUpperCase();
  if (code !== mainCurrency() && code !== second) throw new Error(messages().errors.mock.currencyNotTaken(code));
  if (code === mainCurrency()) plan.currency = "";
  const payments = store.Payment.filter((pay) => pay.treatment_plan === plan.name);
  // Its payments were counted in the plan's currency: it cannot change under them.
  if (before && payments.length && currencyOfDoc(plan) !== currencyOfDoc(before)) {
    throw new Error(messages().errors.mock.planCurrencyLocked);
  }
  const paid = roundMoney(payments.reduce((sum, pay) => sum + num(pay.plan_amount), 0), currencyOfDoc(plan));
  if (paid > num(plan.total_cost) + 0.004) {
    throw new Error(messages().errors.mock.costBelowPaid(String(paid), String(num(plan.total_cost))));
  }
}

/**
 * Mirrors what Clinic Settings.validate() should do for the two currencies: a second currency that is not the
 * clinic's own, rates with a date and an amount above zero (one per date, at least one), and no change to a
 * currency that plans or payments are already in.
 */
function checkSettings(next: MockDoc, before: MockDoc): void {
  const e = messages().errors.mock;
  const main = String(next.currency || "IQD").toUpperCase();
  const wasMain = String(before.currency || "IQD").toUpperCase();
  const second = String(next.second_currency || "").toUpperCase();
  const wasSecond = String(before.second_currency || "").toUpperCase();
  if (second === main) next.second_currency = "";
  const inUse = (code: string) =>
    code !== "" &&
    (store["Treatment Plan"].some((plan) => String(plan.currency || "").toUpperCase() === code) ||
      store.Payment.some((pay) => String(pay.currency || "").toUpperCase() === code) ||
      store.Expense.some((expense) => String(expense.currency || "").toUpperCase() === code));
  if (main !== wasMain && (store["Treatment Plan"].length > 0 || store.Payment.length > 0 || store.Expense.length > 0)) throw new Error(e.mainInUse);
  if (wasSecond && String(next.second_currency || "").toUpperCase() !== wasSecond && inUse(wasSecond)) throw new Error(e.secondInUse(wasSecond));
  const rows = (Array.isArray(next.exchange_rates) ? next.exchange_rates : []) as unknown as ExchangeRate[];
  const dates = rows.map((row) => String(row.rate_date || ""));
  const bad = rows.some((row) => !row.rate_date || !(Number(row.rate) > 0)) || new Set(dates).size !== dates.length;
  if (bad || (next.second_currency && rows.length === 0)) throw new Error(e.ratesInvalid);
}

/**
 * For tests only: `window.__mockFail = ["Patient"]` makes every read of those doctypes fail, like a lost
 * connection, so error states can be checked. Nothing in the app sets it.
 */
function failIfAsked(doctype: string) {
  const failing = typeof window === "undefined" ? undefined : (window as unknown as { __mockFail?: string[] }).__mockFail;
  if (failing?.includes(doctype)) throw new Error(messages().errors.noConnection);
}

/**
 * A short pause so loading states behave like they will against the real backend. For tests and screenshots,
 * `window.__mockLatency = 5000` makes every call slower, so a loading state stays on screen.
 */
const latency = () => {
  const slow = typeof window === "undefined" ? undefined : (window as unknown as { __mockLatency?: number }).__mockLatency;
  return new Promise((resolve) => setTimeout(resolve, typeof slow === "number" ? slow : 150));
};

stampSeeds();
recalculate();

/* ------------------------------------------------------------------ api --- */

export async function mockGetList(
  doctype: string,
  fields?: string[],
  options: MockListOptions = {},
): Promise<MockDoc[]> {
  failIfAsked(doctype);
  await latency();
  const { filters, orFilters, orderBy, limit, start = 0 } = options;
  const rows = sortDocs(query(doctype, filters, orFilters), orderBy);
  const page = limit && limit > 0 ? rows.slice(start, start + limit) : rows.slice(start);
  return page.map((doc) => project(doc, fields));
}

export async function mockGetCount(doctype: string, filters?: unknown, orFilters?: unknown): Promise<number> {
  failIfAsked(doctype);
  await latency();
  return query(doctype, filters, orFilters).length;
}

export async function mockGetDoc(doctype: string, name: string): Promise<MockDoc> {
  failIfAsked(doctype);
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
  const now = stamp();
  Object.assign(doc, { owner: actingUser, creation: now, modified: now, modified_by: actingUser });
  applyDefaults(doctype, doc);

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
  if (doctype === "Expense") checkExpense(doc);
  if (doctype === "Treatment Plan") checkPlan(doc);
  if (doctype === "Cash Count") checkCashCount(doc);
  if (doctype === "Appointment") rollRecall(doc);

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
  next.modified = stamp();
  next.modified_by = actingUser;
  if (doctype === "Patient") {
    if ("date_of_birth" in data && !("age" in data)) next.age = ageFrom(data.date_of_birth);
    if ("dental_chart" in data) next.dental_chart = jsonField(data.dental_chart);
  }
  if (doctype === "User" && ("first_name" in data || "last_name" in data) && !("full_name" in data)) {
    next.full_name = [next.first_name, next.last_name].filter(Boolean).join(" ");
  }
  if (doctype === "Payment") checkPayment(next, doc);
  if (doctype === "Expense") checkExpense(next, doc);
  if (doctype === "Treatment Plan") checkPlan(next, doc);
  if (doctype === "Clinic Settings") checkSettings(next, doc);
  if (doctype === "Cash Count") checkCashCount(next);
  if (doctype === "Appointment") rollRecall(next, doc);

  const before = clone(doc);
  Object.keys(doc).forEach((key) => delete doc[key]);
  Object.assign(doc, next);
  recalculate();
  trackChanges(doctype, before, doc, data);
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
      const doctypes: Record<string, string> = messages().enums.doctype;
      throw new Error(
        messages().errors.mock.linked(doctypes[doctype] ?? doctype, name, doctypes[linkedDoctype] ?? linkedDoctype, String(linked.name)),
      );
    }
  }
  const [removed] = docs.splice(index, 1);
  // Like Frappe, a copy is kept in Deleted Document, so the record can be restored (its Versions stay too).
  if (!NOT_KEPT_WHEN_DELETED.includes(doctype)) {
    const now = stamp();
    store["Deleted Document"].unshift({
      name: nextName("Deleted Document", {}),
      deleted_doctype: doctype,
      deleted_name: name,
      data: JSON.stringify({ ...removed, doctype }),
      restored: 0,
      new_name: "",
      owner: actingUser,
      creation: now,
      modified: now,
      modified_by: actingUser,
    });
  }
  // Frappe deletes the files attached to a deleted record.
  store.File = store.File.filter((file) => !(file.attached_to_doctype === doctype && file.attached_to_name === name));
  recalculate();
}

/**
 * Like frappe.desk.form.load.getdoc: the document, its latest Version records (newest first) and the names of the
 * users involved (the owner, the last editor and the users in the versions).
 */
export async function mockGetDocInfo(
  doctype: string,
  name: string,
): Promise<{ docs: MockDoc[]; docinfo: { versions: MockDoc[]; user_info: Record<string, { fullname: string }> } }> {
  failIfAsked(doctype);
  await latency();
  const doc = find(doctype, name);
  if (!doc) throw new Error(doctype + " " + name + " not found");
  const found = sortDocs(query("Version", [["ref_doctype", "=", doctype], ["docname", "=", name]]), "creation desc")
    .slice(0, HISTORY_LIMIT)
    .map((version) => project(version, ["owner", "creation", "data"]));
  const user_info: Record<string, { fullname: string }> = {};
  [doc.owner, doc.modified_by, ...found.map((version) => version.owner)].map(String).filter(Boolean).forEach((user) => {
    const row = store.User.find((candidate) => candidate.name === user);
    user_info[user] = { fullname: row ? String(row.full_name || user) : user };
  });
  return { docs: [clone(doc)], docinfo: { versions: found, user_info } };
}

/** The few whitelisted methods the front end calls. */
export async function mockCall(method: string, args: Record<string, MockValue>): Promise<unknown> {
  await latency();
  if (method === "frappe.core.doctype.user.user.update_password") {
    if (!args.new_password) throw new Error(messages().errors.mock.newPassword);
    return "ok";
  }
  if (method === RESTORE_METHOD) return restoreDeleted(String(args.name ?? ""));
  throw new Error(messages().errors.mock.noMethod(method));
}

/** Kept out of Deleted Document: files, the history itself, and the deleted-record copies. */
const NOT_KEPT_WHEN_DELETED = ["File", "Version", "Deleted Document"];

/** Frappe's method that puts a deleted record back. */
const RESTORE_METHOD = "frappe.core.doctype.deleted_document.deleted_document.restore";

/** The Link fields a restored record may point at, to refuse one whose patient, plan … is gone. */
const RESTORE_LINKS: Array<[field: string, doctype: string]> = [
  ["patient", "Patient"], ["doctor", "Doctor"], ["treatment_plan", "Treatment Plan"], ["appointment", "Appointment"],
];

/**
 * Like Frappe's restore(): the record goes back under its own name, with the same checks as a new one, unless it was
 * restored already, its name is taken, or a record it links to is gone. Returns the restored record's name.
 */
function restoreDeleted(name: string): string {
  const e = messages().errors.mock;
  const deleted = find("Deleted Document", name);
  if (!deleted) throw new Error("Deleted Document " + name + " not found");
  if (Number(deleted.restored) === 1) throw new Error(e.alreadyRestored(String(deleted.deleted_name)));
  const doctype = String(deleted.deleted_doctype);
  const doc = JSON.parse(String(deleted.data)) as MockDoc;
  delete doc.doctype;
  if (find(doctype, doc.name)) throw new Error(e.nameTaken(doc.name));
  const doctypes: Record<string, string> = messages().enums.doctype;
  for (const [field, linked] of RESTORE_LINKS) {
    if (doc[field] && !find(linked, doc[field])) {
      throw new Error(e.restoreLinkGone(doctypes[linked] ?? linked, String(doc[field])));
    }
  }
  normalize(doc);
  if (doctype === "Payment") checkPayment(doc);
  if (doctype === "Treatment Plan") checkPlan(doc);
  if (doctype === "Expense") checkExpense(doc);
  if (doctype === "Cash Count") checkCashCount(doc);
  doc.modified = stamp();
  doc.modified_by = actingUser;
  collection(doctype).unshift(doc);
  Object.assign(deleted, { restored: 1, new_name: doc.name, modified: stamp(), modified_by: actingUser });
  recalculate();
  return doc.name;
}

/** Reads a file into a data URL, which works as an image src in the browser. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(messages().errors.mock.readFile));
    reader.readAsDataURL(file);
  });
}

/**
 * Pretends to send the file at about 4 MB a second, reporting progress the way a real upload does. For tests,
 * `window.__mockUploadMs = 3000` makes every upload take that long, so its progress bar stays on screen.
 */
async function sendSlowly(file: File, onProgress?: (fraction: number) => void) {
  const steps = 10;
  const forced = typeof window === "undefined" ? undefined : (window as unknown as { __mockUploadMs?: number }).__mockUploadMs;
  const total = forced ?? Math.min(4000, Math.max(150, file.size / 4000));
  for (let step = 1; step <= steps; step++) {
    await new Promise((resolve) => setTimeout(resolve, total / steps));
    onProgress?.(step / steps);
  }
}

export async function mockUpload(file: File, onProgress?: (fraction: number) => void): Promise<string> {
  await sendSlowly(file, onProgress);
  return readAsDataUrl(file);
}

/** Like Frappe's upload_file with doctype and docname: a private File record attached to the doc. */
export async function mockAttach(
  file: File,
  doctype: string,
  name: string,
  onProgress?: (fraction: number) => void,
): Promise<MockDoc> {
  await sendSlowly(file, onProgress);
  const url = await readAsDataUrl(file);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return mockCreateDoc("File", {
    file_name: file.name,
    file_url: url,
    is_private: 1,
    attached_to_doctype: doctype,
    attached_to_name: name,
    creation: `${todayISO()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  });
}
