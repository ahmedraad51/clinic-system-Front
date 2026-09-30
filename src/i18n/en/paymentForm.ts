/** The payment form (src/components/forms/PaymentForm.tsx), shared by the new and edit pages. */
export const paymentForm = {
  patient: "Patient",
  searchPatient: "Search by name or phone...",
  plan: "Treatment Plan",
  noPlansHint: "This patient has no plans with a balance left.",
  noPlan: "No plan (general payment)",
  choosePatient: "Choose a patient first",
  /** "Crown · tooth 36 · IQD 150,000 left" */
  planOption: (type: string, tooth: string, left: string) => `${type}${tooth ? ` · tooth ${tooth}` : ""} · ${left} left`,
  date: "Date",
  /** "Amount (IQD)" */
  amount: (currency: string) => `Amount (${currency})`,
  amountZero: "Enter an amount greater than zero.",
  amountMax: (left: string) => `This plan only has ${left} left to pay.`,
  upTo: (amount: string) => `Up to ${amount} for this plan.`,
  payFull: "Pay full balance",
  method: "Payment Method",
  notes: "Notes",
  saveFailed: "Could not save the payment. Please try again.",
};
