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
};
