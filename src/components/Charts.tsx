"use client";

import type { CSSProperties } from "react";
import { messages, num } from "@/i18n";
import { cx } from "@/lib/format";

/**
 * Small charts drawn in code (no chart library): bars and a ring. They take the colour of the section they sit in
 * (a `sec-*` class on the card, see globals.css), grow into place, and read out as one sentence to screen readers.
 */

export interface ChartPoint {
  label: string;
  value: number;
  /** A longer label for the tooltip and screen readers ("Sep 2026" for "Sep"). */
  fullLabel?: string;
}

/** More bars than this and the chart turns compact: thinner bars, no values on top, only some labels. */
const DENSE_AFTER = 12;

/**
 * Vertical bars with the value above each one. `format` writes a value ("450K"); the highest bar is drawn in
 * the full colour, the others lighter, so the best month stands out. With many bars (days of a month) the values
 * move into the tooltips and only every few labels are written.
 */
export function BarChart({
  data,
  label,
  format = (value) => num(value),
  highlight,
  empty = messages().ui.nothingYet,
}: {
  data: ChartPoint[];
  /** What the chart shows, e.g. "Revenue, last 6 months". */
  label: string;
  format?: (value: number) => string;
  /** Index of the bar to draw in full colour; the highest one when left out. */
  highlight?: number;
  empty?: string;
}) {
  const max = Math.max(0, ...data.map((point) => point.value));
  const strong = highlight ?? (max > 0 ? data.findIndex((point) => point.value === max) : -1);
  const summary = `${label}: ${data.map((point) => `${point.fullLabel ?? point.label} ${format(point.value)}`).join(", ")}`;
  if (max === 0) return <p className="text-sm text-gray-500 py-10 text-center">{empty}</p>;
  const dense = data.length > DENSE_AFTER;
  // In a compact chart, a label every `step` bars (and on the last one).
  const step = dense ? Math.ceil(data.length / 7) : 1;
  return (
    <div role="img" aria-label={summary} className={cx("flex items-end h-48 pt-6", dense ? "gap-0.5 sm:gap-1" : "gap-2 sm:gap-3")}>
      {data.map((point, index) => {
        const height = point.value > 0 ? Math.max(3, Math.round((point.value / max) * 100)) : 0;
        const delay = dense ? Math.round((index / data.length) * 600) : index * 60;
        const style: CSSProperties = { height: `${height}%`, animationDelay: `${delay}ms` };
        const showLabel = !dense || index % step === 0 || index === data.length - 1;
        return (
          <div key={point.label + index} aria-hidden="true" className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1.5">
            {!dense && (
              <span className="text-xs font-semibold text-gray-700 tabular-nums whitespace-nowrap">{point.value > 0 ? format(point.value) : ""}</span>
            )}
            <div className="w-full max-w-14 flex-1 flex items-end border-b border-gray-100">
              <div
                title={`${point.fullLabel ?? point.label}: ${format(point.value)}`}
                style={style}
                className={cx(
                  "w-full origin-bottom motion-safe:animate-grow-up",
                  "rounded-t-md bg-linear-to-t from-sec to-sec-light",
                  index !== strong && "opacity-70",
                )}
              />
            </div>
            <span className={cx("text-xs text-gray-500 whitespace-nowrap", !showLabel && "invisible")}>{point.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** The colours of a ring's slices, in order: the section colours, then greys. */
const SLICE_COLOURS = [
  "var(--sec-treatments)",
  "var(--sec-patients)",
  "var(--sec-appointments)",
  "var(--sec-money)",
  "var(--sec-reports)",
  "var(--brand)",
  "#94a3b8",
  "#cbd5e1",
];

/** A ring cut into slices, with the total in the middle and a legend beside it. */
export function DonutChart({
  data,
  label,
  centerLabel,
  format = (value) => num(value),
  empty = messages().ui.nothingYet,
}: {
  data: ChartPoint[];
  label: string;
  /** Under the total in the middle, e.g. "plans". */
  centerLabel: string;
  format?: (value: number) => string;
  empty?: string;
}) {
  const total = data.reduce((sum, point) => sum + point.value, 0);
  if (total === 0) return <p className="text-sm text-gray-500 py-10 text-center">{empty}</p>;
  const percent = (value: number) => Math.round((value / total) * 100);
  const summary = `${label}: ${data.map((point) => `${point.label} ${format(point.value)} (${percent(point.value)}%)`).join(", ")}`;
  // Where each slice starts on the ring (0-100), and how much of it it takes.
  const slices = data.map((point, index) => ({
    point,
    share: (point.value / total) * 100,
    start: data.slice(0, index).reduce((sum, before) => sum + (before.value / total) * 100, 0),
  }));
  return (
    // Ring and legend side by side when the card is wide enough, the legend under the ring in a narrow card.
    <div role="img" aria-label={summary} className="@container">
      <div className="flex flex-col @sm:flex-row items-center gap-6">
      <div className="relative w-40 h-40 shrink-0" aria-hidden="true">
        <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="currentColor" strokeWidth="5" className="text-gray-100" />
          {slices.map(({ point, share, start }, index) => (
              <circle
                key={point.label}
                cx="21"
                cy="21"
                r="15.9"
                fill="none"
                pathLength={100}
                strokeWidth="5"
                // A small gap between slices (none when there is only one).
                strokeDasharray={`${Math.max(0, share - (data.length > 1 ? 1 : 0))} ${100 - share + (data.length > 1 ? 1 : 0)}`}
                strokeDashoffset={-start}
                style={{ stroke: SLICE_COLOURS[index % SLICE_COLOURS.length] }}
              />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-800 leading-none">{format(total)}</span>
          <span className="text-xs text-gray-500 mt-1">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 @sm:flex-1 space-y-2" aria-hidden="true">
        {data.map((point, index) => (
          <li key={point.label} className="flex items-center gap-2.5 text-sm">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: SLICE_COLOURS[index % SLICE_COLOURS.length] }} />
            <span className="flex-1 min-w-0 truncate text-gray-700">{point.label}</span>
            <span className="font-semibold text-gray-800 tabular-nums">{format(point.value)}</span>
            <span className="w-10 text-end text-xs text-gray-500 tabular-nums">{percent(point.value)}%</span>
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}
