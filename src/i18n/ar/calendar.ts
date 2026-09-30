import type { Messages } from "../en";
import { num, plural } from "../runtime";

export const calendar: Messages["calendar"] = {
  loadFailed: "تعذّر تحميل المواعيد.",
  closedDay: "العيادة مغلقة في هذا اليوم.",
  noDoctors: "لا يوجد أطباء فعّالون لعرضهم.",
  freeAllDay: "لا مواعيد طوال اليوم",
  count: (n: number) => plural(n, { one: "موعد واحد", two: "موعدان", few: "# مواعيد", many: "# موعدًا", other: "# موعد" }),
  hoursRange: (from: string, to: string) => `${from}–${to}`,
  closed: "مغلقة",
  previousDoctor: "الطبيب السابق",
  nextDoctor: "الطبيب التالي",
  doctorOf: (index: number, count: number) => `الطبيب ${num(index)} من ${num(count)}`,
  bookAt: (time: string, doctor: string, outside: boolean) =>
    `حجز الساعة ${time}${doctor ? ` مع ${doctor}` : ""}${outside ? " (خارج ساعات العمل)" : ""}`,
  slotHint: (time: string) => `+ ${time}`,
  blockLabel: (time: string, who: string, doctor: string, status: string) =>
    `${time}، ${who}${doctor ? `، ${doctor}` : ""}، ${status}`,
  blockTitle: (time: string, who: string, reason: string, status: string) =>
    `${time} · ${who}${reason ? ` · ${reason}` : ""} · ${status}`,
  moved: (who: string, time: string) => `تم نقل موعد ${who} إلى الساعة ${time}.`,
  moveFailed: "تعذّر نقل الموعد.",
  now: "الآن",
  notWorking: "خارج دوام الطبيب",
  clickToBook: "اضغط على وقت فارغ لحجزه.",
  dragToMove: "اسحب الموعد لنقله.",
  moveTitle: "نقل هذا الموعد؟",
  move: "نقل",
  moveAnyway: "نقل على أي حال",
  moveFrom: (date: string, time: string, doctor: string) => ` من ${date} الساعة ${time}${doctor ? ` مع ${doctor}` : ""} إلى `,
  moveTo: (date: string, time: string) => `${date} الساعة ${time}`,
  moveWith: (doctor: string) => ` مع ${doctor}`,
  moveEnd: ".",
  overlaps: (who: string, time: string) =>
    who ? `يتداخل هذا مع موعد ${who} الساعة ${time}.` : `يتداخل هذا مع موعد آخر الساعة ${time}.`,
};
