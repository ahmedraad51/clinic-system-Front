"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * The app's own hover hint, in place of the browser's `title` tooltip: spread it on any element,
 * `<button aria-label={x.zoomIn} {...tooltip(x.zoomIn)}>`. One `TooltipLayer` (in the root layout) shows the text of the
 * element under the mouse after a short wait, and at once when the element gets the focus from the keyboard.
 * Never use `title` for a hint (an `<iframe>` keeps its `title`: that is its name, not a hint).
 */
export function tooltip(text: string | null | undefined): { "data-tooltip"?: string } {
  return text ? { "data-tooltip": text } : {};
}

/** How long the mouse rests on an element before its hint shows; once one shows, the next one shows at once. */
const SHOW_AFTER_MS = 350;
const HIDE_AFTER_MS = 100;
/** Space kept between the hint and the element, and between the hint and the edge of the screen. */
const GAP = 8;
const EDGE = 8;
const TOOLTIP_ID = "app-tooltip";

interface Shown {
  target: HTMLElement;
  text: string;
}

function hintTarget(node: EventTarget | null): HTMLElement | null {
  return node instanceof Element ? node.closest<HTMLElement>("[data-tooltip]") : null;
}

/** The accessible name the element already has: a hint that only repeats it is not linked as a description. */
function ownName(el: HTMLElement): string {
  return (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim();
}

/**
 * Shows the hint of the element under the mouse or with the keyboard focus. The hint takes the page's font and
 * direction (right to left in Arabic) and the text colour as its background, so it stands out in light and dark mode.
 * It stays while the mouse moves onto it, Escape closes it (and only it, never the dialog around), and it follows the
 * element while the page scrolls. Touch screens get no hints: there is nothing to rest the pointer on.
 */
export function TooltipLayer() {
  const [shown, setShown] = useState<Shown | null>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const arrow = useRef<HTMLSpanElement>(null);
  const current = useRef<HTMLElement | null>(null);

  // Mouse, focus and keys: one set of listeners for the whole page.
  useEffect(() => {
    let showTimer: number | undefined;
    let hideTimer: number | undefined;
    const clearTimers = () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
    const show = (target: HTMLElement) => {
      clearTimers();
      const text = target.dataset.tooltip;
      if (!text) return;
      current.current = target;
      setShown({ target, text });
    };
    const hide = () => {
      clearTimers();
      current.current = null;
      setShown(null);
    };
    const hideSoon = () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(hide, HIDE_AFTER_MS);
    };

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (bubble.current?.contains(event.target as Node)) {
        window.clearTimeout(hideTimer);
        return;
      }
      const target = hintTarget(event.target);
      if (!target) return;
      if (target === current.current) {
        window.clearTimeout(hideTimer);
        return;
      }
      clearTimers();
      if (current.current) show(target);
      else showTimer = window.setTimeout(() => show(target), SHOW_AFTER_MS);
    };
    const onPointerOut = (event: PointerEvent) => {
      const to = event.relatedTarget as Node | null;
      const from = hintTarget(event.target);
      const onBubble = bubble.current?.contains(event.target as Node);
      if (!from && !onBubble) return;
      // Still inside the same element, or moving between it and its hint.
      if (to && (from?.contains(to) || current.current?.contains(to) || bubble.current?.contains(to))) return;
      if (current.current) hideSoon();
      else window.clearTimeout(showTimer);
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = hintTarget(event.target);
      // Only a keyboard focus: a click focuses the button too, and the mouse already had its hint.
      if (target && target === event.target && target.matches(":focus-visible")) show(target);
    };
    const onFocusOut = (event: FocusEvent) => {
      if (current.current && event.target === current.current) hide();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !current.current) return;
      // Closes the hint only: a dialog checks defaultPrevented and stays open.
      event.preventDefault();
      hide();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!bubble.current?.contains(event.target as Node)) hide();
    };

    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      clearTimers();
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, []);

  // While a hint shows: link it to its element for screen readers, and keep it next to the element on every frame
  // (the page scrolls, a dialog moves, the text changes). It goes when the element leaves the page.
  useEffect(() => {
    if (!shown) return;
    const { target } = shown;
    const before = target.getAttribute("aria-describedby");
    const describes = shown.text !== ownName(target);
    if (describes) target.setAttribute("aria-describedby", [before, TOOLTIP_ID].filter(Boolean).join(" "));

    let frame = 0;
    const place = () => {
      const box = bubble.current;
      if (!target.isConnected || !target.dataset.tooltip) {
        current.current = null;
        setShown(null);
        return;
      }
      if (target.dataset.tooltip !== shown.text) {
        setShown({ target, text: target.dataset.tooltip });
        return;
      }
      if (box) {
        const r = target.getBoundingClientRect();
        const width = box.offsetWidth;
        const height = box.offsetHeight;
        const viewWidth = document.documentElement.clientWidth;
        const below = r.top - GAP - height < EDGE;
        const left = Math.min(Math.max(r.left + r.width / 2 - width / 2, EDGE), Math.max(EDGE, viewWidth - width - EDGE));
        const top = below ? r.bottom + GAP : r.top - GAP - height;
        // Screen coordinates, so left and top (not inset-inline-start): the same in both directions. Not a transform:
        // the opening animation uses that.
        box.style.left = `${Math.round(left)}px`;
        box.style.top = `${Math.round(top)}px`;
        box.dataset.side = below ? "bottom" : "top";
        if (arrow.current) {
          const x = Math.min(Math.max(r.left + r.width / 2 - left, 10), width - 10);
          arrow.current.style.left = `${Math.round(x) - 4}px`;
        }
        box.style.visibility = "visible";
      }
      frame = requestAnimationFrame(place);
    };
    frame = requestAnimationFrame(place);
    return () => {
      cancelAnimationFrame(frame);
      if (!describes) return;
      if (before) target.setAttribute("aria-describedby", before);
      else target.removeAttribute("aria-describedby");
    };
  }, [shown]);

  if (!shown) return null;
  return createPortal(
    <div
      ref={bubble}
      id={TOOLTIP_ID}
      role="tooltip"
      data-tooltip-bubble
      // Placed by the frame loop above; hidden until it is measured, so it never flashes in the corner.
      style={{ visibility: "hidden" }}
      className="group/tip fixed z-[70] max-w-[min(18rem,calc(100vw-1rem))] rounded-md bg-gray-900 text-surface px-2.5 py-1.5 text-xs font-medium shadow-md whitespace-pre-line break-words print:hidden motion-safe:animate-pop-in"
    >
      <span>{shown.text}</span>
      <span
        ref={arrow}
        aria-hidden="true"
        className="absolute w-2 h-2 rotate-45 bg-gray-900 group-data-[side=top]/tip:-bottom-1 group-data-[side=bottom]/tip:-top-1"
      />
    </div>,
    document.body,
  );
}
