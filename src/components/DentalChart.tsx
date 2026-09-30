"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, FileText, ImageIcon, PenLine, Plus, Printer, RotateCcw, Save, Sparkles, X } from "lucide-react";
import UnsavedChangesGuard from "@/components/UnsavedChangesGuard";
import ImageViewer from "@/components/xrays/ImageViewer";
import { SketchCanvas, SketchToolbar } from "@/components/xrays/Sketch";
import ToothLogo from "@/components/ToothLogo";
import { Alert, Button, CardIcon, LinkButton, Segmented, StatusBadge, TextArea } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { label } from "@/i18n";
import {
  cleanChart, describeTooth, isChildTooth, isUpper, parseDentalChart, surfaceLayout, toothKind, toothName, type ToothKind,
} from "@/lib/dentalChart";
import { cx } from "@/lib/format";
import { fileHref } from "@/lib/frappe";
import { treatmentHref } from "@/lib/links";
import { parseChartSketch, SKETCH_COLOURS, type ChartSketch, type SketchData, type SketchTool } from "@/lib/sketch";
import { imageTeeth, imageTitle, isPdf } from "@/lib/xrays";
import type { DentalImage } from "@/lib/types";
import {
  CHILD_LOWER_TEETH, CHILD_UPPER_TEETH, LOWER_TEETH, TOOTH_CONDITIONS, UPPER_TEETH,
  type DentalChartData, type SurfaceFinding, type ToothCondition, type ToothRecord, type ToothSurface,
  type TreatmentPlan,
} from "@/lib/types";

/*
 * The odontogram. Each tooth is drawn by type (incisor, canine, premolar, molar) with its five surfaces
 * underneath. Click a tooth to see it in the panel below; people who may edit the patient can mark
 * surfaces (caries, filling) and whole-tooth conditions, and write a note. Save Chart stores it all in
 * Patient.dental_chart (see DentalChartData in src/lib/types.ts).
 *
 * The teeth are drawn from the dentist's view (the patient's right on the left of the screen), so the rows of
 * teeth and the surface squares are always left to right (dir="ltr"), also on an Arabic screen. The panel, the
 * findings and the texts around them follow the page.
 */

type Dentition = "adult" | "child";
type Tool = SurfaceFinding | "clear";

/* ------------------------------------------------------------ drawings -- */

/** Tooth outlines in a 40×64 box, crown at the top and roots down (lower jaw). Upper teeth are flipped. */
const SHAPES: Record<ToothKind, { crown: string; roots: string; canals: string[] }> = {
  molar: {
    crown: "M6 5 Q9 1 14 3 Q20 0 26 3 Q31 1 34 5 Q37 10 36 17 Q35 25 30 27 L10 27 Q5 25 4 17 Q3 10 6 5 Z",
    roots: "M10 27 Q8 42 11 58 Q13 63 16 58 Q17 44 20 34 Q23 44 24 58 Q27 63 29 58 Q32 42 30 27 Z",
    canals: ["M13.5 29 Q12.5 44 13.5 56", "M26.5 29 Q27.5 44 26.5 56"],
  },
  premolar: {
    crown: "M10 6 Q14 1 20 3 Q26 1 30 6 Q33 13 31 21 Q29 27 26 28 L14 28 Q11 27 9 21 Q7 13 10 6 Z",
    roots: "M14 28 Q13 46 18 61 Q20 64 22 61 Q27 46 26 28 Z",
    canals: ["M20 30 L20 58"],
  },
  canine: {
    crown: "M12 9 Q16 2 20 0.5 Q24 2 28 9 Q31 16 29 23 Q27 28 25 29 L15 29 Q13 28 11 23 Q9 16 12 9 Z",
    roots: "M15 29 Q14 50 19 63 Q20 64.5 21 63 Q26 50 25 29 Z",
    canals: ["M20 31 L20 60"],
  },
  incisor: {
    crown: "M12 2 L28 2 Q30.5 3 30 7 L28.5 21 Q27.5 28 25 29 L15 29 Q12.5 28 11.5 21 L10 7 Q9.5 3 12 2 Z",
    roots: "M15 29 Q14.5 47 19 61 Q20 63 21 61 Q25.5 47 25 29 Z",
    canals: ["M20 31 L20 58"],
  },
};

const has = (record: ToothRecord | undefined, condition: ToothCondition) => Boolean(record?.conditions?.includes(condition));

function ToothDrawing({ tooth, record }: { tooth: number; record?: ToothRecord }) {
  const shape = SHAPES[toothKind(tooth)];
  const missing = has(record, "missing");
  const implant = has(record, "implant");
  // Fixed paints, the same in dark mode: teeth stay white on the chart.
  const crownFill = has(record, "crown")
    ? "fill-[#fde68a] stroke-[#d97706]"
    : record?.legacy === "treated"
      ? "fill-[color-mix(in_srgb,var(--brand)_16%,white)] stroke-[var(--brand)]"
      : record?.legacy === "pending"
        ? "fill-[#fef9c3] stroke-[#eab308]"
        : "fill-white stroke-[#9e9ba9]";
  return (
    <svg viewBox="0 0 40 64" className="w-9 h-[58px] xl:w-11 xl:h-[70px] overflow-visible" aria-hidden="true">
      <g transform={isUpper(tooth) ? "translate(0 64) scale(1 -1)" : undefined} strokeWidth={1.4} strokeLinejoin="round">
        {missing ? (
          <g className="fill-none stroke-gray-300" strokeDasharray="3 2.5">
            <path d={shape.crown} />
            {!implant && <path d={shape.roots} />}
          </g>
        ) : (
          <>
            {!implant && <path d={shape.roots} className="fill-[#f7f7f9] stroke-[#9e9ba9]" />}
            <path d={shape.crown} className={crownFill} />
          </>
        )}
        {implant && (
          <g>
            <path d="M15 29 L25 29 L24 57 L20 62 L16 57 Z" className="fill-[#d4d4d8] stroke-[#71717a]" />
            {[34, 39, 44, 49, 54].map((y) => (
              <path key={y} d={`M14.5 ${y} L25.5 ${y - 2}`} className="stroke-[#71717a]" />
            ))}
          </g>
        )}
        {has(record, "root_canal") && !implant && !missing &&
          shape.canals.map((d) => <path key={d} d={d} className="fill-none stroke-rose-500" strokeWidth={2.4} strokeLinecap="round" />)}
        {has(record, "bridge") && <rect x={-2} y={11} width={44} height={6} rx={2} className="fill-[#a78bfa]/80 stroke-[#7c3aed]" />}
        {has(record, "extract") && (
          <path d="M7 6 L33 58 M33 6 L7 58" className="stroke-red-500" strokeWidth={3} strokeLinecap="round" />
        )}
      </g>
    </svg>
  );
}

const FINDING_FILLS: Record<SurfaceFinding, string> = {
  caries: "fill-red-500",
  filling: "fill-sky-500",
};

/** The five-part square under each tooth, coloured where a surface has caries or a filling. */
function SurfaceSquare({ tooth, record }: { tooth: number; record?: ToothRecord }) {
  const layout = surfaceLayout(tooth);
  const fill = (surface: ToothSurface) => {
    const finding = record?.surfaces?.[surface];
    return finding ? FINDING_FILLS[finding] : "fill-white";
  };
  return (
    <svg viewBox="0 0 28 28" className={cx("w-7 h-7 xl:w-8 xl:h-8", has(record, "missing") && "opacity-30")} aria-hidden="true">
      <g className="stroke-[#9e9ba9]" strokeWidth={1} strokeLinejoin="round">
        <path d="M0.5 0.5 L27.5 0.5 L19.5 8.5 L8.5 8.5 Z" className={fill(layout.top)} />
        <path d="M0.5 27.5 L27.5 27.5 L19.5 19.5 L8.5 19.5 Z" className={fill(layout.bottom)} />
        <path d="M0.5 0.5 L8.5 8.5 L8.5 19.5 L0.5 27.5 Z" className={fill(layout.left)} />
        <path d="M27.5 0.5 L19.5 8.5 L19.5 19.5 L27.5 27.5 Z" className={fill(layout.right)} />
        <path d="M8.5 8.5 H19.5 V19.5 H8.5 Z" className={fill("O")} />
      </g>
    </svg>
  );
}

/* --------------------------------------------------------------- chart -- */

type PlanOnTooth = Pick<TreatmentPlan, "name" | "treatment_type" | "tooth_number" | "status">;

const isActivePlan = (plan: PlanOnTooth) => plan.status === "Planned" || plan.status === "In Progress";

/** Plans whose tooth_number names this tooth (it may hold several, e.g. "36, 37"). */
const plansFor = (plans: PlanOnTooth[], tooth: number) =>
  plans.filter((plan) => (plan.tooth_number || "").split(/[^0-9]+/).includes(String(tooth)));

export default function DentalChart({
  initialChart,
  onSave,
  canEdit = true,
  patientAge,
  plans = [],
  newTreatmentHref,
  onNewTreatment,
  initialTooth,
  printHref,
  images = [],
  patientName,
  onImagesChanged,
  sketch,
  onSaveSketch,
}: {
  /** Patient.dental_chart as it came from the server, in either shape. */
  initialChart?: unknown;
  onSave?: (chart: DentalChartData) => Promise<void>;
  canEdit?: boolean;
  /** Children under 6 open on the child teeth. */
  patientAge?: number;
  /** The patient's treatment plans, to show per tooth. */
  plans?: PlanOnTooth[];
  /** Link for "New treatment for this tooth", or nothing when the user may not add treatments. */
  newTreatmentHref?: (tooth: number) => string;
  /** Opens the new treatment dialog for a tooth (wins over newTreatmentHref). */
  onNewTreatment?: (tooth: number) => void;
  /** Open with this tooth selected, e.g. the tooth of a treatment plan. */
  initialTooth?: number;
  /** Where "Print" goes, e.g. /patients/<id>/chart. */
  printHref?: string;
  /** The patient's X-rays and photos: a tooth that has some gets a marker, and its panel lists them. */
  images?: DentalImage[];
  patientName?: string;
  /** An image was changed in the viewer. */
  onImagesChanged?: () => void;
  /** Patient.chart_sketch: a drawing on top of the adult teeth and one on the child teeth. */
  sketch?: unknown;
  /** Saves both drawings; without it there is no Sketch button. */
  onSaveSketch?: (sketch: ChartSketch) => Promise<void>;
}) {
  const { t } = useI18n();
  const [saved, setSaved] = useState<DentalChartData>(() => cleanChart(parseDentalChart(initialChart)));
  const [chart, setChart] = useState<DentalChartData>(saved);
  const [selected, setSelected] = useState<number | null>(initialTooth ?? null);
  const [tool, setTool] = useState<Tool>("caries");
  const [saving, setSaving] = useState(false);
  const [dentition, setDentition] = useState<Dentition>(() => {
    if (initialTooth) return isChildTooth(initialTooth) ? "child" : "adult";
    const marked = Object.keys(saved.teeth).map(Number);
    const onlyChild = marked.length > 0 && marked.every(isChildTooth);
    return onlyChild || (patientAge !== undefined && patientAge > 0 && patientAge < 6) ? "child" : "adult";
  });

  // The drawing on the chart (the teeth themselves never change), and the one being drawn.
  const [sketches, setSketches] = useState<ChartSketch>(() => parseChartSketch(sketch));
  const [sketchDraft, setSketchDraft] = useState<SketchData | null>(null);
  const [sketchTool, setSketchTool] = useState<SketchTool>("pen");
  const [sketchColor, setSketchColor] = useState<string>(SKETCH_COLOURS[0]);
  const [sketchSaving, setSketchSaving] = useState(false);
  // The teeth area's height ÷ width, so the drawing keeps its place.
  const teethRef = useRef<HTMLDivElement>(null);
  const [teethAspect, setTeethAspect] = useState(0.4);
  useEffect(() => {
    const element = teethRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0) setTeethAspect(height / width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // An image opened from a tooth's panel: the images of that tooth, and which one.
  // (The images come from `images` each time, so a change made in the viewer shows at once.)
  const [viewing, setViewing] = useState<{ tooth: number; start: string } | null>(null);
  const imagesOf = (tooth: number) => images.filter((image) => imageTeeth(image).includes(String(tooth)));
  // A saved drawing shows on the teeth it was drawn on.
  const sketchSaved: SketchData | undefined = sketches[dentition];
  const sketchOnView = Boolean(sketchSaved && sketchSaved.shapes.length > 0);
  // A drawing started and not saved yet counts as unsaved work.
  const sketchChanged = Boolean(sketchDraft) && JSON.stringify(sketchDraft?.shapes) !== JSON.stringify(sketchSaved?.shapes ?? []);

  // On a narrow screen the chart scrolls sideways: keep the chosen tooth in view.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = scrollRef.current;
    const button = selected === null ? null : box?.querySelector<HTMLElement>(`[data-tooth="${selected}"]`);
    if (!box || !button || box.scrollWidth <= box.clientWidth) return;
    const boxRect = box.getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    box.scrollLeft += rect.left + rect.width / 2 - (boxRect.left + boxRect.width / 2);
  }, [selected, dentition]);

  const clean = cleanChart(chart);
  const dirty = JSON.stringify(clean) !== JSON.stringify(saved);
  const upper: readonly number[] = dentition === "adult" ? UPPER_TEETH : CHILD_UPPER_TEETH;
  const lower: readonly number[] = dentition === "adult" ? LOWER_TEETH : CHILD_LOWER_TEETH;
  const order = [...UPPER_TEETH, ...CHILD_UPPER_TEETH, ...LOWER_TEETH, ...CHILD_LOWER_TEETH] as number[];
  const findings = Object.keys(clean.teeth)
    .map(Number)
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));

  const record = (tooth: number): ToothRecord | undefined => chart.teeth[String(tooth)];
  const updateTooth = (tooth: number, change: (current: ToothRecord) => ToothRecord) => {
    setChart((prev) => ({ ...prev, teeth: { ...prev.teeth, [String(tooth)]: change(prev.teeth[String(tooth)] ?? {}) } }));
  };

  const toggleCondition = (tooth: number, condition: ToothCondition) =>
    updateTooth(tooth, (current) => {
      const conditions = current.conditions ?? [];
      return {
        ...current,
        conditions: conditions.includes(condition) ? conditions.filter((c) => c !== condition) : [...conditions, condition],
      };
    });

  const applyTool = (tooth: number, surface: ToothSurface) =>
    updateTooth(tooth, (current) => {
      const surfaces = { ...current.surfaces };
      // The same finding twice clears it, so a mistaken tap is easy to undo.
      if (tool === "clear" || surfaces[surface] === tool) delete surfaces[surface];
      else surfaces[surface] = tool;
      return { ...current, surfaces };
    });

  const markHealthy = (tooth: number) => updateTooth(tooth, (current) => ({ note: current.note }));

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(clean);
      setSaved(clean);
      setChart(clean);
    } catch {
      // The page shows the error; the unsaved marks stay on screen.
    } finally {
      setSaving(false);
    }
  };

  const column = (tooth: number, upperJaw: boolean, index: number, count: number) => {
    const current = record(tooth);
    const active = plansFor(plans, tooth).some(isActivePlan);
    const withImages = imagesOf(tooth).length > 0;
    const description = describeTooth(current);
    // Screen readers hear about the X-rays too (the marker is only a picture).
    const spoken = [description, withImages ? t.xrays.toothHasImages : ""].filter(Boolean).join(t.common.dot);
    const number = (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-gray-600">
        {tooth}
        {active && <span className="w-1.5 h-1.5 rounded-full bg-primary-500" title={t.chart.openPlan} />}
        {withImages && (
          <span data-xray-marker className="text-sky-600" title={t.xrays.ofTooth}>
            <ImageIcon size={10} aria-hidden="true" />
          </span>
        )}
      </span>
    );
    return (
      <button
        key={tooth}
        type="button"
        onClick={() => setSelected(selected === tooth ? null : tooth)}
        aria-pressed={selected === tooth}
        data-tooth={tooth}
        aria-label={t.chart.toothButton(tooth, toothName(tooth), spoken)}
        title={`${tooth} · ${toothName(tooth)}${description ? ` · ${description}` : ""}`}
        className={cx(
          "flex flex-col items-center gap-1 w-10 xl:w-12 py-1.5 rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
          selected === tooth ? "bg-primary-50 ring-2 ring-primary-400" : "hover:bg-gray-50",
          // The midline between the patient's right and left.
          index === count / 2 - 1 && "me-2",
        )}
      >
        {upperJaw ? (
          <>
            {number}
            <ToothDrawing tooth={tooth} record={current} />
            <SurfaceSquare tooth={tooth} record={current} />
          </>
        ) : (
          <>
            <SurfaceSquare tooth={tooth} record={current} />
            <ToothDrawing tooth={tooth} record={current} />
            {number}
          </>
        )}
      </button>
    );
  };

  return (
    <section className="bg-surface rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 w-full space-y-5 [print-color-adjust:exact] print:shadow-none print:border-0 print:p-0">
      <UnsavedChangesGuard when={(dirty && canEdit && Boolean(onSave)) || sketchChanged} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <CardIcon icon={ToothLogo} />
          <div>
            <h2 className="text-base font-semibold text-gray-800">{t.chart.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {t.chart.findingsCount(findings.length)}
              <span className="print:hidden">
                {t.common.dot}
                {canEdit ? t.chart.clickToMark : t.chart.clickToSee}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {onSaveSketch && canEdit && !dirty && !sketchDraft && (
            <Button variant="secondary" icon={PenLine} onClick={() => setSketchDraft(sketchSaved ?? { version: 1, aspect: teethAspect, shapes: [] })}>
              {t.xrays.sketch}
            </Button>
          )}
          {printHref && !dirty && !sketchDraft && (
            <LinkButton href={printHref} variant="secondary" icon={Printer}>
              {t.common.print}
            </LinkButton>
          )}
          {/* While drawing, the teeth stay as they are: the drawing belongs to them. */}
          {!sketchDraft && (
            <Segmented
              label={t.chart.teeth}
              value={dentition}
              onChange={(next) => {
                setDentition(next);
                setSelected(null);
              }}
              options={[
                { value: "adult", label: t.chart.adult },
                { value: "child", label: t.chart.child },
              ]}
            />
          )}
          {canEdit && onSave && dirty && (
            <>
              <Button variant="secondary" icon={RotateCcw} onClick={() => setChart(saved)} disabled={saving}>
                {t.chart.undo}
              </Button>
              <Button icon={Save} onClick={handleSave} loading={saving}>
                {t.chart.saveChart}
              </Button>
            </>
          )}
        </div>
      </div>

      {sketchDraft && (
        <div className="space-y-2 print:hidden">
          <p className="text-sm text-gray-600">{t.xrays.sketchHint}</p>
          <SketchToolbar
            tool={sketchTool}
            onTool={setSketchTool}
            color={sketchColor}
            onColor={setSketchColor}
            canUndo={sketchDraft.shapes.length > 0}
            onUndo={() => setSketchDraft({ ...sketchDraft, shapes: sketchDraft.shapes.slice(0, -1) })}
            onClear={() => setSketchDraft({ ...sketchDraft, shapes: [] })}
            onCancel={() => setSketchDraft(null)}
            saving={sketchSaving}
            saveLabel={t.xrays.saveSketch}
            onSave={async () => {
              if (!onSaveSketch) return;
              // This set of teeth gets the new drawing; the other keeps its own.
              const next: ChartSketch = { ...sketches, [dentition]: { ...sketchDraft, aspect: teethAspect } };
              setSketchSaving(true);
              try {
                await onSaveSketch(next);
                setSketches(next);
                setSketchDraft(null);
              } catch {
                // The page said why; the drawing stays open to try again.
              } finally {
                setSketchSaving(false);
              }
            }}
          />
        </div>
      )}

      {/* Anatomical: the patient's right stays on the left in every language. */}
      <div ref={scrollRef} dir="ltr" className="overflow-x-auto -mx-2 px-2">
        <div ref={teethRef} className="w-max mx-auto relative">
          <div className="flex justify-between text-xs text-gray-500 px-1 mb-1">
            <span>{t.chart.patientsRight}</span>
            <span className="font-medium text-gray-500">{t.chart.upperJaw}</span>
            <span>{t.chart.patientsLeft}</span>
          </div>
          <div className="flex justify-center">{upper.map((tooth, i) => column(tooth, true, i, upper.length))}</div>
          <div className="my-2 border-t-2 border-dashed border-gray-200" />
          <div className="flex justify-center">{lower.map((tooth, i) => column(tooth, false, i, lower.length))}</div>
          <p className="text-center text-xs font-medium text-gray-500 mt-1">{t.chart.lowerJaw}</p>
          {(sketchDraft || sketchOnView) && (
            <SketchCanvas
              sketch={sketchDraft ?? sketchSaved ?? { version: 1, aspect: teethAspect, shapes: [] }}
              aspect={teethAspect}
              editing={Boolean(sketchDraft)}
              label={t.xrays.sketchTitle}
              tool={sketchTool}
              color={sketchColor}
              onAdd={(shape) => sketchDraft && setSketchDraft({ ...sketchDraft, shapes: [...sketchDraft.shapes, shape] })}
              className={sketchDraft ? "rounded-lg ring-2 ring-primary-400" : undefined}
            />
          )}
        </div>
      </div>

      <Legend />

      {selected !== null && (
        <ToothPanel
          tooth={selected}
          record={record(selected)}
          canEdit={canEdit && Boolean(onSave)}
          tool={tool}
          onTool={setTool}
          onSurface={(surface) => applyTool(selected, surface)}
          onCondition={(condition) => toggleCondition(selected, condition)}
          onHealthy={() => markHealthy(selected)}
          onNote={(note) => updateTooth(selected, (current) => ({ ...current, note }))}
          onClose={() => setSelected(null)}
          plans={plansFor(plans, selected)}
          newTreatmentHref={newTreatmentHref?.(selected)}
          onNewTreatment={onNewTreatment ? () => onNewTreatment(selected) : undefined}
          images={imagesOf(selected)}
          onOpenImage={(image) => setViewing({ tooth: selected, start: image.name })}
        />
      )}

      {viewing && imagesOf(viewing.tooth).length > 0 && (
        <ImageViewer
          images={imagesOf(viewing.tooth)}
          start={viewing.start}
          patientName={patientName}
          canEdit={canEdit}
          onClose={() => setViewing(null)}
          onChanged={() => onImagesChanged?.()}
        />
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{t.chart.findings}</h3>
        {findings.length === 0 ? (
          <p className="text-sm text-gray-500">{t.chart.nothingMarked}</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
            {findings.map((tooth) => {
              const current = clean.teeth[String(tooth)];
              return (
                <li key={tooth}>
                  <button
                    type="button"
                    onClick={() => {
                      setDentition(isChildTooth(tooth) ? "child" : "adult");
                      setSelected(tooth);
                    }}
                    className="w-full min-h-11 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2 text-start text-sm hover:bg-gray-50"
                  >
                    <span className="font-semibold text-gray-800 w-6">{tooth}</span>
                    <span className="text-gray-700">{describeTooth(current) || t.chart.noteOnly}</span>
                    {current.note && <span className="text-gray-500">· {current.note}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function Legend() {
  const { t } = useI18n();
  const item = (swatch: string, text: string) => (
    <span className="inline-flex items-center gap-1.5">
      <span className={cx("w-3 h-3 rounded-sm border", swatch)} />
      {text}
    </span>
  );
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
      {item("bg-red-500 border-red-600", t.chart.findingNames.caries)}
      {item("bg-sky-500 border-sky-600", t.chart.findingNames.filling)}
      {item("bg-[#fde68a] border-[#d97706]", t.chart.conditions.crown)}
      {item("bg-surface border-rose-500 border-2", t.chart.conditions.root_canal)}
      {item("bg-[#d4d4d8] border-[#71717a]", t.chart.conditions.implant)}
      {item("bg-[#a78bfa] border-[#7c3aed]", t.chart.conditions.bridge)}
      {item("bg-surface border-gray-300 border-dashed", t.chart.conditions.missing)}
      {item("bg-surface border-red-500 border-2", t.chart.conditions.extract)}
    </div>
  );
}

/* ---------------------------------------------------------- tooth panel -- */

/** Clip shapes for the five surface buttons of the large square. */
const SURFACE_CLIPS = {
  top: "polygon(0 0, 100% 0, 71.4% 28.6%, 28.6% 28.6%)",
  bottom: "polygon(0 100%, 100% 100%, 71.4% 71.4%, 28.6% 71.4%)",
  left: "polygon(0 0, 28.6% 28.6%, 28.6% 71.4%, 0 100%)",
  right: "polygon(100% 0, 71.4% 28.6%, 71.4% 71.4%, 100% 100%)",
  center: "polygon(28.6% 28.6%, 71.4% 28.6%, 71.4% 71.4%, 28.6% 71.4%)",
} as const;

const LABEL_PLACES = {
  top: "items-start justify-center pt-2",
  bottom: "items-end justify-center pb-2",
  left: "items-center justify-start ps-3",
  right: "items-center justify-end pe-3",
  center: "items-center justify-center",
} as const;

const FINDING_BUTTONS: Record<SurfaceFinding | "none", string> = {
  none: "bg-surface text-gray-500 hover:bg-gray-100",
  caries: "bg-red-500 text-white hover:bg-[#dc2626]",
  filling: "bg-sky-500 text-white hover:bg-[#0284c7]",
};

function ToothPanel({
  tooth,
  record,
  canEdit,
  tool,
  onTool,
  onSurface,
  onCondition,
  onHealthy,
  onNote,
  onClose,
  plans,
  newTreatmentHref,
  onNewTreatment,
  images,
  onOpenImage,
}: {
  tooth: number;
  record?: ToothRecord;
  canEdit: boolean;
  tool: Tool;
  onTool: (tool: Tool) => void;
  onSurface: (surface: ToothSurface) => void;
  onCondition: (condition: ToothCondition) => void;
  onHealthy: () => void;
  onNote: (note: string) => void;
  onClose: () => void;
  plans: PlanOnTooth[];
  newTreatmentHref?: string;
  onNewTreatment?: () => void;
  images: DentalImage[];
  onOpenImage: (image: DentalImage) => void;
}) {
  const layout = surfaceLayout(tooth);
  const places: Array<[keyof typeof SURFACE_CLIPS, ToothSurface]> = [
    ["top", layout.top],
    ["bottom", layout.bottom],
    ["left", layout.left],
    ["right", layout.right],
    ["center", "O"],
  ];
  const { t } = useI18n();
  const description = describeTooth(record);

  return (
    <div className="rounded-2xl border border-primary-100 bg-primary-50/40 p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-gray-800">{t.chart.tooth(tooth)}</p>
          <p className="text-sm text-gray-500">{toothName(tooth)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.chart.closePanel}
          className="w-11 h-11 -me-2 -mt-2 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
        >
          <X size={18} />
        </button>
      </div>

      {record?.legacy && (
        <Alert tone="yellow">
          {t.chart.legacyNotice(t.chart.legacy[record.legacy])}
          {canEdit ? ` ${t.chart.legacyEditHint}` : ""}
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5">
        {/* Surfaces. Left and right are anatomical (mesial faces the midline), so the square stays left to right. */}
        <div className="flex flex-col items-center gap-3">
          <div dir="ltr" className="relative w-36 h-36" role="group" aria-label={t.chart.surfacesOf(tooth)}>
            {places.map(([place, surface]) => {
              const finding = record?.surfaces?.[surface];
              return (
                <button
                  key={place}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => onSurface(surface)}
                  aria-label={t.chart.surfaceButton(t.chart.surfaces[surface], finding ? t.chart.findingNames[finding] : t.chart.healthySurface)}
                  className={cx(
                    "absolute inset-0 flex text-sm font-semibold transition disabled:cursor-default focus:outline-none focus-visible:brightness-90",
                    LABEL_PLACES[place],
                    FINDING_BUTTONS[finding ?? "none"],
                  )}
                  style={{ clipPath: SURFACE_CLIPS[place] }}
                >
                  {surface}
                </button>
              );
            })}
            <svg viewBox="0 0 28 28" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
              <g className="fill-none stroke-gray-400" strokeWidth={0.5}>
                <rect x={0.25} y={0.25} width={27.5} height={27.5} />
                <rect x={8} y={8} width={12} height={12} />
                <path d="M0.25 0.25 L8 8 M27.75 0.25 L20 8 M0.25 27.75 L8 20 M27.75 27.75 L20 20" />
              </g>
            </svg>
          </div>
          {canEdit && (
            <Segmented
              label={t.chart.markSurfacesAs}
              value={tool}
              onChange={onTool}
              options={[
                { value: "caries", label: t.chart.findingNames.caries },
                { value: "filling", label: t.chart.findingNames.filling },
                { value: "clear", label: t.chart.clear },
              ]}
            />
          )}
          <p className="text-xs text-gray-500 text-center max-w-[15rem]">
            {canEdit ? t.chart.toolHint : t.chart.surfaceKey}
          </p>
        </div>

        {/* Whole tooth, note, plans */}
        <div className="space-y-4 min-w-0">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{t.chart.wholeTooth}</p>
            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                {TOOTH_CONDITIONS.map((condition) => {
                  const on = Boolean(record?.conditions?.includes(condition));
                  return (
                    <button
                      key={condition}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onCondition(condition)}
                      className={cx(
                        "inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-xl border text-sm font-medium transition",
                        on
                          ? "bg-brand border-primary-600 text-white"
                          : "bg-surface border-gray-200 text-gray-700 hover:border-primary-300",
                      )}
                    >
                      {on && <Check size={14} />}
                      {t.chart.conditions[condition]}
                    </button>
                  );
                })}
                <Button variant="ghost" icon={Sparkles} onClick={onHealthy} className="text-green-700 hover:bg-green-50">
                  {t.chart.healthy}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-700">{description || t.chart.healthy}</p>
            )}
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">{t.chart.note}</span>
            {canEdit ? (
              <TextArea
                rows={2}
                value={record?.note ?? ""}
                onChange={(event) => onNote(event.target.value)}
                placeholder={t.chart.notePlaceholder}
              />
            ) : (
              <span className="block text-sm text-gray-700">{record?.note || t.common.dash}</span>
            )}
          </label>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{t.chart.plansForTooth}</p>
            {plans.length === 0 ? (
              <p className="text-sm text-gray-500">{t.chart.noneYet}</p>
            ) : (
              <ul className="space-y-1.5">
                {plans.map((plan) => (
                  <li key={plan.name} className="flex items-center gap-2 text-sm">
                    <Link href={treatmentHref(plan.name)} className="font-medium text-gray-800 hover:text-primary-600">
                      {label(t.enums.treatmentType, plan.treatment_type)}
                    </Link>
                    <StatusBadge kind="treatment" status={plan.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{t.xrays.ofTooth}</p>
            {images.length === 0 ? (
              <p className="text-sm text-gray-500">{t.xrays.noneOfTooth}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {images.map((image) => (
                  <li key={image.name}>
                    <button
                      type="button"
                      onClick={() => onOpenImage(image)}
                      aria-label={t.xrays.openImage(imageTitle(image))}
                      title={imageTitle(image)}
                      className="block w-20 h-16 rounded-lg overflow-hidden bg-gray-950 ring-1 ring-gray-200 hover:ring-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      {isPdf(image) ? (
                        <span className="w-full h-full flex items-center justify-center text-white/80">
                          <FileText size={22} aria-hidden="true" />
                        </span>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element -- an uploaded X-ray of unknown size
                        <img src={fileHref(image.image || "")} alt="" className="w-full h-full object-cover" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {onNewTreatment ? (
            <Button variant="secondary" icon={Plus} onClick={onNewTreatment}>
              {t.chart.newTreatmentForTooth}
            </Button>
          ) : (
            newTreatmentHref && (
              <LinkButton href={newTreatmentHref} variant="secondary" icon={Plus}>
                {t.chart.newTreatmentForTooth}
              </LinkButton>
            )
          )}
        </div>
      </div>
    </div>
  );
}
