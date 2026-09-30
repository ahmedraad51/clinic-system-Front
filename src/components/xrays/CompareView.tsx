"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Scan, SunMoon, X, ZoomIn, ZoomOut } from "lucide-react";
import ImageStage, { clampZoom, DEFAULT_VIEW, type ImageView } from "./ImageStage";
import { useI18n } from "@/context/LanguageContext";
import { cx } from "@/lib/format";
import { parseSketch } from "@/lib/sketch";
import { imageTitle } from "@/lib/xrays";
import type { DentalImage } from "@/lib/types";

const button =
  "w-10 h-10 pointer-coarse:w-11 pointer-coarse:h-11 inline-flex items-center justify-center rounded-xl text-white/90 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

/** One side of the comparison: its title and its own zoom. */
function Pane({ image, invert }: { image: DentalImage; invert: boolean }) {
  const { t } = useI18n();
  const x = t.xrays;
  const [view, setView] = useState<ImageView>(DEFAULT_VIEW);
  const title = imageTitle(image);
  return (
    <section aria-label={title} className="flex flex-col min-h-0 min-w-0 border-white/10 sm:border-e last:border-e-0">
      <div className="flex items-center gap-1 px-3 py-2">
        <p className="flex-1 min-w-0 text-sm font-semibold truncate">{title}</p>
        <button type="button" className={button} aria-label={x.zoomOut} title={x.zoomOut} onClick={() => setView({ ...view, zoom: clampZoom(view.zoom / 1.25) })}>
          <ZoomOut size={18} />
        </button>
        <button type="button" className={button} aria-label={x.zoomIn} title={x.zoomIn} onClick={() => setView({ ...view, zoom: clampZoom(view.zoom * 1.25) })}>
          <ZoomIn size={18} />
        </button>
        <button type="button" className={button} aria-label={x.fit} title={x.fit} onClick={() => setView(DEFAULT_VIEW)}>
          <Scan size={18} />
        </button>
      </div>
      <ImageStage
        src={image.image || ""}
        alt={title}
        view={{ ...view, invert }}
        onView={(next) => setView({ ...next, invert: view.invert })}
        sketch={parseSketch(image.annotations)}
        className="flex-1 min-h-0"
      />
    </section>
  );
}

/** Two images side by side (one above the other on a phone), e.g. before and after a root canal. */
export default function CompareView({ images, onClose }: { images: [DentalImage, DentalImage]; onClose: () => void }) {
  const { t } = useI18n();
  const x = t.xrays;
  const closeRef = useRef<HTMLButtonElement>(null);
  const [swapped, setSwapped] = useState(false);
  const [invert, setInvert] = useState(false);
  const [first, second] = swapped ? [images[1], images[0]] : images;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={x.compareTitle} className="fixed inset-0 z-50 flex flex-col bg-gray-950 text-white print:hidden">
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-white/10">
        <p className="flex-1 text-sm font-semibold">{x.compareTitle}</p>
        <button type="button" className={button} aria-label={x.invert} title={x.invert} aria-pressed={invert} onClick={() => setInvert(!invert)}>
          <SunMoon size={18} className={cx(invert && "text-primary-300")} />
        </button>
        <button type="button" className={button} aria-label={x.swap} title={x.swap} onClick={() => setSwapped(!swapped)}>
          <ArrowLeftRight size={18} />
        </button>
        <button ref={closeRef} type="button" className={button} aria-label={x.close} title={x.close} onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 min-h-0 grid grid-rows-2 sm:grid-rows-1 sm:grid-cols-2">
        <Pane key={first.name} image={first} invert={invert} />
        <Pane key={second.name} image={second} invert={invert} />
      </div>
    </div>
  );
}
