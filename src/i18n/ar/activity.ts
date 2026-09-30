import type { Messages } from "../en";
import { plural } from "../runtime";

export const activity: Messages["activity"] = {
  title: "سجل النشاط",
  subtitle: "من أضاف أو عدّل أو حذف أي سجل. يمكن استعادة السجل المحذوف خطأً من هنا.",
  kindFilter: "ما حدث",
  kinds: { all: "كل شيء", added: "إضافة", changed: "تعديل", deleted: "حذف" },
  typeFilter: "السجل",
  allTypes: "كل السجلات",
  verbs: { added: "أضاف", changed: "عدّل", deleted: "حذف" },
  someone: "أحد المستخدمين",
  restore: "استعادة",
  restored: "تمت الاستعادة",
  restoredAs: (name: string) => `استُعيد باسم ${name}`,
  restoredToast: (what: string) => `عاد ${what}.`,
  restoreFailed: "تعذّرت الاستعادة.",
  none: "لا شيء بعد.",
  noneFiltered: "لا شيء مطابق.",
  more: "عرض المزيد",
  loadFailed: "تعذّر تحميل سجل النشاط.",
  change: (field: string, from: string, to: string) => `${field}: ${from} ← ${to}`,
  moreChanges: (n: number) =>
    plural(n, { one: "وتعديل آخر", two: "وتعديلان آخران", few: "و# تعديلات أخرى", many: "و# تعديلًا آخر", other: "و# تعديل آخر" }),
};
