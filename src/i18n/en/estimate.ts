import { plural } from "../runtime";

/** The printable treatment estimate (/patients/[id]/estimate). */
export const estimate = {
  title: "Treatment Estimate",
  letterheadKind: "Treatment estimate",
  patientWhat: "Patient",
  backToPatients: "Back to Patients",
  noPlansTitle: "No open treatment plans",
  noPlansText: "Plans that are Planned or In Progress appear here.",
  treatment: "Treatment",
  tooth: "Tooth",
  cost: "Cost",
  paid: "Paid",
  toPay: "To pay",
  totalCost: "Total cost",
  alreadyPaid: "Already paid",
  leftToPay: "Left to pay",
  /** `date` is already formatted. */
  validity: (days: number, date: string) =>
    `This estimate is valid for ${plural(days, { one: "# day", other: "# days" })} from ${date}. The final cost may change if the treatment plan changes after examination.`,
  patientSignature: "Patient signature",
  doctorSignature: "Doctor signature",
};
