"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Plus, Printer, RotateCcw, Save, Sparkles, X } from "lucide-react";
import UnsavedChangesGuard from "@/components/UnsavedChangesGuard";
import ToothLogo from "@/components/ToothLogo";
import { Alert, Button, CardIcon, LinkButton, Segmented, StatusBadge, TextArea } from "@/components/ui";
import {
  CONDITION_LABELS, FINDING_LABELS, LEGACY_LABELS, SURFACE_LABELS, cleanChart, describeTooth, isChildTooth,
  isUpper, parseDentalChart, surfaceLayout, toothKind, toothName, type ToothKind,
} from "@/lib/dentalChart";
import { cx } from "@/lib/format";
import { treatmentHref } from "@/lib/links";
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
  const crownFill = has(record, "crown")
    ? "fill-amber-200 stroke-amber-600"
    : record?.legacy === "treated"
      ? "fill-primary-100 stroke-primary-500"
      : record?.legacy === "pending"
        ? "fill-yellow-100 stroke-yellow-500"
        : "fill-white stroke-gray-400";
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
            {!implant && <path d={shape.roots} className="fill-gray-50 stroke-gray-400" />}
            <path d={shape.crown} className={crownFill} />
          </>
        )}
        {implant && (
          <g>
            <path d="M15 29 L25 29 L24 57 L20 62 L16 57 Z" className="fill-gray-300 stroke-gray-500" />
            {[34, 39, 44, 49, 54].map((y) => (
              <path key={y} d={`M14.5 ${y} L25.5 ${y - 2}`} className="stroke-gray-500" />
            ))}
          </g>
        )}
        {has(record, "root_canal") && !implant && !missing &&
          shape.canals.map((d) => <path key={d} d={d} className="fill-none stroke-rose-500" strokeWidth={2.4} strokeLinecap="round" />)}
        {has(record, "bridge") && <rect x={-2} y={11} width={44} height={6} rx={2} className="fill-violet-400/80 stroke-violet-600" />}
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
      <g className="stroke-gray-400" strokeWidth={1} strokeLinejoin="round">
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
  initialTooth,
  printHref,
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
  /** Open with this tooth selected, e.g. the tooth of a treatment plan. */
  initialTooth?: number;
  /** Where "Print" goes, e.g. /patients/<id>/chart. */
  printHref?: string;
}) {
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
    const description = describeTooth(current);
    const number = (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-gray-600">
        {tooth}
        {active && <span className="w-1.5 h-1.5 rounded-full bg-primary-500" title="Has an open treatment plan" />}
      </span>
    );
    return (
      <button
        key={tooth}
        type="button"
        onClick={() => setSelected(selected === tooth ? null : tooth)}
        aria-pressed={selected === tooth}
        data-tooth={tooth}
        aria-label={`Tooth ${tooth}, ${toothName(tooth)}${description ? `: ${description}` : ""}`}
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
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 w-full space-y-5 [print-color-adjust:exact] print:shadow-none print:border-0 print:p-0">
      <UnsavedChangesGuard when={dirty && canEdit && Boolean(onSave)} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <CardIcon icon={ToothLogo} />
          <div>
            <h2 className="text-base font-semibold text-gray-800">Dental Chart</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {findings.length === 0 ? "No findings" : findings.length === 1 ? "1 tooth with findings" : `${findings.length} teeth with findings`}
              <span className="print:hidden">
                {" · "}click a tooth to {canEdit ? "mark it" : "see it"}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {printHref && !dirty && (
            <LinkButton href={printHref} variant="secondary" icon={Printer}>
              Print
            </LinkButton>
          )}
          <Segmented
            label="Teeth"
            value={dentition}
            onChange={(next) => {
              setDentition(next);
              setSelected(null);
            }}
            options={[
              { value: "adult", label: "Adult" },
              { value: "child", label: "Child" },
            ]}
          />
          {canEdit && onSave && dirty && (
            <>
              <Button variant="secondary" icon={RotateCcw} onClick={() => setChart(saved)} disabled={saving}>
                Undo
              </Button>
              <Button icon={Save} onClick={handleSave} loading={saving}>
                Save Chart
              </Button>
            </>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="overflow-x-auto -mx-2 px-2">
        <div className="w-max mx-auto">
          <div className="flex justify-between text-xs text-gray-500 px-1 mb-1">
            <span>Patient&apos;s right</span>
            <span className="font-medium text-gray-500">Upper jaw</span>
            <span>Patient&apos;s left</span>
          </div>
          <div className="flex justify-center">{upper.map((t, i) => column(t, true, i, upper.length))}</div>
          <div className="my-2 border-t-2 border-dashed border-gray-200" />
          <div className="flex justify-center">{lower.map((t, i) => column(t, false, i, lower.length))}</div>
          <p className="text-center text-xs font-medium text-gray-500 mt-1">Lower jaw</p>
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
        />
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Findings</h3>
        {findings.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing marked. All teeth are recorded as healthy.</p>
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
                    <span className="text-gray-700">{describeTooth(current) || "Note only"}</span>
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
  const item = (swatch: string, label: string) => (
    <span className="inline-flex items-center gap-1.5">
      <span className={cx("w-3 h-3 rounded-sm border", swatch)} />
      {label}
    </span>
  );
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
      {item("bg-red-500 border-red-600", "Caries")}
      {item("bg-sky-500 border-sky-600", "Filling")}
      {item("bg-amber-200 border-amber-600", "Crown")}
      {item("bg-white border-rose-500 border-2", "Root canal")}
      {item("bg-gray-300 border-gray-500", "Implant")}
      {item("bg-violet-400 border-violet-600", "Bridge")}
      {item("bg-white border-gray-300 border-dashed", "Missing")}
      {item("bg-white border-red-500 border-2", "To extract")}
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
  none: "bg-white text-gray-500 hover:bg-gray-100",
  caries: "bg-red-500 text-white hover:bg-red-600",
  filling: "bg-sky-500 text-white hover:bg-sky-600",
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
}) {
  const layout = surfaceLayout(tooth);
  const places: Array<[keyof typeof SURFACE_CLIPS, ToothSurface]> = [
    ["top", layout.top],
    ["bottom", layout.bottom],
    ["left", layout.left],
    ["right", layout.right],
    ["center", "O"],
  ];
  const description = describeTooth(record);

  return (
    <div className="rounded-2xl border border-primary-100 bg-primary-50/40 p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-gray-800">Tooth {tooth}</p>
          <p className="text-sm text-gray-500">{toothName(tooth)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tooth panel"
          className="w-11 h-11 -me-2 -mt-2 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-gray-700"
        >
          <X size={18} />
        </button>
      </div>

      {record?.legacy && (
        <Alert tone="yellow">
          The old chart marked this tooth as &quot;{LEGACY_LABELS[record.legacy]}&quot;.
          {canEdit ? " Mark what it has below, or press Healthy to clear the old mark." : ""}
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5">
        {/* Surfaces */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-36 h-36" role="group" aria-label={`Surfaces of tooth ${tooth}`}>
            {places.map(([place, surface]) => {
              const finding = record?.surfaces?.[surface];
              return (
                <button
                  key={place}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => onSurface(surface)}
                  aria-label={`${SURFACE_LABELS[surface]} surface: ${finding ? FINDING_LABELS[finding] : "healthy"}`}
                  className={cx(
                    "absolute inset-0 flex text-sm font-bold transition disabled:cursor-default focus:outline-none focus-visible:brightness-90",
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
              label="Mark surfaces as"
              value={tool}
              onChange={onTool}
              options={[
                { value: "caries", label: "Caries" },
                { value: "filling", label: "Filling" },
                { value: "clear", label: "Clear" },
              ]}
            />
          )}
          <p className="text-xs text-gray-500 text-center max-w-[15rem]">
            {canEdit ? "Choose Caries, Filling or Clear, then tap the surfaces." : "M mesial · O occlusal · D distal · B buccal · L lingual"}
          </p>
        </div>

        {/* Whole tooth, note, plans */}
        <div className="space-y-4 min-w-0">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Whole tooth</p>
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
                          ? "bg-primary-600 border-primary-600 text-white"
                          : "bg-white border-gray-200 text-gray-700 hover:border-primary-300",
                      )}
                    >
                      {on && <Check size={14} />}
                      {CONDITION_LABELS[condition]}
                    </button>
                  );
                })}
                <Button variant="ghost" icon={Sparkles} onClick={onHealthy} className="text-green-700 hover:bg-green-50">
                  Healthy
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-700">{description || "Healthy"}</p>
            )}
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">Note</span>
            {canEdit ? (
              <TextArea
                rows={2}
                value={record?.note ?? ""}
                onChange={(event) => onNote(event.target.value)}
                placeholder="e.g. sensitive to cold, crack on the buccal cusp"
              />
            ) : (
              <span className="block text-sm text-gray-700">{record?.note || "—"}</span>
            )}
          </label>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Treatment plans for this tooth</p>
            {plans.length === 0 ? (
              <p className="text-sm text-gray-500">None yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {plans.map((plan) => (
                  <li key={plan.name} className="flex items-center gap-2 text-sm">
                    <Link href={treatmentHref(plan.name)} className="font-medium text-gray-800 hover:text-primary-600">
                      {plan.treatment_type}
                    </Link>
                    <StatusBadge kind="treatment" status={plan.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {newTreatmentHref && (
            <LinkButton href={newTreatmentHref} variant="secondary" icon={Plus}>
              New treatment for this tooth
            </LinkButton>
          )}
        </div>
      </div>
    </div>
  );
}
