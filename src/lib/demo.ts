/**
 * Switches for checking the app with the dummy data (MOCK_DATA): on this computer only, kept in localStorage, offered on
 * My Profile. They let one build show what a real installation shows when something is wrong. Tests set the same keys
 * with page.addInitScript. A real back end ignores them (every reader checks MOCK_DATA first).
 */
export const DEMO_FLAGS = {
  /** The clinic server has no internet (WhatsApp cannot be opened). */
  noInternet: "demo_no_internet",
  /** The server cannot be reached: every request fails, as when the clinic's network is down. */
  serverDown: "demo_server_down",
} as const;
export type DemoFlag = keyof typeof DEMO_FLAGS;

const listeners = new Set<() => void>();

export function demoFlag(flag: DemoFlag): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(DEMO_FLAGS[flag]) === "1";
  } catch {
    return false;
  }
}

export function setDemoFlag(flag: DemoFlag, on: boolean): void {
  try {
    if (on) localStorage.setItem(DEMO_FLAGS[flag], "1");
    else localStorage.removeItem(DEMO_FLAGS[flag]);
  } catch {
    // Storage blocked: nothing to pretend.
  }
  listeners.forEach((listener) => listener());
}

/** Calls the listener when a switch changes (here or in another tab). */
export function subscribeDemoFlags(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key && Object.values(DEMO_FLAGS).includes(event.key as (typeof DEMO_FLAGS)[DemoFlag])) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
