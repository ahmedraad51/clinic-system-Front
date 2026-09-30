/**
 * Languages: Arabic (the default, right to left) and English.
 *
 * Every text on screen lives in the translation files, one per area: src/i18n/en/<area>.ts and
 * src/i18n/ar/<area>.ts. The Arabic files are typed from the English ones (`Messages`), so a text missing in
 * Arabic is a type error. React components read the texts with `useI18n().t` (src/context/LanguageContext.tsx);
 * plain functions (errors, formatting, printouts) call `messages()`.
 *
 * Numbers use 0-9 unless the clinic turned on Arabic digits (Clinic Settings → arabic_digits); then Arabic
 * screens show ٠-٩. Always write numbers in a text with num() or plural(), so they follow that setting.
 */

import { ar } from "./ar";
import { en, type Messages } from "./en";
import { currentLang, type Lang } from "./runtime";

export * from "./runtime";
export type { Messages };

const DICTIONARIES: Record<Lang, Messages> = { ar, en };

/** The texts of the current language. */
export function messages(): Messages {
  return DICTIONARIES[currentLang()];
}

/** The texts of a given language (e.g. a WhatsApp message in another language than the screen). */
export function messagesFor(lang: Lang): Messages {
  return DICTIONARIES[lang];
}
