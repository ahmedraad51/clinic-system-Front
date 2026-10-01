import { WARN_DAYS, type PlanKey } from "@/config/sales";
import { addDays, todayISO } from "./format";

/**
 * The licence of a clinic server: what lets DentClinic run on the clinic's own computer, for a plan, until a day.
 * The methods live in dent_app (docs/backend-todo.md section 10); with the dummy data src/lib/mockPlatform.ts answers.
 * A clinic server's plan (useSubscription) comes from its licence.
 */
export const LICENSE_METHODS = {
  status: "dent_app.api.license.status",
  /** Takes a new key (`key`), checks it on this server, and answers the new LicenseStatus. */
  activate: "dent_app.api.license.activate",
} as const;

/** "DCL-4F2A-8K3M-Q7T1-9C1E": DCL and four groups of four capital letters or digits. */
export const LICENSE_KEY_PATTERN = /^DCL(-[A-Z0-9]{4}){4}$/;

/** A typed key, cleaned: capitals, no spaces, dashes put back ("dcl 4f2a8k3m…" → "DCL-4F2A-8K3M-…"). */
export function cleanLicenseKey(text: string): string {
  const raw = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = raw.startsWith("DCL") ? raw.slice(3) : raw;
  const groups = body.match(/.{1,4}/g) ?? [];
  return ["DCL", ...groups].join("-");
}

/** The answer of LICENSE_METHODS.status. */
export interface LicenseStatus {
  /** The key with its middle hidden ("DCL-4F2A-••••-••••-9C1E"). */
  key: string;
  /** The clinic it was issued to. */
  clinic_name: string;
  plan: PlanKey;
  issued_on: string;
  /** The last day it is valid. */
  expires_on: string;
  /** "invalid": the key does not belong to this server (copied to another computer) or was changed. */
  status: "valid" | "expired" | "invalid";
  /** Days after it ends while the app still works; then it is view-only. */
  grace_days: number;
  /** This computer's ID, which the key is made for (asked for when renewing). */
  server_id: string;
}

export interface LicenseState {
  /** Whole days until the last valid day (negative once passed). */
  daysLeft: number;
  /** It ends within WARN_DAYS (14). */
  ending: boolean;
  /** It has ended. */
  ended: boolean;
  /** The first day the app is view-only. */
  lockOn: string;
}

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

export function licenseState(license: LicenseStatus, today = todayISO()): LicenseState {
  const daysLeft = daysBetween(today, license.expires_on);
  const lockOn = addDays(license.expires_on, license.grace_days + 1);
  return { daysLeft, ending: daysLeft >= 0 && daysLeft <= WARN_DAYS, ended: daysLeft < 0 || license.status === "expired", lockOn };
}
