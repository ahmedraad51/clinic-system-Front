import type { Messages } from "../en";

export const money: Messages["money"] = {
  currency: "العملة",
  names: { IQD: "دينار عراقي (د.ع)", USD: "دولار أمريكي ($)" },
  rate: (one: string, worth: string) => `${one} = ${worth}`,
  rateOnDay: (date: string, rate: string) => `سعر الصرف في ${date}: ${rate}`,
  rateUsed: "سعر الصرف",
  countsAs: (amount: string) => `تُحتسب ${amount} من هذه الخطة.`,
  countedAs: "من الخطة",
  noRate: (code: string) => `لم يُحدَّد سعر صرف ${code} بعد. أضفه في الإعدادات.`,
  currencyLocked: "لهذه الخطة دفعات، لذا تبقى عملتها كما هي.",
  usualPriceConverted: (type: string, price: string, converted: string) =>
    `السعر المعتاد (${type}): ${price} (نحو ${converted} بسعر اليوم)`,
};
