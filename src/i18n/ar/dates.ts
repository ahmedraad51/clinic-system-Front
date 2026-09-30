import type { Messages } from "../en";

/** The month names used in Iraq (كانون الثاني، شباط …). */
export const dates: Messages["dates"] = {
  monthsShort: ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"],
  monthsLong: ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"],
  daysShort: ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"],
  daysLong: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
  am: "ص",
  pm: "م",
  date: (day: string, month: string, year: string) => `${day} ${month} ${year}`,
  dayMonth: (day: string, month: string) => `${day} ${month}`,
  monthYear: (month: string, year: string) => `${month} ${year}`,
  longDate: (weekday: string, day: string, month: string, year: string) => `${weekday}، ${day} ${month} ${year}`,
  time: (hour: string, minute: string, half: string) => `${hour}:${minute} ${half}`,
  dateTime: (date: string, time: string) => `${date}، ${time}`,
  currencySymbols: { IQD: "د.ع", USD: "$", EUR: "€", GBP: "£", SAR: "ر.س", AED: "د.إ", JOD: "د.أ", KWD: "د.ك", EGP: "ج.م", TRY: "ل.ت" },
};
