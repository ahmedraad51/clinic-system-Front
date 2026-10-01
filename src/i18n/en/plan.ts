import { num, plural } from "../runtime";

/** The clinic's plan (Settings → Plan), its limits, and the notices when the subscription ends. */
export const plan = {
  nav: { settings: "Settings", plan: "Plan" },
  navLabel: "Settings pages",
  title: "Plan",
  subtitle: "Your DentClinic plan, what it includes, and how much of it you use.",
  current: "Your Plan",
  statuses: { trial: "Free trial", active: "Active", ending: "Ending soon", grace: "Ended", locked: "View-only", suspended: "Suspended" },
  /** "IQD 45,000 a month" */
  price: (amount: string, period: "month" | "year") => `${amount} ${period === "month" ? "a month" : "a year"}`,
  trialEnds: (date: string) => `Free trial until ${date}.`,
  renews: (date: string) => `Paid until ${date}.`,
  ended: (date: string, lock: string) => `Ended on ${date}. Changes are still possible until ${lock}; after that the app is view-only.`,
  locked: (date: string) => `Ended on ${date}. The app is view-only until the plan is renewed. Nothing is lost.`,
  suspended: "This clinic is suspended. Please contact DentClinic.",
  daysLeft: (n: number) => plural(n, { zero: "Ends today", one: "# day left", other: "# days left" }),
  usageTitle: "What You Use",
  usage: {
    doctors: "Doctors",
    users: "Staff logins",
    storage: "X-rays and photos",
  },
  /** "4 of 8" */
  of: (used: string, limit: string) => `${used} of ${limit}`,
  unlimited: "no limit",
  /** "1.2 GB" */
  gb: (value: number) => `${num(Math.round(value * 10) / 10)} GB`,
  mb: (value: number) => `${num(Math.round(value))} MB`,
  nearLimit: "Almost at the limit.",
  atLimit: "At the limit.",
  plansTitle: "Plans",
  yourPlan: "Your plan",
  requestUpgrade: "Request an Upgrade",
  upgradeTitle: "Request a Plan Change",
  upgradeText: "Choose the plan you would like. We will contact you to arrange it; nothing changes until then.",
  newPlan: "Plan",
  note: "Note (optional)",
  send: "Send Request",
  sent: "Request sent. We will contact you soon.",
  pending: (planName: string, date: string) => `You asked for ${planName} on ${date}. We will contact you.`,
  contact: "Questions about your plan?",
  whatsapp: "WhatsApp Us",
  whatsappText: (clinic: string) => `Hello, this is ${clinic}. I have a question about our DentClinic plan.`,
  loadFailed: "Could not load your plan.",
  // Limits in the screens
  limitTitle: "Your plan's limit",
  limitDoctors: (limit: number, planName: string) =>
    `Your plan (${planName}) has room for ${plural(limit, { one: "# active doctor", other: "# active doctors" })}, and all are in use. Switch a doctor off, or ask for a bigger plan.`,
  limitUsers: (limit: number, planName: string) =>
    `Your plan (${planName}) has room for ${plural(limit, { one: "# staff login", other: "# staff logins" })}, and all are in use. Disable a user who has left, or ask for a bigger plan.`,
  limitStorage: (limit: string, planName: string) =>
    `Your plan (${planName}) has room for ${limit} of X-rays and photos, and these files would go over it. Ask for a bigger plan to add more.`,
  seePlan: "See Your Plan",
  // Notices across the app
  endingNotice: (date: string, days: string) => `Your DentClinic plan ends on ${date} (${days}). Renew it to keep working without a break.`,
  trialNotice: (date: string, days: string) => `Your free trial ends on ${date} (${days}). Choose a plan to keep your data and keep working.`,
  graceNotice: (date: string, lock: string) =>
    `Your DentClinic plan ended on ${date}. Renew it before ${lock}, or the app becomes view-only (nothing is lost).`,
  lockedTitle: "View-only: the plan has ended",
  lockedText: "Everything can still be seen, but nothing can be added or changed until the plan is renewed. No data is lost.",
  suspendedTitle: "View-only: this clinic is suspended",
  suspendedText: "Everything can still be seen, but nothing can be changed. Please contact DentClinic.",
  renew: "Renew",
};
