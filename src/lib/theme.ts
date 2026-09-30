/**
 * The clinic's main colour (Clinic Settings → theme_color).
 *
 * globals.css builds the whole `primary-*` palette from one CSS variable, `--brand`, so changing that
 * variable recolours every button, link and highlight. A colour that is too light for white text is
 * darkened until it reaches the WCAG AA contrast of 4.5:1, so buttons stay readable whatever is chosen.
 */

/** Indigo, used when the clinic chose no colour. Keep in step with `--brand` in globals.css. */
export const DEFAULT_THEME_COLOR = "#4f46e5";

/** Ready-made choices on the settings page. */
export const THEME_PRESETS = [
  { label: "Teal", value: "#0e7c86" },
  { label: "Sky", value: "#0369a1" },
  { label: "Blue", value: "#2563eb" },
  { label: "Green", value: "#15803d" },
  { label: "Rose", value: "#be123c" },
  { label: "Purple", value: "#7e22ce" },
] as const;

const STORAGE_KEY = "theme_color";

/** "#abc" or "#aabbcc" (any case) → "#aabbcc". Anything else → null. */
export function normalizeHex(value: string | null | undefined): string | null {
  const text = (value || "").trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(text)) return text;
  if (/^#[0-9a-f]{3}$/.test(text)) return "#" + [...text.slice(1)].map((c) => c + c).join("");
  return null;
}

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio of a colour against white. */
export function contrastWithWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05);
}

/** The colour the app really uses: the chosen one, darkened just enough for white text on it. */
export function readableBrand(value: string | null | undefined): string {
  let hex = normalizeHex(value) ?? DEFAULT_THEME_COLOR;
  for (let step = 0; step < 20 && contrastWithWhite(hex) < 4.5; step++) {
    hex = "#" + channels(hex).map((v) => Math.round(v * 0.92).toString(16).padStart(2, "0")).join("");
  }
  return hex;
}

/**
 * Applies the clinic colour to the page and remembers it, so the next visit starts in the right colour. No colour
 * (the clinic never chose one) leaves the default indigo (globals.css).
 */
export function applyThemeColor(value: string | null | undefined): void {
  const root = document.documentElement.style;
  if (!normalizeHex(value)) {
    root.removeProperty("--brand");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage is blocked: nothing was saved either.
    }
    return;
  }
  const brand = readableBrand(value);
  root.setProperty("--brand", brand);
  try {
    localStorage.setItem(STORAGE_KEY, brand);
  } catch {
    // Private mode or storage full: the colour still applies for this visit.
  }
}

/**
 * Runs in <head> before the page paints, so a clinic with its own colour does not see a flash of teal.
 * It only reads a colour this app saved itself.
 */
export const THEME_BOOT_SCRIPT = `try{var c=localStorage.getItem("${STORAGE_KEY}");if(/^#[0-9a-f]{6}$/.test(c||""))document.documentElement.style.setProperty("--brand",c)}catch(e){}`;
