import type { Messages } from "../en";
import { num, plural } from "../runtime";

export const errors: Messages["errors"] = {
  generic: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
  sessionEnded: "انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.",
  loginNotKept:
    "تم تسجيل دخولك، لكن المتصفح لم يحتفظ بتسجيل الدخول. اطلب ممن أعدّ النظام التأكد من أن التطبيق يصل إلى الخادم عبر عنوانه الخاص (FRAPPE_URL).",
  twoFactor: "هذا الحساب يستخدم تسجيل الدخول بخطوتين، وهو غير مدعوم في التطبيق بعد. راجع مدير النظام.",
  passwordReset: "يجب تغيير كلمة المرور قبل تسجيل الدخول. اطلب من مدير النظام إعادة تعيينها.",
  noPermission: "ليست لديك صلاحية للقيام بذلك.",
  serverDownRead: "خادم العيادة لا يستجيب. يرجى المحاولة بعد قليل.",
  serverDownSave: "لم يستجب خادم العيادة. ربما تم الحفظ، لذا تحقق قبل المحاولة مرة أخرى.",
  uploadTimeout: (minutes: number) =>
    `استغرق الرفع أكثر من ${plural(minutes, { one: "دقيقة", two: "دقيقتين", few: "# دقائق", many: "# دقيقة", other: "# دقيقة" })} فتم إيقافه. تحقق من اتصال الإنترنت، أو جرّب ملفًا أصغر.`,
  timeoutRead: "تأخر الخادم في الرد. يرجى المحاولة مرة أخرى.",
  timeoutSave: "تأخر الخادم في الرد. ربما تم الحفظ، لذا تحقق قبل المحاولة مرة أخرى.",
  noConnection: "تعذّر الوصول إلى الخادم. تحقق من اتصال الإنترنت وحاول مرة أخرى.",
  duplicate: (value: string) => (value ? `القيمة "${value}" مستخدمة في سجل آخر.` : "هذه القيمة مستخدمة في سجل آخر."),
  tooLong: (field: string) => `النص في حقل ${field} طويل جدًا. يرجى اختصاره.`,
  mock: {
    amountAboveZero: "يجب أن يكون المبلغ أكبر من صفر.",
    paidAboveCost: (paid: string, cost: string, plan: string) =>
      `المبلغ المدفوع (${num(paid)}) لا يمكن أن يتجاوز الكلفة الكلية (${num(cost)}) لخطة العلاج ${plan}.`,
    costBelowPaid: (paid: string, cost: string) => `المبلغ المدفوع (${num(paid)}) لا يمكن أن يتجاوز الكلفة الكلية (${num(cost)}).`,
    countDay: "اختر يوم الجرد.",
    countCash: "أدخل مبلغ النقد المعدود.",
    countTwice: (day: string, name: string) => `تم جرد نقد يوم ${day} مسبقًا (${name}).`,
    countNote: "اكتب ملاحظة توضح سبب النقص أو الزيادة في النقد.",
    linked: (doctype: string, name: string, linkedDoctype: string, linkedName: string) =>
      `تعذّر حذف ${doctype} ${name}، فهناك سجل مرتبط به: ${linkedDoctype} ${linkedName}.`,
    newPassword: "كلمة المرور الجديدة مطلوبة.",
    noMethod: (method: string) => `الإجراء ${method} غير متاح مع البيانات التجريبية.`,
    readFile: "تعذّرت قراءة الملف.",
  },
};
