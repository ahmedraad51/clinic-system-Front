import { currentLang } from "@/i18n";

/**
 * The governorates of Iraq, offered as suggestions in the patient's Address box. On an English screen the English
 * name is what is typed into the address and the Arabic name is shown beside it; on an Arabic screen the other
 * way round (see governorateSuggestions()).
 */
export const IRAQ_GOVERNORATES: ReadonlyArray<{ name: string; arabic: string }> = [
  { name: "Baghdad", arabic: "بغداد" },
  { name: "Basra", arabic: "البصرة" },
  { name: "Nineveh", arabic: "نينوى" },
  { name: "Erbil", arabic: "أربيل" },
  { name: "Sulaymaniyah", arabic: "السليمانية" },
  { name: "Duhok", arabic: "دهوك" },
  { name: "Halabja", arabic: "حلبجة" },
  { name: "Kirkuk", arabic: "كركوك" },
  { name: "Diyala", arabic: "ديالى" },
  { name: "Anbar", arabic: "الأنبار" },
  { name: "Saladin", arabic: "صلاح الدين" },
  { name: "Babylon", arabic: "بابل" },
  { name: "Karbala", arabic: "كربلاء" },
  { name: "Najaf", arabic: "النجف" },
  { name: "Wasit", arabic: "واسط" },
  { name: "Qadisiyyah", arabic: "القادسية" },
  { name: "Muthanna", arabic: "المثنى" },
  { name: "Dhi Qar", arabic: "ذي قار" },
  { name: "Maysan", arabic: "ميسان" },
];

/** The Address box suggestions in the current language: `value` goes into the box, `hint` is shown beside it. */
export function governorateSuggestions(): Array<{ value: string; hint: string }> {
  const arabic = currentLang() === "ar";
  return IRAQ_GOVERNORATES.map((place) => (arabic ? { value: place.arabic, hint: place.name } : { value: place.name, hint: place.arabic }));
}
