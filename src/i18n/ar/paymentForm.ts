import type { Messages } from "../en";
import { dates } from "./dates";

export const paymentForm: Messages["paymentForm"] = {
  patient: "المريض",
  searchPatient: "ابحث بالاسم أو رقم الهاتف…",
  plan: "خطة العلاج",
  noPlansHint: "لا توجد لهذا المريض خطط عليها مبالغ متبقية.",
  noPlan: "بدون خطة (دفعة عامة)",
  choosePatient: "اختر المريض أولًا",
  planOption: (type: string, tooth: string, left: string) => `${type}${tooth ? ` · السن ${tooth}` : ""} · المتبقي ${left}`,
  date: "التاريخ",
  amount: (currency: string) => `المبلغ (${dates.currencySymbols[currency] ?? currency})`,
  amountZero: "أدخل مبلغًا أكبر من صفر.",
  amountMax: (left: string) => `المتبقي على هذه الخطة ${left} فقط.`,
  upTo: (amount: string) => `حتى ${amount} لهذه الخطة.`,
  payFull: "دفع كامل المتبقي",
  method: "طريقة الدفع",
  notes: "ملاحظات",
  saveFailed: "تعذّر حفظ الدفعة. يرجى المحاولة مرة أخرى.",
};
