import type { Messages } from "../en";
import { plural } from "../runtime";

export const estimate: Messages["estimate"] = {
  title: "عرض سعر العلاج",
  letterheadKind: "عرض سعر العلاج",
  patientWhat: "المريض",
  backToPatients: "العودة إلى المرضى",
  noPlansTitle: "لا توجد خطط علاج مفتوحة",
  noPlansText: "تظهر هنا الخطط التي حالتها مخطط أو قيد العلاج.",
  treatment: "العلاج",
  tooth: "السن",
  cost: "الكلفة",
  paid: "المدفوع",
  toPay: "المتبقي",
  totalCost: "الكلفة الكلية",
  alreadyPaid: "المدفوع حتى الآن",
  leftToPay: "المبلغ المتبقي",
  validity: (days: number, date: string) =>
    `عرض السعر هذا صالح لمدة ${plural(days, { one: "يوم واحد", two: "يومين", few: "# أيام", many: "# يومًا", other: "# يوم" })} من ${date}. قد تتغيّر الكلفة النهائية إذا تغيّرت خطة العلاج بعد الفحص.`,
  patientSignature: "توقيع المريض",
  doctorSignature: "توقيع الطبيب",
};
