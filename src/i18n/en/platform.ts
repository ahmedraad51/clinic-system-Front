/** The platform owner's area (/platform): the clinics, their payments, trial and plan requests. */
export const platform = {
  errors: {
    clinic: "That clinic was not found.",
    clinicName: "Write the clinic's name.",
    address: "The web address must be 3 to 30 English letters, digits or hyphens, starting with a letter.",
    addressTaken: (address: string) => `The web address ${address} is taken.`,
    plan: "Choose a plan.",
    email: "Write the manager's email address.",
    amount: "The amount must be more than 0.",
    method: "Choose how it was paid.",
    periods: "Choose how many months or years it pays for (1 to 36).",
  },
};
