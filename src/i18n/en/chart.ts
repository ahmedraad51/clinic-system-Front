import { plural } from "../runtime";

const ADULT_NAMES = ["", "central incisor", "lateral incisor", "canine", "first premolar", "second premolar", "first molar", "second molar", "third molar (wisdom tooth)"];
const CHILD_NAMES = ["", "central incisor", "lateral incisor", "canine", "first molar", "second molar"];

/** The dental chart (DentalChart, src/lib/dentalChart.ts) and its printout. */
export const chart = {
  title: "Dental Chart",
  /** "No findings", "1 tooth with findings", "3 teeth with findings" */
  findingsCount: (n: number) => (n === 0 ? "No findings" : plural(n, { one: "# tooth with findings", other: "# teeth with findings" })),
  clickToMark: "click a tooth to mark it",
  clickToSee: "click a tooth to see it",
  teeth: "Teeth",
  adult: "Adult",
  child: "Child",
  undo: "Undo",
  saveChart: "Save Chart",
  patientsRight: "Patient's right",
  patientsLeft: "Patient's left",
  upperJaw: "Upper jaw",
  lowerJaw: "Lower jaw",
  openPlan: "Has an open treatment plan",
  /** The tooth button: "Tooth 46, Lower right first molar: caries O". */
  toothButton: (tooth: number, name: string, description: string) => `Tooth ${tooth}, ${name}${description ? `: ${description}` : ""}`,
  findings: "Findings",
  nothingMarked: "Nothing marked. All teeth are recorded as healthy.",
  noteOnly: "Note only",

  // The tooth panel
  tooth: (tooth: number) => `Tooth ${tooth}`,
  closePanel: "Close tooth panel",
  legacyNotice: (mark: string) => `The old chart marked this tooth as "${mark}".`,
  legacyEditHint: "Mark what it has below, or press Healthy to clear the old mark.",
  surfacesOf: (tooth: number) => `Surfaces of tooth ${tooth}`,
  /** "Mesial surface: caries" */
  surfaceButton: (surface: string, state: string) => `${surface} surface: ${state}`,
  healthySurface: "healthy",
  markSurfacesAs: "Mark surfaces as",
  clear: "Clear",
  toolHint: "Choose Caries, Filling or Clear, then tap the surfaces.",
  /** The surface letters stay M, O, D, B, L on the drawing; this line says what they mean. */
  surfaceKey: "M mesial · O occlusal · D distal · B buccal · L lingual",
  wholeTooth: "Whole tooth",
  healthy: "Healthy",
  note: "Note",
  notePlaceholder: "e.g. sensitive to cold, crack on the buccal cusp",
  plansForTooth: "Treatment plans for this tooth",
  noneYet: "None yet.",
  newTreatmentForTooth: "New treatment for this tooth",

  // Labels (also used by describeTooth in src/lib/dentalChart.ts)
  conditions: {
    crown: "Crown",
    root_canal: "Root canal",
    implant: "Implant",
    bridge: "Bridge",
    missing: "Missing",
    extract: "To extract",
  },
  findingNames: {
    caries: "Caries",
    filling: "Filling",
  },
  surfaces: {
    M: "Mesial",
    O: "Occlusal",
    D: "Distal",
    B: "Buccal",
    L: "Lingual",
  },
  legacy: {
    treated: "Has treatment (old chart)",
    pending: "Needs treatment (old chart)",
  },
  /** A label after the first one in a line: "Root canal, crown". */
  inList: (label: string) => label.toLowerCase(),
  listSeparator: ", ",
  /**
   * The name of a tooth from its place: 36 → "Lower left first molar", 55 → "Upper right second molar (child)".
   * `position` is the last FDI digit (1 central incisor … 8 third molar).
   */
  toothName: (position: number, upper: boolean, right: boolean, child: boolean) =>
    `${upper ? "Upper" : "Lower"} ${right ? "right" : "left"} ${(child ? CHILD_NAMES : ADULT_NAMES)[position] ?? ""}${child ? " (child)" : ""}`,

  // The printout
  letterheadKind: "Dental chart",
  patientWhat: "Patient",
  backToPatients: "Back to Patients",
};
