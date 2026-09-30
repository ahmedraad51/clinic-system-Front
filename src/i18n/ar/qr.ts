import type { Messages } from "../en";

export const qr: Messages["qr"] = {
  scanButton: "مسح بطاقة مريض",
  scanTitle: "مسح بطاقة مريض",
  scanHint: "وجّه رمز QR الموجود على بطاقة المريض أو المخطط المطبوع نحو الكاميرا.",
  starting: "جارٍ تشغيل الكاميرا…",
  noCamera: "لا يمكن استخدام الكاميرا هنا. اسمح باستخدام الكاميرا لهذا الموقع، أو اكتب رقم المريض أدناه.",
  notPatient: "رمز QR هذا ليس بطاقة مريض من DentClinic.",
  orType: "أو اكتب رقم المريض",
  idLabel: "رقم المريض",
  idInvalid: "اكتب رقمًا مثل PAT-2026-00001.",
  open: "فتح ملف المريض",
  video: "الكاميرا",
  codeLabel: (name: string) => `رمز QR لملف ${name}`,
  chartQr: "امسح الرمز لفتح ملف المريض",
  card: {
    title: "بطاقة المريض",
    button: "بطاقة المريض",
    kind: "بطاقة مريض",
    patientId: "رقم المريض",
    born: "تاريخ الميلاد",
    phone: "هاتف العيادة",
    scanNote: "أبرز هذه البطاقة عند الاستقبال.",
    hint: "اطبعها على ورق مقوّى وقصّها على الخط. مسح الرمز يفتح ملف هذا المريض في DentClinic.",
  },
};
