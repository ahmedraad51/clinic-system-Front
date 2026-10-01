import type { Messages } from "../en";

export const treatmentForm: Messages["treatmentForm"] = {
  searchPatient: "ابحث بالاسم أو رقم الهاتف…",
  selectDoctor: "اختر الطبيب",
  treatmentType: "نوع العلاج",
  selectType: "اختر النوع",
  tooth: "السن",
  toothHint: "رقم السن بنظام FDI. اتركه فارغًا لعلاج الفم كله مثل التنظيف.",
  notToothSpecific: "ليس لسنّ محدد",
  quadrants: {
    upperRight: "العلوي الأيمن",
    upperLeft: "العلوي الأيسر",
    lowerLeft: "السفلي الأيسر",
    lowerRight: "السفلي الأيمن",
    childUpperRight: "أسنان لبنية: العلوي الأيمن",
    childUpperLeft: "أسنان لبنية: العلوي الأيسر",
    childLowerLeft: "أسنان لبنية: السفلي الأيسر",
    childLowerRight: "أسنان لبنية: السفلي الأيمن",
  },
  totalCost: (currency: string) => `الكلفة الكلية (${currency})`,
  usualPrice: (type: string, price: string) => `السعر المعتاد (${type}): ${price}`,
  costInvalid: "أدخل الكلفة الكلية كرقم.",
  saveFailed: "تعذّر حفظ خطة العلاج. يرجى المحاولة مرة أخرى.",
  diagnosis: "التشخيص",
  treatmentNotes: "ملاحظات العلاج",
};
