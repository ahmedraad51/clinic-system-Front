import type { Messages } from "../en";

export const connection: Messages["connection"] = {
  needsInternet: "يحتاج إلى إنترنت",
  whatsappNeedsInternet: "يحتاج واتساب إلى الإنترنت، ولا يوجد إنترنت في العيادة الآن.",
  noInternetTitle: "لا يوجد إنترنت في العيادة الآن",
  noInternetReminders: "لا يمكن فتح واتساب. تبقى التذكيرات في هذه القائمة حتى يعود الإنترنت.",
  noInternetList: "لا يمكن إرسال رسائل واتساب حتى يعود الإنترنت.",
  copyNoInternet: "لا يوجد إنترنت في خادم العيادة، فتعذّر تحديث النسخة السحابية.",
  status: {
    title: "الاتصال",
    online: "متصل",
    clinicServer: "متصل بخادم العيادة",
    noInternet: "متصل بخادم العيادة، بلا إنترنت",
    offline: "غير متصل: هذا الحاسوب بلا شبكة",
    offlineShort: "لا توجد شبكة",
    unreachable: "تعذّر الوصول إلى الخادم",
    checking: "جارٍ فحص الاتصال…",
    copyFresh: (ago: string) => `النسخة السحابية محدَّثة (${ago})`,
    copyBehind: (ago: string) => `آخر تحديث للنسخة السحابية ${ago}`,
    copyNever: "لم تُنشأ النسخة السحابية بعد",
  },
};
