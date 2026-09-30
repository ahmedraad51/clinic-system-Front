/**
 * Prescriptions: the medicine list's defaults, and the safety warnings a dentist should see before signing.
 * The warnings come from what is already on the patient record (allergies, medicines, pregnancy, age) and from
 * a few flags on each medicine. They never stop a prescription from being saved: the dentist decides.
 */
import { messages } from "@/i18n";
import { isBlankMedicalText } from "./medical";
import { medicalFlags, type MedicalFields } from "./medical";
import { toLatinDigits } from "./phone";
import type { DentalMedicine, Patient, PrescriptionMedicine } from "./types";

/**
 * How often a medicine is taken, and how many times a day that is (0 when it cannot be counted). The value is
 * saved in English on each prescription row; show it with label(t.enums.frequency, value).
 */
export const FREQUENCIES: Array<{ value: string; perDay: number }> = [
  { value: "Once a day", perDay: 1 },
  { value: "Twice a day", perDay: 2 },
  { value: "Three times a day", perDay: 3 },
  { value: "Four times a day", perDay: 4 },
  { value: "Every 4 hours", perDay: 6 },
  { value: "Every 6 hours", perDay: 4 },
  { value: "Every 8 hours", perDay: 3 },
  { value: "Every 12 hours", perDay: 2 },
  { value: "When needed", perDay: 0 },
  { value: "Once only", perDay: 0 },
];

/** A patient younger than this gets the "check the dose for a child" warning. */
export const CHILD_AGE = 12;

/** Fields to load for the patient of a prescription (the alerts and the age). */
export const PRESCRIPTION_PATIENT_FIELDS = ["name", "full_name", "age", "allergies", "current_medications", "chronic_diseases", "medical_history", "notes"];

/** Fields of a Dental Medicine the form and the warnings read. */
export const MEDICINE_FIELDS = [
  "name", "medicine_name", "strength", "dosage_form", "medicine_group", "default_dose", "default_frequency", "default_duration_days",
  "default_instructions", "allergy_words", "is_nsaid", "avoid_in_pregnancy", "max_daily_mg", "child_note", "is_active",
];

export type PatientForPrescription = MedicalFields & Pick<Patient, "age"> & Partial<Pick<Patient, "full_name">>;

/** "Amoxicillin 500 mg" (the name and strength, without the form). */
export function medicineLabel(medicine: Pick<DentalMedicine, "medicine_name" | "strength">): string {
  return [medicine.medicine_name, medicine.strength].filter(Boolean).join(" ");
}

/** The row a chosen medicine starts with: its usual dose, frequency, duration and instructions. */
export function medicineDefaults(medicine: DentalMedicine): Omit<PrescriptionMedicine, "medicine" | "medicine_name"> {
  return {
    dose: medicine.default_dose ?? "",
    frequency: medicine.default_frequency ?? "",
    duration_days: Number(medicine.default_duration_days) || 0,
    instructions: medicine.default_instructions ?? "",
  };
}

/** How many times a day a frequency means; 0 when it cannot be counted ("When needed"). */
export function timesPerDay(frequency: string | null | undefined): number {
  return FREQUENCIES.find((option) => option.value === frequency)?.perDay ?? 0;
}

/**
 * The milligrams in one dose: "500 mg" → 500, "1 g" → 1000, and "2 tablets" → 2 × the medicine's strength when
 * the strength is in mg. Null when it cannot be worked out ("10 ml", "1 tablet" of a 0.12% mouthwash).
 * Arabic digits and the usual Arabic units are read too ("٥٠٠ ملغ", "2 حبة").
 */
export function doseMg(dose: string | null | undefined, strength?: string | null): number | null {
  const text = toLatinDigits(dose).trim().toLowerCase();
  const direct = MASS_DOSE.exec(text);
  if (direct) return Number(direct[1]) * gramFactor(direct[2]);
  const count = COUNT_DOSE.exec(text);
  if (!count) return null;
  const perUnit = MASS_DOSE.exec(toLatinDigits(strength).trim().toLowerCase());
  if (!perUnit) return null;
  return Number(count[1]) * Number(perUnit[1]) * gramFactor(perUnit[2]);
}

/** The unit must end there: "1 g" is grams, "1 gm" or "10 ml" is not read. */
const UNIT_END = "(?![a-z\\u0621-\\u064a])";
/** "500 mg", "1 g", "500 ملغ", "1 غم". */
const MASS_DOSE = new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*(mg|g|ملغم|ملغ|مغ|غرام|غم|غ)${UNIT_END}`);
/** "2 tablets", "1 capsule", "2 حبة". */
const COUNT_DOSE = new RegExp(
  `^(\\d+(?:\\.\\d+)?)\\s*(tablets?|tabs?|capsules?|caps?|sachets?|حبات|حبة|أقراص|قرص|كبسولات|كبسولة|أكياس|كيس)${UNIT_END}`,
);
const gramFactor = (unit: string) => (unit === "g" || unit.startsWith("غ") ? 1000 : 1);

export type WarningKind = "allergy" | "blood_thinner" | "pregnancy" | "child" | "max_dose" | "duplicate";

export interface PrescriptionWarning {
  kind: WarningKind;
  /** Red: the medicine may be unsafe for this patient. Yellow: something to check. */
  severity: "high" | "medium";
  /** The medicine the warning is about. */
  medicine: string;
  text: string;
}

/** The words of a medicine's `allergy_words` ("penicillin, amoxicillin"), lower-cased, without empties. */
function allergyWords(medicine: DentalMedicine): string[] {
  return (medicine.allergy_words ?? "")
    .split(/[,;،؛]/)
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Everything the dentist should know before signing: an allergy to a medicine, an NSAID with a blood thinner, a
 * medicine to avoid in pregnancy, a child's dose, a dose above the usual daily maximum, and the same medicine
 * twice. Rows without a known medicine are skipped. Red warnings first.
 */
export function prescriptionWarnings(
  patient: PatientForPrescription | null | undefined,
  rows: Array<Pick<PrescriptionMedicine, "medicine" | "dose" | "frequency">>,
  medicines: ReadonlyMap<string, DentalMedicine> | Record<string, DentalMedicine>,
): PrescriptionWarning[] {
  const lookup = (name: string) => (medicines instanceof Map ? medicines.get(name) : (medicines as Record<string, DentalMedicine>)[name]);
  const flags = medicalFlags(patient);
  const bloodThinner = flags.find((flag) => flag.kind === "blood_thinner");
  const pregnant = flags.some((flag) => flag.kind === "pregnancy");
  const allergies = !isBlankMedicalText(patient?.allergies) ? String(patient?.allergies).toLowerCase() : "";
  const age = Number(patient?.age) || 0;
  const warnings: PrescriptionWarning[] = [];
  const seen = new Set<string>();
  const t = messages().prescriptions.warnings;

  rows.forEach((row) => {
    const medicine = row.medicine ? lookup(row.medicine) : undefined;
    if (!medicine) return;
    const label = medicineLabel(medicine);

    if (seen.has(medicine.name)) {
      warnings.push({ kind: "duplicate", severity: "medium", medicine: label, text: t.duplicate(label) });
    }
    seen.add(medicine.name);

    if (allergies) {
      const hit = allergyWords(medicine).find((word) => new RegExp(`(^|[^a-z])${escapeRegExp(word)}`, "i").test(allergies));
      if (hit) {
        warnings.push({
          kind: "allergy",
          severity: "high",
          medicine: label,
          text: t.allergy(label, hit),
        });
      }
    }
    if (bloodThinner && Number(medicine.is_nsaid) === 1) {
      warnings.push({
        kind: "blood_thinner",
        severity: "high",
        medicine: label,
        text: t.bloodThinner(label, bloodThinner.detail),
      });
    }
    if (pregnant && Number(medicine.avoid_in_pregnancy) === 1) {
      warnings.push({
        kind: "pregnancy",
        severity: "high",
        medicine: label,
        text: t.pregnancy(label),
      });
    }
    if (age > 0 && age < CHILD_AGE) {
      warnings.push({
        kind: "child",
        severity: "medium",
        medicine: label,
        text: t.child(label, age, medicine.child_note?.trim() || t.childDefault),
      });
    }
    const max = Number(medicine.max_daily_mg) || 0;
    const perDose = doseMg(row.dose, medicine.strength);
    const perDay = timesPerDay(row.frequency);
    if (max > 0 && perDose !== null && perDay > 0 && perDose * perDay > max) {
      warnings.push({
        kind: "max_dose",
        severity: "medium",
        medicine: label,
        text: t.maxDose(label, perDose * perDay, max),
      });
    }
  });

  return warnings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
}
