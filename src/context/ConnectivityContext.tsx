"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useDeployment } from "./DeploymentContext";
import { callMethod, isConnectionLost, onConnectionChange } from "@/lib/frappe";
import { bumpData } from "@/lib/dataVersion";
import { subscribeDemoFlags } from "@/lib/demo";
import { SERVER_METHODS, type ServerStatus } from "@/lib/server";

/** Whether the server answers: "checking" until the first answer (or failure). */
export type ServerReach = "checking" | "ok" | "unreachable";

interface ConnectivityInfo {
  /** The browser has a network at all (navigator.onLine). */
  browserOnline: boolean;
  /** The server answered the last request, or did not. */
  server: ServerReach;
  /** Something on the internet (WhatsApp) can be opened from here: a clinic server says whether it has the internet. */
  internet: boolean;
  /** The server's last answer about itself (its clock, the internet, the cloud copy), or null when unknown. */
  status: ServerStatus | null;
  /** Asks the server again now. */
  check: () => void;
}

const ConnectivityContext = createContext<ConnectivityInfo | null>(null);

/** How often the server is asked about itself, and how often while it cannot be reached. */
const POLL_MS = 30_000;
const RETRY_MS = 10_000;

function subscribeOnline(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

/**
 * The connection to the clinic's server and, through it, to the internet. Every request reports whether the server
 * answered (onConnectionChange in src/lib/frappe.ts), and the server is asked about itself every 30 seconds
 * (SERVER_METHODS.status): its clock, whether it has the internet, and the cloud copy.
 */
export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { mode } = useDeployment();
  const browserOnline = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [server, setServer] = useState<ServerReach>("checking");
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [version, setVersion] = useState(0);
  const reach = useRef<ServerReach>("checking");

  // Every request says whether the server answered. Setting the same value again does not draw anything again.
  useEffect(
    () =>
      onConnectionChange((reachable) => {
        const next = reachable ? "ok" : "unreachable";
        // Back after a break: ask about the internet and the cloud copy again at once, and every list and page loads
        // again (they showed the last copy while offline).
        if (next === "ok" && reach.current === "unreachable") {
          setVersion((v) => v + 1);
          bumpData();
        }
        reach.current = next;
        setServer(next);
      }),
    [],
  );

  // The network back on this computer: every list and page loads again.
  const wasOnline = useRef(browserOnline);
  useEffect(() => {
    if (browserOnline && !wasOnline.current) bumpData();
    wasOnline.current = browserOnline;
  }, [browserOnline]);

  // The pretend switches of the dummy data (My Profile) change what the server says about itself.
  useEffect(() => subscribeDemoFlags(() => setVersion((v) => v + 1)), []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let timer: number | undefined;
    const load = async () => {
      try {
        const answer = await callMethod<ServerStatus>(SERVER_METHODS.status);
        if (!cancelled) setStatus(answer);
      } catch (err) {
        // A server without the method (an older dent_app): nothing is known, and nothing is held back.
        if (!cancelled && !isConnectionLost(err)) setStatus(null);
      } finally {
        if (!cancelled) timer = window.setTimeout(load, reach.current === "unreachable" ? RETRY_MS : POLL_MS);
      }
    };
    load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [user, mode, browserOnline, version]);

  const check = useCallback(() => setVersion((v) => v + 1), []);

  const value = useMemo<ConnectivityInfo>(() => {
    const internet = !browserOnline ? false : mode === "clinic-server" ? (status?.internet ?? true) : true;
    return { browserOnline, server: browserOnline ? server : "unreachable", internet, status, check };
  }, [browserOnline, server, status, mode, check]);

  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
}

export function useConnectivity(): ConnectivityInfo {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) throw new Error("useConnectivity must be used within ConnectivityProvider");
  return ctx;
}
