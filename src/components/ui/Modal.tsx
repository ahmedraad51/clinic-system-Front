"use client";

import { messages } from "@/i18n";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button, InDialog } from "./index";
import { cx } from "@/lib/format";

const noop = () => {};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A dialog over the page. For keyboard and screen-reader users it moves the focus into the dialog (a field
 * with autoFocus, or else the first button or field of the body, so Cancel in a confirmation), keeps Tab
 * inside it, closes on Escape, and returns the focus to where it was. The page behind does not scroll.
 */
/** Open dialogs, newest last. Only the newest one reacts to Escape and Tab. */
const openDialogs: number[] = [];
let lastDialogId = 0;
/**
 * The page's scroll lock is shared: several dialogs can close in the same moment (a form and its "Leave without
 * saving?" question), in any order, so the first one to open keeps what to put back and the last one to close does it.
 */
let scrollLocks = 0;
let savedOverflow = "";

/** True while any dialog is open (the search palette does not open over one). */
export function isDialogOpen(): boolean {
  return openDialogs.length > 0;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
  size,
  side = false,
  fullScreenOnPhone = false,
  priority = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** The same as size "lg". */
  wide?: boolean;
  /** md (28rem, questions), lg (42rem, forms), xl (64rem, the booking form with the doctor's day). */
  size?: "md" | "lg" | "xl";
  /** A panel down the end side of the screen (the right in English, the left in Arabic), for long forms. */
  side?: boolean;
  /** The whole screen on a phone (forms), instead of a sheet from the bottom. */
  fullScreenOnPhone?: boolean;
  /** Above every other dialog (the "Log in again" dialog), still under toasts. */
  priority?: boolean;
}) {
  const width = { md: "sm:max-w-md", lg: "sm:max-w-2xl", xl: "sm:max-w-5xl" }[size ?? (wide ? "lg" : "md")];
  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Always the latest onClose, without re-running the focus effect when it changes.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const id = ++lastDialogId;
    openDialogs.push(id);
    const before = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) {
      const first = bodyRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? dialog.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    }
    if (scrollLocks++ === 0) savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      // A dialog opened on top of this one handles the keys.
      if (openDialogs[openDialogs.length - 1] !== id) return;
      if (event.key === "Escape") {
        // A control inside that used Escape itself (the patient picker's list) keeps the dialog open.
        if (event.defaultPrevented) return;
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === firstItem || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && (document.activeElement === lastItem || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      openDialogs.splice(openDialogs.indexOf(id), 1);
      window.removeEventListener("keydown", onKey);
      if (--scrollLocks === 0) document.body.style.overflow = savedOverflow;
      if (before && document.contains(before)) before.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cx(
        "fixed inset-0 flex print:hidden",
        side ? "items-stretch justify-end" : "items-end sm:items-center justify-center sm:p-4",
        fullScreenOnPhone && !side && "max-sm:items-stretch",
        priority ? "z-[55]" : "z-50",
      )}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "relative bg-surface w-full shadow-lg flex flex-col",
          side
            ? "h-full sm:max-w-2xl motion-safe:animate-page-in"
            : cx("rounded-t-md sm:rounded-md max-h-[90vh]", width, fullScreenOnPhone && "max-sm:h-full max-sm:max-h-none max-sm:rounded-none"),
        )}
      >
        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-4">
          <h2 className="text-lg font-medium text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={messages().ui.close}
            className="w-8 h-8 pointer-coarse:w-11 pointer-coarse:h-11 -me-2 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            <X size={20} />
          </button>
        </div>
        <div ref={bodyRef} className="px-6 pb-6 overflow-y-auto flex-1">
          <InDialog.Provider value={true}>{children}</InDialog.Provider>
        </div>
      </div>
    </div>
  );
}

/** "Are you sure?" before deleting or other actions that cannot be undone. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = messages().ui.confirm,
  danger = true,
  busy = false,
  priority = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  /** Above other dialogs and the Appearance panel (a question asked from inside them). */
  priority?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={busy ? noop : onCancel} priority={priority}>
      <div className="text-sm text-gray-600">{message}</div>
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          {messages().ui.cancel}
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
