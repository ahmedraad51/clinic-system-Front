/**
 * How the app looks on this computer: light, dark or the computer's own setting, a menu that collapses to icons,
 * cards with borders instead of shadows, a dark menu on a light page, and a boxed or full-width page. Kept in
 * localStorage (each computer at the clinic can differ) and applied as classes on <html> before the first paint
 * by APPEARANCE_BOOT_SCRIPT, so the page never flashes the wrong colours. globals.css reacts to the classes.
 */
import { useSyncExternalStore } from "react";
import { APPEARANCE_KEY as STORAGE_KEY } from "./appearanceBoot";

export type ThemeMode = "light" | "dark" | "system";

export interface Appearance {
  mode: ThemeMode;
  /** The menu shows icons only (large screens); pointing at it opens it over the page. */
  collapsed: boolean;
  /** "bordered": cards, menus and bars get a thin border instead of a shadow. */
  skin: "default" | "bordered";
  /** The menu in dark colours while the page is light. */
  semiDark: boolean;
  /** "wide": the page uses the whole width instead of a 1440 px box. */
  width: "compact" | "wide";
}

export const DEFAULT_APPEARANCE: Appearance = { mode: "light", collapsed: false, skin: "default", semiDark: false, width: "compact" };

const listeners = new Set<() => void>();
let cached: { raw: string | null; value: Appearance } | null = null;
/** The choice made on this page when it could not be saved (private mode, storage blocked or full). */
let memory: Appearance | null = null;

function read(): Appearance {
  if (memory) return memory;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage is blocked: the defaults.
  }
  if (cached && cached.raw === raw) return cached.value;
  let value = DEFAULT_APPEARANCE;
  try {
    const saved = raw ? (JSON.parse(raw) as Partial<Appearance>) : {};
    value = {
      mode: saved.mode === "dark" || saved.mode === "system" ? saved.mode : "light",
      collapsed: saved.collapsed === true,
      skin: saved.skin === "bordered" ? "bordered" : "default",
      semiDark: saved.semiDark === true,
      width: saved.width === "wide" ? "wide" : "compact",
    };
  } catch {
    // A broken saved value: the defaults.
  }
  cached = { raw, value };
  return value;
}

/** True when the page shows dark colours now (dark mode, or system mode on a computer set to dark). */
export function prefersDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches === true;
}

/** Puts the classes on <html> (the same thing the boot script does). */
export function applyAppearance(value: Appearance): void {
  const classes = document.documentElement.classList;
  classes.toggle("dark", prefersDark(value.mode));
  classes.toggle("nav-collapsed", value.collapsed);
  classes.toggle("skin-bordered", value.skin === "bordered");
  classes.toggle("nav-semi-dark", value.semiDark);
  classes.toggle("content-wide", value.width === "wide");
}

export function saveAppearance(change: Partial<Appearance>): void {
  const next = { ...read(), ...change };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    memory = null;
  } catch {
    // Private mode: it still applies for this visit.
    memory = next;
  }
  applyAppearance(next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed it, or the computer switched between light and dark.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      applyAppearance(read());
      listener();
    }
  };
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  const onScheme = () => {
    // A new snapshot, so the screens that ask prefersDark() while drawing see the change.
    cached = null;
    if (memory) memory = { ...memory };
    applyAppearance(read());
    listener();
  };
  window.addEventListener("storage", onStorage);
  media?.addEventListener("change", onScheme);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
    media?.removeEventListener("change", onScheme);
  };
}

/** This computer's appearance; the defaults on the server and in the first render. */
export function useAppearance(): Appearance {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_APPEARANCE);
}
