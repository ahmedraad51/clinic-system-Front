import type { Messages } from "../en";
import { num } from "../runtime";

export const notifications: Messages["notifications"] = {
  countLabel: (n: number) => `مواعيد اليوم: ${num(n)}`,
  loadFailedLabel: "تعذّر تحميل مواعيد اليوم",
  mine: "مرضاك المتبقون لهذا اليوم",
  all: "المواعيد المتبقية لهذا اليوم",
  loadFailed: "تعذّر تحميل مواعيد اليوم.",
  nothingLeft: "لا توجد مواعيد متبقية لهذا اليوم.",
  viewAll: "عرض كل مواعيد اليوم",
};
