import type { Messages } from "../en";
import { num } from "../runtime";

export const receipt: Messages["receipt"] = {
  kind: "وصل",
  receivedFrom: "استُلم من",
  for: "مقابل",
  treatment: "علاج",
  generalPayment: "دفعة عامة",
  paymentMethod: "طريقة الدفع",
  date: "التاريخ",
  notes: "ملاحظات",
  amountPaid: "المبلغ المدفوع",

  letterhead: {
    taxNumber: "الرقم الضريبي:",
  },

  slip: {
    leftOnTreatment: "المتبقي على هذا العلاج",
    row: (widthMm: number) => `وصل مصغّر لطابعة الوصولات (ورق ${num(widthMm)} ملم)`,
    settings: "إعدادات الوصل المصغّر",
    print: "طباعة الوصل المصغّر",
    printFailed: "تعذّر بدء الطباعة.",
    dialogTitle: "إعدادات الوصل المصغّر",
    dialogText:
      "تُحفظ على هذا الحاسوب فقط. تفتح نافذة الطباعة على آخر طابعة استُخدمت: تأكّد من اختيار طابعة الوصولات.",
    paperWidth: "عرض الورق",
    mm: (value: number) => `${num(value)} ملم`,
    otherWidth: "آخر",
    widthLabel: "العرض (ملم)",
    widthHint: "بين 40 و120.",
    widthError: "أدخل عرض ورق بين 40 و120 ملم.",
    marginLabel: "الهامش الجانبي (ملم)",
    marginHint: "المساحة التي لا تستطيع الطابعة الطباعة عليها. أغلب الطابعات تحتاج من 2 إلى 4 ملم.",
    marginError: "أدخل هامشًا جانبيًا بين 0 و10 ملم.",
    textSize: "حجم النص",
    small: "صغير",
    normal: "عادي",
    large: "كبير",
    printTest: "طباعة وصل تجريبي",
    saved: "تم حفظ إعدادات الوصل المصغّر على هذا الحاسوب.",
    testNo: "وصل تجريبي",
    testPatient: "محمد عبد الرحمن الكاظمي",
    testFor: "علاج عصب وتاج · السن 36",
  },

  printed: {
    title: (receiptNo: string) => `وصل ${receiptNo}`,
    taxNo: (taxNumber: string) => `الرقم الضريبي ${taxNumber}`,
    heading: "وصل استلام",
    patient: "المريض",
    for: "مقابل",
    method: "الطريقة",
    paid: "المدفوع",
    printedAt: (at: string, by: string) => `طُبع ${at}${by ? ` بواسطة ${by}` : ""}`,
    thanks: "شكرًا لكم",
  },
};
