import { useSyncExternalStore } from "react";

/**
 * How this copy of DentClinic is installed. One app, three ways to sell it:
 *
 * - "cloud": online, one Frappe site per clinic. With CLOUD_DOMAIN set, the clinic comes from the web address
 *   (alnoor.dentclinic.example → the "alnoor" clinic); the main address itself is the public website. Without it, the
 *   app serves the one clinic at FRAPPE_URL.
 * - "clinic-server": on a small computer inside the clinic, working with no internet at all.
 * - "cloud-copy": the online copy of a clinic server, which the owner views from home. Everything is view-only.
 *
 * Set with the DEPLOYMENT_MODE environment variable before `npm run build` (next.config.ts puts it into the app).
 */
export const DEPLOYMENT_MODES = ["cloud", "clinic-server", "cloud-copy"] as const;
export type DeploymentMode = (typeof DEPLOYMENT_MODES)[number];

/** The value next.config.ts built into the app (it checks it and falls back to "cloud"). */
export const BUILT_MODE: DeploymentMode = asMode(process.env.DEPLOYMENT_MODE) ?? "cloud";

/** The main web address of the cloud ("dentclinic.example"), or "" for a single clinic. */
export const CLOUD_DOMAIN = (process.env.CLOUD_DOMAIN ?? "").toLowerCase();

/** Web addresses that are never a clinic: "www.dentclinic.example" is the public website too. */
export const RESERVED_ADDRESSES = ["www", "admin", "api", "app", "mail"];

/**
 * A clinic's web address (the part before the main address): 3 to 30 lowercase letters, digits and hyphens, starting
 * with a letter and not ending with a hyphen. next.config.ts uses the same rule (CLINIC_SLUG there); keep them equal.
 */
export const CLINIC_ADDRESS_PATTERN = /^[a-z][a-z0-9-]{1,28}[a-z0-9]$/;

export function isValidClinicAddress(slug: string): boolean {
  return CLINIC_ADDRESS_PATTERN.test(slug) && !RESERVED_ADDRESSES.includes(slug);
}

function asMode(value: unknown): DeploymentMode | null {
  return DEPLOYMENT_MODES.includes(value as DeploymentMode) ? (value as DeploymentMode) : null;
}

/**
 * The clinic named by a host name in the cloud ("alnoor.dentclinic.example" → "alnoor"), or null: the main address,
 * another domain, a reserved name, or a single-clinic install (no CLOUD_DOMAIN).
 */
export function clinicFromHost(hostname: string, domain = CLOUD_DOMAIN): string | null {
  const host = hostname.toLowerCase().replace(/:\d+$/, "");
  if (!domain || !host.endsWith(`.${domain}`)) return null;
  const slug = host.slice(0, -(domain.length + 1));
  return isValidClinicAddress(slug) ? slug : null;
}

/** True on the cloud's main address (or www.): the public website, where no clinic is named. */
export function isMainAddress(hostname: string, domain = CLOUD_DOMAIN): boolean {
  const host = hostname.toLowerCase().replace(/:\d+$/, "");
  return Boolean(domain) && (host === domain || host === `www.${domain}`);
}

/** A clinic's own web address in the cloud ("alnoor.dentclinic.example"), for the platform owner's list. */
export function clinicAddress(slug: string, domain = CLOUD_DOMAIN || "dentclinic.example"): string {
  return `${slug}.${domain}`;
}

/* --- Previewing a mode with the dummy data ---------------------------------------------------------------------
   The mode is fixed when the app is built. With the dummy data (MOCK_DATA in src/lib/frappe.ts) the profile page can
   preview another one on this computer, so all three can be checked without building three times. */

export const DEMO_MODE_KEY = "demo_deployment_mode";
const listeners = new Set<() => void>();

function readDemoMode(): DeploymentMode | null {
  try {
    return asMode(localStorage.getItem(DEMO_MODE_KEY));
  } catch {
    return null;
  }
}

/** Previews a mode on this computer (dummy data only); null goes back to the built one. */
export function setDemoMode(mode: DeploymentMode | null): void {
  try {
    if (mode && mode !== BUILT_MODE) localStorage.setItem(DEMO_MODE_KEY, mode);
    else localStorage.removeItem(DEMO_MODE_KEY);
  } catch {
    // Storage blocked: the built mode stays.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === DEMO_MODE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The mode in effect now, outside React (data layer, mock). `allowDemo` is false for a real back end. */
export function currentMode(allowDemo: boolean): DeploymentMode {
  if (!allowDemo || typeof window === "undefined") return BUILT_MODE;
  return readDemoMode() ?? BUILT_MODE;
}

/** The mode in effect, in a component. The first render matches the server's (the built mode). */
export function useDeploymentMode(allowDemo: boolean): DeploymentMode {
  return useSyncExternalStore(
    subscribe,
    () => currentMode(allowDemo),
    () => BUILT_MODE,
  );
}
