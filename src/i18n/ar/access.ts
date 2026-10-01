import type { Messages } from "../en";

export const access: Messages["access"] = {
  copyTitle: "نسخة للعرض فقط",
  copyUpdated: (when: string) => `آخر تحديث ${when}.`,
  copyUnknown: "موعد آخر تحديث غير معروف بعد.",
  copyText: "تُجرى التغييرات في العيادة، وتظهر هنا بعد التحديث التالي.",
  copyFailed: (why: string) => `لم ينجح التحديث الأخير: ${why}`,
  readOnlyRefused: "هذه نسخة للعرض فقط: لا يمكن تغيير شيء هنا.",
  viewOnly: "للعرض فقط",
  passwordAtClinic: "تُغيَّر كلمات المرور في العيادة، لا في النسخة المخصصة للعرض.",
  offlineTitle: "غير متصل: تعرض الشاشة آخر نسخة",
  offlineNoNetwork: "هذا الحاسوب بلا شبكة.",
  offlineNoServer: "تعذّر الوصول إلى الخادم.",
  offlineShown: (when: string) =>
    `يُعرض ما حُمّل حتى ${when}، ولا يمكن إضافة أو تعديل أي شيء. يتحدّث كل شيء تلقائيًا عند عودة الاتصال.`,
  offlineNothing: "لا يمكن إضافة أو تعديل أي شيء. يتحدّث كل شيء تلقائيًا عند عودة الاتصال.",
  tryAgain: "حاول مجددًا",
};
