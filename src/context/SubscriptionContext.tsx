"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useDeployment } from "./DeploymentContext";
import { useDataVersion } from "@/lib/dataVersion";
import { callMethod, errorMessage } from "@/lib/frappe";
import { overLimit, subscriptionState, SUBSCRIPTION_METHODS, type LimitKind, type Subscription, type SubscriptionState } from "@/lib/subscription";

interface SubscriptionInfo {
  /** The clinic's plan, limits and use, or null until it has loaded (or when the server does not know it). */
  subscription: Subscription | null;
  /** Where it stands today: active, ending, in its grace days, view-only. */
  state: SubscriptionState | null;
  loading: boolean;
  error: string;
  /** True when one more doctor, user (or `addMb` more files) would go over the plan's limit. */
  overLimit: (kind: LimitKind, addMb?: number) => boolean;
  refresh: () => void;
}

const SubscriptionContext = createContext<SubscriptionInfo | null>(null);

/** How often the plan is asked again while the app stays open. */
const REFRESH_MS = 10 * 60_000;

/**
 * The clinic's subscription (SUBSCRIPTION_METHODS.status), for the Plan page, the limits in the screens and the
 * notices when it ends. Loaded after login, again after every save (a new doctor changes the use) and every 10 minutes.
 * The view-only cloud copy has no subscription of its own.
 */
export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { mode } = useDeployment();
  const dataVersion = useDataVersion();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!user || mode === "cloud-copy") return;
    let cancelled = false;
    let timer: number | undefined;
    const load = async () => {
      try {
        const answer = await callMethod<Subscription>(SUBSCRIPTION_METHODS.status);
        if (!cancelled) {
          setSubscription(answer);
          setError("");
        }
      } catch (err) {
        // Kept as it was: a failed check never locks anyone out.
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) {
          setLoaded(true);
          timer = window.setTimeout(() => setVersion((v) => v + 1), REFRESH_MS);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [user, mode, dataVersion, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const value = useMemo<SubscriptionInfo>(() => {
    const active = mode === "cloud-copy" ? null : subscription;
    return {
      subscription: active,
      state: subscriptionState(active),
      loading: Boolean(user) && mode !== "cloud-copy" && !loaded,
      error,
      overLimit: (kind, addMb = 0) => overLimit(active, kind, addMb),
      refresh,
    };
  }, [subscription, loaded, error, mode, user, refresh]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionInfo {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
