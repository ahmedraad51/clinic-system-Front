import { plural } from "../runtime";

/** The end-of-day report (/payments/day) and its cash drawer count (src/components/CashCountCard.tsx). */
export const cash = {
  title: "End-of-Day Report",
  /** On the letterhead of the printout. */
  kind: "End-of-day report",
  loadFailed: "Could not load the payments.",
  day: "Day",
  payments: (n: number) => plural(n, { one: "# payment", other: "# payments" }),
  total: "Total",
  noPayments: "No payments on this day",
  colPatient: "Patient",
  colFor: "For",
  colMethod: "Method",
  colReceipt: "Receipt",
  colAmount: "Amount",
  generalPayment: "General payment",
  countedBy: "Counted by",
  checkedBy: "Checked by",
  recentTitle: "Recent cash counts",

  /** The cash count card. */
  countLoadFailed: "Could not load the cash count.",
  enterCounted: "Enter the cash counted.",
  noteRequired: "Write a note saying why the cash is short or over.",
  countSaved: "Cash count saved.",
  countSaveFailed: "Could not save the cash count.",
  drawer: "Cash in the drawer",
  cashPayments: "Cash payments",
  openingFloat: "Opening float",
  openingFloatHint: "Money put in the drawer this morning, for change.",
  cashCounted: "Cash counted",
  cashCountedHint: "All the cash in the drawer now.",
  /** An empty value on paper, to fill in by hand. */
  blank: "________",
  shouldBe: "Should be in the drawer",
  result: "Result",
  note: "Note",
  noteHint: "What happened, for example change given twice.",
  notePrinted: (note: string) => `Note: ${note}`,
  paymentsChanged: (then: string) => `Cash payments changed since the count was saved (then ${then}). Count again and save.`,
  countedByLine: (name: string, at: string) => `Counted by ${name}${at ? `, ${at}` : ""}`,
  someone: "someone",
  notCounted: "Not counted yet.",
  updateCount: "Update Count",
  saveCount: "Save Count",

  /** Matched / Short by / Over by, with the money already formatted. */
  matched: "Matched",
  shortBy: (amount: string) => `Short by ${amount}`,
  overBy: (amount: string) => `Over by ${amount}`,

  /** The recent counts table. */
  recentLoadFailed: "Could not load the cash counts.",
  noCounts: "No cash counts saved yet.",
  colDay: "Day",
  colShouldBe: "Should be",
  colCounted: "Counted",
  colResult: "Result",
  colNote: "Note",
  colCountedBy: "Counted by",
  otherCash: (amount: string) => `Cash in the other currency on this day: ${amount}. It is not part of the count below: count it apart.`,
};
