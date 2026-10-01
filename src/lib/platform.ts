import type { PlanKey } from "@/config/sales";

/**
 * The platform: the part of DentClinic that sells it (the cloud's main address, PLATFORM_SITE_URL). Its methods live on
 * the platform's Frappe site (docs/backend-todo.md section 10); with the dummy data src/lib/mockPlatform.ts answers.
 */
export const PLATFORM_METHODS = {
  /** A visitor asks for a free trial (no login needed). */
  requestTrial: "dent_app.platform.request_trial",
} as const;

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
