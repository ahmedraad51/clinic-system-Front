import { GRACE_DAYS, WARN_DAYS, type PlanKey, type PlanLimits } from "@/config/sales";
import { addDays, todayISO } from "./format";

/**
 * A clinic's subscription: its plan, until when it is paid, its limits and what it uses. The clinic's own site answers
 * (the platform keeps it up to date; a clinic server works it out from its licence); see docs/backend-todo.md.
 */
export const SUBSCRIPTION_METHODS = {
  status: "dent_app.api.subscription.status",
  /** Ask the platform for another plan (an upgrade). */
  requestChange: "dent_app.api.subscription.request_change",
} as const;

/** "trial": the free trial; "active": paid; "ended": not renewed in time; "suspended": stopped by the platform. */
export type SubscriptionStatus = "trial" | "active" | "ended" | "suspended";

export interface Subscription {
  plan: PlanKey;
  status: SubscriptionStatus;
  /** The last day of the trial (status "trial"). */
  trial_ends_on: string | null;
  /** The last day that is paid for (status "active" or "ended"). */
  paid_until: string | null;
  /** Days after the end when changes are still allowed (see GRACE_DAYS). */
  grace_days: number;
  /** This clinic's own limits (they may differ from the published ones in src/config/sales.ts). */
  limits: PlanLimits;
  /** What the clinic uses now: active doctors, staff users who can log in, X-rays and other files in MB. */
  usage: { doctors: number; users: number; storage_mb: number };
  /** The price this clinic pays. */
  price: number;
  currency: string;
  period: "month" | "year";
  /** A plan change asked for and not answered yet. */
  pending_request: { plan: PlanKey; requested_on: string } | null;
}

/**
 * Where the subscription stands today:
 * - "trial" / "active": all fine;
 * - "ending": fine, but it ends within WARN_DAYS (the manager is told);
 * - "grace": it has ended, but changes are still allowed until `lockOn`;
 * - "locked": ended and past the grace days, or suspended: the app is view-only.
 */
export type SubscriptionPhase = "trial" | "active" | "ending" | "grace" | "locked";

export interface SubscriptionState {
  phase: SubscriptionPhase;
  /** The last day of the trial or of what is paid. */
  endsOn: string | null;
  /** Whole days until that day (negative once it has passed). */
  daysLeft: number | null;
  /** The first day the app is view-only (end + grace days + 1). */
  lockOn: string | null;
  suspended: boolean;
}

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

export function subscriptionState(sub: Subscription | null, today = todayISO()): SubscriptionState | null {
  if (!sub) return null;
  if (sub.status === "suspended") return { phase: "locked", endsOn: null, daysLeft: null, lockOn: null, suspended: true };
  const endsOn = sub.status === "trial" ? sub.trial_ends_on : sub.paid_until;
  if (!endsOn) return { phase: sub.status === "trial" ? "trial" : "active", endsOn: null, daysLeft: null, lockOn: null, suspended: false };
  const daysLeft = daysBetween(today, endsOn);
  const lockOn = addDays(endsOn, (sub.grace_days ?? GRACE_DAYS) + 1);
  if (daysLeft < 0 || sub.status === "ended") {
    return { phase: today >= lockOn ? "locked" : "grace", endsOn, daysLeft, lockOn, suspended: false };
  }
  if (daysLeft <= WARN_DAYS) return { phase: "ending", endsOn, daysLeft, lockOn, suspended: false };
  return { phase: sub.status === "trial" ? "trial" : "active", endsOn, daysLeft, lockOn, suspended: false };
}

/** A limit the clinic is at (or over): adding one more of it is refused. */
export type LimitKind = "doctors" | "users" | "storage";

/** True when one more doctor or user (or `addMb` more files) would go over the plan's limit. */
export function overLimit(sub: Subscription | null, kind: LimitKind, addMb = 0): boolean {
  if (!sub) return false;
  if (kind === "storage") return sub.usage.storage_mb + addMb > sub.limits.storageGb * 1024;
  const limit = sub.limits[kind];
  return limit !== null && sub.usage[kind] >= limit;
}
