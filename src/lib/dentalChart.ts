/**
 * Reading, cleaning and describing the dental chart (Patient.dental_chart).
 * The shapes are in src/lib/types.ts; the drawing is src/components/DentalChart.tsx.
 */
import { messages } from "@/i18n";
import {
  SURFACE_FINDINGS, TOOTH_CONDITIONS, TOOTH_SURFACES,
  type DentalChartData, type SurfaceFinding, type ToothCondition, type ToothRecord,
  type ToothSurface,
} from "./types";

// The labels of conditions, findings, surfaces and old-chart marks are in the translation files:
// t.chart.conditions, t.chart.findingNames, t.chart.surfaces and t.chart.legacy (src/i18n/<lang>/chart.ts).

export const EMPTY_CHART: DentalChartData = { version: 2, teeth: {} };

const isCondition = (value: unknown): value is ToothCondition =>
  (TOOTH_CONDITIONS as readonly unknown[]).includes(value);
const isFinding = (value: unknown): value is SurfaceFinding => (SURFACE_FINDINGS as readonly unknown[]).includes(value);
const isSurface = (value: unknown): value is ToothSurface => (TOOTH_SURFACES as readonly unknown[]).includes(value);

/** Keeps only valid, non-empty parts of a tooth. Returns null for a healthy tooth with no note. */
export function cleanTooth(value: unknown): ToothRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const record: ToothRecord = {};

  const conditions = Array.isArray(raw.conditions) ? raw.conditions.filter(isCondition) : [];
  const unique = TOOTH_CONDITIONS.filter((c) => conditions.includes(c));
  if (unique.length) record.conditions = unique;

  if (raw.surfaces && typeof raw.surfaces === "object") {
    const surfaces: Partial<Record<ToothSurface, SurfaceFinding>> = {};
    TOOTH_SURFACES.forEach((surface) => {
      const finding = (raw.surfaces as Record<string, unknown>)[surface];
      if (isSurface(surface) && isFinding(finding)) surfaces[surface] = finding;
    });
    if (Object.keys(surfaces).length) record.surfaces = surfaces;
  }

  if (typeof raw.note === "string" && raw.note.trim()) record.note = raw.note.trim();
  if (raw.legacy === "treated" || raw.legacy === "pending") record.legacy = raw.legacy;

  return Object.keys(record).length ? record : null;
}

/**
 * Reads Patient.dental_chart. Accepts a JSON string or an object, in the current shape
 * ({ version: 2, teeth: {...} }) or the first one ({ "36": "treated", "37": "pending" }).
 * Anything it cannot read gives an empty chart, never an error.
 */
export function parseDentalChart(value: unknown): DentalChartData {
  let raw: unknown = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return { version: 2, teeth: {} };
    }
  }
  const teeth: Record<string, ToothRecord> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { version: 2, teeth };
  const obj = raw as Record<string, unknown>;

  if (obj.teeth && typeof obj.teeth === "object" && !Array.isArray(obj.teeth)) {
    Object.entries(obj.teeth as Record<string, unknown>).forEach(([tooth, record]) => {
      const clean = cleanTooth(record);
      if (clean && /^\d{2}$/.test(tooth)) teeth[tooth] = clean;
    });
  } else {
    // The first version: { "36": "treated" | "pending" | "normal" }.
    Object.entries(obj).forEach(([tooth, status]) => {
      if (/^\d{2}$/.test(tooth) && (status === "treated" || status === "pending")) teeth[tooth] = { legacy: status };
    });
  }
  return { version: 2, teeth };
}

/** The chart with healthy teeth dropped and keys sorted, ready to compare or save. */
export function cleanChart(chart: DentalChartData): DentalChartData {
  const teeth: Record<string, ToothRecord> = {};
  Object.keys(chart.teeth)
    .sort()
    .forEach((tooth) => {
      const clean = cleanTooth(chart.teeth[tooth]);
      if (clean) teeth[tooth] = clean;
    });
  return { version: 2, teeth };
}

/** Upper jaw: quadrants 1, 2 (adult) and 5, 6 (child). */
export const isUpper = (tooth: number) => [1, 2, 5, 6].includes(Math.floor(tooth / 10));
/** The patient's right side, drawn on the left of the chart: quadrants 1, 4, 5, 8. */
export const isPatientRight = (tooth: number) => [1, 4, 5, 8].includes(Math.floor(tooth / 10));
export const isChildTooth = (tooth: number) => Math.floor(tooth / 10) >= 5;

export type ToothKind = "incisor" | "canine" | "premolar" | "molar";

export function toothKind(tooth: number): ToothKind {
  const position = tooth % 10;
  if (isChildTooth(tooth)) return position <= 2 ? "incisor" : position === 3 ? "canine" : "molar";
  return position <= 2 ? "incisor" : position === 3 ? "canine" : position <= 5 ? "premolar" : "molar";
}

/** 36 → "Lower left first molar"; 55 → "Upper right second molar (child)" (in the current language). */
export function toothName(tooth: number): string {
  return messages().chart.toothName(tooth % 10, isUpper(tooth), isPatientRight(tooth), isChildTooth(tooth));
}

/**
 * Which surface sits on each side of the five-part square, as drawn on the chart.
 * The outer edge of each jaw is buccal and the middle of the chart is lingual; mesial faces the midline.
 */
export function surfaceLayout(tooth: number): { top: ToothSurface; bottom: ToothSurface; left: ToothSurface; right: ToothSurface } {
  const upper = isUpper(tooth);
  const right = isPatientRight(tooth);
  return {
    top: upper ? "B" : "L",
    bottom: upper ? "L" : "B",
    left: right ? "D" : "M",
    right: right ? "M" : "D",
  };
}

/**
 * One line about a tooth, e.g. "Root canal, crown · caries M, O · filling D" (in the current language; the
 * surface letters stay M, O, D, B, L). Empty for a healthy tooth.
 */
export function describeTooth(record: ToothRecord | undefined): string {
  if (!record) return "";
  const t = messages().chart;
  const parts: string[] = [];
  if (record.conditions?.length) {
    parts.push(record.conditions.map((c, i) => (i === 0 ? t.conditions[c] : t.inList(t.conditions[c]))).join(t.listSeparator));
  }
  SURFACE_FINDINGS.forEach((finding) => {
    const surfaces = TOOTH_SURFACES.filter((s) => record.surfaces?.[s] === finding);
    if (surfaces.length) {
      const label = parts.length ? t.inList(t.findingNames[finding]) : t.findingNames[finding];
      parts.push(`${label} ${surfaces.join(t.listSeparator)}`);
    }
  });
  if (record.legacy && parts.length === 0) parts.push(t.legacy[record.legacy]);
  return parts.join(" · ");
}
