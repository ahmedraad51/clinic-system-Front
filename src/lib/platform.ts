import type { PlanKey } from "@/config/sales";
import type { SubscriptionStatus } from "./subscription";

/**
 * The platform: the part of DentClinic that sells it and keeps the clinics (the cloud's main address, PLATFORM_SITE_URL).
 * Its methods live on the platform's Frappe site (docs/backend-todo.md section 10); with the dummy data
 * src/lib/mockPlatform.ts answers. Only the "Platform Owner" role may call the owner's methods.
 */
export const PLATFORM_METHODS = {
  /** A visitor asks for a free trial (no login needed). */
  requestTrial: "dent_app.platform.request_trial",
  clinics: "dent_app.platform.clinics",
  createClinic: "dent_app.platform.create_clinic",
  recordPayment: "dent_app.platform.record_payment",
  setSuspended: "dent_app.platform.set_suspended",
  payments: "dent_app.platform.payments",
  trialRequests: "dent_app.platform.trial_requests",
  changeRequests: "dent_app.platform.change_requests",
} as const;

/** The role of whoever runs the platform (sees /platform). */
export const PLATFORM_ROLE = "Platform Owner";

/** What the free-trial form sends. */
export interface TrialRequest {
  clinic_name: string;
  contact_name: string;
  phone: string;
  city: string;
  email: string;
  plan: PlanKey;
  /** The web address the clinic would like ("alnoor"), or "". */
  address: string;
  message: string;
  /** The language the visitor used, so we answer in it. */
  language: "ar" | "en";
}

export interface TrialRequestDoc extends TrialRequest {
  name: string;
  creation: string;
  status: "New" | "Contacted" | "Started" | "Declined";
}

/** One clinic on the platform. */
export interface ClinicAccount {
  /** "CLN-00001" */
  name: string;
  clinic_name: string;
  /** Its web address name ("alnoor" → alnoor.dentclinic.example). */
  address: string;
  plan: PlanKey;
  status: SubscriptionStatus;
  manager_email: string;
  created_on: string;
  trial_ends_on: string | null;
  /** The last day that is paid for. */
  paid_until: string | null;
  usage: { doctors: number; users: number; storage_mb: number };
  last_payment_on: string | null;
}

/** Ways a clinic pays the platform by hand. */
export const PAYMENT_CHANNELS = ["Zain Cash", "FastPay", "Qi Card", "Bank Transfer", "Cash"] as const;
export type PaymentChannel = (typeof PAYMENT_CHANNELS)[number];

/** A payment from a clinic, recorded by the platform owner. */
export interface PlatformPayment {
  /** "PPY-00001" */
  name: string;
  clinic: string;
  clinic_name: string;
  amount: number;
  currency: string;
  method: PaymentChannel;
  paid_on: string;
  /** How many months (or years for a yearly plan) it pays for. */
  periods: number;
  /** The receipt or transfer number. */
  reference: string;
  /** The new last paid day. */
  paid_until: string;
}

/** A clinic asking for another plan (Settings → Plan). */
export interface ChangeRequest {
  name: string;
  clinic: string;
  clinic_name: string;
  from_plan: PlanKey;
  plan: PlanKey;
  note: string;
  requested_on: string;
}
