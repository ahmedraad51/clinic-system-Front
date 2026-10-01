"use client";

import { useLayoutEffect, useRef, useState, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { messages, num } from "@/i18n";
import { addDays, addMonths, cx, formatDate, formatLongDate, monthStart, todayISO, weekStart } from "@/lib/format";
import { useMediaQuery } from "@/lib/hooks";
import { coarsePointer, fieldLabelOf, Popover } from "./Popover";
import { peerFieldClass, setNativeValue } from "./Select";
import { inputClass } from "./styles";

type View = "days" | "months" | "years";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const inRange = (iso: string, min?: string, max?: string) => (!min || iso >= min) && (!max || iso <= max);
const clamp = (iso: string, min?: string, max?: string) => (min && iso < min ? min : max && iso > max ? max : iso);

/**
 * The app's own date field, used like <input type="date"> (value "YYYY-MM-DD", onChange with the input's event, min,
 * max, required, name). A real date input stays underneath, invisible: the label points at it, forms and tests read
 * and fill it, and `required` checks it. Our button shows the date in the screen's language ("26 أيلول 2026"); clicking
 * it, or Enter, Space or Down on the field, opens our calendar (a Popover; a sheet on a phone): the month's days with
 * the week from Sunday, Arabic or English month and day names, today marked, months and years to jump between (a birth
 * year is three clicks away), Today and Clear, and min / max respected. In the calendar the arrow keys move a day or a
 * week (left and right follow the reading direction), Page Up / Down a month, Home / End the week, Enter chooses.
 * `clearable` (default: when not required) shows Clear.
 */
export function DateInput({
  className,
  value,
  onChange,
  min,
  max,
  placeholder,
  clearable,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "min" | "max"> & {
  value?: string;
  min?: string;
  max?: string;
  clearable?: boolean;
}) {
  const t = messages();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Where the keyboard focus goes after the next render: the focused day, or the chosen month or year. Not after the
  // header's arrows (they keep it, so Enter twice moves two months).
  const focusTo = useRef<"day" | "choice" | null>(null);
  // Wide enough for 44 px days on touch screens.
  const coarse = useMediaQuery("(pointer: coarse)");
  const [open, setOpen] = useState(false);
  // The field's label, read when the calendar opens: the phone sheet's title.
  const [title, setTitle] = useState("");
  const [view, setView] = useState<View>("days");
  const today = todayISO();
  const current = value && ISO.test(value) ? value : "";
  // The day with the keyboard focus, and the month shown.
  const [focused, setFocused] = useState(current || today);
  const [yearsFrom, setYearsFrom] = useState(0);
  const shownMonth = monthStart(focused);

  const openCalendar = () => {
    if (rest.disabled) return;
    const start = current || (max && today > max ? max : min && today < min ? min : today);
    setFocused(start);
    setYearsFrom(Number(start.slice(0, 4)) - 7);
    setView("days");
    setTitle(fieldLabelOf(boxRef.current) || rest["aria-label"] || "");
    focusTo.current = "day";
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) inputRef.current?.focus({ preventScroll: true });
  };
  const choose = (iso: string, byTouch = false) => {
    if (iso && !inRange(iso, min, max)) return;
    if (inputRef.current && iso !== current) setNativeValue(inputRef.current, iso, "input");
    close(!byTouch);
  };
  const showView = (next: View) => {
    focusTo.current = next === "days" ? "day" : "choice";
    setView(next);
  };

  // The keyboard focus stays inside the calendar: on the focused day while moving around, on the chosen month or year
  // after switching views, and on the panel itself if neither can take it (so Escape still closes only the calendar).
  useLayoutEffect(() => {
    if (!open || !focusTo.current) return;
    const target =
      focusTo.current === "day"
        ? gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focused}"]:not(:disabled)`)
        : panelRef.current?.querySelector<HTMLButtonElement>("[data-chosen]");
    focusTo.current = null;
    (target ?? panelRef.current)?.focus({ preventScroll: true });
  }, [open, view, focused, yearsFrom]);

  const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  const onGridKey = (event: KeyboardEvent) => {
    const move = (to: (day: string) => string) => () => setFocused((day) => clamp(to(day), min, max));
    const step = (days: number) => move((day) => addDays(day, days));
    const keys: Record<string, () => void> = {
      ArrowRight: step(rtl ? -1 : 1),
      ArrowLeft: step(rtl ? 1 : -1),
      ArrowDown: step(7),
      ArrowUp: step(-7),
      PageDown: move((day) => addMonths(day, event.shiftKey ? 12 : 1)),
      PageUp: move((day) => addMonths(day, event.shiftKey ? -12 : -1)),
      Home: move((day) => weekStart(day)),
      End: move((day) => addDays(weekStart(day), 6)),
      Enter: () => choose(focused),
      " ": () => choose(focused),
      Escape: () => close(),
    };
    const action = keys[event.key];
    if (!action) return;
    focusTo.current = "day";
    // Escape closes the calendar only, never the dialog around the field.
    event.preventDefault();
    event.stopPropagation();
    action();
  };
  const onPanelKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  const days = Array.from({ length: 42 }, (_, i) => addDays(weekStart(shownMonth), i));
  const weekdays = Array.from({ length: 7 }, (_, i) => addDays(weekStart(shownMonth), i));
  const monthIndex = Number(shownMonth.slice(5, 7)) - 1;
  const year = Number(shownMonth.slice(0, 4));
  const Prev = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;

  return (
    <div ref={boxRef} className={cx("relative w-full", className)}>
      <input
        ref={inputRef}
        type="date"
        {...rest}
        value={value ?? ""}
        min={min}
        max={max}
        onChange={onChange}
        onKeyDown={(event) => {
          if (["ArrowDown", "Enter", " ", "F4"].includes(event.key)) {
            event.preventDefault();
            openCalendar();
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
        onClick={() => (open ? close() : openCalendar())}
        className={cx(inputClass, peerFieldClass, "flex items-center gap-2 text-start pe-10 cursor-pointer", open && "border-primary-600 ring-1 ring-primary-600")}
      >
        <span className={cx("flex-1 min-w-0 truncate", !current && "text-gray-400")}>
          {current ? formatDate(current) : placeholder || t.ui.pickDate}
        </span>
        <CalendarDays size={18} aria-hidden="true" className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-500" />
      </button>
      {open && (
        <Popover anchor={boxRef} onClose={() => close(false)} width={coarse ? 21.5 : 19} title={title} tall>
          <div ref={panelRef} tabIndex={-1} className="p-3 max-sm:px-5 focus:outline-none" onKeyDown={onPanelKey}>
            {/* Month and year, and the arrows to the month before and after. */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <button
                type="button"
                onClick={() => (view === "years" ? setYearsFrom((y) => y - 12) : setFocused((day) => addMonths(day, view === "months" ? -12 : -1)))}
                aria-label={view === "years" ? t.ui.earlierYears : t.ui.previousMonth}
                className="w-9 h-9 pointer-coarse:w-11 pointer-coarse:h-11 flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
              >
                <Prev size={18} />
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => showView(view === "months" ? "days" : "months")}
                  aria-label={t.ui.chooseMonth}
                  className="px-2 h-9 pointer-coarse:h-11 rounded-md text-sm font-medium text-gray-900 hover:bg-gray-100"
                >
                  {t.dates.monthsLong[monthIndex]}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setYearsFrom(year - 7);
                    showView(view === "years" ? "days" : "years");
                  }}
                  aria-label={t.ui.chooseYear}
                  className="px-2 h-9 pointer-coarse:h-11 rounded-md text-sm font-medium text-gray-900 hover:bg-gray-100"
                >
                  {num(year, { useGrouping: false })}
                </button>
              </div>
              <button
                type="button"
                onClick={() => (view === "years" ? setYearsFrom((y) => y + 12) : setFocused((day) => addMonths(day, view === "months" ? 12 : 1)))}
                aria-label={view === "years" ? t.ui.laterYears : t.ui.nextMonth}
                className="w-9 h-9 pointer-coarse:w-11 pointer-coarse:h-11 flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
              >
                <Next size={18} />
              </button>
            </div>

            {view === "days" && (
              <div ref={gridRef} role="grid" aria-label={`${t.dates.monthsLong[monthIndex]} ${year}`} onKeyDown={onGridKey}>
                <div role="row" className="grid grid-cols-7 mb-1">
                  {weekdays.map((day) => (
                    <span key={day} role="columnheader" className="text-center text-xs text-gray-500 py-1">
                      {t.dates.daysShort[new Date(`${day}T12:00:00`).getDay()]}
                    </span>
                  ))}
                </div>
                {[0, 1, 2, 3, 4, 5].map((week) => (
                  <div role="row" key={week} className="grid grid-cols-7">
                    {days.slice(week * 7, week * 7 + 7).map((day) => {
                      const outside = day.slice(0, 7) !== shownMonth.slice(0, 7);
                      const selected = day === current;
                      const allowed = inRange(day, min, max);
                      return (
                        <button
                          key={day}
                          type="button"
                          role="gridcell"
                          data-day={day}
                          tabIndex={day === focused ? 0 : -1}
                          aria-selected={selected}
                          aria-current={day === today ? "date" : undefined}
                          aria-label={formatLongDate(day)}
                          disabled={!allowed}
                          onClick={() => choose(day, coarsePointer())}
                          className={cx(
                            "mx-auto my-0.5 w-9 h-9 pointer-coarse:w-11 pointer-coarse:h-11 rounded-full text-sm flex items-center justify-center",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
                            selected
                              ? "bg-brand text-white font-medium"
                              : day === today
                                ? "border border-primary-600 text-primary-700 font-medium hover:bg-primary-50"
                                : outside
                                  ? "text-gray-500 hover:bg-gray-100"
                                  : "text-gray-800 hover:bg-gray-100",
                            !allowed && "opacity-30 cursor-not-allowed hover:bg-transparent",
                          )}
                        >
                          {num(Number(day.slice(8)))}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {view === "months" && (
              <div className="grid grid-cols-3 gap-1.5 py-1">
                {t.dates.monthsLong.map((name, index) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setFocused(clamp(`${year}-${String(index + 1).padStart(2, "0")}-01`, min, max));
                      showView("days");
                    }}
                    data-chosen={index === monthIndex ? "" : undefined}
                    className={cx(
                      "h-10 pointer-coarse:h-11 rounded-md text-sm",
                      index === monthIndex ? "bg-brand text-white font-medium" : "text-gray-800 hover:bg-gray-100",
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            {view === "years" && (
              <div className="grid grid-cols-3 gap-1.5 py-1">
                {Array.from({ length: 12 }, (_, i) => yearsFrom + i).map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setFocused(`${y}-${shownMonth.slice(5, 7)}-01`);
                      showView("months");
                    }}
                    data-chosen={y === year ? "" : undefined}
                    className={cx(
                      "h-10 pointer-coarse:h-11 rounded-md text-sm",
                      y === year ? "bg-brand text-white font-medium" : "text-gray-800 hover:bg-gray-100",
                    )}
                  >
                    {num(y, { useGrouping: false })}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-gray-200">
              {inRange(today, min, max) ? (
                <button
                  type="button"
                  onClick={() => choose(today, coarsePointer())}
                  className="px-3 h-9 pointer-coarse:h-11 rounded-md text-sm font-medium text-primary-600 hover:bg-primary-50"
                >
                  {t.ui.today}
                </button>
              ) : (
                <span />
              )}
              {(clearable ?? !rest.required) && current && (
                <button
                  type="button"
                  onClick={() => choose("", coarsePointer())}
                  className="px-3 h-9 pointer-coarse:h-11 rounded-md text-sm text-gray-600 hover:bg-gray-100"
                >
                  {t.ui.clear}
                </button>
              )}
            </div>
          </div>
        </Popover>
      )}
    </div>
  );
}
