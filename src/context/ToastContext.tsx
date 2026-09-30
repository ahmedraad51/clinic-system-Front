"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from "react";
import Link from "next/link";
import { Check, Info, X } from "lucide-react";
import { messages } from "@/i18n";

type ToastKind = "success" | "error" | "info";

/** A link in the message, e.g. "Open" to the record a dialog just saved. */
export interface ToastAction {
  label: string;
  href: string;
}

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
}

interface ToastContextType {
  success: (message: string, action?: ToastAction) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

/** Solid colours that stay the same in dark mode, so the white text stays readable. */
const STYLES: Record<ToastKind, string> = {
  success: "bg-solid-green",
  error: "bg-solid-red",
  info: "bg-solid-ink",
};

/** Small messages in the corner, e.g. "Patient saved". They close by themselves. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string, action?: ToastAction) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, kind, message, action }]);
      // A message with a link stays longer, so there is time to use it.
      setTimeout(() => dismiss(id), kind === "error" ? 6000 : action ? 8000 : 3500);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      success: (message: string, action?: ToastAction) => push("success", message, action),
      error: (message: string) => push("error", message),
      info: (message: string) => push("info", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        // On phones the messages sit under the top bar, so they never cover the Save bar or a bottom sheet.
        className="fixed bottom-4 end-4 max-sm:bottom-auto max-sm:top-20 z-[60] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm print:hidden"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
            className={`${STYLES[toast.kind]} text-white rounded-xl shadow-lg px-4 py-3 text-sm flex items-start gap-3`}
          >
            <span className="mt-0.5 shrink-0">
              {toast.kind === "success" ? <Check size={16} /> : <Info size={16} />}
            </span>
            <span className="flex-1">
              {toast.message}
              {toast.action && (
                <Link
                  href={toast.action.href}
                  onClick={() => dismiss(toast.id)}
                  className="ms-2 font-semibold underline underline-offset-2 whitespace-nowrap"
                >
                  {toast.action.label}
                </Link>
              )}
            </span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="shrink-0 opacity-80 hover:opacity-100"
              aria-label={messages().ui.closeMessage}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};
