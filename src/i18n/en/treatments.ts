import { num } from "../runtime";

/** Treatment plans: the list, the new and edit pages, the plan page and its sessions. */
export const treatments = {
  title: "Treatment Plans",
  subtitle: "Planned and ongoing work for each patient, with what is still to pay.",
  newTreatment: "New Treatment",
  searchPlaceholder: "Search by patient, treatment or tooth...",
  typeFilter: "Treatment type",
  allTypes: "All treatments",
  allStatuses: "All statuses",
  treatment: "Treatment",
  tooth: "Tooth",
  cost: "Cost",
  remaining: "Remaining",
  noMatch: "No treatment plans match these filters.",
  empty: "No treatment plans yet.",

  // New and edit pages
  newTitle: "New Treatment Plan",
  saveTreatment: "Save Treatment",
  created: "Treatment plan created.",
  editTitle: "Edit Treatment Plan",
  saved: "Treatment plan saved.",
  /** The record type in "Treatment plan not found", and the back link to one plan. */
  what: "Treatment plan",
  backToList: "Back to Treatment Plans",

  // The plan page
  loadRelatedFailed: "Could not load the sessions and payments of this plan.",
  /** `status` is already translated. */
  markedAs: (status: string) => `Marked as ${status}.`,
  statusFailed: "Could not change the status.",
  deleted: "Treatment plan deleted.",
  deleteFailed: "Could not delete the treatment plan.",
  /** "Crown · Tooth 36" */
  titleWithTooth: (type: string, tooth: string) => `${type} · Tooth ${tooth}`,
  /** The reason filled in when booking the next visit of a plan: "Crown · tooth 36". */
  visitReason: (type: string, tooth: string) => `${type} · tooth ${tooth}`,
  addPayment: "Add Payment",
  deletePlan: "Delete treatment plan",
  totalCost: "Total Cost",
  paid: "Paid",
  cancelledNothingLeft: "Cancelled plans have nothing left to pay.",
  /** "40% paid" */
  paidPercent: (percent: number) => `${num(percent)}% paid`,
  diagnosis: "Diagnosis",
  updateStatus: "Update Status",
  payments: "Payments",
  noPayments: "No payments for this plan yet.",
  sessions: "Sessions",
  bookVisit: "Book Visit",
  addSession: "Add Session",
  noSessionsTitle: "No sessions yet",
  noSessionsText: "Add a session for each visit where this treatment is worked on.",
  deleteTitle: "Delete this treatment plan?",
  deleteMessage:
    "This plan will be removed for good. A plan that already has payments or sessions cannot be deleted; set its status to Cancelled instead.",
  deleteConfirm: "Delete Plan",

  // The session dialog
  editSession: "Edit Session",
  saveSession: "Save Session",
  sessionSaved: "Session saved.",
  sessionAdded: "Session added.",
  sessionSaveFailed: "Could not save the session.",
  sessionDeleted: "Session deleted.",
  sessionDeleteFailed: "Could not delete the session.",
  selectDoctor: "Select Doctor",
  sessionNotesHint: "What was done in this visit.",
  clickAgainToDelete: "Click again to delete",
};
