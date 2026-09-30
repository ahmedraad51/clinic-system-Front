/**
 * The three design options the owner is choosing between (A, B or C). Each one is a set of CSS tokens and
 * `design-a:` / `design-b:` / `design-c:` classes, switched by `data-design` on <html>. The choice is kept on
 * this computer only, like the screen size. Once the owner picks one, the other two are removed.
 */

export const DESIGN_OPTIONS = [
  {
    value: "a",
    name: "Fresh Mint",
    brand: "#0f766e",
    summary: "Light and airy: pastel colour for each part of the clinic, soft rounded cards and a white menu.",
  },
  {
    value: "b",
    name: "Midnight",
    brand: "#4f46e5",
    summary: "Bold and modern: a dark menu with glowing icons, a colourful welcome banner and crisp white cards.",
  },
  {
    value: "c",
    name: "Sunrise",
    brand: "#c2410c",
    summary: "Warm and friendly: cream background, rounded pill buttons and big solid-colour number tiles.",
  },
] as const;

export type DesignOption = (typeof DESIGN_OPTIONS)[number]["value"];

export const DEFAULT_DESIGN: DesignOption = "a";
const STORAGE_KEY = "design_option";

export function normalizeDesign(value: unknown): DesignOption {
  return DESIGN_OPTIONS.some((option) => option.value === value) ? (value as DesignOption) : DEFAULT_DESIGN;
}

/** The choice made on this page, for when storage is blocked (private mode). */
let chosenHere: DesignOption | null = null;

export function readDesign(): DesignOption {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeDesign(saved) : (chosenHere ?? DEFAULT_DESIGN);
  } catch {
    return chosenHere ?? DEFAULT_DESIGN;
  }
}

const listeners = new Set<() => void>();

/** Another tab chose a design: show it here too. */
function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  document.documentElement.dataset.design = readDesign();
  listeners.forEach((listener) => listener());
}

export function subscribeDesign(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function saveDesign(value: DesignOption): void {
  const design = normalizeDesign(value);
  chosenHere = design;
  try {
    localStorage.setItem(STORAGE_KEY, design);
  } catch {
    // Storage is blocked: the design lasts until the page is closed.
  }
  document.documentElement.dataset.design = design;
  listeners.forEach((listener) => listener());
}

/** Runs in <head> before the page draws, so the chosen design shows without a flash of another one. */
export const DESIGN_BOOT_SCRIPT = `try{var d=localStorage.getItem("${STORAGE_KEY}");if(${JSON.stringify(
  DESIGN_OPTIONS.map((option) => option.value),
)}.indexOf(d)>-1)document.documentElement.dataset.design=d}catch(e){}`;
