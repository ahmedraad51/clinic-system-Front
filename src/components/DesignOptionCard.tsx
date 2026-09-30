"use client";

import type { KeyboardEvent } from "react";
import { Check, Palette } from "lucide-react";
import { Card } from "@/components/ui";
import { DESIGN_OPTIONS, saveDesign } from "@/lib/design";
import { cx } from "@/lib/format";
import { useDesign } from "@/lib/hooks";

/**
 * Profile page: switch between the three design options (A, B, C) on this computer, to compare them before one
 * is chosen for good. Each choice shows a small sample of its colours.
 */
export default function DesignOptionCard() {
  const design = useDesign();
  // Arrow keys move to the next or previous option and choose it, like any radio group.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // In a right-to-left page the left arrow goes forward.
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    const step = event.key === "ArrowDown" || event.key === forward ? 1 : event.key === "ArrowUp" || event.key === back ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = DESIGN_OPTIONS.findIndex((option) => option.value === design);
    const next = DESIGN_OPTIONS[(index + step + DESIGN_OPTIONS.length) % DESIGN_OPTIONS.length];
    saveDesign(next.value);
    event.currentTarget.querySelector<HTMLElement>(`[data-option="${next.value}"]`)?.focus();
  };
  return (
    <Card title="Design Option" icon={Palette}>
      <p className="text-sm text-gray-600 mb-4">
        Three looks to choose from. Try each one; only this computer changes. The clinic keeps the one it likes best.
      </p>
      <div role="radiogroup" aria-label="Design option" onKeyDown={onKeyDown} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {DESIGN_OPTIONS.map((option) => {
          const active = option.value === design;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              data-option={option.value}
              tabIndex={active ? 0 : -1}
              onClick={() => saveDesign(option.value)}
              className={cx(
                "text-start rounded-2xl border-2 p-3 transition min-h-11",
                active ? "border-primary-600 bg-primary-50" : "border-gray-200 hover:border-gray-300 bg-white",
              )}
            >
              <DesignSample option={option.value} />
              <span className="flex items-center gap-2 mt-3">
                <span className="text-sm font-semibold text-gray-800">
                  {option.value.toUpperCase()} · {option.name}
                </span>
                {active && <Check size={16} className="text-primary-700" aria-hidden="true" />}
              </span>
              <span className="block text-xs text-gray-600 mt-1">{option.summary}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/** A tiny picture of the option: its menu, page and coloured tiles. Colours are fixed here on purpose. */
function DesignSample({ option }: { option: (typeof DESIGN_OPTIONS)[number]["value"] }) {
  const look = {
    a: { menu: "#ffffff", page: "#f1f7f6", tiles: ["#e0f2fe", "#ede9fe", "#ccfbf1", "#fef3c7"], bar: "#0f766e", edge: "#e5e7eb" },
    b: { menu: "#0f172a", page: "#eef1f8", tiles: ["#2563eb", "#c026d3", "#0891b2", "#059669"], bar: "#4f46e5", edge: "#0f172a" },
    c: { menu: "#fffaf4", page: "#fbf5ee", tiles: ["#0369a1", "#7e22ce", "#0f766e", "#15803d"], bar: "#c2410c", edge: "#fed7aa" },
  }[option];
  return (
    <svg viewBox="0 0 120 64" className="w-full h-auto rounded-lg" aria-hidden="true">
      <rect width="120" height="64" fill={look.page} />
      <rect width="30" height="64" fill={look.menu} stroke={look.edge} strokeWidth="0.6" />
      {[10, 18, 26, 34].map((y, i) => (
        <rect key={y} x="5" y={y} width="5" height="5" rx={option === "c" ? 2.5 : 1.3} fill={look.tiles[i]} />
      ))}
      <rect x="36" y="6" width="78" height="12" rx="3" fill={option === "b" ? look.bar : "#ffffff"} />
      {look.tiles.map((colour, i) => (
        <rect key={colour} x={36 + i * 20} y="24" width="17" height="14" rx={option === "c" ? 5 : 3} fill={colour} />
      ))}
      <rect x="36" y="43" width="78" height="15" rx="3" fill="#ffffff" />
      <rect x="40" y="48" width="22" height="5" rx={option === "c" ? 2.5 : 1.5} fill={look.bar} />
    </svg>
  );
}
