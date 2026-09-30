import type { Messages } from "../en";

export const sendWhatsapp: Messages["sendWhatsapp"] = {
  title: "إرسال عبر واتساب",
  template: "القالب",
  otherLanguage: (name: string, language: string) => `${name} (${language})`,
  message: "الرسالة",
  hintBefore: "إلى ",
  hintAfter: ". يمكنك تعديل النص قبل الإرسال.",
  noPhone: "لا يوجد لهذا المريض رقم هاتف يصلح لواتساب.",
  open: "فتح واتساب",
};
