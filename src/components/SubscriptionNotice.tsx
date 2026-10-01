"use client";

import { useSyncExternalStore } from "react";
import { CalendarClock, X } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { formatDate, todayISO } from "@/lib/format";

/** Hidden for the rest of the day once closed, on this computer. */
const HIDDEN_KEY = "plan_notice_hidden";
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const hiddenToday = () => {
  try {
    return localStorage.getItem(HIDDEN_KEY) === todayISO();
  } catch {
    return false;
  }
};

/**
 * Above every page while the plan needs attention:
 * - it (or the free trial) ends within WARN_DAYS: the manager is told, and can close it for the day;
 * - it has ended and is in its grace days: everyone is told when the app becomes view-only (it cannot be closed).
 * After the grace days ReadOnlyBanner takes over.
 */
export default function SubscriptionNotice() {
  const { t } = useI18n();
  const p = t.plan;
  const { can, readOnly } = useSession();
  const { subscription, state } = useSubscription();
  const hidden = useSyncExternalStore(subscribe, hiddenToday, () => false);
  if (!subscription || !state || readOnly) return null;
  const manager = can("manage_users");

  let text = "";
  let urgent = false;
  if (state.phase === "grace" && state.endsOn && state.lockOn) {
    text = p.graceNotice(formatDate(state.endsOn), formatDate(state.lockOn));
    urgent = true;
  } else if (state.phase === "ending" && manager && !hidden && state.endsOn && state.daysLeft !== null) {
    const days = p.daysLeft(state.daysLeft);
    text = subscription.status === "trial" ? p.trialNotice(formatDate(state.endsOn), days) : p.endingNotice(formatDate(state.endsOn), days);
  }
  if (!text) return null;

  const close = () => {
    try {
      localStorage.setItem(HIDDEN_KEY, todayISO());
    } catch {
      // No storage: it shows again on the next page.
    }
    listeners.forEach((listener) => listener());
  };

  return (
    <div className="px-4 sm:px-6 pt-4 print:hidden">
      <div
        role="status"
        data-testid="plan-notice"
        className={`mx-auto max-w-[87rem] content-wide:max-w-none flex flex-wrap items-center gap-3 rounded-md border px-4 py-3 ${
          urgent ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"
        }`}
      >
        <CalendarClock size={20} className={urgent ? "shrink-0 text-red-700" : "shrink-0 text-yellow-800"} aria-hidden="true" />
        <p className="flex-1 min-w-[12rem] text-sm text-gray-900">{text}</p>
        {manager && (
          <LinkButton href="/settings/plan" size="sm" variant={urgent ? "primary" : "secondary"}>
            {p.renew}
          </LinkButton>
        )}
        {!urgent && (
          <button
            type="button"
            onClick={close}
            aria-label={t.common.close}
            className="w-9 h-9 pointer-coarse:w-11 pointer-coarse:h-11 rounded-md flex items-center justify-center text-gray-700 hover:bg-yellow-100"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
