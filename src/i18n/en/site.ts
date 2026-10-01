import { num, plural } from "../runtime";

/** The public website on the cloud's main address (/site): what DentClinic is, the plans, a free trial. */
export const site = {
  title: "DentClinic",
  tagline: "Run your dental clinic in Arabic and English: patients, appointments, treatments, payments and reports.",
  language: "Language",
  nav: {
    label: "On this page",
    features: "Features",
    plans: "Plans",
    trial: "Free Trial",
    yourClinic: "Log in",
  },
  // The top of the page
  heroTitle: "Your dental clinic, organised, in Arabic and English",
  heroText:
    "Patients and their records, the appointment book, treatment plans with the dental chart, payments, receipts and reports. Online, or on a small computer inside your clinic.",
  startTrial: "Start a Free Trial",
  talkWhatsapp: "Talk to Us on WhatsApp",
  /** "Free for 14 days. Nothing to pay to try it." */
  trialNote: (days: number) => `Free for ${plural(days, { one: "# day", other: "# days" })}. Nothing to pay to try it.`,
  whatsappText: "Hello, I would like to know more about DentClinic.",
  heroImage: "The DentClinic dashboard",
  // Features
  featuresTitle: "Everything the clinic does in a day",
  features: {
    patients: { title: "Patients and medical alerts", text: "Every patient's details, allergies and medicines, with clear alerts wherever treatment is decided." },
    appointments: { title: "Appointment book", text: "A day and week calendar per doctor, booking in a few taps, the waiting room and the Today board." },
    chart: { title: "Dental chart and treatments", text: "Per-tooth charting, treatment plans and sessions, X-rays and photos, and prescriptions." },
    money: { title: "Payments and reports", text: "Payments in dinars and dollars, printed receipts, the end-of-day cash count, expenses and profit." },
    whatsapp: { title: "WhatsApp reminders", text: "Reminders and receipts ready to send on WhatsApp, in the patient's language." },
    offline: { title: "Works without internet", text: "The Clinic Server keeps working when the internet is down. The cloud copy lets you look from home." },
  },
  // Screenshots
  screensTitle: "See it",
  screens: {
    dashboard: "The dashboard: today's visits and what needs attention",
    patient: "A patient's page, with medical alerts at the top",
    appointments: "The appointment book, a column per doctor",
    "dental-chart": "The dental chart",
  },
  // The plans
  plansTitle: "Plans",
  plansText: "Choose how DentClinic runs for you. Every plan has every feature, in Arabic and English.",
  perMonth: "a month",
  perYear: "a year",
  /** "+ IQD 300,000 once, to set it up" */
  setupFee: (amount: string) => `+ ${amount} once, to set it up`,
  mostChosen: "Most chosen",
  choosePlan: "Start with This Plan",
  limits: {
    doctors: (n: number | null) => (n === null ? "Any number of doctors" : plural(n, { one: "Up to # doctor", other: "Up to # doctors" })),
    users: (n: number | null) => (n === null ? "Any number of staff" : plural(n, { one: "Up to # staff login", other: "Up to # staff logins" })),
    storage: (gb: number) => `${num(gb)} GB for X-rays and photos`,
  },
  plans: {
    cloud: {
      name: "Cloud",
      text: "Online, nothing to install. Your clinic has its own web address, and we keep it running and backed up.",
      points: ["Use it from any computer, tablet or phone", "Daily backups", "Updates included"],
    },
    server: {
      name: "Clinic Server",
      text: "A small computer inside your clinic. Works even when the internet is down; your data stays in the clinic.",
      points: ["Works with no internet", "Your data stays in the clinic", "Backups to USB"],
    },
    "server-cloud": {
      name: "Clinic Server + Cloud copy",
      text: "The Clinic Server, plus an automatic copy online that you can look at from home.",
      points: ["Everything in Clinic Server", "See the clinic from home", "A second copy of your data online"],
    },
  },
  // The free-trial form
  trialTitle: "Ask for a Free Trial",
  trialText: "Tell us about your clinic. We will set it up and send you the address and the login on WhatsApp.",
  clinicName: "Clinic name",
  contactName: "Your name",
  phone: "Mobile number (WhatsApp)",
  city: "City",
  email: "Email",
  plan: "Plan",
  address: "Web address you would like",
  /** "alnoor.dentclinic.example" */
  addressHint: (example: string) => `Letters, digits and hyphens, for example ${example}`,
  addressInvalid: "Use 3 to 30 English letters, digits or hyphens, starting with a letter.",
  message: "Anything else we should know",
  send: "Send",
  required: "Fill in this field.",
  phoneInvalid: "Write a mobile number, for example 0770 123 4567.",
  sentTitle: "Thank you!",
  sentText: "We received your request and will contact you on WhatsApp soon.",
  sendFailed: "Could not send the request. Please try again, or write to us on WhatsApp.",
  footer: (year: number) => `© ${year} DentClinic`,
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
