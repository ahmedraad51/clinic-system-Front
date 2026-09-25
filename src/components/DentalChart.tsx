"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { cx, parseDentalChart } from "@/lib/format";
import { LOWER_TEETH, UPPER_TEETH, type DentalChartData, type ToothStatus } from "@/lib/types";

const STATUSES: ToothStatus[] = ["normal", "treated", "pending"];

const statusConfig: Record<ToothStatus, { label: string; bg: string; border: string; text: string }> = {
  normal: { label: "Normal", bg: "bg-white", border: "border-gray-200", text: "text-gray-500" },
  treated: { label: "Has Treatment", bg: "bg-primary-50", border: "border-primary-400", text: "text-primary-600" },
  pending: { label: "Pending Treatment", bg: "bg-yellow-50", border: "border-yellow-400", text: "text-yellow-600" },
};

/** Drops "normal" teeth and sorts the keys, so two charts can be compared and only real marks are saved. */
function clean(chart: DentalChartData): DentalChartData {
  const result: DentalChartData = {};
  Object.keys(chart)
    .sort()
    .forEach((tooth) => {
      if (chart[tooth] !== "normal") result[tooth] = chart[tooth];
    });
  return result;
}

function ToothButton({
  number,
  status,
  selected,
  canEdit,
  onSelect,
}: {
  number: number;
  status: ToothStatus;
  selected: boolean;
  canEdit: boolean;
  onSelect: (tooth: number | null) => void;
}) {
  const cfg = statusConfig[status];
  return (
    <button
      type="button"
      disabled={!canEdit}
      onClick={() => onSelect(selected ? null : number)}
      aria-pressed={selected}
      aria-label={`Tooth ${number}: ${cfg.label}`}
      className={cx(
        "w-9 h-11 sm:w-10 sm:h-12 shrink-0 rounded-lg border-2 text-xs font-bold transition-all duration-150 disabled:cursor-default",
        cfg.bg,
        cfg.border,
        cfg.text,
        selected ? "ring-2 ring-primary-500 ring-offset-1 scale-110" : canEdit && "hover:scale-105 hover:shadow-md",
      )}
    >
      {number}
    </button>
  );
}

/**
 * FDI chart of the 32 permanent teeth. Click a tooth to mark it.
 * `onSave` receives only the marked teeth, e.g. { "36": "treated" }.
 */
export default function DentalChart({
  initialTeeth,
  onSave,
  canEdit = true,
}: {
  initialTeeth?: DentalChartData | string | null;
  onSave?: (chart: DentalChartData) => Promise<void>;
  canEdit?: boolean;
}) {
  const [saved, setSaved] = useState<DentalChartData>(() => clean(parseDentalChart(initialTeeth)));
  const [teeth, setTeeth] = useState<DentalChartData>(() => clean(parseDentalChart(initialTeeth)));
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(clean(teeth)) !== JSON.stringify(saved);
  const marked = Object.keys(clean(teeth)).length;

  const setStatus = (tooth: number, status: ToothStatus) => {
    setTeeth((prev) => ({ ...prev, [String(tooth)]: status }));
    setSelected(null);
  };

  const handleSave = async () => {
    if (!onSave) return;
    const chart = clean(teeth);
    setSaving(true);
    try {
      await onSave(chart);
      setSaved(chart);
      setTeeth(chart);
    } catch {
      // The page shows the error; the unsaved marks stay on screen.
    } finally {
      setSaving(false);
    }
  };

  const tooth = (n: number) => (
    <ToothButton
      key={n}
      number={n}
      status={teeth[String(n)] || "normal"}
      selected={selected === n}
      canEdit={canEdit}
      onSelect={setSelected}
    />
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 w-full">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Dental Chart</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {marked === 0 ? "No teeth marked" : marked === 1 ? "1 tooth marked" : `${marked} teeth marked`}
            {canEdit ? " · click a tooth to change it" : ""}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto py-2">
        <div className="min-w-[640px]">
          <p className="text-xs text-gray-400 text-center mb-2 font-medium">Upper Jaw</p>
          <div className="flex justify-center gap-1">{UPPER_TEETH.map(tooth)}</div>
          <div className="my-4 border-t-2 border-dashed border-gray-100" />
          <div className="flex justify-center gap-1">{LOWER_TEETH.map(tooth)}</div>
          <p className="text-xs text-gray-400 text-center mt-2 font-medium">Lower Jaw</p>
        </div>
      </div>

      {selected !== null && (
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
          <span className="text-sm font-semibold text-gray-700 sm:w-24">Tooth {selected}</span>
          <div className="flex flex-wrap gap-2 flex-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(selected, s)}
                className={cx(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition",
                  (teeth[String(selected)] || "normal") === s
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-700 border-gray-200 hover:border-primary-300",
                )}
              >
                {statusConfig[s].label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setSelected(null)} className="text-xs text-gray-500 hover:text-gray-800">
            Done
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-4 justify-center my-6">
        {STATUSES.map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={cx("w-3 h-3 rounded border-2", statusConfig[s].bg, statusConfig[s].border)} />
            <span className="text-xs text-gray-500">{statusConfig[s].label}</span>
          </div>
        ))}
      </div>

      {canEdit && onSave && (
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!dirty} loading={saving} className="flex-1">
            Save Chart
          </Button>
          {dirty && (
            <Button variant="secondary" onClick={() => setTeeth(saved)} disabled={saving}>
              Undo changes
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
