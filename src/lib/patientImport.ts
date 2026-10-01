import { addDays } from "./format";
import { phoneDigits, samePhone, toLatinDigits } from "./phone";

/**
 * Importing patients from a spreadsheet (/patients/import): which column is which, turning cells into a Patient's
 * fields, and finding the rows that are already patients (the same phone number) or appear twice in the file.
 */

/** The Patient fields a column can fill, in the order they are offered. */
export const IMPORT_FIELDS = [
  "full_name",
  "phone_number",
  "secondary_phone",
  "gender",
  "date_of_birth",
  "age",
  "email",
  "address",
  "allergies",
  "current_medications",
  "chronic_diseases",
  "medical_history",
  "notes",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

/** Header words that mean a field, in English and Arabic (compared without case, spaces, dots or "ال"). */
const SYNONYMS: Record<ImportField, string[]> = {
  full_name: ["name", "full name", "patient", "patient name", "الاسم", "اسم المريض", "الاسم الكامل", "المريض", "الاسم الثلاثي"],
  phone_number: ["phone", "mobile", "phone number", "mobile number", "telephone", "tel", "cell", "الهاتف", "رقم الهاتف", "الموبايل", "رقم الموبايل", "الجوال", "موبايل", "هاتف", "الرقم"],
  secondary_phone: ["second phone", "phone 2", "other phone", "mobile 2", "secondary phone", "الهاتف الثاني", "هاتف ثان", "هاتف آخر", "رقم آخر", "رقم ثاني"],
  gender: ["gender", "sex", "الجنس"],
  date_of_birth: ["date of birth", "birth date", "dob", "birthday", "born", "تاريخ الميلاد", "المواليد", "الميلاد", "تولد"],
  age: ["age", "العمر", "السن"],
  email: ["email", "e-mail", "mail", "البريد", "البريد الإلكتروني", "الإيميل"],
  address: ["address", "city", "area", "العنوان", "المنطقة", "السكن", "المدينة"],
  allergies: ["allergies", "allergy", "الحساسية"],
  current_medications: ["medications", "medicines", "current medications", "drugs", "الأدوية", "الأدوية الحالية", "العلاج الحالي"],
  chronic_diseases: ["chronic diseases", "diseases", "conditions", "الأمراض المزمنة", "الأمراض"],
  medical_history: ["medical history", "history", "التاريخ المرضي", "السوابق المرضية"],
  notes: ["notes", "note", "comments", "remarks", "ملاحظات", "الملاحظات", "ملاحظة"],
};

const normalizeHeader = (text: string) =>
  toLatinDigits(text)
    .toLowerCase()
    .replace(/[\s._:\-()]+/g, " ")
    .trim()
    .replace(/^ال/, "");

/** The field each column most likely holds (or null), from its header; a field is given to one column only. */
export function guessColumns(headers: string[]): Array<ImportField | null> {
  const taken = new Set<ImportField>();
  return headers.map((header) => {
    const h = normalizeHeader(header);
    if (!h) return null;
    const exact = IMPORT_FIELDS.find((field) => !taken.has(field) && SYNONYMS[field].some((word) => normalizeHeader(word) === h));
    const field = exact ?? IMPORT_FIELDS.find((f) => !taken.has(f) && SYNONYMS[f].some((word) => h.includes(normalizeHeader(word))));
    if (field) taken.add(field);
    return field ?? null;
  });
}

/** "M", "male", "ذكر" → Male; "F", "female", "أنثى" → Female; anything else → "". */
export function readGender(value: string): "" | "Male" | "Female" {
  const v = value.trim().toLowerCase();
  if (["m", "male", "man", "ذكر", "رجل", "ذ"].includes(v)) return "Male";
  if (["f", "female", "woman", "أنثى", "انثى", "امرأة", "ا", "أ"].includes(v)) return "Female";
  return "";
}

/**
 * A date of birth as YYYY-MM-DD, or null when the cell is not a date: 1991-04-12, 1991/4/12, 12/04/1991 (the day
 * first, as in Iraq), 12-4-1991, 12.4.1991, or an Excel day number (33340). Arabic digits are read too.
 */
export function readDate(value: string): string | null {
  const v = toLatinDigits(value).trim();
  if (!v) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const valid = (y: number, m: number, d: number) => {
    const date = new Date(y, m - 1, d);
    return y >= 1900 && y <= 2100 && date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null;
  };
  let match = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) return valid(Number(match[1]), Number(match[2]), Number(match[3]));
  match = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (match) return valid(Number(match[3]), Number(match[2]), Number(match[1]));
  // Excel keeps a date as the number of days since 30 December 1899.
  if (/^\d{4,5}(\.\d+)?$/.test(v)) {
    const days = Math.floor(Number(v));
    if (days > 0 && days < 80000) return addDays("1899-12-30", days);
  }
  return null;
}

/** An age in years (0-120), or null. */
export function readAge(value: string): number | null {
  const v = toLatinDigits(value).trim();
  if (!/^\d{1,3}(\.\d+)?$/.test(v)) return null;
  const age = Math.floor(Number(v));
  return age >= 0 && age <= 120 ? age : null;
}

/** Why a row is not imported, or "ok". */
export type RowState = "ok" | "noName" | "noPhone" | "badPhone" | "badDate" | "existing" | "repeated";

export interface ImportRow {
  /** The row's number in the file (the header is row 1). */
  line: number;
  values: Partial<Record<ImportField, string>>;
  state: RowState;
  /** For "existing": the patient who has the phone already; for "repeated": the row it repeats. */
  match?: string;
  /** What will be saved (only for "ok" rows, or "existing" ones imported anyway). */
  payload?: Record<string, string | number | null>;
}

export interface ExistingPatient {
  name: string;
  full_name: string;
  phone_number?: string;
  secondary_phone?: string;
}

/**
 * The rows of the file as Patients, each with its state: missing a name or phone, a phone that is not one, a date
 * that is not one, a phone already registered (to an existing patient), or repeated in an earlier row of the file.
 */
export function checkRows(rows: string[][], columns: Array<ImportField | null>, existing: ExistingPatient[]): ImportRow[] {
  const seen: Array<{ phone: string; line: number }> = [];
  return rows.map((cells, index) => {
    const line = index + 2;
    const values: Partial<Record<ImportField, string>> = {};
    columns.forEach((field, c) => {
      const cell = (cells[c] ?? "").trim();
      if (field && cell) values[field] = cell;
    });
    const name = values.full_name ?? "";
    const phone = toLatinDigits(values.phone_number ?? "").trim();
    const row: ImportRow = { line, values, state: "ok" };
    if (!name) return { ...row, state: "noName" };
    if (!phone) return { ...row, state: "noPhone" };
    if (phoneDigits(phone).length < 7) return { ...row, state: "badPhone" };
    const birth = values.date_of_birth ? readDate(values.date_of_birth) : null;
    if (values.date_of_birth && !birth) return { ...row, state: "badDate" };

    const payload: Record<string, string | number | null> = {
      full_name: name,
      phone_number: phone,
      secondary_phone: toLatinDigits(values.secondary_phone ?? "").trim(),
      gender: readGender(values.gender ?? ""),
      date_of_birth: birth,
      email: values.email ?? "",
      address: values.address ?? "",
      allergies: values.allergies ?? "",
      current_medications: values.current_medications ?? "",
      chronic_diseases: values.chronic_diseases ?? "",
      medical_history: values.medical_history ?? "",
      notes: values.notes ?? "",
    };
    // The age only when there is no date of birth (the server works it out from the date).
    if (!birth && values.age) payload.age = readAge(values.age);

    const already = existing.find((p) => samePhone(p.phone_number, phone) || samePhone(p.secondary_phone, phone));
    if (already) return { ...row, payload, state: "existing", match: `${already.full_name} (${already.name})` };
    const repeated = seen.find((s) => samePhone(s.phone, phone));
    if (repeated) return { ...row, payload, state: "repeated", match: String(repeated.line) };
    seen.push({ phone, line });
    return { ...row, payload };
  });
}
