"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getList } from "@/lib/frappe";
import { formatTime, todayISO } from "@/lib/format";
import { appointmentHref } from "@/lib/links";
import { StatusBadge } from "@/components/ui";
import type { Appointment } from "@/lib/types";

/** Today's appointments that are still to come. Refreshes every five minutes and each time it opens. */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Appointment[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<Appointment>(
          "Appointment",
          ["name", "patient_name", "doctor_name", "appointment_time", "status"],
          {
            filters: [
              ["appointment_date", "=", todayISO()],
              ["status", "in", ["Scheduled", "Confirmed"]],
            ],
            orderBy: "appointment_time asc",
            limit: 20,
          },
        );
        if (!cancelled) setItems(rows);
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const toggle = () => {
    if (!open) setTick((t) => t + 1);
    setOpen(!open);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`Today's appointments: ${items.length}`}
        className="relative w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
      >
        <Bell size={18} />
        {items.length > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute end-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">Today</p>
              <p className="text-xs text-gray-400">Appointments still to come</p>
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-center text-gray-400">Nothing left for today.</p>
            ) : (
              <ul className="max-h-80 overflow-y-auto py-1">
                {items.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={appointmentHref(item.name)}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50"
                    >
                      <span className="text-xs font-semibold text-primary-600 w-16 shrink-0">{formatTime(item.appointment_time)}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-gray-800 truncate">{item.patient_name || item.name}</span>
                        <span className="block text-xs text-gray-400 truncate">{item.doctor_name}</span>
                      </span>
                      <StatusBadge kind="appointment" status={item.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/appointments?view=day"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-center text-primary-600 font-medium border-t border-gray-100 hover:bg-gray-50 rounded-b-xl"
            >
              View all of today
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
