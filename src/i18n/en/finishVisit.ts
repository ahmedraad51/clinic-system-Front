/** "What was done in this visit?" after an appointment is marked Completed (src/components/FinishVisitDialog.tsx). */
export const finishVisit = {
  title: "What was done in this visit?",
  /** A plan in the list: "Crown · tooth 36 (In Progress)" */
  planLabel: (type: string, tooth: string, status: string) => `${type}${tooth ? ` · tooth ${tooth}` : ""} (${status})`,
  noPlan: (patient: string) => `${patient} has no open treatment plan. Start one to keep track of the work and its cost.`,
  newPlan: "New Treatment Plan",
  plan: "Treatment plan",
  whatWasDone: "What was done",
  whatHint: "Saved as a completed session of this plan.",
  finished: "This treatment is now finished",
  finishedHint: "Marks the plan Completed.",
  nextCheckup: "Next check-up",
  recallHint: (date: string) => `On ${date}, counted from this visit.`,
  saveVisit: "Save Visit",
  skip: "Skip",
  sessionSaved: (type: string) => `Visit saved and ${type} marked complete.`,
  notesSaved: "Visit notes saved to the treatment plan.",
  noRecall: "No recall for this patient.",
  recallSet: (date: string) => `Next check-up: ${date}.`,
  usualRule: "Check-up set to the usual rule.",
  saveFailed: "Could not save the visit.",
};
