"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Circle, Pencil, Trash2, Type, Undo2, type LucideIcon } from "lucide-react";
import { Button, tooltip } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { cx } from "@/lib/format";
import {
  arrowHead, clamp01, SKETCH_COLOURS, SKETCH_TOOLS, type Point, type SketchData, type SketchShape, type SketchTool,
} from "@/lib/sketch";

/** The drawing's own width; the height follows the picture's shape. Points are stored from 0 to 1. */
const W = 1000;

const TOOL_ICONS: Record<SketchTool, LucideIcon> = { pen: Pencil, arrow: ArrowUpRight, circle: Circle, text: Type };

/** One shape, in the drawing's units (width 1000, height 1000 × aspect). */
function ShapeView({ shape, h }: { shape: SketchShape; h: number }) {
  const p = (point: Point): Point => [point[0] * W, point[1] * h];
  const stroke = { stroke: shape.color, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (shape.kind) {
    case "pen":
      return (
        <polyline
          points={(shape.points.length === 1 ? [shape.points[0], shape.points[0]] : shape.points)
            .map((point, index) => {
              const [x, y] = p(point);
              return `${x + (shape.points.length === 1 && index ? 0.5 : 0)},${y}`;
            })
            .join(" ")}
          strokeWidth={shape.width}
          vectorEffect="non-scaling-stroke"
          {...stroke}
        />
      );
    case "arrow": {
      const from = p(shape.from);
      const to = p(shape.to);
      const [a, b] = arrowHead(from, to, 36);
      return (
        <g strokeWidth={shape.width} {...stroke}>
          <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} vectorEffect="non-scaling-stroke" />
          <polyline points={`${a.join(",")} ${to.join(",")} ${b.join(",")}`} vectorEffect="non-scaling-stroke" />
        </g>
      );
    }
    case "circle": {
      const center = p(shape.center);
      return <circle cx={center[0]} cy={center[1]} r={shape.radius * W} strokeWidth={shape.width} vectorEffect="non-scaling-stroke" {...stroke} />;
    }
    case "text": {
      const at = p(shape.at);
      return (
        <text
          x={at[0]}
          y={at[1]}
          fill={shape.color}
          fontSize={shape.size * W}
          fontWeight={700}
          stroke="#000000"
          strokeOpacity={0.55}
          strokeWidth={shape.size * W * 0.06}
          paintOrder="stroke"
          style={{ fontFamily: "inherit" }}
        >
          {shape.text}
        </text>
      );
    }
  }
}

/**
 * The drawing on top of a picture. It fills its parent (which must be `relative` and have the picture's shape):
 * `aspect` is the parent's height divided by its width. While `editing`, one pointer (a finger, a pen or the mouse)
 * draws with the chosen tool and colour, and each finished shape goes to `onAdd`; other fingers (a resting palm)
 * are ignored. Otherwise it lets clicks through to the picture.
 */
export function SketchCanvas({
  sketch,
  aspect,
  editing = false,
  tool = "pen",
  color = SKETCH_COLOURS[0],
  onAdd,
  label,
  className,
}: {
  sketch: SketchData;
  aspect: number;
  editing?: boolean;
  tool?: SketchTool;
  color?: string;
  onAdd?: (shape: SketchShape) => void;
  /** What screen readers call the drawing area while drawing. */
  label?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const svgRef = useRef<SVGSVGElement>(null);
  const [draft, setDraft] = useState<SketchShape | null>(null);
  // The pointer drawing the draft; any other is ignored.
  const activePointer = useRef<number | null>(null);
  // A label being typed: where it goes on the picture, and where the box shows on the screen (the box is not turned
  // or zoomed with the picture).
  const [typing, setTyping] = useState<{ at: Point; x: number; y: number; text: string } | null>(null);
  const h = W * aspect;

  /** Where the pointer is, from 0 to 1 across and down the picture (also when it is zoomed or turned). */
  const pointOf = (event: ReactPointerEvent): Point | null => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return [clamp01(point.x / W), clamp01(point.y / h)];
  };

  const addText = (current: typeof typing) => {
    if (current && current.text.trim()) onAdd?.({ kind: "text", color, at: current.at, text: current.text.trim(), size: 0.05 });
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!editing || event.button !== 0 || activePointer.current !== null) return;
    const point = pointOf(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    if (tool === "text") {
      // Tapping elsewhere keeps the label being typed, then starts a new one there.
      addText(typing);
      setTyping({ at: point, x: event.clientX, y: event.clientY, text: "" });
      return;
    }
    activePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (tool === "pen") setDraft({ kind: "pen", color, width: 4, points: [point] });
    if (tool === "arrow") setDraft({ kind: "arrow", color, width: 4, from: point, to: point });
    if (tool === "circle") setDraft({ kind: "circle", color, width: 4, center: point, radius: 0 });
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!draft || event.pointerId !== activePointer.current) return;
    const point = pointOf(event);
    if (!point) return;
    event.preventDefault();
    if (draft.kind === "pen") {
      const last = draft.points[draft.points.length - 1];
      if (Math.hypot(point[0] - last[0], (point[1] - last[1]) * aspect) > 0.004) setDraft({ ...draft, points: [...draft.points, point] });
    } else if (draft.kind === "arrow") {
      setDraft({ ...draft, to: point });
    } else if (draft.kind === "circle") {
      setDraft({ ...draft, radius: Math.hypot(point[0] - draft.center[0], (point[1] - draft.center[1]) * aspect) });
    }
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerId !== activePointer.current) return;
    activePointer.current = null;
    if (!draft) return;
    const finished = draft;
    setDraft(null);
    // A click without moving draws nothing, except a dot with the pen.
    if (finished.kind === "arrow" && Math.hypot(finished.to[0] - finished.from[0], finished.to[1] - finished.from[1]) < 0.01) return;
    if (finished.kind === "circle" && finished.radius < 0.005) return;
    onAdd?.(finished);
  };

  const finishText = () => {
    addText(typing);
    setTyping(null);
  };

  return (
    <div dir="ltr" className={cx("absolute inset-0", !editing && "pointer-events-none", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${h}`}
        preserveAspectRatio="none"
        direction="ltr"
        className={cx("w-full h-full", editing && "cursor-crosshair touch-none")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={(event) => {
          if (event.pointerId !== activePointer.current) return;
          activePointer.current = null;
          setDraft(null);
        }}
        aria-hidden={!editing}
        role={editing ? "application" : undefined}
        aria-label={editing ? label ?? t.xrays.drawing : undefined}
      >
        {sketch.shapes.map((shape, index) => (
          <ShapeView key={index} shape={shape} h={h} />
        ))}
        {draft && <ShapeView shape={draft} h={h} />}
      </svg>
      {typing &&
        createPortal(
          <input
            autoFocus
            value={typing.text}
            onChange={(event) => setTyping({ ...typing, text: event.target.value })}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") finishText();
              if (event.key === "Escape") setTyping(null);
            }}
            onBlur={finishText}
            placeholder={t.xrays.textPlaceholder}
            aria-label={t.xrays.textLabel}
            dir="auto"
            className="fixed z-[70] w-52 max-w-[calc(100vw-1rem)] rounded-lg border border-white/60 bg-black/80 px-2 py-1 text-sm outline-none"
            style={{
              // Just above the point, kept inside the window.
              left: Math.max(8, Math.min(typing.x, window.innerWidth - 216)),
              top: Math.max(8, typing.y - 40),
              color,
            }}
          />,
          document.body,
        )}
    </div>
  );
}

/** The drawing tools: pen, arrow, circle, text, the colours, undo and clear, and Save / Cancel. */
export function SketchToolbar({
  tool,
  onTool,
  color,
  onColor,
  canUndo,
  onUndo,
  onClear,
  onSave,
  onCancel,
  saving = false,
  saveLabel,
  dark = false,
  extra,
}: {
  tool: SketchTool;
  onTool: (tool: SketchTool) => void;
  color: string;
  onColor: (color: string) => void;
  canUndo: boolean;
  onUndo: () => void;
  onClear: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  saveLabel?: string;
  /** On the dark viewer: light buttons. */
  dark?: boolean;
  /** More buttons after the tools, e.g. zoom. */
  extra?: ReactNode;
}) {
  const { t } = useI18n();
  const x = t.xrays;
  const toolButton = (active: boolean) =>
    cx(
      "w-10 h-10 pointer-coarse:w-11 pointer-coarse:h-11 inline-flex items-center justify-center rounded-xl transition",
      active
        ? "bg-brand text-white"
        : dark
          ? "text-white/85 hover:bg-white/15"
          : "text-gray-600 hover:bg-gray-100",
    );
  return (
    <div className={cx("flex flex-wrap items-center gap-2 rounded-2xl p-2", dark ? "bg-white/10" : "bg-gray-100")}>
      <div role="group" aria-label={x.tools} className="flex items-center gap-1">
        {SKETCH_TOOLS.map((option) => {
          const Icon = TOOL_ICONS[option];
          return (
            <button
              key={option}
              type="button"
              aria-pressed={tool === option}
              aria-label={x.toolNames[option]}
              {...tooltip(x.toolNames[option])}
              onClick={() => onTool(option)}
              className={toolButton(tool === option)}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>
      <div role="group" aria-label={x.colours} className="flex items-center gap-1.5 px-1">
        {SKETCH_COLOURS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={color === option}
            aria-label={x.colourNames[option] ?? option}
            {...tooltip(x.colourNames[option] ?? option)}
            onClick={() => onColor(option)}
            className={cx(
              "w-8 h-8 pointer-coarse:w-10 pointer-coarse:h-10 rounded-full border-2 transition",
              color === option ? "border-primary-500 scale-110" : dark ? "border-white/40" : "border-gray-300",
            )}
            style={{ backgroundColor: option }}
          />
        ))}
      </div>
      <button type="button" onClick={onUndo} disabled={!canUndo} aria-label={x.undo} {...tooltip(x.undo)} className={cx(toolButton(false), "disabled:opacity-40")}>
        <Undo2 size={18} />
      </button>
      <button type="button" onClick={onClear} disabled={!canUndo} aria-label={x.clearDrawing} {...tooltip(x.clearDrawing)} className={cx(toolButton(false), "disabled:opacity-40")}>
        <Trash2 size={18} />
      </button>
      {extra}
      <div className="flex items-center gap-2 ms-auto">
        <Button size="sm" variant={dark ? "ghost" : "secondary"} onClick={onCancel} disabled={saving} className={dark ? "text-white hover:bg-white/15" : undefined}>
          {x.cancelDrawing}
        </Button>
        <Button size="sm" onClick={onSave} loading={saving}>
          {saveLabel ?? x.saveDrawing}
        </Button>
      </div>
    </div>
  );
}
