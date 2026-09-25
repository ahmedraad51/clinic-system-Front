"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar, CalendarDays, CreditCard, Plus, Stethoscope, TrendingUp, UserPlus, Users, Wallet,
} from "lucide-react";
import RequirePermission from "@/components/Guard";
import { Card, EmptyState, LinkButton, PageContainer, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { getCount, getList } from "@/lib/frappe";
import { addDays, formatDate, formatTime, monthStart, todayISO } from "@/lib/format";
import { appointmentHref } from "@/lib/links";
import type { Appointment, Payment, TreatmentPlan } from "@/lib/types";

interface DashboardData {
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

function longDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(year, month - 1, day),
  );
}

function Dashboard() {
  const { can, displayName } = useSession();
  const { money } = useSettings();
  const [data, setData] = useState<DashboardData | null>(null);
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
                filters: [["appointment_date", "=", today]],
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
                ],
                orderBy: "appointment_date asc, appointment_time asc",
                limit: 8,
              })
            : nothing<Appointment>(),
        ]);
        if (cancelled) return;
        setData({
          patients,
          activePlans,
          monthRevenue: monthPayments.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
          outstanding: openPlans.reduce((sum, row) => sum + (Number(row.remaining_amount) || 0), 0),
          today: todayList,
          upcoming,
        });
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [today, seePatients, seeAppointments, seeTreatments, seeMoney]);

  const stillToCome = data?.today.filter((a) => a.status === "Scheduled" || a.status === "Confirmed").length ?? 0;
  const loadingValue = "…";

  const quickActions = [
    can("add_appointments") && { href: "/appointments/new", label: "New Appointment", icon: CalendarDays },
    can("add_patients") && { href: "/patients/new", label: "Add Patient", icon: UserPlus },
    can("add_treatments") && { href: "/treatments/new", label: "New Treatment", icon: Stethoscope },
    can("add_payments") && { href: "/payments/new", label: "Record Payment", icon: CreditCard },
  ].filter((action) => action !== false);

  return (
    <PageContainer>
      <PageHeader title={`${greeting()}, ${displayName}`} subtitle={longDate(today)} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {seeAppointments && (
          <StatCard
            title="Appointments today"
            value={data ? data.today.length : loadingValue}
            hint={data ? `${stillToCome} still to come` : undefined}
            icon={Calendar}
            tone="primary"
            href="/appointments?date=today"
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

      {seeAppointments && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card
            title="Today"
            flush
            actions={
              <Link href="/appointments?date=today" className="text-sm text-primary-600 hover:underline">
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
            title="Next 7 days"
            flush
            actions={
              <Link href="/appointments?date=upcoming" className="text-sm text-primary-600 hover:underline">
                View all
              </Link>
            }
          >
            <AppointmentList rows={data?.upcoming} empty="Nothing booked for the next 7 days." showDate />
          </Card>
        </div>
      )}

      {quickActions.length > 0 && (
        <Card title="Quick Actions">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="rounded-xl border border-gray-100 p-4 flex flex-col items-center gap-2 text-center hover:bg-primary-50/40 hover:border-primary-100 transition group"
                >
                  <span className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 group-hover:bg-primary-100 transition">
                    <Icon size={18} />
                  </span>
                  <span className="text-sm font-medium text-gray-700">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </Card>
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
  if (!rows) return <p className="px-6 pb-6 text-sm text-gray-400">Loading...</p>;
  if (rows.length === 0) {
    return (
      <div className="px-6 pb-6">
        <p className="text-sm text-gray-400">{empty}</p>
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
              {showDate && <span className="block text-xs text-gray-400">{formatDate(a.appointment_date)}</span>}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-gray-800 truncate">{a.patient_name || a.name}</span>
              <span className="block text-xs text-gray-400 truncate">
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
