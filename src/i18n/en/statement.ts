/** The printable patient statement (/patients/[id]/statement). */
export const statement = {
  title: "Patient Statement",
  /** On the letterhead of the printout. */
  kind: "Statement",
  backToPatients: "Back to Patients",
  patient: "Patient",
  phone: "Phone",
  treatments: "Treatments",
  colTreatment: "Treatment",
  colStatus: "Status",
  colCost: "Cost",
  colPaid: "Paid",
  colLeft: "Left",
  noTreatments: "No treatments.",
  /** After the treatment type: "Crown · tooth 36". */
  tooth: (tooth: string) => ` · tooth ${tooth}`,
  payments: "Payments",
  colDate: "Date",
  colFor: "For",
  colMethod: "Method",
  colAmount: "Amount",
  noPayments: "No payments.",
  generalPayment: "General payment",
  totalTreatments: "Total for treatments",
  totalPaid: "Total paid",
  balance: "Balance",
};
