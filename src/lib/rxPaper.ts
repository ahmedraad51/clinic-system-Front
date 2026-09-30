/**
 * Each doctor's prescription paper: the page size, whether the paper already has a printed header (then the page
 * leaves room for it and prints no letterhead), the qualifications under the name, a footer, and an own logo and
 * signature. Saved on the Doctor (rx_* fields); a doctor without them gets the plain A5 clinic letterhead.
 */
import type { Doctor } from "./types";

export const RX_PAPER_SIZES = ["A5", "A4"] as const;
export type RxPaperSize = (typeof RX_PAPER_SIZES)[number];

export interface RxPaper {
  size: RxPaperSize;
  /** The paper has the doctor's header and footer printed on it already. */
  preprinted: boolean;
  /** On pre-printed paper: the room left for its header and footer, in mm. */
  topMm: number;
  bottomMm: number;
  /** Lines under the doctor's name ("BDS, MSc …"). */
  qualifications: string;
  footer: string;
  /** File URLs; empty uses the clinic logo, or no signature image. */
  logo: string;
  signature: string;
}

export const RX_PAPER_FIELDS = [
  "rx_paper_size", "rx_preprinted", "rx_top_mm", "rx_bottom_mm", "rx_qualifications", "rx_footer", "rx_logo", "rx_signature",
] as const;

/** The limits of the blank space on pre-printed paper, in mm. */
export const RX_MARGIN_MIN = 0;
export const RX_MARGIN_MAX = 120;

const clampMm = (value: unknown, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && value !== null && value !== "" ? Math.min(RX_MARGIN_MAX, Math.max(RX_MARGIN_MIN, Math.round(n))) : fallback;
};

/** The doctor's paper, with the defaults for what is not set. */
export function rxPaperOf(doctor?: Partial<Doctor> | null): RxPaper {
  return {
    size: doctor?.rx_paper_size === "A4" ? "A4" : "A5",
    preprinted: Number(doctor?.rx_preprinted) === 1,
    topMm: clampMm(doctor?.rx_top_mm, 40),
    bottomMm: clampMm(doctor?.rx_bottom_mm, 20),
    qualifications: doctor?.rx_qualifications ?? "",
    footer: doctor?.rx_footer ?? "",
    logo: doctor?.rx_logo ?? "",
    signature: doctor?.rx_signature ?? "",
  };
}

/** What the Doctor saves. */
export function rxPaperPayload(paper: RxPaper) {
  return {
    rx_paper_size: paper.size,
    rx_preprinted: paper.preprinted ? 1 : 0,
    rx_top_mm: paper.topMm,
    rx_bottom_mm: paper.bottomMm,
    rx_qualifications: paper.qualifications.trim(),
    rx_footer: paper.footer.trim(),
    rx_logo: paper.logo || null,
    rx_signature: paper.signature || null,
  };
}

/** The printed page: its size, and room for the header and footer already on pre-printed paper. */
export function rxPageCss(paper: RxPaper): string {
  const top = paper.preprinted ? paper.topMm : 10;
  const bottom = paper.preprinted ? paper.bottomMm : 10;
  return `@media print { @page { size: ${paper.size}; margin: ${top}mm 10mm ${bottom}mm; } }`;
}
