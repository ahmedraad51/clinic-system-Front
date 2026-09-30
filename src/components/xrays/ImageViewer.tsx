"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Contrast, Expand, ExternalLink, Eye, EyeOff, Info, PenLine, Printer, RotateCcw, Scan, Shrink,
  RotateCw, Sun, SunMoon, Trash2, X, ZoomIn, ZoomOut, type LucideIcon,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/Modal";
import ImageDetailsDialog from "./ImageDetailsDialog";
import ImageStage, { clampZoom, DEFAULT_VIEW, type ImageView } from "./ImageStage";
import { SketchToolbar } from "./Sketch";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { deleteDoc, errorMessage, fileHref, updateDoc } from "@/lib/frappe";
import { cx } from "@/lib/format";
import { parseSketch, sketchToSave, SKETCH_COLOURS, type SketchData, type SketchTool } from "@/lib/sketch";
import { imageTeeth, imageTitle, isPdf, joinTeeth } from "@/lib/xrays";
import type { DentalImage } from "@/lib/types";

/** A round button on the dark viewer. */
function ViewerButton({
  icon: Icon,
  label,
  onClick,
  pressed,
  disabled,
  className,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cx(
        "w-10 h-10 pointer-coarse:w-11 pointer-coarse:h-11 shrink-0 inline-flex items-center justify-center rounded-xl transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-35",
        pressed ? "bg-white text-gray-900" : "text-white/90 hover:bg-white/15",
        className,
      )}
    >
      <Icon size={19} />
    </button>
  );
}

/**
 * The full-screen image viewer: zoom, move, turn, brightness, contrast, invert, full screen, and previous / next
 * through `images`. People who may edit can draw on the image (a separate layer; the image is never changed), edit
 * the details, print and delete. A PDF is shown as it is.
 */
export default function ImageViewer({
  images,
  start,
  patientName,
  canEdit,
  onClose,
  onChanged,
}: {
  images: DentalImage[];
  /** The name of the image to show first. */
  start: string;
  patientName?: string;
  canEdit: boolean;
  onClose: () => void;
  /** An image was drawn on, edited or deleted: load the list again. */
  onChanged: () => void;
}) {
  const { t, dir } = useI18n();
  const x = t.xrays;
  const toast = useToast();
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [current, setCurrent] = useState(start);
  const [view, setView] = useState<ImageView>(DEFAULT_VIEW);
  const [fullScreen, setFullScreen] = useState(false);
  const [showSketch, setShowSketch] = useState(true);
  // Drawing: a copy of the layer being changed, the tool and the colour.
  const [drawing, setDrawing] = useState<SketchData | null>(null);
  const [tool, setTool] = useState<SketchTool>("pen");
  const [color, setColor] = useState<string>(SKETCH_COLOURS[0]);
  const [saving, setSaving] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Changes saved here, shown at once while the list reloads.
  const [savedLayers, setSavedLayers] = useState<Record<string, SketchData>>({});

  const index = Math.max(0, images.findIndex((image) => image.name === current));
  const image = images[index];
  const pdf = image ? isPdf(image) : false;
  const sketch = image ? savedLayers[image.name] ?? parseSketch(image.annotations) : null;

  const go = useCallback(
    (step: number) => {
      if (images.length < 2) return;
      const next = images[(index + step + images.length) % images.length];
      setCurrent(next.name);
      setView(DEFAULT_VIEW);
      setDrawing(null);
    },
    [images, index],
  );

  // Focus starts on Close and goes back where it was; the page behind does not scroll.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onChange = () => setFullScreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Keys: Escape closes (or stops drawing), arrows move through the images (reading direction), + and − zoom.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // Typing goes to the box; a slider keeps its own arrow keys, but Escape and zoom still work.
      if (target?.closest("textarea, select, input:not([type=range])")) return;
      const onSlider = Boolean(target?.closest("input[type=range]"));
      if (editingDetails || confirmDelete) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (drawing) setDrawing(null);
        else onClose();
      } else if (!drawing && !onSlider && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
        const forward = (event.key === "ArrowRight") === (dir === "ltr");
        go(forward ? 1 : -1);
      } else if (event.key === "+" || event.key === "=") {
        setView((v) => ({ ...v, zoom: clampZoom(v.zoom * 1.25) }));
      } else if (event.key === "-") {
        setView((v) => ({ ...v, zoom: clampZoom(v.zoom / 1.25) }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dir, drawing, editingDetails, confirmDelete, go, onClose]);

  if (!image || !sketch) return null;

  const title = imageTitle(image);
  const teeth = imageTeeth(image);

  const toggleFullScreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch {
      // Full screen was refused (e.g. inside a frame): the viewer already fills the window.
    }
  };

  const saveDrawing = async () => {
    if (!drawing) return;
    setSaving(true);
    try {
      await updateDoc("Dental Image", image.name, { annotations: sketchToSave(drawing) || null });
      setSavedLayers((layers) => ({ ...layers, [image.name]: drawing }));
      setDrawing(null);
      setShowSketch(true);
      toast.success(x.drawingSaved);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, x.drawingFailed));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDoc("Dental Image", image.name);
      toast.success(x.deleted);
      setConfirmDelete(false);
      onChanged();
      // The last one: close after the question has gone, so each gives the page's scrolling back in turn.
      if (images.length <= 1) window.setTimeout(onClose, 0);
      else go(1);
    } catch (err) {
      toast.error(errorMessage(err, x.deleteFailed));
    } finally {
      setDeleting(false);
    }
  };

  const zoomBy = (factor: number) => setView({ ...view, zoom: clampZoom(view.zoom * factor) });

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col bg-gray-950 text-white print:hidden"
    >
      {/* Title, position and closing. */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-white/10">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{title}</p>
          <p className="text-xs text-white/70 truncate">
            {[patientName, images.length > 1 ? x.counter(index + 1, images.length) : ""].filter(Boolean).join(t.common.dot)}
          </p>
        </div>
        <ViewerButton icon={ChevronLeft} label={x.previous} onClick={() => go(-1)} disabled={images.length < 2 || Boolean(drawing)} className="rtl:rotate-180" />
        <ViewerButton icon={ChevronRight} label={x.next} onClick={() => go(1)} disabled={images.length < 2 || Boolean(drawing)} className="rtl:rotate-180" />
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={x.close}
          title={x.close}
          className="w-10 h-10 pointer-coarse:w-11 pointer-coarse:h-11 inline-flex items-center justify-center rounded-xl text-white/90 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <X size={20} />
        </button>
      </div>

      {/* The tools. */}
      {!pdf && !drawing && (
        <div className="flex flex-wrap items-center gap-1 px-2 sm:px-4 py-2 border-b border-white/10">
          <ViewerButton icon={ZoomOut} label={x.zoomOut} onClick={() => zoomBy(1 / 1.25)} />
          <span className="w-14 text-center text-sm tabular-nums" aria-live="polite">
            {x.zoom(Math.round(view.zoom * 100))}
          </span>
          <ViewerButton icon={ZoomIn} label={x.zoomIn} onClick={() => zoomBy(1.25)} />
          <ViewerButton icon={Scan} label={x.fit} onClick={() => setView({ ...view, zoom: 1, x: 0, y: 0 })} className="max-sm:hidden" />
          <ViewerButton icon={RotateCw} label={x.rotate} onClick={() => setView({ ...view, rotation: (view.rotation + 90) % 360 })} />
          <label className="flex items-center gap-2 px-2 text-xs text-white/85" title={x.brightness}>
            <Sun size={16} aria-hidden="true" />
            <input
              type="range"
              min={40}
              max={200}
              value={view.brightness}
              onChange={(event) => setView({ ...view, brightness: Number(event.target.value) })}
              aria-label={x.brightness}
              className="w-20 sm:w-28 accent-primary-400"
            />
          </label>
          <label className="flex items-center gap-2 px-2 text-xs text-white/85" title={x.contrast}>
            <Contrast size={16} aria-hidden="true" />
            <input
              type="range"
              min={40}
              max={250}
              value={view.contrast}
              onChange={(event) => setView({ ...view, contrast: Number(event.target.value) })}
              aria-label={x.contrast}
              className="w-20 sm:w-28 accent-primary-400"
            />
          </label>
          <ViewerButton icon={SunMoon} label={x.invert} pressed={view.invert} onClick={() => setView({ ...view, invert: !view.invert })} />
          <ViewerButton icon={RotateCcw} label={x.resetView} onClick={() => setView(DEFAULT_VIEW)} />
          {sketch.shapes.length > 0 && (
            <ViewerButton
              icon={showSketch ? Eye : EyeOff}
              label={x.showDrawing}
              pressed={showSketch}
              onClick={() => setShowSketch(!showSketch)}
            />
          )}
          <span className="flex-1" />
          {canEdit && (
            <button
              type="button"
              onClick={() => setDrawing(sketch)}
              className="inline-flex items-center gap-2 min-h-10 pointer-coarse:min-h-11 px-3 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
            >
              <PenLine size={17} />
              {x.draw}
            </button>
          )}
          <Link
            href={`/xrays/${encodeURIComponent(image.name)}`}
            aria-label={x.print}
            title={x.print}
            className="w-10 h-10 pointer-coarse:w-11 pointer-coarse:h-11 inline-flex items-center justify-center rounded-xl text-white/90 hover:bg-white/15"
          >
            <Printer size={19} />
          </Link>
          {canEdit && <ViewerButton icon={Info} label={x.details} onClick={() => setEditingDetails(true)} />}
          {canEdit && <ViewerButton icon={Trash2} label={x.delete} onClick={() => setConfirmDelete(true)} className="text-red-300 hover:bg-red-500/20" />}
          <ViewerButton icon={fullScreen ? Shrink : Expand} label={fullScreen ? x.exitFullScreen : x.fullScreen} onClick={toggleFullScreen} />
        </div>
      )}

      {drawing && (
        <div className="px-2 sm:px-4 py-2 border-b border-white/10">
          <SketchToolbar
            dark
            tool={tool}
            onTool={setTool}
            color={color}
            onColor={setColor}
            canUndo={drawing.shapes.length > 0}
            onUndo={() => setDrawing({ ...drawing, shapes: drawing.shapes.slice(0, -1) })}
            onClear={() => setDrawing({ ...drawing, shapes: [] })}
            onSave={saveDrawing}
            onCancel={() => setDrawing(null)}
            saving={saving}
            extra={
              <div className="flex items-center gap-1 px-1">
                <ViewerButton icon={ZoomOut} label={x.zoomOut} onClick={() => zoomBy(1 / 1.25)} />
                <ViewerButton icon={ZoomIn} label={x.zoomIn} onClick={() => zoomBy(1.25)} />
                <ViewerButton icon={Scan} label={x.fit} onClick={() => setView({ ...view, zoom: 1, x: 0, y: 0 })} />
              </div>
            }
          />
        </div>
      )}

      {/* The image. */}
      {pdf ? (
        <div className="flex-1 min-h-0 flex flex-col gap-3 p-3 sm:p-4">
          <p className="text-sm text-white/80">{x.pdfNote}</p>
          <iframe src={fileHref(image.image || "")} title={title} className="flex-1 w-full rounded-xl bg-white" />
          <a
            href={fileHref(image.image || "")}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-white/10 text-sm font-medium hover:bg-white/20"
          >
            <ExternalLink size={16} />
            {x.openInTab}
          </a>
        </div>
      ) : (
        <ImageStage
          src={image.image || ""}
          alt={title}
          view={view}
          onView={setView}
          sketch={drawing ?? sketch}
          showSketch={showSketch}
          editing={Boolean(drawing)}
          tool={tool}
          color={color}
          onAddShape={(shape) => drawing && setDrawing({ ...drawing, shapes: [...drawing.shapes, shape] })}
          onAspect={(aspect) => drawing && drawing.aspect !== aspect && setDrawing({ ...drawing, aspect })}
          className="flex-1 min-h-0"
        />
      )}

      {/* What the image is about. */}
      <div className="px-3 sm:px-4 py-2 border-t border-white/10 text-sm">
        {image.description && (
          <p className="text-white/90" dir="auto">
            {image.description}
          </p>
        )}
        <p className="text-xs text-white/65">
          {teeth.length > 0 && <span>{teeth.length === 1 ? x.tooth(teeth[0]) : x.teethShort(joinTeeth(teeth))}{t.common.dot}</span>}
          {image.file_name && (
            <>
              <bdi>{image.file_name}</bdi>
              {t.common.dot}
            </>
          )}
          {!pdf && x.moveHint}
        </p>
      </div>

      {editingDetails && (
        <ImageDetailsDialog
          image={image}
          onClose={() => setEditingDetails(false)}
          onSaved={() => {
            setEditingDetails(false);
            onChanged();
          }}
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        title={x.deleteTitle}
        message={<p>{x.deleteText(title)}</p>}
        confirmLabel={x.deleteConfirm}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
