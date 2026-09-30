import { num, plural } from "../runtime";

/** The Recall list (/recall), the "Next check-up" dialog and the recall choices (src/lib/recall.ts). */
export const recall = {
  /** The choices for the dentist's recall (recallChoices()). */
  choiceUsual: "Not set (the usual check-up rule)",
  choiceEvery: (months: number) => `Every ${num(months)} months`,
  choiceNone: "No recall",

  /** The "Next check-up" dialog (src/components/RecallDialog.tsx). */
  dialogTitle: "Next check-up",
  dialogQuestion: (name: string) => `When should ${name} come back for a check-up?`,
  checkUp: "Check-up",
  nextOn: "Next check-up on",
  countedFrom: (date: string) => `Counted from ${date}. After each completed visit it moves on by the same interval.`,
  noneHint: "The patient will not appear on the Recall list.",
  usualHint:
    "The patient appears on the Recall list when there has been no visit for the period chosen there (6 months on the dashboard).",
  chooseDate: "Choose the date of the next check-up.",
  savedNone: "No recall for this patient.",
  savedDate: (date: string) => `Next check-up: ${date}.`,
  savedUsual: "Check-up set to the usual rule.",
  saveFailed: "Could not save the check-up.",

  /** The Recall page. */
  title: "Recall",
  subtitle: "Patients due for a check-up and not booked: the date the dentist chose has come, or no visit for a while.",
  notSeenFor: "Not seen for",
  loadFailed: "Could not load the recall list.",
  checkUpDue: "Check-up due",
  lastVisit: "Last visit",
  nobodyDue: (months: number) =>
    `Nobody is due. Every patient was seen in the last ${num(months)} months, is not due yet by the dentist's date, or has a visit booked.`,
  now: "Now",
  dentist: "Dentist",
  dentistEvery: (months: number) => `Dentist: every ${num(months)} months`,
  afterLastVisit: (months: number) => `${num(months)} months after the last visit`,
  neverSeen: "Never seen",
  noVisitYet: "No visit yet",
  whatsapp: "WhatsApp",
  book: "Book",
  countDue: (n: number) => plural(n, { one: "# patient due", other: "# patients due" }),
  /** The WhatsApp reminder sent from the Recall list. */
  whatsappText: (name: string, clinic: string) =>
    `Hello ${name}, it is time for your dental check-up at ${clinic}. Reply to this message and we will find a time that suits you.`,
};
