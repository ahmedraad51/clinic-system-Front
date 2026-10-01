import type { Messages } from "../en";
import { num, plural } from "../runtime";

export const exporter: Messages["exporter"] = {
  title: "تصدير البيانات",
  subtitle: "كل المرضى والمواعيد وخطط العلاج والمدفوعات في العيادة، كملفات داخل ملف ZIP واحد.",
  cardTitle: "تنزيل كل البيانات",
  text:
    "نسخة من سجلات العيادة، للاحتفاظ بها أو فتحها في Excel أو نقلها إلى برنامج آخر. تُضمَّن كل الصفوف. تُكتب التواريخ بصيغة سنة-شهر-يوم، والحالات وطرق الدفع كما حُفظت، والمبالغ أرقامًا.",
  format: "الصيغة",
  formats: { xlsx: "ملفات Excel", csv: "ملفات CSV" },
  formatHint: "Excel: مصنّف لكل نوع من السجلات. CSV: ملف بسيط لكل نوع، يفتحه أي برنامج.",
  download: "تنزيل ZIP",
  preparing: "جارٍ تجهيز الملفات…",
  kinds: { patients: "المرضى", appointments: "المواعيد", plans: "خطط العلاج", payments: "المدفوعات" },
  rows: (n: number) => plural(n, { zero: "لا صفوف", one: "صف واحد", two: "صفّان", few: "# صفوف", many: "# صفًا", other: "# صف" }),
  waiting: "بالانتظار",
  failed: "لم يكتمل التصدير، ولم يُنزَّل شيء.",
  done: "نُزِّل ملف ZIP.",
  id: "الرقم",
  privacyNote: "يحوي الملف بيانات المرضى الطبية والشخصية: احفظه في مكان آمن، ولا ترسله عبر واتساب أو البريد.",
  readmeName: "README.txt",
  readme: (clinic: string, when: string, by: string, counts: string) =>
    `${clinic}: كل البيانات، صُدِّرت في ${when} بواسطة ${by}.\n\n${counts}\n\nالتواريخ بصيغة سنة-شهر-يوم. الحالات والأنواع وطرق الدفع مكتوبة كما حُفظت (بالإنجليزية). المبالغ أرقام، وعمود currency يبيّن العملة (فارغ: عملة العيادة).\n`,
  readmeLine: (kind: string, rows: number) => `${kind}: ${num(rows)}`,
};
