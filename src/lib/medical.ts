/**
 * Medical alerts: what a dentist must see before treating. Built from the Patient's free-text medical
 * fields, so it works with what receptionists already type, in English or Arabic ("Warfarin 3mg",
 * "Type 2 Diabetes", "سكري", "تتناول الوارفارين", ...). This only highlights; it never replaces reading the full
 * medical history.
 */
import { messages } from "@/i18n";
import { isBlankMedical } from "./format";
import type { Patient } from "./types";

export type MedicalFlagKind = "allergy" | "blood_thinner" | "diabetes" | "heart" | "pregnancy";

export interface MedicalFlag {
  kind: MedicalFlagKind;
  /** In the current language. */
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

/** Arabic ways of writing "nothing": لا، لا يوجد، لايوجد، لا شيء، كلا، ماكو، سليم. */
const ARABIC_BLANK = /^(لا|كلا|لا يوجد|لايوجد|لا توجد|لا شيء|لا شي|ماكو|سليم|سليمة)[.!]?$/;

/** True for an empty medical field, or one that only says "None", "No", "لا يوجد" and the like. */
export function isBlankMedicalText(value: string | null | undefined): boolean {
  return isBlankMedical(value) || ARABIC_BLANK.test((value || "").trim());
}

/**
 * An Arabic word from the list, with the prefixes Arabic writes on to a word (و، ب، ف، ل، ال and their mixes)
 * and any ending. It must start a word, so "حمل" is not found inside "يتحمل". Group 1 is the word without the
 * prefix. (No look-behind: older iPads cannot read it.)
 */
function arabicWords(stems: string): RegExp {
  return new RegExp(`(?:^|[^\\u0600-\\u06FF])(?:وال|بال|فال|لل|ال|و|ب|ف|ل)?((?:${stems})[\\u0600-\\u06FF]*)`, "g");
}

/** "لا يوجد سكري", "غير حامل", "ما عنده ضغط", "بدون" … just before the word. */
const ARABIC_NEGATION =
  /(?:^|[^؀-ۿ])(?:لا|ليس|ليست|غير|بدون|دون|ما|ماكو|ينفي|تنفي)(?:\s+(?:يوجد|توجد|عنده|عندها|لديه|لديها|يعاني|تعاني|يتناول|تتناول|يأخذ|تأخذ|من))*[\s-]*$/;

const RULES: Array<{
  kind: Exclude<MedicalFlagKind, "allergy">;
  severity: "high" | "medium";
  words: RegExp;
  arabic: RegExp;
}> = [
  {
    kind: "blood_thinner",
    severity: "high",
    words:
      /\b(warfarin|coumadin|aspirin|clopidogrel|plavix|heparin|enoxaparin|apixaban|eliquis|rivaroxaban|xarelto|dabigatran|pradaxa|anticoagula\w*|blood thinners?)\b/gi,
    arabic: arabicWords(
      "وارفارين|كومادين|[أاإ]سبرين|[أا]سبرو|كلوبيدو[قجغك]ريل|بلافكس|هيبارين|[إا]ينوكسابارين|كليكسان|[أا]بيكسابان|[إا]ليكويس|ريفاروكسابان|زاريلتو|دابيغاتران|مميّ?ع|مسيّ?ل|مضادات? (?:ال)?تخثر",
    ),
  },
  {
    kind: "diabetes",
    severity: "medium",
    words: /\b(diabet\w*|metformin|insulin|glucophage|gliclazide|sitagliptin)\b/gi,
    arabic: arabicWords("سكّ?ري|سكّ?ر|ميتفورمين|[أإا]نسولين|[جغك]لوكوفاج|[جغك]ليكلازيد"),
  },
  {
    kind: "heart",
    severity: "high",
    words:
      /\b(heart\w*|cardiac|angina|arrhythmia|atrial fibrillation|pacemaker|endocarditis|valve replacement|hypertension|high blood pressure|amlodipine|bisoprolol|lisinopril)\b/gi,
    arabic: arabicWords("قلب|ذبحة|جلطة|رجفان|خفقان|منظم (?:ال)?ضربات|صمام|ضغط|[أا]ملوديبين|بيسوبرولول|كونكور|ليزينوبريل"),
  },
  {
    kind: "pregnancy",
    severity: "high",
    words: /\b(pregnan\w*)\b/gi,
    arabic: arabicWords("حامل|حبلى|حمل"),
  },
];

function flagLabel(kind: MedicalFlagKind): string {
  const t = messages().medical;
  switch (kind) {
    case "allergy":
      return t.allergy;
    case "blood_thinner":
      return t.bloodThinner;
    case "diabetes":
      return t.diabetes;
    case "heart":
      return t.heart;
    case "pregnancy":
      return t.pregnancy;
  }
}

/** Allergies first, then the rest, each only once. Negations such as "no diabetes" or "غير حامل" are ignored. */
export function medicalFlags(patient: MedicalFields | null | undefined): MedicalFlag[] {
  if (!patient) return [];
  const flags: MedicalFlag[] = [];
  if (!isBlankMedicalText(patient.allergies)) {
    flags.push({ kind: "allergy", label: flagLabel("allergy"), detail: String(patient.allergies).trim(), severity: "high" });
  }
  // The words just before a match, within the same field (fields are joined by line breaks).
  const sameField = (before: string) => before.slice(before.lastIndexOf("\n") + 1);
  const text = [patient.chronic_diseases, patient.current_medications, patient.medical_history, patient.notes]
    .filter((part) => !isBlankMedicalText(part))
    .join(" \n ");
  RULES.forEach((rule) => {
    const found = new Set<string>();
    for (const match of text.matchAll(rule.words)) {
      const before = sameField(text.slice(Math.max(0, match.index - 12), match.index)).toLowerCase();
      if (/\b(no|not|non|without|denies)\b[\s-]*$/.test(before)) continue;
      found.add(match[0].toLowerCase());
    }
    for (const match of text.matchAll(rule.arabic)) {
      const before = sameField(text.slice(Math.max(0, match.index - 25), match.index));
      if (ARABIC_NEGATION.test(before)) continue;
      found.add(match[1]);
    }
    if (found.size) {
      flags.push({
        kind: rule.kind,
        label: flagLabel(rule.kind),
        detail: [...found].join(messages().medical.listSeparator),
        severity: rule.severity,
      });
    }
  });
  return flags;
}
