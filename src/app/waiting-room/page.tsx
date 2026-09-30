"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Armchair, CalendarClock, Hourglass, Maximize, type LucideIcon } from "lucide-react";
import RequirePermission from "@/components/Guard";
import ToothLogo from "@/components/ToothLogo";
import { CARD_CLASS, LinkButton, Button } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { useDataVersion } from "@/lib/dataVersion";
import { fileHref, getList } from "@/lib/frappe";
import { cx, formatLongDate, formatTime, todayISO, toMinutes } from "@/lib/format";
import { minutesSince, shortName, visitStep } from "@/lib/waitingRoom";
import type { Appointment } from "@/lib/types";

/** How often the screen loads the day again. */
const REFRESH_SECONDS = 20;
/** How many coming appointments the screen lists. */
const NEXT_COUNT = 6;

export default function WaitingRoomPage() {
  return (
    <RequirePermission permission="view_appointments">
      <WaitingRoom />
    </RequirePermission>
  );
}

/**
 * The waiting room screen, for a TV: who is in the chair, who is waiting (and for how long) and who comes next,
 * with each patient's first name and an initial only. It loads the day again every 20 seconds. No menu or top bar
 * (MainLayout leaves them out for this page); Full Screen hides the rest of the browser.
 */
function WaitingRoom() {
  const { t } = useI18n();
  const w = t.waitingRoom;
  const { settings, clinicName } = useSettings();
  const [rows, setRows] = useState<Appointment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [updated, setUpdated] = useState("");
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [fullScreen, setFullScreen] = useState(false);
  const saved = useDataVersion();
  const today = todayISO();

  // The clock, and a new load every REFRESH_SECONDS.
  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 15_000);
    const reload = setInterval(() => setTick((n) => n + 1), REFRESH_SECONDS * 1000);
    const onFullScreen = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullScreen);
    return () => {
      clearInterval(clock);
      clearInterval(reload);
      document.removeEventListener("fullscreenchange", onFullScreen);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const list = await getList<Appointment>(
          "Appointment",
          ["name", "patient_name", "doctor", "doctor_name", "appointment_time", "status", "arrived_at", "in_chair_at"],
          { filters: [["appointment_date", "=", today], ["status", "in", ["Scheduled", "Confirmed"]]], orderBy: "appointment_time asc", limit: 0 },
        );
        if (!cancelled) {
          setRows(list);
          setFailed(false);
          setUpdated(formatTime(`${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, "0")}`));
        }
      } catch (err) {
        console.error(err);
        // The last list stays on the screen; the next tick tries again.
        if (!cancelled) setFailed(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [today, tick, saved]);

  const all = rows ?? [];
  const inChair = all
    .filter((a) => visitStep(a) === "in_chair")
    .sort((a, b) => String(a.in_chair_at).localeCompare(String(b.in_chair_at)));
  const waiting = all
    .filter((a) => visitStep(a) === "waiting")
    .sort((a, b) => String(a.arrived_at).localeCompare(String(b.arrived_at)));
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  // Not here yet: from a quarter of an hour ago on, in order.
  const next = all.filter((a) => !a.arrived_at && toMinutes(a.appointment_time) >= nowMinutes - 15).slice(0, NEXT_COUNT);
  const clock = formatTime(`${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`);

  return (
    <div className="min-h-screen app-bg px-4 py-6 sm:px-8 lg:px-12 lg:py-10 flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          {settings.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- the logo is an uploaded file of unknown size
            <img src={fileHref(settings.logo)} alt="" className="w-16 h-16 rounded-xl object-contain" />
          ) : (
            <span className="w-16 h-16 shrink-0 bg-brand rounded-xl flex items-center justify-center text-white">
              <ToothLogo size={34} />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-3xl font-semibold text-gray-900 truncate">{clinicName}</p>
            <h1 className="text-xl text-gray-600">{w.title}</h1>
          </div>
        </div>
        <div className="text-end">
          <p className="text-5xl font-semibold text-gray-900 tabular-nums" aria-live="off">
            {clock}
          </p>
          <p className="text-lg text-gray-600">{formatLongDate(today)}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
        <Column title={w.inChair} icon={Armchair} tone="text-blue-600" empty={w.nobodyInChair} testId="room-in-chair">
          {inChair.map((a) => (
            <Person key={a.name} name={shortName(a.patient_name)} detail={w.withDoctor(a.doctor_name || a.doctor)} strong />
          ))}
        </Column>
        <Column title={w.waiting} icon={Hourglass} tone="text-amber-600" empty={w.nobodyWaiting} testId="room-waiting">
          {waiting.map((a) => (
            <Person
              key={a.name}
              name={shortName(a.patient_name)}
              detail={w.withDoctor(a.doctor_name || a.doctor)}
              aside={w.waitingMinutes(minutesSince(a.arrived_at, now))}
            />
          ))}
        </Column>
        <Column title={w.next} icon={CalendarClock} tone="text-primary-600" empty={w.nobodyNext} testId="room-next">
          {next.map((a) => (
            <Person key={a.name} name={shortName(a.patient_name)} detail={w.withDoctor(a.doctor_name || a.doctor)} aside={formatTime(a.appointment_time)} />
          ))}
        </Column>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-4 text-base text-gray-600">
        <p>{w.welcome}</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className={failed ? "text-red-600" : undefined}>{failed ? w.loadFailed : updated && w.updated(updated)}</span>
          {!fullScreen && (
            <>
              <Button size="sm" variant="secondary" icon={Maximize} onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)}>
                {w.fullScreen}
              </Button>
              <LinkButton href="/today" size="sm" variant="ghost">
                {w.back}
              </LinkButton>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}

function Column({
  title,
  icon: Icon,
  tone,
  empty,
  testId,
  children,
}: {
  title: string;
  icon: LucideIcon;
  tone: string;
  empty: string;
  testId: string;
  children: ReactNode[];
}) {
  return (
    <section className={cx(CARD_CLASS, "p-6")} data-testid={testId} aria-label={title}>
      <h2 className={cx("flex items-center gap-3 text-2xl font-semibold mb-4", tone)}>
        <Icon size={28} aria-hidden="true" />
        {title}
      </h2>
      {children.length === 0 ? <p className="text-xl text-gray-500 py-2">{empty}</p> : <ul className="divide-y divide-gray-200">{children}</ul>}
    </section>
  );
}

function Person({ name, detail, aside, strong = false }: { name: string; detail: string; aside?: string; strong?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className={cx("block font-semibold text-gray-900 truncate", strong ? "text-4xl" : "text-3xl")}>
          {/* Isolated, so a Latin name keeps its dot at the end on an Arabic screen. */}
          <bdi>{name}</bdi>
        </span>
        <span className="block text-lg text-gray-600 truncate">{detail}</span>
      </span>
      {aside && <span className="shrink-0 text-2xl font-medium text-gray-700 whitespace-nowrap">{aside}</span>}
    </li>
  );
}
