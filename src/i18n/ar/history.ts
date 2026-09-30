import type { Messages } from "../en";
import { plural } from "../runtime";

/** "آخر 10 عمليات حفظ" */
const lastSaves = (n: number) =>
  plural(n, { one: "آخر عملية حفظ", two: "آخر عمليتي حفظ", few: "آخر # عمليات حفظ", many: "آخر # عملية حفظ", other: "آخر # عملية حفظ" });

export const history: Messages["history"] = {
  title: "السجل",
  showHistory: "عرض السجل",
  intro: "من أضاف هذا السجل، ومن غيّر ماذا ومتى.",
  loadFailed: "تعذّر تحميل السجل.",
  loading: "جارٍ التحميل...",
  changedIt: "عدّله",
  addedIt: "أضافه",
  at: (when: string) => ` · ${when}`,
  someone: "شخص ما",
  updated: "تم تحديثه",
  arrow: " ← ",
  nothingInLast: (limit: number) =>
    `لا يوجد ما يُعرض في ${lastSaves(limit)} (حدّثت المجاميع فقط)؛ التغييرات الأقدم لا تظهر.`,
  onlyLast: (limit: number) => `يُنظر فقط في ${lastSaves(limit)}؛ التغييرات الأقدم لا تظهر.`,
  noChanges: "لا تغييرات منذ ذلك الحين.",
  leaveTitle: "المغادرة دون حفظ؟",
  leaveText: "لم تُحفظ تغييراتك في هذه الصفحة. إذا غادرت الآن فستضيع.",
  leaveConfirm: "المغادرة دون حفظ",
  fields: {
    patient: "المريض",
    doctor: "الطبيب",
    status: "الحالة",
    notes: "الملاحظات",
    gender: "الجنس",
    age: "العمر",
    email: "البريد الإلكتروني",
    address: "العنوان",
    allergies: "الحساسية",
    diagnosis: "التشخيص",
    amount: "المبلغ",
  },
  fieldsFor: {
    Patient: {
      full_name: "الاسم",
      date_of_birth: "تاريخ الميلاد",
      phone_number: "الهاتف",
      secondary_phone: "هاتف ثانٍ",
      current_medications: "الأدوية الحالية",
      chronic_diseases: "الأمراض المزمنة",
      medical_history: "التاريخ المرضي",
      dental_chart: "مخطط الأسنان",
      chart_sketch: "الرسم على المخطط",
      next_recall_date: "الفحص الدوري القادم",
      recall_interval_months: "الفحص الدوري كل (أشهر)",
      no_recall: "بلا فحص دوري",
    },
    Appointment: {
      appointment_date: "التاريخ",
      appointment_time: "الوقت",
      arrived_at: "الوصول",
      in_chair_at: "على الكرسي",
      duration_minutes: "المدة (دقائق)",
      reason_for_visit: "سبب الزيارة",
    },
    "Treatment Plan": {
      treatment_type: "العلاج",
      tooth_number: "السن",
      currency: "العملة",
      total_cost: "الكلفة الكلية",
      treatment_notes: "الملاحظات",
      lab_name: "المختبر",
      lab_sent_date: "أُرسل إلى المختبر",
      lab_due_date: "موعد العودة من المختبر",
      lab_received_date: "عاد من المختبر",
    },
    Payment: {
      treatment_plan: "خطة العلاج",
      payment_date: "التاريخ",
      payment_method: "طريقة الدفع",
      currency: "العملة",
      exchange_rate: "سعر الصرف",
    },
  },
};
