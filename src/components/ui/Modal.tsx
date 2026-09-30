"use client";

import { messages } from "@/i18n";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./index";
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

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
  priority = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  /** Above every other dialog (the "Log in again" dialog), still under toasts. */
  priority?: boolean;
}) {
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
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      // A dialog opened on top of this one handles the keys.
      if (openDialogs[openDialogs.length - 1] !== id) return;
      if (event.key === "Escape") {
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
      document.body.style.overflow = scroll;
      if (before && document.contains(before)) before.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={cx("fixed inset-0 flex items-end sm:items-center justify-center sm:p-4 print:hidden", priority ? "z-[55]" : "z-50")}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "relative bg-white w-full rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={messages().ui.close}
            className="w-9 h-9 pointer-coarse:w-11 pointer-coarse:h-11 -me-2 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>
        <div ref={bodyRef} className="px-6 pb-6 overflow-y-auto">
          {children}
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
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={busy ? noop : onCancel}>
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
