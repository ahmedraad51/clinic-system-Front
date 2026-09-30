/**
 * Drawings on top of an X-ray, a photo or the dental chart: pen lines, arrows, circles and text. They are saved as
 * their own layer (Dental Image.annotations, Patient.chart_sketch), so the original picture is never changed.
 *
 * Points are stored from 0 to 1 across the width and down the height of the picture, so the drawing fits the
 * picture at any size. `aspect` is the picture's height divided by its width when the drawing was made.
 */

export const SKETCH_TOOLS = ["pen", "arrow", "circle", "text"] as const;
export type SketchTool = (typeof SKETCH_TOOLS)[number];

/** The pen colours: red, yellow, green, blue, white, black. */
export const SKETCH_COLOURS = ["#ef4444", "#facc15", "#22c55e", "#3b82f6", "#ffffff", "#111827"] as const;

export type Point = [number, number];

export type SketchShape =
  | { kind: "pen"; color: string; width: number; points: Point[] }
  | { kind: "arrow"; color: string; width: number; from: Point; to: Point }
  /** `radius` is a share of the picture's width. */
  | { kind: "circle"; color: string; width: number; center: Point; radius: number }
  /** `size` is a share of the picture's width. */
  | { kind: "text"; color: string; at: Point; text: string; size: number };

export interface SketchData {
  version: 1;
  aspect: number;
  shapes: SketchShape[];
  /** On the dental chart: the teeth it was drawn on ("adult" or "child"). */
  on?: string;
}

export const EMPTY_SKETCH: SketchData = { version: 1, aspect: 1, shapes: [] };

const isPoint = (value: unknown): value is Point =>
  Array.isArray(value) && value.length === 2 && value.every((n) => typeof n === "number" && Number.isFinite(n));

function isShape(value: unknown): value is SketchShape {
  if (!value || typeof value !== "object") return false;
  const shape = value as Record<string, unknown>;
  if (typeof shape.color !== "string") return false;
  switch (shape.kind) {
    case "pen":
      return Array.isArray(shape.points) && shape.points.every(isPoint) && typeof shape.width === "number";
    case "arrow":
      return isPoint(shape.from) && isPoint(shape.to) && typeof shape.width === "number";
    case "circle":
      return isPoint(shape.center) && typeof shape.radius === "number" && typeof shape.width === "number";
    case "text":
      return isPoint(shape.at) && typeof shape.text === "string" && typeof shape.size === "number";
    default:
      return false;
  }
}

/** Reads a saved layer (a JSON string or an object, as Frappe may return either). Anything unreadable is empty. */
export function parseSketch(value: unknown): SketchData {
  let data = value;
  if (typeof data === "string") {
    if (!data.trim()) return EMPTY_SKETCH;
    try {
      data = JSON.parse(data);
    } catch {
      return EMPTY_SKETCH;
    }
  }
  if (!data || typeof data !== "object") return EMPTY_SKETCH;
  const raw = data as { aspect?: unknown; shapes?: unknown; on?: unknown };
  const shapes = Array.isArray(raw.shapes) ? raw.shapes.filter(isShape) : [];
  const aspect = typeof raw.aspect === "number" && raw.aspect > 0 ? raw.aspect : 1;
  return { version: 1, aspect, shapes, ...(typeof raw.on === "string" ? { on: raw.on } : {}) };
}

/** The layer as the text saved on the record; empty when there is nothing drawn. */
export function sketchToSave(sketch: SketchData): string {
  return sketch.shapes.length ? JSON.stringify(sketch) : "";
}

/** Keeps a value between 0 and 1 (a point dragged past the picture's edge). */
export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** The two short strokes of an arrow head at `to`, in the drawing's own units (width 1000). */
export function arrowHead(from: Point, to: Point, length: number): [Point, Point] {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const side = (turn: number): Point => [
    to[0] - length * Math.cos(angle + turn),
    to[1] - length * Math.sin(angle + turn),
  ];
  return [side(Math.PI / 7), side(-Math.PI / 7)];
}

/** Patient.chart_sketch: one drawing for the adult teeth and one for the child teeth. */
export interface ChartSketch {
  adult?: SketchData;
  child?: SketchData;
}

/** Reads Patient.chart_sketch; a single drawing saved the first way counts for the teeth it names (adult by default). */
export function parseChartSketch(value: unknown): ChartSketch {
  let data = value;
  if (typeof data === "string") {
    if (!data.trim()) return {};
    try {
      data = JSON.parse(data);
    } catch {
      return {};
    }
  }
  if (!data || typeof data !== "object") return {};
  const raw = data as { shapes?: unknown; on?: unknown; adult?: unknown; child?: unknown };
  if (Array.isArray(raw.shapes)) return { [raw.on === "child" ? "child" : "adult"]: parseSketch(raw) };
  return {
    ...(raw.adult ? { adult: parseSketch(raw.adult) } : {}),
    ...(raw.child ? { child: parseSketch(raw.child) } : {}),
  };
}

/** The text saved in Patient.chart_sketch; empty when neither drawing has anything. */
export function chartSketchToSave(value: ChartSketch): string {
  const kept = Object.fromEntries(Object.entries(value).filter(([, sketch]) => sketch && sketch.shapes.length > 0));
  return Object.keys(kept).length ? JSON.stringify({ version: 1, ...kept }) : "";
}
