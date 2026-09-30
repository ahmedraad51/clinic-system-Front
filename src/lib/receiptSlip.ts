/**
 * The receipt slip for thermal receipt printers (58 or 80 mm paper rolls), printed from the payment page. The
 * slip is its own small HTML page, printed through a hidden frame, so the app page does not change. The paper
 * settings belong to the computer the printer is attached to, so they are kept in this browser.
 */

import { currentLang, dirOf, messages } from "@/i18n";

export type SlipTextSize = "small" | "normal" | "large";

export interface SlipPaper {
  /** Width of the paper roll: 58 or 80 mm, or another size between 40 and 120. */
  widthMm: number;
  /** Space kept free at the sides, 0-10 mm. */
  marginMm: number;
  textSize: SlipTextSize;
}

export const DEFAULT_SLIP_PAPER: SlipPaper = { widthMm: 80, marginMm: 3, textSize: "normal" };
export const SLIP_WIDTHS = [58, 80] as const;
const TEXT_SCALE: Record<SlipTextSize, number> = { small: 0.88, normal: 1, large: 1.18 };
const STORAGE_KEY = "receipt_slip_paper";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Any saved or typed paper settings made safe: numbers within limits, a known text size. */
export function normalizeSlipPaper(value: unknown): SlipPaper {
  const raw = (typeof value === "object" && value !== null ? value : {}) as Partial<Record<keyof SlipPaper, unknown>>;
  const width = Number(raw.widthMm);
  const margin = Number(raw.marginMm);
  const size = raw.textSize;
  return {
    widthMm: Number.isFinite(width) && width > 0 ? Math.round(clamp(width, 40, 120)) : DEFAULT_SLIP_PAPER.widthMm,
    marginMm: Number.isFinite(margin) && margin >= 0 ? Math.round(clamp(margin, 0, 10) * 10) / 10 : DEFAULT_SLIP_PAPER.marginMm,
    textSize: size === "small" || size === "normal" || size === "large" ? size : DEFAULT_SLIP_PAPER.textSize,
  };
}

/* This computer's paper settings, read through useSyncExternalStore(subscribeSlipPaper, readSlipPaper,
   () => DEFAULT_SLIP_PAPER), so the server render and the first browser render agree. */
const paperListeners = new Set<() => void>();
let cachedPaper: { raw: string | null; paper: SlipPaper } | null = null;

/** The saved paper settings (the defaults when none were saved or the browser blocks storage). */
export function readSlipPaper(): SlipPaper {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage is blocked: use the defaults.
  }
  // The same object while nothing changed, as useSyncExternalStore needs.
  if (!cachedPaper || cachedPaper.raw !== raw) {
    let paper = DEFAULT_SLIP_PAPER;
    try {
      if (raw) paper = normalizeSlipPaper(JSON.parse(raw));
    } catch {
      // Unreadable: the defaults.
    }
    cachedPaper = { raw, paper };
  }
  return cachedPaper.paper;
}

export function subscribeSlipPaper(listener: () => void): () => void {
  paperListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    paperListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function saveSlipPaper(paper: SlipPaper): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSlipPaper(paper)));
  } catch {
    // Storage is blocked: nothing is kept.
  }
  paperListeners.forEach((listener) => listener());
}

/** What the slip shows. Amounts come already formatted in the clinic currency. */
export interface SlipData {
  clinicName: string;
  clinicAddress?: string;
  clinicPhone?: string;
  taxNumber?: string;
  receiptNo: string;
  /** The payment date, formatted. */
  date: string;
  /** When the slip was printed, formatted (filled in when printing). */
  printedAt?: string;
  patient: string;
  forWhat: string;
  method: string;
  amount: string;
  /** A balance line under the amount, e.g. { label: "Left on this treatment", amount: "IQD 3,000" }; none when unknown. */
  balance?: { label: string; amount: string };
  notes?: string;
  /** Who printed the slip (the payment record does not say who took the money). */
  printedBy?: string;
}

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** System fonts only (the slip has no web fonts). Arabic: fonts every Windows computer has, with clear Arabic letters. */
const SLIP_FONTS = {
  ar: `Tahoma, Arial, "Segoe UI", sans-serif`,
  en: `"Segoe UI", Tahoma, Arial, sans-serif`,
} as const;

/**
 * The slip as a complete HTML page, in the current language and direction. Every value is escaped; every size
 * comes from `paper`. The page size itself is set when printing (printHtml with `pageWidthMm`), once the slip's
 * length is known.
 */
export function buildReceiptSlip(data: SlipData, paper: SlipPaper): string {
  const { widthMm, marginMm, textSize } = normalizeSlipPaper(paper);
  const lang = currentLang();
  const t = messages().receipt.printed;
  const scale = TEXT_SCALE[textSize];
  const px = (size: number) => `${Math.round(size * scale * 100) / 100}px`;
  const row = (label: string, value: string | undefined, className = "") =>
    value ? `<div class="row ${className}"><span>${escapeHtml(label)}</span><span class="value">${escapeHtml(value)}</span></div>` : "";
  // `ltr` keeps a phone number such as "0770 123 4567" in its order inside a right-to-left slip.
  const line = (value: string | undefined, className = "small", ltr = false) =>
    value ? `<div class="${className}"${ltr ? ` dir="ltr"` : ""}>${escapeHtml(value)}</div>` : "";

  return `<!doctype html>
<html lang="${lang}" dir="${dirOf(lang)}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(t.title(data.receiptNo))}</title>
<style>
@page { margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: #000; }
body { width: ${widthMm}mm; font-family: ${SLIP_FONTS[lang]}; font-size: ${px(12)}; line-height: 1.35; }
.slip { padding: ${marginMm + 1}mm ${marginMm}mm ${marginMm + 3}mm; }
.center { text-align: center; }
h1 { font-size: ${px(16)}; margin: 0 0 1mm; overflow-wrap: anywhere; }
.small { font-size: ${px(10.5)}; }
hr { border: 0; border-top: 1px dashed #000; margin: 2.5mm 0; }
.row { display: flex; justify-content: space-between; gap: 2mm; margin: 0.8mm 0; }
.row > span:first-child { flex-shrink: 0; }
.row .value { text-align: end; overflow-wrap: anywhere; }
.amount { font-size: ${px(17)}; font-weight: 700; }
.notes { margin-top: 1.5mm; overflow-wrap: anywhere; white-space: pre-line; }
</style>
</head>
<body>
<div class="slip">
<div class="center">
<h1>${escapeHtml(data.clinicName)}</h1>
${line(data.clinicAddress)}
${line(data.clinicPhone, "small", true)}
${line(data.taxNumber ? t.taxNo(`\u2066${data.taxNumber}\u2069`) : "")}
</div>
<hr>
<div class="center"><strong>${escapeHtml(t.heading)}</strong>${line(data.receiptNo)}${line(data.date)}</div>
<hr>
${row(t.patient, data.patient)}
${row(t.for, data.forWhat)}
${row(t.method, data.method)}
<hr>
${row(t.paid, data.amount, "amount")}
${data.balance ? row(data.balance.label, data.balance.amount) : ""}
${data.notes ? `<div class="notes small">${escapeHtml(data.notes)}</div>` : ""}
<hr>
${data.printedAt ? `<div class="center small">${escapeHtml(t.printedAt(data.printedAt, data.printedBy ?? ""))}</div>` : ""}
<div class="center" style="margin-top: 2mm">${escapeHtml(t.thanks)}</div>
</div>
</body>
</html>`;
}

let printing = false;

/**
 * Prints an HTML page through a hidden frame and removes the frame afterwards. Returns false when printing
 * could not start. While one print is open, more calls are ignored (a double click prints once). With
 * `pageWidthMm`, the page is sized to the content: that width and the slip's measured length, which a roll
 * printer needs. The browser's print dialog still opens, on the printer used last.
 */
export function printHtml(html: string, options: { pageWidthMm?: number } = {}): boolean {
  if (typeof document === "undefined") return false;
  if (printing) return true;
  printing = true;
  const before = document.activeElement as HTMLElement | null;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("data-print-frame", "");
  frame.tabIndex = -1;
  frame.title = messages().common.print;
  frame.style.cssText = "position:fixed;inset-inline-end:0;bottom:0;width:0;height:0;border:0;opacity:0;";
  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    printing = false;
    // Keyboard users continue where they were.
    if (before && document.contains(before)) before.focus();
    // A moment later, so a browser still spooling the page is not cut off.
    window.setTimeout(() => frame.remove(), 1000);
  };
  frame.onload = () => {
    const view = frame.contentWindow;
    if (!view) return remove();
    if (options.pageWidthMm) {
      // CSS has no "as long as the content" page size, so measure the slip (96 px = 25.4 mm) and set it.
      const doc = view.document;
      const lengthMm = Math.ceil((doc.documentElement.scrollHeight * 25.4) / 96) + 2;
      const style = doc.createElement("style");
      style.textContent = `@page { size: ${options.pageWidthMm}mm ${lengthMm}mm; margin: 0; }`;
      doc.head.appendChild(style);
    }
    view.addEventListener("afterprint", remove, { once: true });
    view.focus();
    view.print();
    // Some browsers return from print() at once and never send afterprint.
    window.setTimeout(remove, 60_000);
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
  return true;
}
