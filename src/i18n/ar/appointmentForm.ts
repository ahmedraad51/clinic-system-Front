import type { Messages } from "../en";
import { plural } from "../runtime";

const minutes = (n: number) => plural(n, { one: "دقيقة واحدة", two: "دقيقتين", few: "# دقائق", many: "# دقيقة", other: "# دقيقة" });

export const appointmentForm: Messages["appointmentForm"] = {
  saveFailed: "تعذّر حفظ الموعد. يُرجى المحاولة مرة أخرى.",
  clinicHours: (from: string, to: string) => `ساعات العيادة: من ${from} إلى ${to}`,
  searchPatient: "ابحث بالاسم أو رقم الهاتف...",
  selectDoctor: "اختر الطبيب",
  duration: "المدة",
  minutes: (n: number) => plural(n, { one: "دقيقة واحدة", two: "دقيقتان", few: "# دقائق", many: "# دقيقة", other: "# دقيقة" }),
  reasonForVisit: "سبب الزيارة",
  bookAnyway: "احجز على أي حال",
  closedTitle: "العيادة مغلقة في هذا اليوم",
  closedText: (date: string) => `${date} ليس من أيام دوام العيادة (الإعدادات). هل تريد الحجز على أي حال؟`,
  clashTitle: "هذا الطبيب محجوز في هذا الوقت",
  clashBefore: "لدى الطبيب موعد مع ",
  clashAfter: (date: string, time: string) => ` يوم ${date} الساعة ${time} يتداخل مع هذا الوقت.`,

  dayHeading: (doctor: string, date: string) => (doctor ? `${doctor}، ${date}` : date),
  loadingDay: "جارٍ تحميل مواعيد الطبيب في هذا اليوم...",
  booked: "المحجوز",
  nothingBooked: "لا يوجد حجز بعد.",
  range: (from: string, to: string) => `${from}–${to}`,
  past: "هذا التاريخ قد مضى.",
  closed: "العيادة مغلقة في هذا اليوم.",
  freeFor: (n: number) => `أوقات متاحة لمدة ${minutes(n)} — اضغط للاختيار`,
  noFree: (n: number) => `لا يوجد وقت متاح لمدة ${minutes(n)} ضمن ساعات العيادة في هذا اليوم.`,
  nextFree: (time: string) => `أقرب وقت متاح: ${time}`,
  outsideDoctor: (time: string, doctor: string, from: string, to: string) =>
    `${time} خارج ساعات عمل \u2068${doctor || "الطبيب"}\u2069 (${from}–${to}).`,
  outsideClinic: (time: string, from: string, to: string) => `${time} خارج ساعات العيادة (${from}–${to}).`,
  overlaps: (time: string, who: string, at: string) =>
    who ? `${time} يتداخل مع موعد ${who} الساعة ${at}.` : `${time} يتداخل مع موعد آخر الساعة ${at}.`,
};
