/** The public website on the cloud's main address (/site): what DentClinic is, the plans, a free trial. */
export const site = {
  title: "DentClinic",
  tagline: "Run your dental clinic in Arabic and English: patients, appointments, treatments, payments and reports.",
  language: "Language",
  // Going to a clinic's own address
  findTitle: "Go to Your Clinic",
  findText: "Each clinic has its own web address. Type yours to log in.",
  findLabel: "Your clinic's web address",
  findPlaceholder: "alnoor",
  findButton: "Go",
  findInvalid: "Use 3 to 30 English letters, digits or hyphens, starting with a letter.",
  /** "alnoor.dentclinic.example" */
  findPreview: (address: string) => `You will go to ${address}`,
  openClinic: "Open the Clinic",
  singleClinic: "This copy of DentClinic serves one clinic.",
};
