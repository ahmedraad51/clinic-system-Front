import type { Messages } from "../en";
import { num, plural } from "../runtime";

export const files: Messages["files"] = {
  title: "الأشعة والصور",
  takePhoto: "التقاط صورة",
  addFiles: "إضافة ملفات",
  tooBig: (names: string, mb: number) => `${names}: أكبر من ${num(mb)} ميغابايت، لم يُضف.`,
  added: (n: number) =>
    plural(n, { one: "تمت إضافة الملف.", two: "تمت إضافة ملفين.", few: "تمت إضافة # ملفات.", many: "تمت إضافة # ملفًا.", other: "تمت إضافة # ملف." }),
  addFailed: "تعذّرت إضافة الملف.",
  partlyAdded: (added: number, count: number, name: string, reason: string) =>
    `أُضيف ${num(added)} من ${plural(count, { one: "ملف واحد", two: "ملفين", few: "# ملفات", many: "# ملفًا", other: "# ملف" })}. لم يُضف ${name}: ${reason}`,
  deleted: "تم حذف الملف.",
  deleteFailed: "تعذّر حذف الملف.",
  uploadingOf: (index: number, count: number, name: string) => `جارٍ رفع ${num(index)} من ${num(count)}: ${name}`,
  uploading: (name: string) => `جارٍ رفع ${name}`,
  empty: "لا توجد أشعة أو صور بعد",
  emptyText: "أضف صور الأشعة أو صور الفم أو تقارير PDF. على الجهاز اللوحي يفتح زر «التقاط صورة» الكاميرا.",
  opensInTab: "يُفتح هذا الملف في تبويب جديد.",
  openInTab: "فتح في تبويب جديد",
  delete: "حذف",
  deleteTitle: "حذف هذا الملف؟",
  deleteText: " سيُحذف من ملف المريض نهائيًا.",
  deleteConfirm: "حذف الملف",
  separator: "، ",
};
