"use client";

import { useLayoutEffect, useRef, useState, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { Clock } from "lucide-react";
import { localDigits, messages, num } from "@/i18n";
import { cx, formatTime } from "@/lib/format";
import { coarsePointer, fieldLabelOf, Popover } from "./Popover";
import { peerFieldClass, setNativeValue } from "./Select";
import { inputClass } from "./styles";

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n: number) => String(n).padStart(2, "0");

/** "14:30" → { hour: 2, minute: 30, pm: true }; empty → 9:00 AM, the usual start of a clinic day. */
function parts(value: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return { hour: 9, minute: 0, pm: false };
  const h = Number(match[1]);
  return { hour: h % 12 === 0 ? 12 : h % 12, minute: Number(match[2]), pm: h >= 12 };
}
const toValue = (hour: number, minute: number, pm: boolean) => `${pad((hour % 12) + (pm ? 12 : 0))}:${pad(minute)}`;

/**
 * The app's own time field, used like <input type="time"> (value "HH:MM", onChange with the input's event, name,
 * required). A real time input stays underneath, invisible, for the label, forms, tests and `required`. Our button
 * shows the time the way the app writes it ("10:30 ص"); clicking it, or Enter, Space or Down on the field, opens our
 * picker (a Popover; a sheet on a phone) with three columns: the hour, the minute in 5-minute steps (a saved minute
 * in between is kept and shown) and AM / PM. Each click sets the time at once; Done or Escape closes. Up and Down move
 * in a column, left and right between columns (in the reading direction), Enter closes.
 */
export function TimeInput({
  className,
  value,
  onChange,
  placeholder,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value"> & { value?: string }) {
  const t = messages();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // The field's label, read when the picker opens: the phone sheet's title.
  const [title, setTitle] = useState("");
  const current = value && /^\d{1,2}:\d{2}/.test(value) ? value.slice(0, 5) : "";
  const { hour, minute, pm } = parts(current);
  const minutes = MINUTES.includes(minute) ? MINUTES : [...MINUTES, minute].sort((a, b) => a - b);

  const openPicker = () => {
    if (rest.disabled) return;
    setTitle(fieldLabelOf(boxRef.current) || rest["aria-label"] || "");
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) inputRef.current?.focus({ preventScroll: true });
  };
  const set = (next: { hour?: number; minute?: number; pm?: boolean }) => {
    const time = toValue(next.hour ?? hour, next.minute ?? minute, next.pm ?? pm);
    if (inputRef.current && time !== current) setNativeValue(inputRef.current, time, "input");
  };

  // The chosen hour, minute and half of the day are in view, and the hour column takes the keys.
  useLayoutEffect(() => {
    if (!open) return;
    panelRef.current?.querySelectorAll<HTMLElement>("[aria-selected='true']").forEach((cell) => cell.scrollIntoView({ block: "center" }));
    const hourCell =
      panelRef.current?.querySelector<HTMLElement>("[data-column='hour'] [aria-selected='true']") ??
      panelRef.current?.querySelector<HTMLElement>("[data-column='hour'] button");
    hourCell?.focus({ preventScroll: true });
  }, [open]);

  const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const column = target.closest<HTMLElement>("[data-column]");
    const columns = [...(panelRef.current?.querySelectorAll<HTMLElement>("[data-column]") ?? [])];
    const focusSelected = (el?: HTMLElement) => el?.querySelector<HTMLElement>("[aria-selected='true']")?.focus();
    const handlers: Record<string, () => void> = {
      Escape: () => close(),
      Enter: () => close(),
      ArrowDown: () => (target.nextElementSibling as HTMLElement | null)?.click(),
      ArrowUp: () => (target.previousElementSibling as HTMLElement | null)?.click(),
      ArrowRight: () => focusSelected(columns[columns.indexOf(column as HTMLElement) + (rtl ? -1 : 1)]),
      ArrowLeft: () => focusSelected(columns[columns.indexOf(column as HTMLElement) + (rtl ? 1 : -1)]),
    };
    const action = handlers[event.key];
    if (!action) return;
    // Escape closes the picker only, never the dialog around the field.
    event.preventDefault();
    event.stopPropagation();
    action();
  };
  // After a click the newly chosen cell keeps the focus (it was drawn again).
  useLayoutEffect(() => {
    if (!open) return;
    const active = document.activeElement as HTMLElement | null;
    const column = active?.closest<HTMLElement>("[data-column]")?.dataset.column;
    if (column) panelRef.current?.querySelector<HTMLElement>(`[data-column='${column}'] [aria-selected='true']`)?.focus({ preventScroll: true });
  }, [open, current]);

  return (
    <div ref={boxRef} className={cx("relative w-full", className)}>
      <input
        ref={inputRef}
        type="time"
        {...rest}
        value={value ?? ""}
        onChange={onChange}
        onKeyDown={(event) => {
          if (["ArrowDown", "Enter", " ", "F4"].includes(event.key)) {
            event.preventDefault();
            openPicker();
          }
        }}
        className="peer absolute inset-0 w-full h-full opacity-0 pointer-events-none"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        disabled={rest.disabled}
        data-picker={rest.name ?? rest.id}
        onClick={() => (open ? close() : openPicker())}
        className={cx(inputClass, peerFieldClass, "flex items-center gap-2 text-start pe-10 cursor-pointer", open && "border-primary-600 ring-1 ring-primary-600")}
      >
        <span className={cx("flex-1 min-w-0 truncate", !current && "text-gray-400")}>{current ? formatTime(current) : placeholder || t.ui.pickTime}</span>
        <Clock size={18} aria-hidden="true" className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-500" />
      </button>
      {open && (
        <Popover anchor={boxRef} onClose={() => close(false)} width={15} title={title} tall>
          <div ref={panelRef} className="p-2 max-sm:px-5" onKeyDown={onKey}>
            <div className="grid grid-cols-3 gap-2">
              <div data-column="hour" role="listbox" aria-label={t.ui.hour} className="max-h-56 overflow-y-auto space-y-0.5 p-0.5">
                {HOURS.map((h) => (
                  <TimeCell key={h} selected={h === hour && Boolean(current)} label={num(h)} onPick={() => set({ hour: h })} />
                ))}
              </div>
              <div data-column="minute" role="listbox" aria-label={t.ui.minute} className="max-h-56 overflow-y-auto space-y-0.5 p-0.5">
                {minutes.map((m) => (
                  <TimeCell key={m} selected={m === minute && Boolean(current)} label={localDigits(pad(m))} onPick={() => set({ minute: m })} />
                ))}
              </div>
              <div data-column="period" role="listbox" aria-label={t.ui.period} className="space-y-0.5 p-0.5">
                <TimeCell selected={!pm && Boolean(current)} label={t.dates.am} onPick={() => set({ pm: false })} />
                <TimeCell selected={pm && Boolean(current)} label={t.dates.pm} onPick={() => set({ pm: true })} />
              </div>
            </div>
            <div className="flex justify-end mt-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => close(!coarsePointer())}
                className="px-4 h-9 pointer-coarse:h-11 rounded-md text-sm font-medium text-primary-600 hover:bg-primary-50"
              >
                {t.ui.done}
              </button>
            </div>
          </div>
        </Popover>
      )}
    </div>
  );
}

/** One hour, minute or AM / PM in the picker; the chosen one is filled and takes Tab. */
function TimeCell({ selected, label, onPick }: { selected: boolean; label: string; onPick: () => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onPick}
      className={cx(
        "w-full h-9 pointer-coarse:h-11 shrink-0 rounded-md text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
        selected ? "bg-brand text-white font-medium" : "text-gray-800 hover:bg-gray-100",
      )}
    >
      {label}
    </button>
  );
}
