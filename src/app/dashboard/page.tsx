"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  BellRing, Calendar, CalendarDays, CalendarRange, CalendarX, ChevronRight, CreditCard, MessageCircle, PieChart, Plus, Stethoscope,
  TrendingUp, UserPlus, Users, Wallet,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import { BarChart, DonutChart, type ChartPoint } from "@/components/Charts";
import RequirePermission from "@/components/Guard";
import ToothMascot from "@/components/ToothMascot";
import {
  ActionTile, Card, EmptyState, IconTile, LinkButton, LoadError, PageContainer, Segmented, StatCard, StatusBadge, type Hue,
} from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { errorMessage, getCount, getList, type FilterRow } from "@/lib/frappe";
import { addDays, cx, formatCompact, formatDate, formatLongDate, formatMonth, formatTime, monthStart, todayISO } from "@/lib/format";
import { usePatientLooks, type PatientLook } from "@/lib/hooks";
import { appointmentHref } from "@/lib/links";
import { DEFAULT_RECALL_MONTHS, RECALL_APPOINTMENT_FIELDS, RECALL_PATIENT_FIELDS, dueForRecall } from "@/lib/recall";
import type { Appointment, Patient, Payment, TreatmentPlan } from "@/lib/types";

interface DashboardData {
  /** For the "Needs attention" card; null when the user may not see that part. */
  attention: { openPast: number | null; toRemind: number | null; recallDue: number | null; owing: number | null };
  patients: number;
  activePlans: number;
  monthRevenue: number;
  outstanding: number;
  today: Appointment[];
  upcoming: Appointment[];
  /** The charts, each null when the user may not see its numbers. */
  revenueByMonth: ChartPoint[] | null;
  visitsByMonth: ChartPoint[] | null;
  plansByType: ChartPoint[] | null;
}

/** An empty result for sections the user is not allowed to see. */
function nothing<T>(): Promise<T[]> {
  return Promise.resolve([]);
}

const APPOINTMENT_FIELDS = ["name", "patient", "patient_name", "doctor_name", "appointment_date", "appointment_time", "status", "reason_for_visit"];

/** How many months the charts go back, this month included. */
const CHART_MONTHS = 6;

/** The treatment types shown one by one in the ring; the rest are added up as "Other". */
const RING_SLICES = 5;

export default function DashboardPage() {
  return (
    <RequirePermission>
      <Dashboard />
    </RequirePermission>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** The last CHART_MONTHS months, oldest first: "2026-09" keys with "Sep" labels. */
function chartMonths(today: string): Array<{ key: string; label: string; fullLabel: string }> {
  return Array.from({ length: CHART_MONTHS }, (_, i) => {
    const key = monthStart(today, i - (CHART_MONTHS - 1)).slice(0, 7);
    const fullLabel = formatMonth(key);
    return { key, label: fullLabel.slice(0, 3), fullLabel };
  });
}

/** Adds up `value` of each row into its month (by `date`). */
function byMonth<T>(rows: T[], months: ReturnType<typeof chartMonths>, date: (row: T) => string, value: (row: T) => number): ChartPoint[] {
  const totals = new Map(months.map((month) => [month.key, 0]));
  rows.forEach((row) => {
    const key = (date(row) || "").slice(0, 7);
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + value(row));
  });
  return months.map((month) => ({ label: month.label, fullLabel: month.fullLabel, value: totals.get(month.key) ?? 0 }));
}

/** Plans per treatment type, biggest first, the smallest types together as "Other". */
function plansByType(plans: TreatmentPlan[]): ChartPoint[] {
  const counts = new Map<string, number>();
  plans.forEach((plan) => {
    const type = plan.treatment_type || "Other";
    counts.set(type, (counts.get(type) ?? 0) + 1);
  });
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const shown = sorted.slice(0, RING_SLICES).map(([label, value]) => ({ label, value }));
  const rest = sorted.slice(RING_SLICES).reduce((sum, [, value]) => sum + value, 0);
  return rest > 0 ? [...shown, { label: "Other", value: rest }] : shown;
}

function Dashboard() {
  const { can, displayName, doctor: myDoctor } = useSession();
  // A doctor sees their own patients first; "Everyone" shows the whole clinic.
  const [everyone, setEveryone] = useState(false);
  const mine = myDoctor && !everyone ? myDoctor.name : "";
  const { money, settings, currency } = useSettings();
  const [data, setData] = useState<DashboardData | null>(null);
  // A failed load says so (with Try Again) instead of leaving the numbers loading or at zero.
  const [failed, setFailed] = useState("");
  const [version, setVersion] = useState(0);
  const today = todayISO();

  const seePatients = can("view_patients");
  const seeAppointments = can("view_appointments");
  const seeTreatments = can("view_treatments");
  const seeMoney = can("view_payments");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const months = chartMonths(today);
      const chartStart = monthStart(today, -(CHART_MONTHS - 1));
      const myFilter: FilterRow[] = mine ? [["doctor", "=", mine]] : [];
      try {
        const [patients, activePlans, payments, openPlans, todayList, upcoming, visits, plans] = await Promise.all([
          seePatients ? getCount("Patient") : Promise.resolve(0),
          seeTreatments ? getCount("Treatment Plan", [["status", "in", ["Planned", "In Progress"]]]) : Promise.resolve(0),
          // This month's revenue and the revenue chart come from the same rows.
          seeMoney
            ? getList<Payment>("Payment", ["amount", "payment_date"], { filters: [["payment_date", ">=", chartStart]], limit: 0 })
            : nothing<Payment>(),
          seeMoney
            ? getList<TreatmentPlan>("Treatment Plan", ["remaining_amount"], { filters: [["remaining_amount", ">", 0]], limit: 0 })
            : nothing<TreatmentPlan>(),
          seeAppointments
            ? getList<Appointment>("Appointment", APPOINTMENT_FIELDS, {
                filters: [["appointment_date", "=", today], ...myFilter],
                orderBy: "appointment_time asc",
                limit: 50,
              })
            : nothing<Appointment>(),
          seeAppointments
            ? getList<Appointment>("Appointment", APPOINTMENT_FIELDS, {
                filters: [
                  ["appointment_date", ">", today],
                  ["appointment_date", "<=", addDays(today, 7)],
                  ["status", "in", ["Scheduled", "Confirmed"]],
                  ...myFilter,
                ],
                orderBy: "appointment_date asc, appointment_time asc",
                limit: 8,
              })
            : nothing<Appointment>(),
          seeAppointments
            ? getList<Appointment>("Appointment", ["appointment_date", "status"], {
                filters: [["appointment_date", ">=", chartStart], ["appointment_date", "<", monthStart(today, 1)], ...myFilter],
                limit: 0,
              })
            : nothing<Appointment>(),
          seeTreatments
            ? getList<TreatmentPlan>("Treatment Plan", ["treatment_type"], { filters: [["status", "!=", "Cancelled"]], limit: 0 })
            : nothing<TreatmentPlan>(),
        ]);
        // The "Needs attention" counts, each only when the user may see it.
        const [openPast, tomorrowBooked, owing, recall] = await Promise.all([
          seeAppointments
            ? getCount("Appointment", [["appointment_date", "<", today], ["status", "in", ["Scheduled", "Confirmed"]], ...myFilter])
            : Promise.resolve(null),
          seeAppointments && settings.enable_whatsapp !== 0
            ? getList<Appointment>("Appointment", ["name"], {
                filters: [["appointment_date", "=", addDays(today, 1)], ["status", "in", ["Scheduled", "Confirmed"]], ...myFilter],
                limit: 0,
              })
            : Promise.resolve(null),
          seeMoney ? getCount("Patient", [["total_remaining", ">", 0]]) : Promise.resolve(null),
          seePatients && seeAppointments
            ? Promise.all([
                getList<Patient>("Patient", RECALL_PATIENT_FIELDS, { limit: 0 }),
                getList<Appointment>("Appointment", RECALL_APPOINTMENT_FIELDS, { limit: 0 }),
              ])
            : Promise.resolve(null),
        ]);
        const reminded = readRemindersOpened();
        if (cancelled) return;
        setFailed("");
        const thisMonth = monthStart(today);
        setData({
          attention: {
            openPast,
            toRemind: tomorrowBooked ? tomorrowBooked.filter((a) => !reminded.includes(a.name)).length : null,
            recallDue: recall ? dueForRecall(recall[0], recall[1], today, DEFAULT_RECALL_MONTHS).length : null,
            owing,
          },
          patients,
          activePlans,
          monthRevenue: payments
            .filter((row) => row.payment_date >= thisMonth)
            .reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
          outstanding: openPlans.reduce((sum, row) => sum + (Number(row.remaining_amount) || 0), 0),
          today: todayList,
          upcoming,
          revenueByMonth: seeMoney ? byMonth(payments, months, (row) => row.payment_date, (row) => Number(row.amount) || 0) : null,
          // Visits that happened or are booked: cancelled ones and no-shows do not count.
          visitsByMonth: seeAppointments
            ? byMonth(visits.filter((a) => a.status !== "Cancelled" && a.status !== "No Show"), months, (a) => a.appointment_date, () => 1)
            : null,
          plansByType: seeTreatments ? plansByType(plans) : null,
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) setFailed(errorMessage(err, "Could not load the dashboard."));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [today, seePatients, seeAppointments, seeTreatments, seeMoney, mine, settings.enable_whatsapp, version]);

  const looks = usePatientLooks([...(data?.today ?? []), ...(data?.upcoming ?? [])].map((a) => a.patient));
  const stillToCome = data?.today.filter((a) => a.status === "Scheduled" || a.status === "Confirmed").length ?? 0;
  const loadingValue = "…";

  const quickActions = [
    can("add_appointments") && { href: "/appointments/new", label: "New Appointment", hint: "Book a visit", icon: CalendarDays, section: "appointments" as const },
    can("add_patients") && { href: "/patients/new", label: "Add Patient", hint: "Register someone new", icon: UserPlus, section: "patients" as const },
    can("add_treatments") && { href: "/treatments/new", label: "New Treatment", hint: "Start a treatment plan", icon: Stethoscope, section: "treatments" as const },
    can("add_payments") && { href: "/payments/new", label: "Record Payment", hint: "Take a payment", icon: CreditCard, section: "money" as const },
  ].filter((action) => action !== false);

  const summary =
    seeAppointments && data
      ? data.today.length === 0
        ? mine
          ? "You have no patients booked today."
          : "No appointments booked today."
        : `${data.today.length} ${data.today.length === 1 ? "appointment" : "appointments"} today, ${stillToCome} still to come.`
      : undefined;
  // Money in charts is written short: "450K" (the currency is in the card's title).
  const short = (value: number) => formatCompact(value);
  const showCharts = Boolean(data?.revenueByMonth || data?.visitsByMonth || data?.plansByType);

  return (
    <PageContainer>
      <WelcomeBanner
        title={`${greeting()}, ${displayName}`}
        date={formatLongDate(today)}
        summary={summary}
        actions={
          myDoctor && seeAppointments ? (
            <Segmented
              label="Whose appointments"
              value={everyone ? "everyone" : "mine"}
              onChange={(next) => setEveryone(next === "everyone")}
              options={[
                { value: "mine", label: "My patients" },
                { value: "everyone", label: "Everyone" },
              ]}
            />
          ) : undefined
        }
      />

      {/* The everyday jobs first, one tap away as soon as the app opens. */}
      {quickActions.length > 0 && (
        <section aria-labelledby="quick-actions">
          <h2 id="quick-actions" className="sr-only">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {quickActions.map((action, index) => (
              <ActionTile
                key={action.href}
                href={action.href}
                label={action.label}
                hint={action.hint}
                icon={action.icon}
                section={action.section}
                order={index}
              />
            ))}
          </div>
        </section>
      )}

      {failed && (
        <LoadError
          message={failed}
          onRetry={() => {
            setFailed("");
            setVersion((v) => v + 1);
          }}
        />
      )}

      {/* Numbers that never loaded are not shown as zeros. */}
      {(data || !failed) && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {seeAppointments && (
              <StatCard
                title={mine ? "My appointments today" : "Appointments today"}
                value={data ? data.today.length : loadingValue}
                hint={data ? `${stillToCome} still to come` : undefined}
                icon={Calendar}
                section="appointments"
                href="/today"
                order={0}
              />
            )}
            {seePatients && (
              <StatCard title="Patients" value={data ? data.patients : loadingValue} icon={Users} section="patients" href="/patients" order={1} />
            )}
            {seeTreatments && (
              <StatCard
                title="Active treatment plans"
                value={data ? data.activePlans : loadingValue}
                icon={Stethoscope}
                section="treatments"
                href="/treatments"
                order={2}
              />
            )}
            {seeMoney && (
              <StatCard
                title="Revenue this month"
                value={data ? money(data.monthRevenue) : loadingValue}
                hint={data ? `${money(data.outstanding)} still owed` : undefined}
                icon={TrendingUp}
                section="money"
                href="/payments"
                order={3}
              />
            )}
          </div>

          {data && <NeedsAttention attention={data.attention} />}

          {seeAppointments && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card
                title={mine ? "My patients today" : "Today"}
                icon={Calendar}
                section="appointments"
                flush
                actions={
                  <Link href="/today" className="inline-flex items-center pointer-coarse:min-h-11 text-sm text-primary-600 hover:underline">
                    View all
                  </Link>
                }
              >
                <AppointmentList rows={data?.today} looks={looks} empty="No appointments today." showDate={false} />
              </Card>
              <Card
                title={mine ? "My next 7 days" : "Next 7 days"}
                icon={CalendarRange}
                section="appointments"
                flush
                actions={
                  <Link href="/appointments?date=upcoming" className="inline-flex items-center pointer-coarse:min-h-11 text-sm text-primary-600 hover:underline">
                    View all
                  </Link>
                }
              >
                <AppointmentList rows={data?.upcoming} looks={looks} empty="Nothing booked for the next 7 days." showDate />
              </Card>
            </div>
          )}

          {data && showCharts && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {data.revenueByMonth && (
                <Card title={`Revenue, last ${CHART_MONTHS} months`} icon={TrendingUp} section="money">
                  <BarChart
                    label={`Revenue in ${currency}, last ${CHART_MONTHS} months`}
                    data={data.revenueByMonth}
                    format={short}
                    highlight={CHART_MONTHS - 1}
                    empty="No payments in the last six months."
                  />
                  <p className="text-xs text-gray-500 mt-3">Amounts in {currency}. This month is the darker bar.</p>
                </Card>
              )}
              {data.visitsByMonth && (
                <Card title={mine ? "My visits per month" : "Visits per month"} icon={CalendarDays} section="appointments">
                  <BarChart
                    label={`Visits, last ${CHART_MONTHS} months`}
                    data={data.visitsByMonth}
                    highlight={CHART_MONTHS - 1}
                    empty="No visits in the last six months."
                  />
                  <p className="text-xs text-gray-500 mt-3">Completed and booked visits; cancelled ones and no-shows are left out.</p>
                </Card>
              )}
              {data.plansByType && (
                <Card title="Treatments by type" icon={PieChart} section="treatments" className="md:col-span-2 xl:col-span-1">
                  <DonutChart label="Treatment plans by type" data={data.plansByType} centerLabel="plans" empty="No treatment plans yet." />
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {!seeAppointments && !seePatients && !seeTreatments && !seeMoney && (
        <Card>
          <EmptyState
            icon={Wallet}
            title="Nothing to show yet"
            text="Your account has no permissions turned on. Ask a clinic manager to set them under Users."
          />
        </Card>
      )}
    </PageContainer>
  );
}

/**
 * The greeting at the top: the date, "Good morning, …" and a one-line summary of the day, on a bold gradient with a
 * smiling tooth.
 */
function WelcomeBanner({ title, date, summary, actions }: { title: string; date: string; summary?: string; actions?: ReactNode }) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-2xl px-6 py-6 sm:px-8 shadow-lg",
        "bg-linear-to-br from-primary-800 via-primary-600 to-(--sec-appointments)",
      )}
    >
      {/* Soft circles in the corner. */}
      <span aria-hidden="true" className="absolute -top-16 -end-10 w-56 h-56 rounded-full bg-white/10" />
      <span aria-hidden="true" className="absolute -bottom-20 end-40 w-40 h-40 rounded-full bg-white/5" />
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/85">{date}</p>
          <h1 className="text-2xl font-bold text-white mt-0.5 break-words">{title}</h1>
          {summary && <p className="text-sm text-white/85 mt-1">{summary}</p>}
          {actions && <div className="mt-4">{actions}</div>}
        </div>
        <ToothMascot size={104} className="hidden sm:block shrink-0 text-white/90 motion-safe:animate-bob" />
      </div>
    </div>
  );
}

function AppointmentList({
  rows,
  looks,
  empty,
  showDate,
}: {
  rows?: Appointment[];
  looks: Record<string, PatientLook>;
  empty: string;
  showDate: boolean;
}) {
  if (!rows) return <p className="px-6 pb-6 text-sm text-gray-500">Loading...</p>;
  if (rows.length === 0) {
    return (
      <div className="px-6 pb-6">
        <p className="text-sm text-gray-500">{empty}</p>
        <LinkButton href="/appointments/new" size="sm" variant="secondary" icon={Plus} className="mt-3">
          New Appointment
        </LinkButton>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-gray-100 pb-2">
      {rows.map((a) => {
        const look = looks[a.patient];
        return (
          <li key={a.name}>
            <Link href={appointmentHref(a.name)} className="flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-3 hover:bg-gray-50">
              <span className="w-20 shrink-0">
                <span className="block text-sm font-semibold text-sec-ink whitespace-nowrap">{formatTime(a.appointment_time)}</span>
                {showDate && <span className="block text-xs text-gray-500">{formatDate(a.appointment_date)}</span>}
              </span>
              <Avatar name={a.patient_name || a.patient} gender={look?.gender} age={look?.age} size={36} className="max-sm:hidden" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-gray-800 truncate">{a.patient_name || a.name}</span>
                <span className="block text-xs text-gray-500 truncate">
                  {[a.doctor_name, a.reason_for_visit].filter(Boolean).join(" · ")}
                </span>
              </span>
              <StatusBadge kind="appointment" status={a.status} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Reminders already opened on this computer (see the Today board). */
function readRemindersOpened(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem("reminders_opened") || "[]") as unknown;
    return Array.isArray(list) ? list.filter((n): n is string => typeof n === "string") : [];
  } catch {
    return [];
  }
}

/** A short to-do list for the start of the day. Rows with nothing to do are left out. */
function NeedsAttention({ attention }: { attention: DashboardData["attention"] }) {
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  const rows: Array<{ href: string; icon: typeof CalendarX; hue: Hue; text: string; hint: string } | null> = [
    attention.openPast
      ? { href: "/today", icon: CalendarX, hue: "yellow", text: `${attention.openPast} past ${plural(attention.openPast, "appointment", "appointments")} to close`, hint: "Mark them Completed or No show" }
      : null,
    attention.toRemind
      ? { href: "/today", icon: MessageCircle, hue: "whatsapp", text: `${attention.toRemind} ${plural(attention.toRemind, "reminder", "reminders")} to send for tomorrow`, hint: "WhatsApp, one tap each" }
      : null,
    attention.recallDue
      ? { href: "/recall", icon: BellRing, hue: "patients", text: `${attention.recallDue} ${plural(attention.recallDue, "patient", "patients")} due for a check-up`, hint: "Check-up date reached or not seen for 6 months, nothing booked" }
      : null,
    attention.owing
      ? { href: "/patients?balance=owing", icon: Wallet, hue: "red", text: `${attention.owing} ${plural(attention.owing, "patient owes", "patients owe")} money`, hint: "See balances and send reminders" }
      : null,
  ];
  const shown = rows.filter((row) => row !== null);
  if (shown.length === 0) return null;
  return (
    <Card title="Needs attention" flush>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-2 px-2 pb-2">
        {shown.map((row) => (
          <li key={row.text}>
            <Link href={row.href} className="flex items-center gap-3 px-3 sm:px-4 py-3 min-h-11 rounded-xl hover:bg-gray-50">
              <IconTile icon={row.icon} hue={row.hue} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-gray-800">{row.text}</span>
                <span className="block text-xs text-gray-500">{row.hint}</span>
              </span>
              <ChevronRight size={16} className="text-gray-400 rtl:rotate-180" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
