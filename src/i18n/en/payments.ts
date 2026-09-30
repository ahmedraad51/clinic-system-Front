/** The payments list, the new and edit pages, and the payment (receipt) page around the receipt itself. */
export const payments = {
  title: "Payments",
  /** Followed by the amount. */
  totalFiltered: "Total for these filters: ",
  totalAll: "Total received: ",
  subtitle: "Every payment received, newest first.",
  dayReport: "End-of-Day Report",
  add: "Add Payment",
  searchPlaceholder: "Search by patient, treatment or note...",
  methodFilter: "Payment method",
  allMethods: "All methods",
  fromDate: "From date",
  toDate: "To date",
  /** Between the two date boxes. */
  to: "to",
  colDate: "Date",
  colPatient: "Patient",
  colTreatment: "Treatment",
  colMethod: "Method",
  colAmount: "Amount",
  noMatch: "No payments match these filters.",
  none: "No payments yet.",
  backToList: "Back to Payments",

  newTitle: "New Payment",
  backToPlan: "Treatment plan",
  savePayment: "Save Payment",
  recorded: "Payment recorded.",
  editTitle: "Edit Payment",
  backToPayment: "Payment",
  saved: "Payment saved.",

  receiptTitle: "Payment Receipt",
  whatsapp: "WhatsApp",
  deleteLabel: "Delete payment",
  deleteTitle: "Delete this payment?",
  /** "The payment of <amount> will be removed …": the amount goes between the two parts. */
  deleteBefore: "The payment of ",
  deleteAfter: " will be removed and the plan balance will go back up by the same amount.",
  deleteConfirm: "Delete Payment",
  deleted: "Payment deleted.",
  deleteFailed: "Could not delete the payment.",

  /** The receipt sent on WhatsApp. `forWhat` is the treatment type, or empty for a general payment. */
  whatsappThanks: (patient: string, amount: string, date: string, forWhat: string, clinic: string) =>
    `Hello ${patient}, thank you for your payment of ${amount} on ${date}${forWhat ? ` for ${forWhat.toLowerCase()}` : ""} at ${clinic}.`,
  whatsappReceipt: (receiptNo: string, method: string) => `Receipt: ${receiptNo} (${method}).`,
  whatsappLeft: (amount: string) => `Still to pay: ${amount}.`,
  whatsappNothingLeft: "Nothing is left to pay. Thank you!",
};
