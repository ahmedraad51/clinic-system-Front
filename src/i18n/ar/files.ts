import type { Messages } from "../en";
import { num, plural } from "../runtime";

export const files: Messages["files"] = {
  tooBig: (names: string, mb: number) => `${names}: أكبر من ${num(mb)} ميغابايت، لم يُضف.`,
  partlyAdded: (added: number, count: number, name: string, reason: string) =>
    `أُضيف ${num(added)} من ${plural(count, { one: "ملف واحد", two: "ملفين", few: "# ملفات", many: "# ملفًا", other: "# ملف" })}. لم يُضف ${name}: ${reason}`,
  uploadingOf: (index: number, count: number, name: string) => `جارٍ رفع ${num(index)} من ${num(count)}: ${name}`,
  uploading: (name: string) => `جارٍ رفع ${name}`,
  separator: "، ",
};
