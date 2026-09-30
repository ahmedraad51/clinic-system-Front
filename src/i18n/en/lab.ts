/** The lab work of a treatment plan (LabWorkCard), also used on the Today board. */
export const lab = {
  /** Where the lab work stands (the badge). */
  state: {
    none: "Not sent",
    at_lab: "At the lab",
    late: "Late from the lab",
    received: "Back from the lab",
  },
  title: "Lab Work",
  receivedToday: "Received today",
  sendToLab: "Send to lab",
  nothingSent: "Nothing sent to a lab for this plan yet.",
  lab: "Lab",
  sent: "Sent",
  dueBack: "Due back",
  received: "Received",
  markedReceived: "Lab work marked as received.",
  saved: "Lab work saved.",
  saveFailed: "Could not save the lab work.",
  dueBeforeSent: "The date due back cannot be before the date it was sent.",
  labPlaceholder: "e.g. Al-Mansour Dental Lab",
  receivedHint: "Leave empty until the work comes back.",
};
