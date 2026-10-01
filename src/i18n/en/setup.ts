import { num } from "../runtime";

/** The first-run setup wizard of a new clinic (/setup), and the dashboard card that brings it back. */
export const setup = {
  title: "Set Up Your Clinic",
  subtitle: "A few steps, and the clinic is ready to use. Everything can be changed later in Settings.",
  /** "Step 2 of 6" */
  stepOf: (step: number, total: number) => `Step ${num(step)} of ${num(total)}`,
  steps: {
    clinic: "Clinic",
    money: "Currency",
    hours: "Open Days and Hours",
    doctors: "Doctors",
    prices: "Price List",
    staff: "Staff",
  },
  stepsLabel: "Setup steps",
  skip: "Skip for Now",
  back: "Back",
  next: "Next",
  saveNext: "Save and Continue",
  finish: "Finish",
  clinicText: "The name and logo are printed on receipts, prescriptions and the patient card.",
  moneyText:
    "The clinic's own currency: prices and totals are kept in it. A second currency (for example US dollars) can be added later in Settings.",
  hoursText: "The days and hours the clinic is open. Closed days are shaded in the appointment book.",
  doctorsText: "Add each dentist who sees patients. They appear in the appointment book and on treatment plans.",
  noDoctors: "No doctors yet. Add at least one to book appointments.",
  pricesText: "The usual price of each treatment. It fills in new treatment plans, and can be changed on each plan.",
  staffText:
    "Add the people who will log in: the front desk, the dentists, a manager. Each gets the usual permissions of their role, which can be changed later on Users.",
  noStaff: "No staff users yet.",
  doneTitle: "Your clinic is ready",
  doneText: "You can now add patients and book appointments. Anything set here can be changed in Settings.",
  goDashboard: "Go to the Dashboard",
  openSettings: "Open Settings",
  // The dashboard card while the wizard is not finished
  finishTitle: "Finish setting up your clinic",
  /** "You stopped at Price List (step 5 of 6)." */
  finishText: (step: string, at: number, total: number) => `You stopped at ${step} (step ${num(at)} of ${num(total)}).`,
  finishStart: "A few steps set the clinic's name, hours, doctors, prices and staff.",
  continueSetup: "Continue Setup",
  // Settings
  runWizard: "Setup Wizard",
};
