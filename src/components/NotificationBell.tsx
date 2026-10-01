"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, RotateCcw } from "lucide-react";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { num } from "@/i18n";
import { getList, type FilterRow } from "@/lib/frappe";
import { cx, formatTime, todayISO } from "@/lib/format";
import { appointmentHref } from "@/lib/links";
import { Button, StatusBadge } from "@/components/ui";
import { TOP_DROPDOWN, TOP_ICON_BUTTON } from "./topbarStyles";
import type { Appointment } from "@/lib/types";

/**
 * Today's appointments that are still to come; for a doctor, only their own. Refreshes every five minutes
 * and each time it opens.
 */
export default function NotificationBell() {
  const { t } = useI18n();
  const { doctor } = useSession();
  const mine = doctor?.name ?? "";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Appointment[]>([]);
  const [tick, setTick] = useState(0);
  // A failed load says so, instead of "Nothing left for today".
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 5 * 60 * 1000);
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
              ...(mine ? [["doctor", "=", mine] as FilterRow] : []),
            ],
            orderBy: "appointment_time asc",
            limit: 20,
          },
        );
        if (!cancelled) {
          setItems(rows);
          setFailed(false);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setFailed(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [tick, mine]);

  const toggle = () => {
    if (!open) setTick((n) => n + 1);
    setOpen(!open);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={failed ? t.notifications.loadFailedLabel : t.notifications.countLabel(items.length)}
        className={TOP_ICON_BUTTON}
      >
        <Bell size={22} />
        {items.length > 0 && (
          <span className="absolute top-0 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-solid-red text-white text-[10px] font-semibold flex items-center justify-center">
            {num(items.length)}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className={cx(TOP_DROPDOWN, "w-80")}>
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">{t.common.today}</p>
              <p className="text-xs text-gray-500">{mine ? t.notifications.mine : t.notifications.all}</p>
            </div>
            {failed ? (
              <div role="alert" className="px-4 py-5 flex flex-col items-center gap-3 text-sm text-center text-red-700">
                <p>{t.notifications.loadFailed}</p>
                <Button variant="secondary" size="sm" icon={RotateCcw} onClick={() => setTick((n) => n + 1)}>
                  {t.ui.tryAgain}
                </Button>
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-center text-gray-500">{t.notifications.nothingLeft}</p>
            ) : (
              <ul className="max-h-80 overflow-y-auto py-1">
                {items.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={appointmentHref(item.name)}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50"
                    >
                      <span className="text-xs font-semibold text-primary-600 w-16 shrink-0 whitespace-nowrap">{formatTime(item.appointment_time)}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-gray-800 truncate">{item.patient_name || item.name}</span>
                        <span className="block text-xs text-gray-500 truncate">{item.doctor_name}</span>
                      </span>
                      <StatusBadge kind="appointment" status={item.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/today"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-center text-primary-600 font-medium border-t border-gray-100 hover:bg-gray-50 rounded-b-xl"
            >
              {t.notifications.viewAll}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
