"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from "react";
import { Check, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const STYLES: Record<ToastKind, string> = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-gray-800",
};

/** Small messages in the corner, e.g. "Patient saved". They close by themselves. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3500);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      success: (message: string) => push("success", message),
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
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="shrink-0 opacity-80 hover:opacity-100"
              aria-label="Close message"
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
