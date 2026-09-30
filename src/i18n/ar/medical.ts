import type { Messages } from "../en";

export const medical: Messages["medical"] = {
  title: "تنبيهات طبية",
  allergy: "حساسية",
  bloodThinner: "مميّع الدم",
  diabetes: "السكري",
  heart: "القلب / ضغط الدم",
  heartShort: "قلب / ضغط",
  pregnancy: "حامل",
  takes: (medications: string) => `يتناول: ${medications}`,
  detailSeparator: ": ",
  listSeparator: "، ",
};
