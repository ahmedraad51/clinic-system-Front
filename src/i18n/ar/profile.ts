import type { Messages } from "../en";
import { num } from "../runtime";

export const profile: Messages["profile"] = {
  title: "ملفي الشخصي",
  username: "اسم المستخدم",
  email: "البريد الإلكتروني",
  roles: "الأدوار",
  whatICanDo: "ما يمكنني فعله",
  superUser: "أنت مدير نظام، لذا كل الصلاحيات مفعّلة لك.",
  screenSizeTitle: "حجم الشاشة على هذا الحاسوب",
  screenSizeText:
    "كبّر النص والأزرار على شاشة تُقرأ من بعيد، أو صغّرها على شاشة صغيرة. يتغيّر هذا الحاسوب فقط.",
  screenSize: "حجم الشاشة",
  zoomLevel: (percent: number) => `${num(percent, { useGrouping: false })}%`,
  changePassword: "تغيير كلمة المرور",
  currentPassword: "كلمة المرور الحالية",
  newPassword: "كلمة المرور الجديدة",
  newPasswordHint: (min: number) => `${num(min)} أحرف على الأقل.`,
  repeatPassword: "أعد كتابة كلمة المرور الجديدة",
  tooShort: (min: number) => `يجب أن تتكوّن كلمة المرور الجديدة من ${num(min)} أحرف على الأقل.`,
  notSame: "كلمتا المرور الجديدتان غير متطابقتين.",
  changed: "تم تغيير كلمة المرور.",
  changedDemo: "تم تغيير كلمة المرور (بيانات تجريبية، لم يتغيّر شيء فعلًا).",
  changeFailed: "تعذّر تغيير كلمة المرور.",
  tryAnotherUser: "تجربة مستخدم آخر",
  tryAnotherUserText:
    "تسجيل الدخول متوقّف أثناء بناء التطبيق. اختر مستخدمًا لترى التطبيق بصلاحياته. سيختفي هذا عند تفعيل تسجيل الدخول.",
  viewAs: "عرض التطبيق باسم",
  nowViewingAs: (name: string) => `تعرض التطبيق الآن باسم ${name}`,
};
