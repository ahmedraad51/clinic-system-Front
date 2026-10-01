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
    noRate: (code: string) => `حدّد سعر صرف ${code} في الإعدادات أولاً.`,
    currencyNotTaken: (code: string) => `العيادة لا تستلم ${code}. أضفها في الإعدادات أولاً.`,
    planCurrencyLocked: "لهذه الخطة دفعات، لذا لا يمكن تغيير عملتها.",
    ratesInvalid: "يحتاج كل سعر صرف إلى تاريخ ومبلغ أكبر من صفر، وسعر واحد لكل تاريخ، وسعر واحد على الأقل للعملة الثانية.",
    secondInUse: (code: string) => `توجد خطط أو دفعات بـ${code}، لذا تبقى العملة الثانية.`,
    mainInUse: "لا يمكن تغيير عملة العيادة بعد وجود خطط أو دفعات.",
    amountAboveZero: "يجب أن يكون المبلغ أكبر من صفر.",
    paidAboveCost: (paid: string, cost: string, plan: string) =>
      `المبلغ المدفوع (${num(paid)}) لا يمكن أن يتجاوز الكلفة الكلية (${num(cost)}) لخطة العلاج ${plan}.`,
    costBelowPaid: (paid: string, cost: string) => `المبلغ المدفوع (${num(paid)}) لا يمكن أن يتجاوز الكلفة الكلية (${num(cost)}).`,
    countDay: "اختر يوم الجرد.",
    expenseDate: "اختر يوم المصروف.",
    alreadyRestored: (name: string) => `تمت استعادة ${name} من قبل.`,
    nameTaken: (name: string) => `يوجد سجل باسم ${name} بالفعل، لذلك لا يمكن استعادة هذا السجل.`,
    restoreLinkGone: (doctype: string, name: string) => `لا يمكن استعادته: ${doctype} ${name} الذي يتبع له محذوف. استعده أولًا.`,
    expenseCategory: "اختر فئة المصروف.",
    countCash: "أدخل مبلغ النقد المعدود.",
    countTwice: (day: string, name: string) => `تم جرد نقد يوم ${day} مسبقًا (${name}).`,
    countNote: "اكتب ملاحظة توضح سبب النقص أو الزيادة في النقد.",
    linked: (doctype: string, name: string, linkedDoctype: string, linkedName: string) =>
      `تعذّر حذف ${doctype} ${name}، فهناك سجل مرتبط به: ${linkedDoctype} ${linkedName}.`,
    newPassword: "كلمة المرور الجديدة مطلوبة.",
    required: "املأ كل الحقول المطلوبة.",
    noMethod: (method: string) => `الإجراء ${method} غير متاح مع البيانات التجريبية.`,
    readFile: "تعذّرت قراءة الملف.",
  },
};
