/** The treatment plan form (new and edit). */
export const treatmentForm = {
  searchPatient: "Search by name or phone...",
  selectDoctor: "Select Doctor",
  treatmentType: "Treatment Type",
  selectType: "Select Type",
  tooth: "Tooth",
  toothHint: "FDI number. Leave empty for whole-mouth work such as cleaning.",
  notToothSpecific: "Not tooth-specific",
  /** The groups of the tooth dropdown. */
  quadrants: {
    upperRight: "Upper right",
    upperLeft: "Upper left",
    lowerLeft: "Lower left",
    lowerRight: "Lower right",
    childUpperRight: "Child upper right",
    childUpperLeft: "Child upper left",
    childLowerLeft: "Child lower left",
    childLowerRight: "Child lower right",
  },
  /** "Total Cost (IQD)" */
  totalCost: (currency: string) => `Total Cost (${currency})`,
  /** `type` is the translated treatment type: "Usual price for crown: IQD 225,000". */
  usualPrice: (type: string, price: string) => `Usual price for ${type.toLowerCase()}: ${price}`,
  costInvalid: "Enter the total cost as a number.",
  saveFailed: "Could not save the treatment plan. Please try again.",
  diagnosis: "Diagnosis",
  treatmentNotes: "Treatment Notes",
};
