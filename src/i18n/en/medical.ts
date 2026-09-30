/** The medical alerts band and chips (src/components/MedicalAlerts.tsx, src/lib/medical.ts). */
export const medical = {
  title: "Medical alerts",
  allergy: "Allergy",
  bloodThinner: "Blood thinner",
  diabetes: "Diabetes",
  heart: "Heart / blood pressure",
  /** The short chip in the patient list. */
  heartShort: "Heart / BP",
  pregnancy: "Pregnant",
  /** "Takes Warfarin 3mg daily" */
  takes: (medications: string) => `Takes ${medications}`,
  /** Between a flag and what was found: "Allergy: Penicillin". */
  detailSeparator: ": ",
  /** Between the words found: "warfarin, aspirin". */
  listSeparator: ", ",
};
