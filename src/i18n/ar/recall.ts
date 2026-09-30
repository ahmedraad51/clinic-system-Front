import type { Messages } from "../en";
import { plural } from "../runtime";

const everyMonths = (months: number) =>
  plural(months, { one: "كل شهر", two: "كل شهرين", few: "كل # أشهر", many: "كل # شهرًا", other: "كل # شهر" });

const monthsWord = (months: number) =>
  plural(months, { one: "شهر واحد", two: "شهرين", few: "# أشهر", many: "# شهرًا", other: "# شهر" });

export const recall: Messages["recall"] = {
  choiceUsual: "غير محدد (القاعدة المعتادة للفحص الدوري)",
  choiceEvery: (months: number) => everyMonths(months),
  choiceNone: "بدون فحص دوري",

  dialogTitle: "الفحص الدوري القادم",
  dialogQuestion: (name: string) => `متى يعود ${name} للفحص الدوري؟`,
  checkUp: "الفحص الدوري",
  nextOn: "موعد الفحص القادم",
  countedFrom: (date: string) => `محسوب من ${date}. بعد كل زيارة مكتملة يتقدّم بالمدة نفسها.`,
  noneHint: "لن يظهر المريض في قائمة الفحص الدوري.",
  usualHint:
    "يظهر المريض في قائمة الفحص الدوري عندما لا تكون له زيارة خلال المدة المختارة هناك (6 أشهر في الرئيسية).",
  chooseDate: "اختر تاريخ الفحص الدوري القادم.",
  savedNone: "لا فحص دوري لهذا المريض.",
  savedDate: (date: string) => `الفحص الدوري القادم: ${date}.`,
  savedUsual: "تم ضبط الفحص الدوري على القاعدة المعتادة.",
  saveFailed: "تعذّر حفظ الفحص الدوري.",

  title: "الفحص الدوري",
  subtitle: "مرضى حان موعد فحصهم الدوري وليس لهم حجز: حلّ التاريخ الذي اختاره الطبيب، أو مرّت مدة دون زيارة.",
  notSeenFor: "دون زيارة منذ",
  loadFailed: "تعذّر تحميل قائمة الفحص الدوري.",
  checkUpDue: "موعد الفحص",
  lastVisit: "آخر زيارة",
  nobodyDue: (months: number) =>
    `لا أحد مستحق للفحص. كل المرضى زاروا العيادة خلال آخر ${monthsWord(months)}، أو لم يحن التاريخ الذي اختاره الطبيب، أو لديهم حجز.`,
  now: "الآن",
  dentist: "حسب الطبيب",
  dentistEvery: (months: number) => `حسب الطبيب: ${everyMonths(months)}`,
  afterLastVisit: (months: number) => `بعد ${monthsWord(months)} من آخر زيارة`,
  neverSeen: "لم يزر العيادة بعد",
  noVisitYet: "لا زيارة بعد",
  whatsapp: "واتساب",
  book: "حجز",
  countDue: (n: number) =>
    plural(n, { one: "مريض واحد مستحق", two: "مريضان مستحقان", few: "# مرضى مستحقون", many: "# مريضًا مستحقًا", other: "# مريض مستحق" }),
  whatsappText: (name: string, clinic: string) =>
    `مرحبًا ${name}، حان موعد فحص أسنانك الدوري في ${clinic}. ردّ على هذه الرسالة وسنجد لك وقتًا مناسبًا.`,
};
