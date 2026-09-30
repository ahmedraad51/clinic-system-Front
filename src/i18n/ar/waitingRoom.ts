import type { Messages } from "../en";
import { num } from "../runtime";

export const waitingRoom: Messages["waitingRoom"] = {
  title: "قاعة الانتظار",
  inChair: "على الكرسي",
  waiting: "في الانتظار",
  next: "المواعيد القادمة",
  withDoctor: (doctor: string) => `مع ${doctor}`,
  nobodyInChair: "لا أحد بعد",
  nobodyWaiting: "لا أحد ينتظر",
  nobodyNext: "لا مواعيد أخرى اليوم",
  waitingMinutes: (n: number) => (n < 1 ? "وصل الآن" : `${num(n)} دقيقة`),
  fullScreen: "ملء الشاشة",
  back: "العودة إلى اليوم",
  updated: (time: string) => `آخر تحديث ${time}`,
  welcome: "أهلًا بكم. يُرجى إبلاغ الاستقبال عند وصولكم.",
  loadFailed: "تعذّر تحميل مرضى اليوم. تجري المحاولة مجددًا…",
};
