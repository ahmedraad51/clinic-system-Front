"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BellRing, Calendar, CalendarDays, CalendarX, ChevronRight, CreditCard, MessageCircle, Plus, Stethoscope, TrendingUp, UserPlus,
  Users, Wallet,
} from "lucide-react";
import RequirePermission from "@/components/Guard";
import { ActionTile, Card, EmptyState, LinkButton, LoadError, PageContainer, PageHeader, Segmented, StatCard, StatusBadge } from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { errorMessage, getCount, getList, type FilterRow } from "@/lib/frappe";
import { addDays, formatDate, formatLongDate, formatTime, monthStart, todayISO } from "@/lib/format";
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
}

/** An empty result for sections the user is not allowed to see. */
function nothing<T>(): Promise<T[]> {
  return Promise.resolve([]);
}

const APPOINTMENT_FIELDS = ["name", "patient_name", "doctor_name", "appointment_date", "appointment_time", "status", "reason_for_visit"];

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

function Dashboard() {
  const { can, displayName, doctor: myDoctor } = useSession();
  // A doctor sees their own patients first; "Everyone" shows the whole clinic.
  const [everyone, setEveryone] = useState(false);
  const mine = myDoctor && !everyone ? myDoctor.name : "";
  const { money, settings } = useSettings();
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
      try {
        const [patients, activePlans, monthPayments, openPlans, todayList, upcoming] = await Promise.all([
          seePatients ? getCount("Patient") : Promise.resolve(0),
          seeTreatments ? getCount("Treatment Plan", [["status", "in", ["Planned", "In Progress"]]]) : Promise.resolve(0),
          seeMoney
            ? getList<Payment>("Payment", ["amount"], { filters: [["payment_date", ">=", monthStart(today)]], limit: 0 })
            : nothing<Payment>(),
          seeMoney
            ? getList<TreatmentPlan>("Treatment Plan", ["remaining_amount"], { filters: [["remaining_amount", ">", 0]], limit: 0 })
            : nothing<TreatmentPlan>(),
          seeAppointments
            ? getList<Appointment>("Appointment", APPOINTMENT_FIELDS, {
                filters: [["appointment_date", "=", today], ...(mine ? [["doctor", "=", mine] as FilterRow] : [])],
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
                  ...(mine ? [["doctor", "=", mine] as FilterRow] : []),
                ],
                orderBy: "appointment_date asc, appointment_time asc",
                limit: 8,
              })
            : nothing<Appointment>(),
        ]);
        // The "Needs attention" counts, each only when the user may see it.
        const [openPast, tomorrowBooked, owing, recall] = await Promise.all([
          seeAppointments
            ? getCount("Appointment", [
                ["appointment_date", "<", today],
                ["status", "in", ["Scheduled", "Confirmed"]],
                ...(mine ? [["doctor", "=", mine] as FilterRow] : []),
              ])
            : Promise.resolve(null),
          seeAppointments && settings.enable_whatsapp !== 0
            ? getList<Appointment>("Appointment", ["name"], {
                filters: [
                  ["appointment_date", "=", addDays(today, 1)],
                  ["status", "in", ["Scheduled", "Confirmed"]],
                  ...(mine ? [["doctor", "=", mine] as FilterRow] : []),
                ],
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
        setData({
          attention: {
            openPast,
            toRemind: tomorrowBooked ? tomorrowBooked.filter((a) => !reminded.includes(a.name)).length : null,
            recallDue: recall ? dueForRecall(recall[0], recall[1], today, DEFAULT_RECALL_MONTHS).length : null,
            owing,
          },
          patients,
          activePlans,
          monthRevenue: monthPayments.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
          outstanding: openPlans.reduce((sum, row) => sum + (Number(row.remaining_amount) || 0), 0),
          today: todayList,
          upcoming,
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

  const stillToCome = data?.today.filter((a) => a.status === "Scheduled" || a.status === "Confirmed").length ?? 0;
  const loadingValue = "…";

  const quickActions = [
    can("add_appointments") && { href: "/appointments/new", label: "New Appointment", hint: "Book a visit", icon: CalendarDays },
    can("add_patients") && { href: "/patients/new", label: "Add Patient", hint: "Register someone new", icon: UserPlus },
    can("add_treatments") && { href: "/treatments/new", label: "New Treatment", hint: "Start a treatment plan", icon: Stethoscope },
    can("add_payments") && { href: "/payments/new", label: "Record Payment", hint: "Take a payment", icon: CreditCard },
  ].filter((action) => action !== false);

  return (
    <PageContainer>
      <PageHeader
        title={`${greeting()}, ${displayName}`}
        subtitle={formatLongDate(today)}
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
            {quickActions.map((action) => (
              <ActionTile key={action.href} href={action.href} label={action.label} hint={action.hint} icon={action.icon} />
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
                tone="primary"
                href="/today"
              />
            )}
            {seePatients && (
              <StatCard title="Patients" value={data ? data.patients : loadingValue} icon={Users} tone="green" href="/patients" />
            )}
            {seeTreatments && (
              <StatCard
                title="Active treatment plans"
                value={data ? data.activePlans : loadingValue}
                icon={Stethoscope}
                tone="yellow"
                href="/treatments"
              />
            )}
            {seeMoney && (
              <StatCard
                title="Revenue this month"
                value={data ? money(data.monthRevenue) : loadingValue}
                hint={data ? `${money(data.outstanding)} still owed` : undefined}
                icon={TrendingUp}
                tone="purple"
                href="/payments"
              />
            )}
          </div>

          {data && <NeedsAttention attention={data.attention} />}

          {seeAppointments && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card
                title={mine ? "My patients today" : "Today"}
                flush
                actions={
                  <Link href="/today" className="inline-flex items-center pointer-coarse:min-h-11 text-sm text-primary-600 hover:underline">
                    View all
                  </Link>
                }
              >
                <AppointmentList
                  rows={data?.today}
                  empty="No appointments today."
                  showDate={false}
                />
              </Card>
              <Card
                title={mine ? "My next 7 days" : "Next 7 days"}
                flush
                actions={
                  <Link href="/appointments?date=upcoming" className="inline-flex items-center pointer-coarse:min-h-11 text-sm text-primary-600 hover:underline">
                    View all
                  </Link>
                }
              >
                <AppointmentList rows={data?.upcoming} empty="Nothing booked for the next 7 days." showDate />
              </Card>
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

function AppointmentList({
  rows,
  empty,
  showDate,
}: {
  rows?: Appointment[];
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
    <ul className="divide-y divide-gray-50 pb-2">
      {rows.map((a) => (
        <li key={a.name}>
          <Link href={appointmentHref(a.name)} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50">
            <span className="w-20 shrink-0">
              <span className="block text-sm font-semibold text-primary-600">{formatTime(a.appointment_time)}</span>
              {showDate && <span className="block text-xs text-gray-500">{formatDate(a.appointment_date)}</span>}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-gray-800 truncate">{a.patient_name || a.name}</span>
              <span className="block text-xs text-gray-500 truncate">
                {[a.doctor_name, a.reason_for_visit].filter(Boolean).join(" · ")}
              </span>
            </span>
            <StatusBadge kind="appointment" status={a.status} />
          </Link>
        </li>
      ))}
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
  const rows = [
    attention.openPast
      ? { href: "/today", icon: CalendarX, tone: "text-amber-700 bg-amber-50", text: `${attention.openPast} past ${plural(attention.openPast, "appointment", "appointments")} to close`, hint: "Mark them Completed or No show" }
      : null,
    attention.toRemind
      ? { href: "/today", icon: MessageCircle, tone: "text-green-700 bg-green-50", text: `${attention.toRemind} ${plural(attention.toRemind, "reminder", "reminders")} to send for tomorrow`, hint: "WhatsApp, one tap each" }
      : null,
    attention.recallDue
      ? { href: "/recall", icon: BellRing, tone: "text-primary-700 bg-primary-50", text: `${attention.recallDue} ${plural(attention.recallDue, "patient", "patients")} due for a check-up`, hint: "Check-up date reached or not seen for 6 months, nothing booked" }
      : null,
    attention.owing
      ? { href: "/patients?balance=owing", icon: Wallet, tone: "text-red-700 bg-red-50", text: `${attention.owing} ${plural(attention.owing, "patient owes", "patients owe")} money`, hint: "See balances and send reminders" }
      : null,
  ].filter((row) => row !== null);
  if (rows.length === 0) return null;
  return (
    <Card title="Needs attention" flush>
      <ul className="divide-y divide-gray-100">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <li key={row.text}>
              <Link href={row.href} className="flex items-center gap-3 px-5 sm:px-6 py-3 min-h-11 hover:bg-gray-50">
                <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${row.tone}`}>
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gray-800">{row.text}</span>
                  <span className="block text-xs text-gray-500">{row.hint}</span>
                </span>
                <ChevronRight size={16} className="text-gray-400 rtl:rotate-180" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
