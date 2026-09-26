/**
 * WhatsApp helpers: filling template placeholders and building wa.me links.
 * The reminder job on the back end fills the same placeholders (see docs/backend-todo.md).
 */

export const PLACEHOLDERS = ["patient_name", "appointment_date", "appointment_time", "doctor_name", "clinic_name"] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];

/** "Hello {{ patient_name }}" → "Hello Nadia Samir". Unknown placeholders are left as they are. */
export function fillTemplate(message: string, values: Partial<Record<Placeholder, string>>): string {
  return message.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => values[key as Placeholder] ?? match);
}

/** Digits for wa.me: "+20 100 234 5678" → "201002345678". Empty when it does not look like a phone number. */
export function whatsappNumber(phone?: string | null): string {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length >= 8 ? digits : "";
}

/** A link that opens WhatsApp with the chat, and the text ready when given. Empty without a usable number. */
export function whatsappLink(phone?: string | null, text?: string): string {
  const digits = whatsappNumber(phone);
  if (!digits) return "";
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
