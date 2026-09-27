/**
 * Screen size for this computer: text and spacing made smaller or bigger (80-120 %), e.g. bigger on a
 * reception monitor read from a distance. Kept in this browser only. It sets the root font size, and every
 * size in the app is in rem, so everything scales together.
 */

export const ZOOM_LEVELS = [80, 90, 100, 110, 120] as const;
const STORAGE_KEY = "screen_zoom";

/** A saved or chosen level, or 100 when it is not one of ZOOM_LEVELS. */
export function normalizeZoom(value: unknown): number {
  const level = Number(value);
  return (ZOOM_LEVELS as readonly number[]).includes(level) ? level : 100;
}

export function applyZoom(level: number): void {
  const zoom = normalizeZoom(level);
  document.documentElement.style.fontSize = zoom === 100 ? "" : `${zoom}%`;
}

const listeners = new Set<() => void>();

/** This computer's level (100 when none was saved or storage is blocked). */
export function readZoom(): number {
  try {
    return normalizeZoom(localStorage.getItem(STORAGE_KEY) ?? 100);
  } catch {
    return 100;
  }
}

export function subscribeZoom(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function saveZoom(level: number): void {
  const zoom = normalizeZoom(level);
  try {
    if (zoom === 100) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(zoom));
  } catch {
    // Storage is blocked: the size lasts until the page is closed.
  }
  applyZoom(zoom);
  listeners.forEach((listener) => listener());
}

/** Runs in <head> before the page draws, so the chosen size shows without a jump. */
export const ZOOM_BOOT_SCRIPT = `try{var z=Number(localStorage.getItem("${STORAGE_KEY}"));if([${ZOOM_LEVELS.filter((z) => z !== 100).join(",")}].indexOf(z)>-1)document.documentElement.style.fontSize=z+"%"}catch(e){}`;
