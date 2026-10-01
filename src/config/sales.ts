/**
 * Selling DentClinic: the plans with their prices and limits, the free trial, and how to reach us.
 * This is the one file to edit to change a price; the public website (/site), a clinic's Plan page and the plan
 * limits in the app all read it. The texts that describe each plan are in src/i18n/{en,ar}/site.ts (plans).
 *
 * The server keeps each clinic's own plan and limits (docs/backend-todo.md, "Plans"); these are the published ones,
 * used for new clinics and shown to visitors.
 */

/** The three plans: one for each way of installing (DEPLOYMENT_MODE). */
export const PLAN_KEYS = ["cloud", "server", "server-cloud"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export interface PlanLimits {
  /** Active doctors; null means no limit. */
  doctors: number | null;
  /** Staff users who can log in (not counting Administrator); null means no limit. */
  users: number | null;
  /** Room for X-rays, photos and other files, in GB. */
  storageGb: number;
}

export interface Plan {
  key: PlanKey;
  /** The price, and what it pays for: a month or a year. */
  price: number;
  currency: string;
  period: "month" | "year";
  /** A one-time charge for installing the clinic server (0: none). */
  setupFee: number;
  limits: PlanLimits;
  /** Shown as "Most chosen" on the website. */
  highlight?: boolean;
}

export const PLANS: Record<PlanKey, Plan> = {
  cloud: {
    key: "cloud",
    price: 45_000,
    currency: "IQD",
    period: "month",
    setupFee: 0,
    limits: { doctors: 5, users: 10, storageGb: 20 },
    highlight: true,
  },
  server: {
    key: "server",
    price: 450_000,
    currency: "IQD",
    period: "year",
    setupFee: 300_000,
    limits: { doctors: 10, users: 20, storageGb: 500 },
  },
  "server-cloud": {
    key: "server-cloud",
    price: 650_000,
    currency: "IQD",
    period: "year",
    setupFee: 300_000,
    limits: { doctors: 10, users: 20, storageGb: 500 },
  },
};

/** Days of the free trial (a cloud clinic, ready to use). */
export const TRIAL_DAYS = 14;

/** Days a clinic can still change things after its subscription ends, before it becomes view-only. */
export const GRACE_DAYS = 7;

/** Days before the end of a subscription or licence when the app starts to warn. */
export const WARN_DAYS = 14;

/** How visitors and clinics reach us: WhatsApp (digits with the country code) and email. */
export const CONTACT = {
  whatsapp: "9647700000000",
  email: "sales@dentclinic.example",
};
