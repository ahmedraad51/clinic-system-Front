import type { Messages } from "../en";

export const deployment: Messages["deployment"] = {
  modes: {
    cloud: "السحابة",
    "clinic-server": "خادم العيادة",
    "cloud-copy": "خادم العيادة + نسخة سحابية",
  },
  modeHints: {
    cloud: "عبر الإنترنت. لكل عيادة موقعها وعنوانها الخاص.",
    "clinic-server": "على حاسوب صغير داخل العيادة. يعمل دون إنترنت.",
    "cloud-copy": "النسخة السحابية من خادم العيادة، للاطلاع عليها من البيت. لا يمكن تغيير شيء فيها.",
  },
  previewTitle: "معاينة طريقة التثبيت",
  previewText:
    "يمكن تثبيت DentClinic بثلاث طرق، وتُحدَّد الطريقة عند بناء التطبيق (DEPLOYMENT_MODE). مع البيانات التجريبية يمكنك معاينة طريقة أخرى على هذا الحاسوب؛ تُعاد تحميل الصفحة وتبدأ البيانات التجريبية من جديد.",
  previewLabel: "طريقة التثبيت",
  builtIn: (mode: string) => `${mode} (المبنية في التطبيق)`,
  previewing: (mode: string) => `معاينة: ${mode}`,
  pretendNoInternet: "افترض أن العيادة بلا إنترنت",
  pretendNoInternetHint: "عندها تُظهر أزرار واتساب أنها تحتاج إلى الإنترنت، وتبقى التذكيرات في قائمتها.",
};
