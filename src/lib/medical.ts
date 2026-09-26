/**
 * Medical alerts: what a dentist must see before treating. Built from the Patient's free-text medical
 * fields, so it works with what receptionists already type ("Warfarin 3mg", "Type 2 Diabetes", ...).
 * This only highlights; it never replaces reading the full medical history.
 */
import { isBlankMedical } from "./format";
import type { Patient } from "./types";

export type MedicalFlagKind = "allergy" | "blood_thinner" | "diabetes" | "heart" | "pregnancy";

export interface MedicalFlag {
  kind: MedicalFlagKind;
  label: string;
  /** The words that matched, or the allergy text. */
  detail: string;
  /** Red for things that change what the dentist may do today; yellow for things to keep in mind. */
  severity: "high" | "medium";
}

export type MedicalFields = Pick<
  Patient,
  "allergies" | "current_medications" | "chronic_diseases" | "medical_history" | "notes"
>;

/** Fields to request with getList/getDoc so MedicalAlerts can be shown. */
export const MEDICAL_FIELDS = ["allergies", "current_medications", "chronic_diseases", "medical_history", "notes"];

const RULES: Array<{ kind: Exclude<MedicalFlagKind, "allergy">; label: string; severity: "high" | "medium"; words: RegExp }> = [
  {
    kind: "blood_thinner",
    label: "Blood thinner",
    severity: "high",
    words:
      /\b(warfarin|coumadin|aspirin|clopidogrel|plavix|heparin|enoxaparin|apixaban|eliquis|rivaroxaban|xarelto|dabigatran|pradaxa|anticoagula\w*|blood thinners?)\b/gi,
  },
  {
    kind: "diabetes",
    label: "Diabetes",
    severity: "medium",
    words: /\b(diabet\w*|metformin|insulin|glucophage|gliclazide|sitagliptin)\b/gi,
  },
  {
    kind: "heart",
    label: "Heart / blood pressure",
    severity: "high",
    words:
      /\b(heart\w*|cardiac|angina|arrhythmia|atrial fibrillation|pacemaker|endocarditis|valve replacement|hypertension|high blood pressure|amlodipine|bisoprolol|lisinopril)\b/gi,
  },
  {
    kind: "pregnancy",
    label: "Pregnant",
    severity: "high",
    words: /\b(pregnan\w*)\b/gi,
  },
];

/** Allergies first, then the rest, each only once. Negations such as "no diabetes" are ignored. */
export function medicalFlags(patient: MedicalFields | null | undefined): MedicalFlag[] {
  if (!patient) return [];
  const flags: MedicalFlag[] = [];
  if (!isBlankMedical(patient.allergies)) {
    flags.push({ kind: "allergy", label: "Allergy", detail: String(patient.allergies).trim(), severity: "high" });
  }
  const text = [patient.chronic_diseases, patient.current_medications, patient.medical_history, patient.notes]
    .filter((part) => !isBlankMedical(part))
    .join(" \n ");
  RULES.forEach((rule) => {
    const found = new Set<string>();
    for (const match of text.matchAll(rule.words)) {
      const before = text.slice(Math.max(0, match.index - 12), match.index).toLowerCase();
      if (/\b(no|not|non|without|denies)\b[\s-]*$/.test(before)) continue;
      found.add(match[0].toLowerCase());
    }
    if (found.size) {
      flags.push({ kind: rule.kind, label: rule.label, detail: [...found].join(", "), severity: rule.severity });
    }
  });
  return flags;
}
