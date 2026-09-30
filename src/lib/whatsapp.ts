/**
 * WhatsApp helpers: filling template placeholders and building wa.me links.
 * The reminder job on the back end fills the same placeholders (see docs/backend-todo.md).
 */

import { inLanguage, isLang, type Lang } from "@/i18n";
import { formatDate, formatTime } from "./format";
import { dialableNumber } from "./phone";
import type { WhatsAppTemplate, WhatsAppTrigger } from "./types";

export const PLACEHOLDERS = ["patient_name", "appointment_date", "appointment_time", "doctor_name", "clinic_name"] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];

/**
 * The template to use for a trigger, preferring one written in the given language: the same trigger and language,
 * then the same trigger with no language set, then the same trigger in another language, then any template in the
 * language, then the first one. Null when there are none.
 */
export function pickTemplate<T extends Pick<WhatsAppTemplate, "trigger" | "language">>(
  templates: T[],
  trigger: WhatsAppTrigger,
  lang: Lang,
): T | null {
  return (
    templates.find((t) => t.trigger === trigger && t.language === lang) ??
    templates.find((t) => t.trigger === trigger && !t.language) ??
    templates.find((t) => t.trigger === trigger) ??
    templates.find((t) => t.language === lang) ??
    templates[0] ??
    null
  );
}

/** What an appointment message is about; the date is "YYYY-MM-DD" and the time "HH:MM", as saved. */
export interface AppointmentFacts {
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  doctor_name: string;
  clinic_name: string;
}

/**
 * Fills a message about an appointment. The date and time are written in the message's own language (a template's
 * `language`, else `fallback`), with 0-9 digits, so an English message never gets "أيلول" or "ص" in it.
 */
export function fillAppointmentMessage(message: string, messageLang: string | null | undefined, fallback: Lang, facts: AppointmentFacts): string {
  const lang = isLang(messageLang) ? messageLang : fallback;
  return inLanguage(lang, false, () =>
    fillTemplate(message, {
      ...facts,
      appointment_date: formatDate(facts.appointment_date),
      appointment_time: formatTime(facts.appointment_time),
    }),
  );
}

/** "Hello {{ patient_name }}" → "Hello Zahraa Hussein". Unknown placeholders are left as they are. */
export function fillTemplate(message: string, values: Partial<Record<Placeholder, string>>): string {
  return message.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => values[key as Placeholder] ?? match);
}

/**
 * Digits for wa.me, with the country code: "0770 123 4567" → "9647701234567", "+971 50 123 4567" →
 * "971501234567". Pass the clinic's code from useSettings().countryCode. Empty when it does not look like a
 * phone number.
 */
export function whatsappNumber(phone?: string | null, countryCode?: string): string {
  return dialableNumber(phone, countryCode);
}

/** A link that opens WhatsApp with the chat, and the text ready when given. Empty without a usable number. */
export function whatsappLink(phone?: string | null, text?: string, countryCode?: string): string {
  const digits = whatsappNumber(phone, countryCode);
  if (!digits) return "";
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
