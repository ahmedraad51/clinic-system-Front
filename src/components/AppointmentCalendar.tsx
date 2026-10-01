"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useRecordDialogs } from "@/components/RecordDialogs";
import { useDataVersion } from "@/lib/dataVersion";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Avatar from "@/components/Avatar";
import { Alert, CARD_CLASS, statusLabel, statusTone, tooltip, type Tone } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { joinParts, messages, num } from "@/i18n";
import { errorMessage, getList, updateDoc } from "@/lib/frappe";
import { addDays, cx, formatDate, formatTime, fromMinutes, toMinutes, todayISO, weekdayShort, weekStart } from "@/lib/format";
import { useMediaQuery } from "@/lib/hooks";
import { appointmentHref } from "@/lib/links";
import { APPOINTMENT_STATUSES, type Appointment, type Doctor } from "@/lib/types";

/**
 * The appointment book as a time grid.
 * Day view: one column per doctor. Week view: one column per day.
 * Rows run from the clinic's opening time to its closing time (wider if an appointment falls outside).
 * Clicking an empty slot books an appointment with the date, time and doctor filled in.
 */

export type CalendarView = "day" | "week";

/** Height of one minute in pixels. 15 minutes = 24 px, one hour = 96 px. */
const PX = 1.6;
/** Clicking books on this grid, in minutes. */
const SLOT = 15;
/*
 * Layers, bottom to top: slot buttons, appointment blocks (z-10, z-20 on hover), the "now" line (z-20),
 * the sticky time column (z-25), the sticky header row (z-30), its corner cell (z-40), the loading badge (z-50).
 */

const FIELDS = [
  "name", "patient", "patient_name", "doctor", "doctor_name", "appointment_date", "appointment_time",
  "duration_minutes", "status", "reason_for_visit",
];

/** Block colours, matching the status badges. */
const BLOCK_TONES: Record<Tone, string> = {
  primary: "bg-primary-50 border-primary-500 text-primary-900",
  blue: "bg-blue-50 border-blue-500 text-blue-950",
  green: "bg-green-50 border-green-600 text-green-950",
  gray: "bg-gray-100 border-gray-400 text-gray-700",
  red: "bg-red-50 border-red-300 text-red-800",
  yellow: "bg-yellow-50 border-yellow-500 text-yellow-950",
  purple: "bg-purple-50 border-purple-500 text-purple-950",
};

const DOT_TONES: Record<Tone, string> = {
  primary: "bg-primary-500",
  blue: "bg-blue-500",
  green: "bg-green-600",
  gray: "bg-gray-400",
  red: "bg-red-400",
  yellow: "bg-yellow-500",
  purple: "bg-purple-500",
};

interface Column {
  key: string;
  date: string;
  /** Set in the day view: the doctor this column belongs to. */
  doctor?: string;
  /** The day view's doctor, for their photo or drawing above the column. */
  person?: { gender?: string; photo?: string };
  title: string;
  subtitle?: string;
  today?: boolean;
  items: Appointment[];
  /** The doctor's working hours in minutes, when known. Time outside them is shaded. */
  hours?: { start: number; end: number };
  /** The clinic is closed that day (Clinic Settings → working_days). */
  closed?: boolean;
}

/** An appointment being dragged, and where it would land. */
interface Drag {
  appointment: Appointment;
  /** Minutes between the top of the block and where it was grabbed. */
  grab: number;
  startX: number;
  startY: number;
  moved: boolean;
  target: { column: Column; minutes: number } | null;
}

/** A dropped appointment waiting for "Move?" to be confirmed. */
interface PendingMove {
  appointment: Appointment;
  date: string;
  doctor: string;
  minutes: number;
  clash?: Appointment;
}

const canDrag = (a: Appointment) => a.status === "Scheduled" || a.status === "Confirmed";

/** A doctor's working hours in minutes, or undefined when not set (then the clinic hours apply). */
function doctorHours(doctor?: Doctor): { start: number; end: number } | undefined {
  if (!doctor?.start_time || !doctor.end_time) return undefined;
  const start = toMinutes(doctor.start_time);
  const end = toMinutes(doctor.end_time);
  return end > start ? { start, end } : undefined;
}

/** Diagonal stripes for time the doctor does not work. */
const OFF_HOURS = {
  backgroundImage: "repeating-linear-gradient(135deg, var(--color-gray-100) 0 6px, var(--color-gray-50) 6px 12px)",
};

interface Placed {
  appointment: Appointment;
  start: number;
  end: number;
  lane: number;
  lanes: number;
}

const startOf = (a: Appointment) => toMinutes(a.appointment_time);
const endOf = (a: Appointment) => startOf(a) + (Number(a.duration_minutes) || 30);

/** Places appointments side by side where they overlap. */
function placeInLanes(items: Appointment[]): Placed[] {
  const sorted = [...items].sort((x, y) => startOf(x) - startOf(y) || endOf(x) - endOf(y));
  const placed: Placed[] = [];
  let group: Placed[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -1;
  const closeGroup = () => {
    group.forEach((item) => (item.lanes = laneEnds.length));
    group = [];
    laneEnds = [];
  };
  for (const appointment of sorted) {
    const start = startOf(appointment);
    const end = endOf(appointment);
    if (start >= groupEnd) closeGroup();
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    const item = { appointment, start, end, lane, lanes: 1 };
    group.push(item);
    placed.push(item);
    groupEnd = Math.max(groupEnd, end);
  }
  closeGroup();
  return placed;
}

const shortDoctor = (name?: string) => (name || "").replace(/^Dr\.?\s+/i, "");

export default function AppointmentCalendar({
  view,
  date,
  doctors,
  doctorsLoading = false,
  doctorFilter,
  openingTime,
  closingTime,
  canBook,
  canMove = false,
  isOpenOn = () => true,
}: {
  view: CalendarView;
  /** The day shown, or any day of the week shown. */
  date: string;
  /** Active doctors. */
  doctors: Doctor[];
  doctorsLoading?: boolean;
  /** Show one doctor only (a Doctor name), or "" for all. */
  doctorFilter: string;
  openingTime?: string;
  closingTime?: string;
  canBook: boolean;
  /** Appointments can be dragged to another time, day or doctor (edit_appointments). */
  canMove?: boolean;
  /** Whether the clinic is open on a date; closed days are shaded. */
  isOpenOn?: (iso: string) => boolean;
}) {
  const { t } = useI18n();
  const c = t.calendar;
  const toast = useToast();
  const openDialog = useRecordDialogs();
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = todayISO();
  const first = view === "day" ? date : weekStart(date);
  const last = view === "day" ? date : addDays(first, 6);
  const rangeKey = `${first}|${last}|${doctorFilter}`;

  const [result, setResult] = useState<{ key: string; rows: Appointment[]; error: string } | null>(null);
  const [now, setNow] = useState(() => new Date());
  // Phones show one doctor at a time in the day view; null = start with the first doctor who has patients.
  const narrow = useMediaQuery("(max-width: 639px)");
  const [phoneColumn, setPhoneColumn] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [moving, setMoving] = useState(false);
  // A drag ends with a click on the block; that click must not open the appointment.
  const suppressClick = useRef(false);

  // A dialog saved something: load again.
  const saved = useDataVersion();
  useEffect(() => {
    let cancelled = false;
    const [from, to, doctor] = rangeKey.split("|");
    const load = async () => {
      try {
        const rows = await getList<Appointment>("Appointment", FIELDS, {
          filters: [
            ["appointment_date", "between", [from, to]],
            ...(doctor ? [["doctor", "=", doctor] as [string, string, string]] : []),
          ],
          orderBy: "appointment_date asc, appointment_time asc",
          limit: 0,
        });
        if (!cancelled) setResult({ key: rangeKey, rows, error: "" });
      } catch (err) {
        console.error(err);
        if (!cancelled) setResult({ key: rangeKey, rows: [], error: errorMessage(err, messages().calendar.loadFailed) });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [rangeKey, saved]);

  // Move the "now" line every minute.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const rows = result?.rows ?? [];
  const loading = result?.key !== rangeKey;

  // Opening to closing time, stretched to fit any appointment outside it.
  let dayStart = toMinutes(openingTime) || 9 * 60;
  let dayEnd = toMinutes(closingTime) || 18 * 60;
  if (dayEnd <= dayStart) {
    dayStart = 9 * 60;
    dayEnd = 18 * 60;
  }
  rows.forEach((a) => {
    dayStart = Math.min(dayStart, startOf(a));
    dayEnd = Math.max(dayEnd, endOf(a));
  });
  dayStart = Math.floor(dayStart / 60) * 60;
  dayEnd = Math.min(24 * 60, Math.ceil(dayEnd / 60) * 60);
  const height = (dayEnd - dayStart) * PX;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Columns: doctors for a day, days for a week.
  let columns: Column[];
  if (view === "day") {
    const shown = doctorFilter ? doctors.filter((d) => d.name === doctorFilter) : [...doctors];
    // A doctor who is no longer active but still has appointments that day gets a column too.
    rows.forEach((a) => {
      if (!shown.some((d) => d.name === a.doctor) && (!doctorFilter || a.doctor === doctorFilter)) {
        shown.push({ name: a.doctor, full_name: a.doctor_name || a.doctor });
      }
    });
    columns = shown.map((doctor) => {
      const items = rows.filter((a) => a.doctor === doctor.name);
      const booked = items.filter((a) => a.status !== "Cancelled" && a.status !== "No Show").length;
      return {
        key: doctor.name,
        date,
        doctor: doctor.name,
        person: { gender: doctor.gender, photo: doctor.photo },
        title: doctor.full_name,
        subtitle: booked === 0 ? c.freeAllDay : c.count(booked),
        today: date === today,
        items,
        hours: doctorHours(doctor),
        closed: !isOpenOn(date),
      };
    });
  } else {
    columns = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(first, i);
      return {
        key: day,
        date: day,
        doctor: doctorFilter || undefined,
        title: weekdayShort(day),
        subtitle: num(Number(day.slice(8, 10))),
        today: day === today,
        items: rows.filter((a) => a.appointment_date === day),
        hours: doctorFilter ? doctorHours(doctors.find((d) => d.name === doctorFilter)) : undefined,
        closed: !isOpenOn(day),
      };
    });
  }

  // Open at the current time on today's view, otherwise at the top. Only when the shown range or its
  // data changes, not every minute as the clock moves.
  const scrollTarget = first <= today && today <= last ? Math.max(0, (nowMinutes - dayStart - 60) * PX) : 0;
  const scrollKey = `${rangeKey}|${view}|${loading ? 0 : 1}|${columns.length > 0}`;
  const scrolledFor = useRef("");
  useEffect(() => {
    if (scrolledFor.current === scrollKey || !scrollRef.current) return;
    scrolledFor.current = scrollKey;
    const box = scrollRef.current;
    box.scrollTo({ top: scrollTarget });
    // On a narrow screen the week scrolls sideways; bring today's column into view. Measured on screen and
    // moved by the difference, so it works both left to right and right to left (where scrollLeft counts
    // down from 0).
    const todayHeader = box.querySelector<HTMLElement>("[data-today='true']");
    if (view === "week" && todayHeader) {
      const column = todayHeader.getBoundingClientRect();
      const frame = box.getBoundingClientRect();
      box.scrollLeft += column.left + column.width / 2 - (frame.left + frame.width / 2);
    }
  }, [scrollKey, scrollTarget, view]);

  /* ------------------------------------------------ dragging to move -- */

  const startDrag = (event: PointerEvent<HTMLAnchorElement>, a: Appointment) => {
    if (!canMove || !canDrag(a) || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ appointment: a, grab: (event.clientY - rect.top) / PX, startX: event.clientX, startY: event.clientY, moved: false, target: null });
  };

  const moveDrag = (event: PointerEvent<HTMLAnchorElement>) => {
    if (!drag) return;
    const moved = drag.moved || Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6;
    if (!moved) return;
    const under = document
      .elementsFromPoint(event.clientX, event.clientY)
      .find((el): el is HTMLElement => el instanceof HTMLElement && Boolean(el.dataset.column));
    const column = under ? columns.find((col) => col.key === under.dataset.column) : undefined;
    let target: Drag["target"] = null;
    if (under && column) {
      const length = endOf(drag.appointment) - startOf(drag.appointment);
      const raw = dayStart + (event.clientY - under.getBoundingClientRect().top) / PX - drag.grab;
      const minutes = Math.min(Math.max(Math.round(raw / SLOT) * SLOT, dayStart), dayEnd - length);
      target = { column, minutes };
    }
    setDrag({ ...drag, moved, target });
  };

  const endDrag = () => {
    if (!drag) return;
    if (drag.moved) {
      suppressClick.current = true;
      const a = drag.appointment;
      const target = drag.target;
      const doctor = target?.column.doctor ?? a.doctor;
      const unchanged =
        target && target.column.date === a.appointment_date && doctor === a.doctor && target.minutes === startOf(a);
      if (target && !unchanged) {
        const length = endOf(a) - startOf(a);
        const clash = rows.find(
          (other) =>
            other.name !== a.name &&
            other.doctor === doctor &&
            other.appointment_date === target.column.date &&
            canDrag(other) &&
            startOf(other) < target.minutes + length &&
            target.minutes < endOf(other),
        );
        setPendingMove({ appointment: a, date: target.column.date, doctor, minutes: target.minutes, clash });
      }
    }
    setDrag(null);
  };

  const confirmMove = async () => {
    if (!pendingMove) return;
    const { appointment: a, date: day, doctor, minutes } = pendingMove;
    const time = fromMinutes(minutes);
    setMoving(true);
    try {
      await updateDoc("Appointment", a.name, { appointment_date: day, appointment_time: time, doctor });
      const doctorName = doctors.find((d) => d.name === doctor)?.full_name ?? a.doctor_name;
      setResult((prev) =>
        prev && {
          ...prev,
          rows: prev.rows.map((row) =>
            row.name === a.name ? { ...row, appointment_date: day, appointment_time: time, doctor, doctor_name: doctorName } : row,
          ),
        },
      );
      toast.success(c.moved(a.patient_name || a.patient, formatTime(time)));
      setPendingMove(null);
    } catch (err) {
      toast.error(errorMessage(err, c.moveFailed));
    } finally {
      setMoving(false);
    }
  };

  const book = (column: Column, minutes: number) => {
    openDialog({
      kind: "newAppointment",
      prefill: { appointment_date: column.date, appointment_time: fromMinutes(minutes), doctor: column.doctor || "" },
    });
  };

  const hours: number[] = [];
  for (let m = dayStart; m <= dayEnd; m += 60) hours.push(m);
  const slots: number[] = [];
  for (let m = dayStart; m < dayEnd; m += SLOT) slots.push(m);

  // Narrow enough that a whole week fits beside the menu on a tablet.
  const single = view === "day" && narrow && columns.length > 1;
  const busiest = Math.max(0, columns.findIndex((col) => col.items.length > 0));
  const shownIndex = Math.min(phoneColumn ?? busiest, columns.length - 1);
  const shown = single ? [columns[shownIndex]] : columns;
  const minColumn = view === "day" ? (single ? "12rem" : "10.5rem") : "5.5rem";
  // Hour lines and lighter half-hour lines. (Built with join: joining template literals with + was
  // miscompiled in the production build and lost the "px),".)
  const hourPx = 60 * PX;
  const halfPx = 30 * PX;
  const gridLines = {
    backgroundImage: [
      `repeating-linear-gradient(to bottom, var(--color-gray-200) 0 1px, transparent 1px ${hourPx}px)`,
      `repeating-linear-gradient(to bottom, transparent 0 ${halfPx}px, var(--color-gray-100) ${halfPx}px ${halfPx + 1}px, transparent ${halfPx + 1}px ${hourPx}px)`,
    ].join(", "),
  };

  return (
    <div className="space-y-3">
      {result?.error && <Alert tone="red">{result.error}</Alert>}
      {view === "day" && !isOpenOn(date) && <Alert tone="yellow">{c.closedDay}</Alert>}

      {/* isolate: the grid's sticky headers and chips stack among themselves, under the top bar's menus. */}
      <div className={cx("relative isolate overflow-hidden", CARD_CLASS)}>
        {loading && (
          <div className="absolute top-3 end-3 z-50 rounded-full bg-surface/90 px-3 py-1 text-xs text-gray-600 shadow-sm" role="status">
            {t.common.loading}
          </div>
        )}
        {columns.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-gray-500">
            {doctorsLoading ? t.common.loading : c.noDoctors}
          </p>
        ) : (
          <>
          {single && (
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={() => setPhoneColumn((shownIndex - 1 + columns.length) % columns.length)}
                aria-label={c.previousDoctor}
                className="w-11 h-11 flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
              >
                <ChevronLeft size={20} className="rtl:rotate-180" />
              </button>
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs text-gray-500">{c.doctorOf(shownIndex + 1, columns.length)}</p>
                <div className="flex gap-1.5" aria-hidden="true">
                  {columns.map((column, index) => (
                    <span
                      key={column.key}
                      className={cx("w-1.5 h-1.5 rounded-full", index === shownIndex ? "bg-brand" : "bg-gray-300")}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPhoneColumn((shownIndex + 1) % columns.length)}
                aria-label={c.nextDoctor}
                className="w-11 h-11 flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
              >
                <ChevronRight size={20} className="rtl:rotate-180" />
              </button>
            </div>
          )}
          <div ref={scrollRef} className="overflow-auto max-h-[calc(100dvh-15rem)] min-h-[24rem]">
            {/* w-max: as wide as the columns, so the sticky time column can stay put while scrolling sideways. */}
            <div
              className="grid w-max min-w-full"
              style={{ gridTemplateColumns: `4.25rem repeat(${shown.length}, minmax(${minColumn}, 1fr))` }}
            >
              {/* Header row */}
              <div className="sticky top-0 start-0 z-40 bg-surface border-b border-e border-gray-100" />
              {shown.map((column) => (
                <div
                  key={column.key}
                  data-today={column.today}
                  className="sticky top-0 z-30 bg-surface border-b border-gray-100 border-e last:border-e-0 px-2 py-2.5 text-center"
                >
                  {view === "day" ? (
                    <>
                      <Avatar name={column.title} gender={column.person?.gender} photo={column.person?.photo} role="doctor" size={40} className="mb-1" />
                      <p className="text-sm font-semibold text-gray-800 truncate" {...tooltip(column.title)}>
                        {column.title}
                      </p>
                      <p className="text-xs text-gray-500">{column.subtitle}</p>
                      {column.hours && (
                        <p className="text-xs text-gray-500">
                          {c.hoursRange(formatTime(fromMinutes(column.hours.start)), formatTime(fromMinutes(column.hours.end)))}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className={cx("text-xs font-medium uppercase tracking-wide", column.today ? "text-primary-700" : "text-gray-500")}>
                        {column.title}
                      </p>
                      <p
                        className={cx(
                          "mx-auto mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-base font-semibold",
                          column.today ? "bg-brand text-white" : "text-gray-800",
                        )}
                      >
                        {column.subtitle}
                      </p>
                      {column.closed && <p className="text-xs font-medium text-gray-500">{c.closed}</p>}
                    </>
                  )}
                </div>
              ))}

              {/* Time labels */}
              <div className="sticky start-0 z-[25] bg-surface border-e border-gray-100" style={{ height }}>
                {hours.map((m, i) => (
                  <span
                    key={m}
                    className={cx(
                      "absolute end-2 text-xs text-gray-500 whitespace-nowrap",
                      i === 0 ? "translate-y-0.5" : i === hours.length - 1 ? "-translate-y-full" : "-translate-y-1/2",
                    )}
                    style={{ top: (m - dayStart) * PX }}
                  >
                    {formatTime(fromMinutes(m))}
                  </span>
                ))}
              </div>

              {/* One column per doctor or day */}
              {shown.map((column) => (
                <div
                  key={column.key}
                  data-column={column.key}
                  className={cx("relative border-e border-gray-100 last:border-e-0", column.today && view === "week" && "bg-primary-50/40")}
                  style={{ height, ...gridLines }}
                >
                  {column.closed && (
                    <div className="absolute inset-0 pointer-events-none" style={OFF_HOURS} aria-hidden="true" />
                  )}
                  {column.hours && column.hours.start > dayStart && (
                    <div
                      className="absolute inset-x-0 top-0 pointer-events-none"
                      style={{ height: (column.hours.start - dayStart) * PX, ...OFF_HOURS }}
                      aria-hidden="true"
                    />
                  )}
                  {column.hours && column.hours.end < dayEnd && (
                    <div
                      className="absolute inset-x-0 bottom-0 pointer-events-none"
                      style={{ height: (dayEnd - column.hours.end) * PX, ...OFF_HOURS }}
                      aria-hidden="true"
                    />
                  )}
                  {canBook &&
                    slots.map((m) => (
                      <button
                        key={m}
                        type="button"
                        tabIndex={-1}
                        onClick={() => book(column, m)}
                        aria-label={c.bookAt(
                          formatTime(fromMinutes(m)),
                          view === "day" ? column.title : "",
                          Boolean(column.hours && (m < column.hours.start || m >= column.hours.end)),
                        )}
                        className="group absolute inset-x-0 flex items-center px-2 hover:bg-primary-50 focus:outline-none"
                        style={{ top: (m - dayStart) * PX, height: SLOT * PX }}
                      >
                        <span className="hidden group-hover:inline text-xs font-medium text-primary-700 whitespace-nowrap">
                          {c.slotHint(formatTime(fromMinutes(m)))}
                        </span>
                      </button>
                    ))}

                  {placeInLanes(column.items).map(({ appointment: a, start, end, lane, lanes }) => {
                    const tone = statusTone("appointment", a.status);
                    const blockHeight = Math.max((end - start) * PX, 22);
                    const faded = a.status === "Cancelled" || a.status === "No Show";
                    const who = a.patient_name || a.patient;
                    const doctor = view === "week" && !doctorFilter ? shortDoctor(a.doctor_name) : "";
                    const movable = canMove && canDrag(a);
                    const dragging = drag?.moved && drag.appointment.name === a.name;
                    return (
                      <Link
                        key={a.name}
                        href={appointmentHref(a.name)}
                        onPointerDown={(event) => startDrag(event, a)}
                        onPointerMove={moveDrag}
                        onPointerUp={endDrag}
                        onPointerCancel={() => setDrag(null)}
                        onClick={(event) => {
                          if (suppressClick.current) {
                            event.preventDefault();
                            suppressClick.current = false;
                          }
                        }}
                        draggable={false}
                        aria-label={c.blockLabel(formatTime(a.appointment_time), who, a.doctor_name || "", statusLabel("appointment", a.status))}
                        {...tooltip(c.blockTitle(formatTime(a.appointment_time), who, a.reason_for_visit || "", statusLabel("appointment", a.status)))}
                        className={cx(
                          "absolute z-10 overflow-hidden rounded-lg border-s-4 px-2 py-1 text-start shadow-sm transition hover:shadow-md hover:z-20",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                          BLOCK_TONES[tone],
                          faded && "opacity-60",
                          // Touching a movable block drags it instead of scrolling the calendar.
                          movable && "touch-none cursor-grab",
                          dragging && "opacity-40 cursor-grabbing",
                        )}
                        style={{
                          top: (start - dayStart) * PX + 1,
                          height: blockHeight - 2,
                          insetInlineStart: `calc(${(lane / lanes) * 100}% + 3px)`,
                          width: `calc(${100 / lanes}% - 6px)`,
                        }}
                      >
                        {blockHeight < 44 ? (
                          <p className={cx("text-xs font-semibold truncate leading-tight", faded && "line-through")}>
                            {formatTime(a.appointment_time)} {who}
                          </p>
                        ) : (
                          <>
                            <p className={cx("text-xs font-semibold truncate leading-tight", faded && "line-through")}>{who}</p>
                            <p className="text-xs truncate leading-tight opacity-80 mt-0.5">
                              {joinParts([formatTime(a.appointment_time), doctor || a.reason_for_visit], t.common.dot)}
                            </p>
                          </>
                        )}
                      </Link>
                    );
                  })}

                  {drag?.moved && drag.target?.column.key === column.key && (
                    <div
                      className="absolute inset-x-1 z-30 rounded-lg border-2 border-dashed border-primary-500 bg-primary-50/80 px-2 py-1 pointer-events-none"
                      style={{
                        top: (drag.target.minutes - dayStart) * PX,
                        height: (endOf(drag.appointment) - startOf(drag.appointment)) * PX,
                      }}
                      aria-hidden="true"
                    >
                      <p className="text-xs font-semibold text-primary-800 truncate">
                        {formatTime(fromMinutes(drag.target.minutes))} {drag.appointment.patient_name}
                      </p>
                    </div>
                  )}

                  {column.date === today && nowMinutes >= dayStart && nowMinutes <= dayEnd && (
                    <div
                      className="absolute inset-x-0 z-20 pointer-events-none"
                      style={{ top: (nowMinutes - dayStart) * PX }}
                      aria-hidden="true"
                    >
                      <div className="relative border-t-2 border-red-500">
                        <span className="absolute -start-1 -top-[5px] w-2 h-2 rounded-full bg-red-500" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
        {APPOINTMENT_STATUSES.map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span className={cx("w-2.5 h-2.5 rounded-full", DOT_TONES[statusTone("appointment", status)])} />
            {statusLabel("appointment", status)}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-red-500" />
          {c.now}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-3 rounded-sm border border-gray-200" style={OFF_HOURS} />
          {c.notWorking}
        </span>
        {canBook && <span className="text-gray-500">{c.clickToBook}</span>}
        {canMove && <span className="text-gray-500">{c.dragToMove}</span>}
      </div>

      <ConfirmDialog
        open={pendingMove !== null}
        title={c.moveTitle}
        danger={false}
        confirmLabel={pendingMove?.clash ? c.moveAnyway : c.move}
        busy={moving}
        message={
          pendingMove && (
            <div className="space-y-2">
              <p>
                <strong>{pendingMove.appointment.patient_name || pendingMove.appointment.patient}</strong>
                {c.moveFrom(
                  formatDate(pendingMove.appointment.appointment_date),
                  formatTime(pendingMove.appointment.appointment_time),
                  pendingMove.appointment.doctor_name || "",
                )}
                <strong>{c.moveTo(formatDate(pendingMove.date), formatTime(fromMinutes(pendingMove.minutes)))}</strong>
                {pendingMove.doctor !== pendingMove.appointment.doctor
                  ? c.moveWith(doctors.find((d) => d.name === pendingMove.doctor)?.full_name ?? pendingMove.doctor)
                  : ""}
                {c.moveEnd}
              </p>
              {pendingMove.clash && (
                <p className="text-amber-700">
                  {c.overlaps(pendingMove.clash.patient_name || "", formatTime(pendingMove.clash.appointment_time))}
                </p>
              )}
            </div>
          )
        }
        onCancel={() => setPendingMove(null)}
        onConfirm={confirmMove}
      />
    </div>
  );
}
