import { plural } from "../runtime";

/** The patient form (src/components/forms/PatientForm.tsx), shared by Add Patient and Edit Patient. */
export const patientForm = {
  basicInfo: "Basic Information",
  alreadyRegistered: "Already registered?",
  samePhone: "same phone number",
  sameName: "same name",
  fullName: "Full Name",
  gender: "Gender",
  select: "Select",
  age: "Age",
  ageRange: "Enter an age between 0 and 120.",
  dobInstead: "Enter the date of birth instead",
  dateOfBirth: "Date of Birth",
  dobHint: "Age is worked out from this.",
  onlyAge: "Only know the age?",
  phoneNumber: "Phone Number",
  secondaryPhone: "Secondary Phone",
  email: "Email",
  address: "Address",

  medicalInfo: "Medical Information",
  checklistTitle: "Quick checklist",
  checklistHint: "Tick what applies; it is written into the fields below.",
  checklistFixed: "Written in the text below; change it there.",
  /**
   * The checklist boxes. `term` is the word a box writes into the medical field (in the language of the screen).
   * A box also shows ticked when the text has the word in either language.
   */
  checklist: {
    bloodThinners: { label: "Takes blood thinners", term: "Blood thinners" },
    diabetes: { label: "Diabetes", term: "Diabetes" },
    heart: { label: "Heart disease", term: "Heart disease" },
    bloodPressure: { label: "High blood pressure", term: "High blood pressure" },
    pregnant: { label: "Pregnant", term: "Pregnant" },
    penicillin: { label: "Allergic to penicillin", term: "Penicillin" },
    latex: { label: "Allergic to latex", term: "Latex" },
    anaesthetic: { label: "Allergic to local anaesthetic", term: "Local anaesthetic" },
  },
  /** Between the terms in a medical field: "Diabetes, High blood pressure". */
  termSeparator: ", ",
  allergies: "Allergies",
  allergiesHint: "Shown as a warning on the patient page.",
  currentMedications: "Current Medications",
  chronicDiseases: "Chronic Diseases",
  medicalHistory: "Medical History",
  notes: "Notes",

  saveFailed: "Could not save the patient. Please try again.",
  cancel: "Cancel",
  duplicateTitle: "This phone number is already registered",
  saveAnyway: "Save anyway",
  /** `names`: the patients with this number, joined with ", ". */
  duplicateMessage: (names: string, count: number) =>
    `${names} already ${plural(count, { one: "has", other: "have" })} this phone number. If it is the same person, open that record instead. Save a new record anyway?`,
};
