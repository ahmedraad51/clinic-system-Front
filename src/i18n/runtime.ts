/**
 * The language state and the number helpers. Kept apart from the dictionaries, so the translation files can use
 * num() and plural() without importing themselves. Import from "@/i18n", not from here.
 */

export type Lang = "ar" | "en";

export const LANGS: readonly Lang[] = ["ar", "en"];

/** Used until the clinic's default or the user's choice is known. */
export const DEFAULT_LANG: Lang = "ar";

/** Each language's name, written in that language (for the switch). */
export const LANG_NAMES: Record<Lang, string> = { ar: "العربية", en: "English" };

let current: Lang = DEFAULT_LANG;
let arabicDigits = false;

export function isLang(value: unknown): value is Lang {
  return value === "ar" || value === "en";
}

/** Called by LanguageProvider whenever the language or the digit setting changes. */
export function setLocale(lang: Lang, useArabicDigits: boolean): void {
  current = lang;
  arabicDigits = useArabicDigits;
}

export function currentLang(): Lang {
  return current;
}

/**
 * Runs `run` as if the screen were in another language (dates, times, numbers, texts), then goes back. For text that
 * leaves the app in its own language, e.g. a WhatsApp message written in English while the screen is Arabic.
 */
export function inLanguage<T>(lang: Lang, useArabicDigits: boolean, run: () => T): T {
  const before = { lang: current, digits: arabicDigits };
  setLocale(lang, useArabicDigits);
  try {
    return run();
  } finally {
    setLocale(before.lang, before.digits);
  }
}

export function dirOf(lang: Lang): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}

/**
 * Parts of a line joined with a separator (usually " · "), the empty ones left out. On a right-to-left screen each
 * part is isolated (U+2068 … U+2069), so a Latin ID or name and the number of the part beside it never trade places:
 * without it "PAT-2026-00004 · 53 سنة" shows as "53 · سنة PAT-2026-00004". On an English screen only a line holding
 * Arabic (a name or note typed in Arabic) is isolated, so "د. زينب الهاشمي · تركيب التاج" keeps its parts in order;
 * English text stays exactly as it was.
 */
export function joinParts(parts: Array<string | number | null | undefined | false>, separator: string): string {
  const kept = parts.filter((part) => part !== null && part !== undefined && part !== false && part !== "").map(String);
  const isolate = dirOf(current) === "rtl" || kept.some((part) => RTL_LETTERS.test(part));
  return isolate ? kept.map((part) => `⁨${part}⁩`).join(separator) : kept.join(separator);
}

/** Arabic (and Hebrew) letters: text that reads right to left. */
const RTL_LETTERS = /[֐-ࣿיִ-﷿ﹰ-﻿]/;

/** Where this computer keeps the language last shown (for the first paint) and the one chosen on it. */
export const LAST_LANG_KEY = "language";
export const CHOSEN_LANG_KEY = "language_choice";

/**
 * Runs in <head> before the page paints: sets lang and dir on <html> from the language last shown on this
 * computer, so an English page does not flash right-to-left (or the other way round).
 */
export const LANG_BOOT_SCRIPT = `try{var l=localStorage.getItem("${LAST_LANG_KEY}");if(l==="en"||l==="ar"){document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr"}}catch(e){}`;

/** True when numbers are written ٠-٩ (an Arabic screen with the clinic's Arabic digits on). */
export function showsArabicDigits(): boolean {
  return current === "ar" && arabicDigits;
}

/** The locale for Intl formatting, with the right digits. */
export function intlLocale(): string {
  if (current === "en") return "en-US";
  return arabicDigits ? "ar-IQ-u-nu-arab" : "ar-IQ-u-nu-latn";
}

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Turns 0-9 in an already formatted text into ٠-٩ when Arabic digits are on; otherwise returns it unchanged. */
export function localDigits(text: string): string {
  return showsArabicDigits() ? text.replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)]) : text;
}

/** A number with thousands separators, in the current digits: 1250000 → "1,250,000" (or "١٬٢٥٠٬٠٠٠"). */
export function num(value: number | string | null | undefined, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlLocale(), options).format(Number(value) || 0);
}

/**
 * The right form of a word for a count, with "#" replaced by the number. English needs `one` and `other`;
 * Arabic has `zero`, `one`, `two`, `few` (3-10), `many` (11-99) and `other` (100 and more). Missing forms fall back
 * to `other`.
 *   plural(3, { one: "# patient", other: "# patients" }) → "3 patients"
 *   plural(3, { zero: "لا مرضى", one: "مريض واحد", two: "مريضان", few: "# مرضى", many: "# مريضًا", other: "# مريض" })
 */
export function plural(
  count: number,
  forms: { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string },
): string {
  const rule = new Intl.PluralRules(current).select(count) as keyof typeof forms;
  return (forms[rule] ?? forms.other).replace(/#/g, num(count));
}

/**
 * The label of a fixed value saved in English (a status, a treatment type, a payment method …) in the current
 * language. Values the list does not know are shown as saved.
 */
export function label<T extends string>(list: Record<T, string>, value: string | null | undefined): string {
  if (!value) return "";
  return (list as Record<string, string>)[value] ?? value;
}
