/** Texts about the two currencies (the clinic's own and a second one), shared by forms, receipts and reports. */
export const money = {
  currency: "Currency",
  /** Names in the currency pickers; a code not listed shows as it is. */
  names: { IQD: "Iraqi dinar (IQD)", USD: "US dollar (USD)" } as Record<string, string>,
  /** "$1 = IQD 1,460" */
  rate: (one: string, worth: string) => `${one} = ${worth}`,
  rateOnDay: (date: string, rate: string) => `Rate on ${date}: ${rate}`,
  rateUsed: "Exchange rate",
  countsAs: (amount: string) => `Counts as ${amount} on this plan.`,
  countedAs: "On the plan",
  noRate: (code: string) => `No ${code} exchange rate is set yet. Add it in Settings.`,
  currencyLocked: "This plan has payments, so its currency stays as it is.",
  usualPriceConverted: (type: string, price: string, converted: string) =>
    `Usual price for ${type.toLowerCase()}: ${price} (about ${converted} at today's rate)`,
};
