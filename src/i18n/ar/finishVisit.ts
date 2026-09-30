import type { Messages } from "../en";

export const finishVisit: Messages["finishVisit"] = {
  title: "ماذا أُنجز في هذه الزيارة؟",
  planLabel: (type: string, tooth: string, status: string) => `${type}${tooth ? ` · السن ${tooth}` : ""} (${status})`,
  noPlan: (patient: string) => `ليس لدى ${patient} خطة علاج مفتوحة. ابدأ خطة لمتابعة العمل وكلفته.`,
  newPlan: "خطة علاج جديدة",
  plan: "خطة العلاج",
  whatWasDone: "ما الذي أُنجز",
  whatHint: "يُحفظ كجلسة مكتملة ضمن هذه الخطة.",
  finished: "اكتمل هذا العلاج",
  finishedHint: "تُحدَّد الخطة كمكتملة.",
  nextCheckup: "الفحص الدوري القادم",
  recallHint: (date: string) => `في ${date}، محسوبًا من هذه الزيارة.`,
  saveVisit: "حفظ الزيارة",
  skip: "تخطي",
  sessionSaved: (type: string) => `تم حفظ الزيارة وتسجيل اكتمال ${type}.`,
  notesSaved: "تم حفظ ملاحظات الزيارة في خطة العلاج.",
  noRecall: "لا فحص دوري لهذا المريض.",
  recallSet: (date: string) => `الفحص الدوري القادم: ${date}.`,
  usualRule: "تم ضبط الفحص الدوري على القاعدة المعتادة.",
  saveFailed: "تعذّر حفظ الزيارة.",
};
