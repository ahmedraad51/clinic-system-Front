/**
 * Phone number helpers. Numbers are saved as typed, only with Arabic digits turned into 0-9 by the phone boxes
 * (PhoneInput) ("0770 123 4567", "+964 770 123 4567"); these turn them into what WhatsApp and the search need.
 */

/** Iraq. Used when Clinic Settings has no phone_country_code. */
export const DEFAULT_COUNTRY_CODE = "964";

/** Invisible direction marks that copying from WhatsApp or an Arabic text can add around a number. */
const DIRECTION_MARKS = /[‎‏‪-‮⁦-⁩﻿]/g;

/**
 * Turns Arabic-Indic (٠-٩) and Persian (۰-۹) digits into 0-9 and removes invisible direction marks. Arabic
 * keyboards type those digits even in an English screen, and a plain /\D/ clean-up would silently delete them.
 */
export function toLatinDigits(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(DIRECTION_MARKS, "")
    .replace(/[٠-٩۰-۹]/g, (char) => {
      const code = char.charCodeAt(0);
      return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
    });
}

/** Only the digits of a phone number, after turning Arabic digits into 0-9. */
export function phoneDigits(value: string | null | undefined): string {
  return toLatinDigits(value).replace(/\D/g, "");
}

/**
 * A country code as plain digits: "+964", "00964" and "964" all give "964". Returns `fallback` (the
 * default code, 964) when nothing is left.
 */
export function cleanCountryCode(value: string | null | undefined, fallback = DEFAULT_COUNTRY_CODE): string {
  return phoneDigits(value).replace(/^0+/, "") || fallback;
}

/**
 * The full international number as digits, the form wa.me needs: "0770 123 4567" → "9647701234567".
 * - Starts with "+": the number already names its country; keep its digits.
 * - Starts with "00": an international prefix; drop it.
 * - Starts with "0": a local number; the leading 0 is replaced by the country code.
 * - Starts with the country code: keep it.
 * - 11 digits or more: already international (no national number is that long); keep it.
 * - Otherwise (a local number without its 0, like "770 123 4567"): add the country code.
 * A 0 left after the clinic's own code ("+964 0770…") is removed. Empty when there are fewer than 8 digits,
 * so a button can hide itself.
 */
export function dialableNumber(phone: string | null | undefined, countryCode = DEFAULT_COUNTRY_CODE): string {
  const text = toLatinDigits(phone).trim();
  const digits = text.replace(/\D/g, "");
  if (digits.length < 8) return "";
  const code = cleanCountryCode(countryCode);
  let full: string;
  if (/^[\s(]*\+/.test(text)) full = digits;
  else if (digits.startsWith("00")) full = digits.slice(2);
  else if (digits.startsWith("0")) full = `${code}${digits.replace(/^0+/, "")}`;
  else if (digits.startsWith(code) || digits.length >= 11) full = digits;
  else full = `${code}${digits}`;
  return full.startsWith(`${code}0`) ? `${code}${full.slice(code.length).replace(/^0+/, "")}` : full;
}

/** Digits without an international "00" and without leading zeros: what two spellings of a number share. */
function phoneKey(phone: string | null | undefined): string {
  let digits = phoneDigits(phone);
  if (digits.startsWith("00")) digits = digits.slice(2);
  return digits.replace(/^0+/, "");
}

/**
 * True when two numbers are the same phone, however they were typed: "0770 123 4567", "+964 770 123 4567"
 * and "00964 7701234567" all match. Compares the last 10 digits (fewer when a number is shorter, but at
 * least 7), so the country code and the leading 0 do not matter.
 */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = phoneKey(a);
  const y = phoneKey(b);
  const length = Math.min(10, x.length, y.length);
  return length >= 7 && x.slice(-length) === y.slice(-length);
}

/**
 * A LIKE pattern that finds a phone number in the database however it was stored, or null when the search
 * text does not look like a phone number (fewer than 7 digits, or letters in it). It uses the last 9
 * digits with "%" between them, so "+964 770 123 4567" finds "07701234567" and "0770 123 4567".
 */
export function phoneSearchPattern(text: string | null | undefined): string | null {
  const value = toLatinDigits(text).trim();
  if (!/^[\d\s+()./-]+$/.test(value)) return null;
  const key = phoneKey(value);
  if (key.length < 7) return null;
  return `%${key.slice(-9).split("").join("%")}%`;
}
