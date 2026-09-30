"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { SketchCanvas } from "./Sketch";
import { fileHref } from "@/lib/frappe";
import { cx } from "@/lib/format";
import type { SketchData, SketchShape, SketchTool } from "@/lib/sketch";

/** How an image is shown: zoom (1 = fits the stage), quarter turns, how far it is moved, and the light filters. */
export interface ImageView {
  zoom: number;
  rotation: number;
  x: number;
  y: number;
  /** 100 = as taken. */
  brightness: number;
  contrast: number;
  invert: boolean;
}

export const DEFAULT_VIEW: ImageView = { zoom: 1, rotation: 0, x: 0, y: 0, brightness: 100, contrast: 100, invert: false };
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 8;
export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom * 100) / 100));

/**
 * One image on a dark stage: it fits the stage, and can be zoomed (wheel, two-finger pinch on a tablet), moved (drag)
 * and turned. The drawing layer sits on the image and turns and zooms with it. While `editing`, one finger draws;
 * two fingers still pinch and move the image.
 */
export default function ImageStage({
  src,
  alt,
  view,
  onView,
  sketch,
  showSketch = true,
  editing = false,
  tool,
  color,
  onAddShape,
  onAspect,
  className,
}: {
  src: string;
  alt: string;
  view: ImageView;
  onView: (view: ImageView) => void;
  sketch?: SketchData;
  showSketch?: boolean;
  editing?: boolean;
  tool?: SketchTool;
  color?: string;
  onAddShape?: (shape: SketchShape) => void;
  /** The image's height divided by its width, once it has loaded. */
  onAspect?: (aspect: number) => void;
  className?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [aspect, setAspect] = useState(0.75);
  // The fingers (or the mouse) on the stage, and the view when the gesture started.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ view: ImageView; x: number; y: number; distance: number } | null>(null);
  // The latest view and setter, for the wheel listener below.
  const latest = useRef({ view, onView });
  useEffect(() => {
    latest.current = { view, onView };
  });

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setStage({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    // The wheel zooms; it must not scroll the page, so the listener is not passive.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const { view: current, onView: set } = latest.current;
      set({ ...current, zoom: clampZoom(current.zoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15)) });
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer.disconnect();
      element.removeEventListener("wheel", onWheel);
    };
  }, []);

  // The image's box at zoom 1: as big as fits, turned sideways when it is rotated a quarter.
  const sideways = Math.abs(view.rotation % 180) === 90;
  const shownAspect = sideways ? 1 / aspect : aspect;
  const room = { width: Math.max(0, stage.width - 24), height: Math.max(0, stage.height - 24) };
  const fitWidth = Math.min(room.width, room.height / shownAspect);
  const box = sideways ? { width: fitWidth * shownAspect, height: fitWidth } : { width: fitWidth, height: fitWidth * aspect };

  /** The middle of the fingers and how far apart they are. */
  const measure = () => {
    const points = [...pointers.current.values()];
    const x = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const y = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const distance = points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0;
    return { x, y, distance };
  };
  const restart = () => {
    gesture.current = pointers.current.size ? { view, ...measure() } : null;
  };

  // Capture phase: while drawing, the drawing layer takes the first finger; a second one turns it into a pinch.
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (editing && event.pointerType === "mouse") return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (editing && pointers.current.size < 2) return;
    if (editing) {
      // The pinch wins over the stroke that the first finger started.
      event.stopPropagation();
    } else {
      // Keep following a drag that leaves the stage.
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    restart();
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const start = gesture.current;
    if (!start || (editing && pointers.current.size < 2)) return;
    const now = measure();
    const zoom = start.distance > 0 && now.distance > 0 ? clampZoom(start.view.zoom * (now.distance / start.distance)) : start.view.zoom;
    onView({ ...start.view, zoom, x: start.view.x + now.x - start.x, y: start.view.y + now.y - start.y });
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    restart();
  };

  return (
    <div
      ref={stageRef}
      className={cx("relative overflow-hidden bg-black select-none touch-none", !editing && "cursor-grab active:cursor-grabbing", className)}
      onPointerDownCapture={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: box.width,
          height: box.height,
          transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${view.zoom}) rotate(${view.rotation}deg)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- an uploaded X-ray of unknown size */}
        <img
          src={fileHref(src)}
          alt={alt}
          draggable={false}
          onLoad={(event) => {
            const img = event.currentTarget;
            if (img.naturalWidth > 0) {
              const next = img.naturalHeight / img.naturalWidth;
              setAspect(next);
              onAspect?.(next);
            }
          }}
          className="w-full h-full object-contain"
          style={{
            filter: `brightness(${view.brightness}%) contrast(${view.contrast}%)${view.invert ? " invert(1)" : ""}`,
          }}
        />
        {sketch && (showSketch || editing) && (
          <SketchCanvas sketch={sketch} aspect={aspect} editing={editing} tool={tool} color={color} onAdd={onAddShape} />
        )}
      </div>
    </div>
  );
}
