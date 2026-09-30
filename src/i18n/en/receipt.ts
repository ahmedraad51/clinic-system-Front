import { num } from "../runtime";

/** The printable receipt, the letterhead on every printout, and the slip for thermal receipt printers. */
export const receipt = {
  /** On the letterhead of the receipt. */
  kind: "Receipt",
  receivedFrom: "Received from",
  for: "For",
  treatment: "Treatment",
  generalPayment: "General payment",
  paymentMethod: "Payment method",
  date: "Date",
  notes: "Notes",
  amountPaid: "Amount paid",

  /** The clinic header on printouts (src/components/ClinicLetterhead.tsx). */
  letterhead: {
    taxNumber: "Tax number:",
  },

  /** The "Receipt slip" row under the receipt and its settings dialog. */
  slip: {
    leftOnTreatment: "Left on this treatment",
    row: (widthMm: number) => `Receipt slip for a receipt printer (${num(widthMm)} mm paper)`,
    settings: "Slip Settings",
    print: "Print Slip",
    printFailed: "Could not start printing.",
    dialogTitle: "Receipt Slip Settings",
    dialogText:
      "Kept on this computer only. The print dialog opens on the printer used last: check that the receipt printer is chosen.",
    paperWidth: "Paper width",
    /** "58 mm" */
    mm: (value: number) => `${num(value)} mm`,
    otherWidth: "Other",
    widthLabel: "Width (mm)",
    widthHint: "Between 40 and 120.",
    widthError: "Enter a paper width between 40 and 120 mm.",
    marginLabel: "Side margin (mm)",
    marginHint: "Space the printer cannot print on. Most need 2 to 4 mm.",
    marginError: "Enter a side margin between 0 and 10 mm.",
    textSize: "Text size",
    small: "Small",
    normal: "Normal",
    large: "Large",
    printTest: "Print Test Slip",
    saved: "Slip settings saved on this computer.",
    /** The test slip: a long name and a long treatment, the worst case for a narrow roll. */
    testNo: "TEST SLIP",
    testPatient: "Mohammed Abdulrahman Al-Kadhimi",
    testFor: "Root canal and crown · tooth 36",
  },

  /** Texts printed on the slip itself (src/lib/receiptSlip.ts). */
  printed: {
    title: (receiptNo: string) => `Receipt ${receiptNo}`,
    taxNo: (taxNumber: string) => `Tax no. ${taxNumber}`,
    heading: "RECEIPT",
    patient: "Patient",
    for: "For",
    method: "Method",
    paid: "Paid",
    printedAt: (at: string, by: string) => `Printed ${at}${by ? ` by ${by}` : ""}`,
    thanks: "Thank you",
  },
};
