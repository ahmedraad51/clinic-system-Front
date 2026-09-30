import { num, plural } from "../runtime";

/** Prescriptions: the form, the printable page and the safety warnings (src/lib/prescriptions.ts). */
export const prescriptions = {
  newTitle: "New Prescription",
  editTitle: "Edit Prescription",
  title: "Prescription",
  /** What the document is, on the letterhead. */
  letterhead: "Prescription",
  backAppointment: "Appointment",
  backPatient: "Patient",
  backPrescription: "Prescription",
  backToPatients: "Back to Patients",
  saveButton: "Save Prescription",
  saved: "Prescription saved.",
  deleted: "Prescription deleted.",
  deleteFailed: "Could not delete the prescription.",
  deleteLabel: "Delete prescription",
  deleteTitle: "Delete this prescription?",
  /** `date` is already formatted. */
  deleteMessage: (date: string) => `The prescription of ${date} will be removed for good.`,
  deleteConfirm: "Delete Prescription",
  visit: "Visit",
  /** The visit's date and time, as a link: "8 Sep 2026, 10:00 AM". */
  visitWhen: (date: string, time: string) => `${date}, ${time}`,
  rx: "Rx",
  /** The number before each medicine on the paper: "1." */
  itemNumber: (n: number) => `${num(n)}.`,
  /** How long a medicine is taken: "5 days". */
  days: (n: number) => plural(n, { one: "# day", other: "# days" }),
  signature: "Doctor's signature",
  form: {
    patientPlaceholder: "Search by name or phone...",
    selectDoctor: "Select Doctor",
    medicines: "Medicines",
    addMedicine: "Add medicine",
    /** The group of fields of one medicine row: "Medicine 1". */
    row: (n: number) => `Medicine ${num(n)}`,
    medicine: "Medicine",
    chooseMedicine: "Choose a medicine",
    dose: "Dose",
    dosePlaceholder: "500 mg, 1 tablet, 10 ml",
    howOften: "How often",
    choose: "Choose",
    days: "Days",
    instructions: "Instructions",
    instructionsPlaceholder: "After food",
    removeRow: (n: number) => `Remove row ${num(n)}`,
    notes: "Notes for the patient",
    notesHint: "Printed under the medicines.",
    listFailed: "Could not load the medicine list.",
    needOne: "Add at least one medicine.",
    chooseEvery: "Choose a medicine for every row, or remove the empty rows.",
    saveFailed: "Could not save the prescription. Please try again.",
  },
  warnings: {
    none: "No warnings for this patient and these medicines.",
    title: "Check before signing",
    footer: "The warnings do not stop the prescription from being saved. The dentist decides.",
    /** `medicine` is the medicine's name and strength, e.g. "Amoxicillin 500 mg". */
    duplicate: (medicine: string) => `${medicine} is listed twice.`,
    /** `word` is the allergy word found in the patient's allergies. */
    allergy: (medicine: string, word: string) => `${medicine}: the patient's allergies say "${word}". Choose another medicine.`,
    /** `found` is what the patient record says (e.g. "warfarin"). */
    bloodThinner: (medicine: string, found: string) =>
      `${medicine} is an NSAID and the patient takes a blood thinner (${found}): a higher risk of bleeding. Paracetamol is the usual choice.`,
    pregnancy: (medicine: string) => `${medicine}: the patient may be pregnant. Check that it is safe, or choose another medicine.`,
    /** `note` is the medicine's own note for children, or childDefault. */
    child: (medicine: string, age: number, note: string) => `${medicine}: the patient is ${num(age)}. ${note}`,
    childDefault: "Check the dose for a child, by weight.",
    maxDose: (medicine: string, perDay: number, max: number) =>
      `${medicine}: ${num(perDay, { useGrouping: false })} mg a day is above the usual maximum of ${num(max, { useGrouping: false })} mg a day.`,
  },
};
