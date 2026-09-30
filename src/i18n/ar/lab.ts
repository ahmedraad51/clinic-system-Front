import type { Messages } from "../en";

export const lab: Messages["lab"] = {
  state: {
    none: "لم يُرسل",
    at_lab: "في المختبر",
    late: "متأخر من المختبر",
    received: "عاد من المختبر",
  },
  title: "عمل المختبر",
  receivedToday: "استُلم اليوم",
  sendToLab: "إرسال إلى المختبر",
  nothingSent: "لم يُرسل شيء إلى المختبر لهذه الخطة بعد.",
  lab: "المختبر",
  sent: "تاريخ الإرسال",
  dueBack: "موعد الإرجاع",
  received: "تاريخ الاستلام",
  markedReceived: "تم تسجيل استلام عمل المختبر.",
  saved: "تم حفظ عمل المختبر.",
  saveFailed: "تعذّر حفظ عمل المختبر.",
  dueBeforeSent: "لا يمكن أن يكون موعد الإرجاع قبل تاريخ الإرسال.",
  labPlaceholder: "مثلًا: مختبر المنصور لطب الأسنان",
  receivedHint: "اتركه فارغًا حتى يعود العمل.",
};
