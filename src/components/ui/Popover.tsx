"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { messages } from "@/i18n";
import { cx } from "@/lib/format";
import { useMediaQuery } from "@/lib/hooks";

/**
 * The floating panel under a field: the list of a dropdown, a calendar, a time or colour picker. It sits on the page
 * body (a portal), so a dialog's scrolling body never cuts it off, opens below the field (above it when there is more
 * room there), stays inside the screen, follows the field while the page or a dialog scrolls, and closes when the
 * user clicks or taps elsewhere. On a phone it is a sheet from the bottom of the screen with a title and a close
 * button. Keys (Escape, arrows) are the content's job: it calls onClose itself.
 */
export function Popover({
  anchor,
  onClose,
  title,
  width,
  sheet = true,
  tall = false,
  children,
  className,
}: {
  /** The field it belongs to: positions the panel and does not count as "elsewhere". */
  anchor: RefObject<HTMLElement | null>;
  onClose: () => void;
  /** The sheet's title on a phone (usually the field's label). */
  title?: string;
  /** "anchor" (at least the field's width, the default), or a fixed width in rem. */
  width?: "anchor" | number;
  /** False keeps it under the field on a phone too (suggestions under a box being typed in, above the keyboard). */
  sheet?: boolean;
  /** A panel that must show whole (a calendar, a time or colour picker), not a list that scrolls after 360 px. */
  tall?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const phone = useMediaQuery("(max-width: 639px)") && sheet;
  const panelRef = useRef<HTMLDivElement>(null);
  // Transparent (not hidden) until placed: the content can take the focus as soon as it is drawn.
  const [style, setStyle] = useState<CSSProperties>({ position: "fixed", top: 0, left: 0, opacity: 0 });
  // Always the latest onClose, without re-adding the listeners.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // Where it goes: under the field, or above it when the room below is short; inside the screen.
  useLayoutEffect(() => {
    if (phone) return;
    const place = () => {
      const field = anchor.current;
      const panel = panelRef.current;
      if (!field || !panel) return;
      const rect = field.getBoundingClientRect();
      const margin = 8;
      const gap = 4;
      const rtl = document.documentElement.dir === "rtl";
      // Sizes are in rem, which the Screen Size setting changes (80-120 %).
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const wanted = width === "anchor" || width === undefined ? Math.max(rect.width, 12 * rem) : width * rem;
      const panelWidth = Math.min(wanted, window.innerWidth - 2 * margin);
      // The part of the screen really visible: on a phone the keyboard covers the bottom (the visual viewport).
      const view = window.visualViewport;
      const viewTop = view?.offsetTop ?? 0;
      const viewBottom = view ? view.offsetTop + view.height : window.innerHeight;
      const below = viewBottom - rect.bottom - gap - margin;
      const above = rect.top - viewTop - gap - margin;
      const cap = tall ? 640 : 360;
      // The content's own height (the panel itself may already be cut to an earlier maxHeight).
      const content = [...panel.children].reduce((sum, child) => sum + (child as HTMLElement).scrollHeight, 2);
      const natural = Math.min(content, cap);
      const upward = below < natural && above > below;
      const room = upward ? above : below;
      const maxHeight = Math.max(80, Math.min(cap, room));
      // Lined up with the field's start edge (its right edge in Arabic), kept on screen.
      let left = rtl ? rect.right - panelWidth : rect.left;
      left = Math.min(Math.max(margin, left), window.innerWidth - panelWidth - margin);
      setStyle({
        position: "fixed",
        left,
        width: panelWidth,
        maxHeight,
        ...(upward ? { bottom: window.innerHeight - rect.top + gap } : { top: rect.bottom + gap }),
      });
    };
    place();
    window.addEventListener("resize", place);
    // Capture: a dialog's own scrolling body moves the field too.
    window.addEventListener("scroll", place, true);
    // The phone keyboard opening or closing.
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    // Content that arrives later (search results) may need the room above instead.
    const sizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    if (panelRef.current && sizes) for (const child of panelRef.current.children) sizes.observe(child);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("scroll", place);
      sizes?.disconnect();
    };
  }, [anchor, phone, width, tall]);

  // A click or tap elsewhere closes it. A tap on the phone sheet's dark backdrop is left to the backdrop's own click,
  // so the tap does not go on to whatever is under it once the sheet is gone.
  useEffect(() => {
    const onDown = (event: PointerEvent) => {
      const target = event.target as Element;
      if (panelRef.current?.contains(target) || anchor.current?.contains(target)) return;
      if (target.closest?.("[data-popover-sheet]")) return;
      closeRef.current();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [anchor]);

  if (typeof document === "undefined") return null;

  // Tab and Shift+Tab go round the panel's own buttons and boxes (it sits at the end of the page, so leaving it would
  // lose the place). Lists close on Tab themselves (they stop the key first).
  const keepTab = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || event.defaultPrevented) return;
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>("button, input, [tabindex]")].filter(
      (el) => el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled,
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey ? document.activeElement === first : document.activeElement === last) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  };

  if (phone) {
    return createPortal(
      <div className="fixed inset-0 z-[57] flex flex-col justify-end" data-popover-sheet>
        <div
          className="absolute inset-0 bg-black/40"
          aria-hidden="true"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }}
        />
        <div
          ref={panelRef}
          data-popover=""
          onKeyDown={keepTab}
          className={cx(
            "relative max-h-[78vh] flex flex-col rounded-t-xl bg-surface shadow-xl pb-[env(safe-area-inset-bottom)] motion-safe:animate-page-in",
            className,
          )}
        >
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
            <p className="text-base font-medium text-gray-900 truncate">{title}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label={messages().ui.close}
              className="w-11 h-11 -me-2 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto flex flex-col">{children}</div>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      ref={panelRef}
      style={typeof width === "number" ? { ...style, width: `${width}rem`, maxWidth: "calc(100vw - 1rem)" } : style}
      data-popover=""
      onKeyDown={keepTab}
      className={cx(
        "z-[57] flex flex-col rounded-md border border-gray-200 bg-surface shadow-lg motion-safe:animate-pop-in",
        tall ? "overflow-y-auto" : "overflow-hidden",
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}

/** The label text of the Field a control sits in, for the phone sheet's title (empty outside a Field). */
export function fieldLabelOf(element: HTMLElement | null): string {
  const label = element?.closest("label");
  return label?.querySelector("[data-field-label]")?.textContent?.replace(/\*$/, "").trim() ?? "";
}

/** True on a touch screen. There, focusing a hidden native select or date box after a tap would open the browser's
 * own picker (iPhone, iPad), so a choice made by touch does not move the focus back to it. */
export function coarsePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}
