"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { MOCK_DATA } from "@/lib/frappe";
import {
  BUILT_MODE, CLOUD_DOMAIN, clinicFromHost, currentMode, isMainAddress, subscribeDemoMode, type DeploymentMode,
} from "@/lib/deployment";

interface DeploymentInfo {
  /** How this copy is installed: cloud, clinic-server or cloud-copy (see src/lib/deployment.ts). */
  mode: DeploymentMode;
  /** The clinic named by the web address in the cloud ("alnoor"), or null. */
  clinic: string | null;
  /** The cloud's main address: the public website, no clinic. */
  mainAddress: boolean;
  /** True when the mode is only previewed on this computer (dummy data), not built in. */
  previewed: boolean;
}

const DeploymentContext = createContext<DeploymentInfo | null>(null);

const noop = () => () => {};
const hostname = () => window.location.hostname;
const serverHostname = () => "";

/** The deployment mode and the clinic of the web address, for every screen. */
export function DeploymentProvider({ children }: { children: ReactNode }) {
  // The built mode, or the one previewed with the dummy data. The first render matches the server's (the built one).
  const mode = useSyncExternalStore(subscribeDemoMode, () => currentMode(MOCK_DATA), () => BUILT_MODE);
  // The host name is read after the first render (the server does not know it when prerendering).
  const host = useSyncExternalStore(noop, hostname, serverHostname);
  const value = useMemo<DeploymentInfo>(() => {
    const cloud = mode === "cloud" && Boolean(CLOUD_DOMAIN);
    return {
      mode,
      clinic: cloud && host ? clinicFromHost(host) : null,
      mainAddress: cloud && Boolean(host) && isMainAddress(host),
      previewed: mode !== BUILT_MODE,
    };
  }, [mode, host]);
  return <DeploymentContext.Provider value={value}>{children}</DeploymentContext.Provider>;
}

export function useDeployment(): DeploymentInfo {
  const ctx = useContext(DeploymentContext);
  if (!ctx) throw new Error("useDeployment must be used within DeploymentProvider");
  return ctx;
}
