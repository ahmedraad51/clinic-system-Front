import { num, plural } from "../runtime";

/** The Today board (/today): the front desk's day. */
export const today = {
  title: "Today",
  titleMine: "My Day",
  whose: "Whose patients",
  dayReport: "Day Report",
  walkIn: "Walk-in",
  loadFailed: "Could not load today's appointments.",
  statusFailed: "Could not change the status.",
  /** "Zahraa Hussein: Confirmed." */
  statusChanged: (patient: string, status: string) => `${patient}: ${status}.`,
  counts: {
    toCome: "Still to come",
    late: "Late",
    completed: "Completed",
    noShow: "No show",
    waiting: "Waiting",
    inChair: "In the chair",
  },
  noneMine: "You have no patients today",
  none: "No appointments today",
  noneText: "Walk-ins can be booked with the button above.",
  openWeek: "Open the week",
  /** Beside each doctor's name: "2 to come · 3 today". */
  groupSummary: (toCome: number, total: number) => `${num(toCome)} to come · ${num(total)} today`,
  minutesLate: (n: number) => plural(n, { one: "# min late", other: "# min late" }),
  /** When the appointment has no reason for the visit. */
  appointment: "Appointment",
  owes: (amount: string) => `owes ${amount}`,
  confirm: "Confirm",
  completed: "Completed",
  noShow: "No show",
  cancelled: "Cancelled",
  undo: "Undo",
  /** The waiting room steps: arrived at the desk, then called into the chair. */
  arrived: "Arrived",
  inChair: "In Chair",
  undoStep: "Undo step",
  waitingFor: (n: number) => (n < 1 ? "Waiting, just arrived" : plural(n, { one: "Waiting # min", other: "Waiting # min" })),
  inChairSince: (time: string) => `In the chair since ${time}`,
  stepSaved: (name: string, step: string) => `${name}: ${step}.`,
  stepArrived: "arrived",
  stepInChair: "in the chair",
  stepUndone: "step undone",
  waitingRoomScreen: "Waiting Room Screen",
  addPayment: "Add Payment",
  remindersTitle: (toSend: number) => `Tomorrow's reminders (${num(toSend)} to send)`,
  defaultMessage: "Default message",
  /** Used when the clinic has no active template. The {{ … }} placeholders stay as they are. */
  defaultReminder:
    "Hello {{ patient_name }}, this is a reminder of your appointment at {{ clinic_name }} on {{ appointment_date }} at {{ appointment_time }}.",
  reminderOpened: "Reminder opened",
  sendReminder: "Send reminder",
  noPhone: "No phone number",
  labTitle: (n: number) => `Lab work due (${num(n)})`,
  labHint: "Check it is back before the patient comes",
  /** FDI tooth numbers stay as they are. */
  tooth: (tooth: string) => `tooth ${tooth}`,
  labDue: (date: string) => `Due ${date}`,
  noDueDate: "No due date",
  labState: {
    none: "Not sent",
    at_lab: "At the lab",
    late: "Late from the lab",
    received: "Back from the lab",
  },
  earlierTitle: (n: number) => `Earlier, still open (${num(n)})`,
  earlierHint: "Mark what happened, so the records stay right",
  /** A medical alert chip's tooltip: "Allergy: penicillin". */
  flagDetail: (flag: string, detail: string) => `${flag}: ${detail}`,
  /** Between the alerts on a chip. */
  listSeparator: ", ",
  /** "8 Sep 2026, 10:00 AM" */
  dateTime: (date: string, time: string) => `${date}, ${time}`,
};
