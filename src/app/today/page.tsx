"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, CheckCheck, Clock, CreditCard, FileText, HeartPulse, Plus, RefreshCw, UserX } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Alert, Button, Card, EmptyState, LinkButton, PageContainer, PageHeader, PageLoading, StatusBadge,
} from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { errorMessage, getList, updateDoc } from "@/lib/frappe";
import { cx, formatLongDate, formatTime, fromMinutes, toMinutes, todayISO } from "@/lib/format";
import { appointmentHref, patientHref } from "@/lib/links";
import { MEDICAL_FIELDS, medicalFlags } from "@/lib/medical";
import type { Appointment, AppointmentStatus, Patient } from "@/lib/types";

/** Minutes after the start time before a patient who has not been seen counts as late. */
const LATE_AFTER = 10;

export default function TodayPage() {
  return (
    <RequirePermission permission="view_appointments">
      <TodayBoard />
    </RequirePermission>
  );
}

interface Board {
  date: string;
  appointments: Appointment[];
  patients: Record<string, Patient>;
}

/**
 * The front desk's day: today's appointments by doctor, with one tap to confirm, complete or mark a
 * no-show, late patients highlighted, medical alerts and balances at a glance, and quick payments.
 */
function TodayBoard() {
  const { can } = useSession();
  const { money } = useSettings();
  const toast = useToast();
  const today = todayISO();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const showMoney = can("view_payments");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const appointments = await getList<Appointment>(
          "Appointment",
          [
            "name", "patient", "patient_name", "doctor", "doctor_name", "appointment_time", "duration_minutes",
            "status", "reason_for_visit",
          ],
          { filters: [["appointment_date", "=", today]], orderBy: "appointment_time asc", limit: 0 },
        );
        const ids = [...new Set(appointments.map((a) => a.patient))];
        const rows = ids.length
          ? await getList<Patient>("Patient", ["name", "phone_number", "total_remaining", ...MEDICAL_FIELDS], {
              filters: [["name", "in", ids]],
              limit: 0,
            })
          : [];
        if (!cancelled) {
          setBoard({ date: today, appointments, patients: Object.fromEntries(rows.map((p) => [p.name, p])) });
          setError("");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(errorMessage(err, "Could not load today's appointments."));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [today, version]);

  // Keep "late" up to date.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const setStatus = async (appointment: Appointment, status: AppointmentStatus) => {
    setSaving(appointment.name);
    try {
      await updateDoc("Appointment", appointment.name, { status });
      setBoard((prev) =>
        prev && {
          ...prev,
          appointments: prev.appointments.map((a) => (a.name === appointment.name ? { ...a, status } : a)),
        },
      );
      toast.success(`${appointment.patient_name || appointment.patient}: ${status}.`);
    } catch (err) {
      toast.error(errorMessage(err, "Could not change the status."));
    } finally {
      setSaving(null);
    }
  };

  if (!board && !error) return <PageLoading />;

  const appointments = board?.appointments ?? [];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const open = (a: Appointment) => a.status === "Scheduled" || a.status === "Confirmed";
  const minutesLate = (a: Appointment) => (open(a) ? nowMinutes - toMinutes(a.appointment_time) : 0);
  const isLate = (a: Appointment) => minutesLate(a) >= LATE_AFTER;

  const counts = {
    toCome: appointments.filter(open).length,
    late: appointments.filter(isLate).length,
    done: appointments.filter((a) => a.status === "Completed").length,
    missed: appointments.filter((a) => a.status === "No Show").length,
  };

  // One group per doctor, in the order of their first appointment.
  const groups: Array<{ doctor: string; name: string; items: Appointment[] }> = [];
  appointments.forEach((a) => {
    const group = groups.find((g) => g.doctor === a.doctor);
    if (group) group.items.push(a);
    else groups.push({ doctor: a.doctor, name: a.doctor_name || a.doctor, items: [a] });
  });

  const canEdit = can("edit_appointments");
  // A walk-in: book now, rounded up to the next quarter hour.
  const walkInTime = fromMinutes(Math.min(23 * 60 + 45, Math.ceil(nowMinutes / 15) * 15));

  return (
    <PageContainer>
      <PageHeader
        title="Today"
        subtitle={formatLongDate(today)}
        actions={
          <>
            {showMoney && (
              <LinkButton href="/payments/day" variant="secondary" icon={FileText}>
                Day Report
              </LinkButton>
            )}
            <Button variant="secondary" icon={RefreshCw} onClick={() => setVersion((v) => v + 1)}>
              Refresh
            </Button>
            {can("add_appointments") && (
              <LinkButton href={`/appointments/new?date=${today}&time=${walkInTime}`} icon={Plus}>
                Walk-in
              </LinkButton>
            )}
          </>
        }
      />

      {error && <Alert tone="red">{error}</Alert>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Count label="Still to come" value={counts.toCome} tone="text-primary-700" />
        <Count label="Late" value={counts.late} tone={counts.late ? "text-amber-600" : "text-gray-400"} />
        <Count label="Completed" value={counts.done} tone="text-green-700" />
        <Count label="No show" value={counts.missed} tone={counts.missed ? "text-red-600" : "text-gray-400"} />
      </div>

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            icon={Clock}
            title="No appointments today"
            text="Walk-ins can be booked with the button above."
            action={
              <LinkButton href="/appointments?view=week" variant="secondary">
                Open the week
              </LinkButton>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          {groups.map((group) => (
            <Card
              key={group.doctor}
              title={group.name}
              flush
              actions={
                <span className="text-xs text-gray-500">
                  {group.items.filter(open).length} to come · {group.items.length} today
                </span>
              }
            >
              <ul className="divide-y divide-gray-100">
                {group.items.map((a) => {
                  const patient = board?.patients[a.patient];
                  const flags = medicalFlags(patient);
                  const urgent = flags.filter((f) => f.severity === "high");
                  const owes = Number(patient?.total_remaining) || 0;
                  const late = isLate(a);
                  const busy = saving === a.name;
                  return (
                    <li
                      key={a.name}
                      className={cx(
                        "px-5 py-4 space-y-3",
                        late && "bg-amber-50/70",
                        (a.status === "Cancelled" || a.status === "No Show") && "opacity-60",
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-[5.5rem] shrink-0">
                          <p className="text-base font-bold text-gray-800 whitespace-nowrap">{formatTime(a.appointment_time)}</p>
                          {late && (
                            <p className="text-xs font-semibold text-amber-700">{minutesLate(a)} min late</p>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={patientHref(a.patient)}
                              className="text-base font-semibold text-gray-800 hover:text-primary-600"
                            >
                              {a.patient_name || a.patient}
                            </Link>
                            <StatusBadge kind="appointment" status={a.status} />
                            {urgent.length > 0 && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium"
                                title={urgent.map((f) => `${f.label}: ${f.detail}`).join(" · ")}
                              >
                                <HeartPulse size={13} />
                                {urgent.map((f) => f.label).join(", ")}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            <Link href={appointmentHref(a.name)} className="hover:text-primary-600">
                              {a.reason_for_visit || "Appointment"}
                            </Link>
                            {" · "}
                            {Number(a.duration_minutes) || 30} min
                            {showMoney && owes > 0 && (
                              <span className="text-red-600 font-medium"> · owes {money(owes)}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {(canEdit || (showMoney && can("add_payments"))) && (
                        <div className="flex flex-wrap gap-2 sm:ps-[6.5rem]">
                          {canEdit && a.status === "Scheduled" && (
                            <Button size="sm" variant="secondary" icon={Check} loading={busy} onClick={() => setStatus(a, "Confirmed")}>
                              Confirm
                            </Button>
                          )}
                          {canEdit && open(a) && (
                            <Button size="sm" variant="success" icon={CheckCheck} disabled={busy} onClick={() => setStatus(a, "Completed")}>
                              Completed
                            </Button>
                          )}
                          {canEdit && open(a) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={UserX}
                              disabled={busy}
                              onClick={() => setStatus(a, "No Show")}
                              className="text-red-600 hover:bg-red-50"
                            >
                              No show
                            </Button>
                          )}
                          {canEdit && (a.status === "Completed" || a.status === "No Show") && (
                            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setStatus(a, "Confirmed")}>
                              Undo
                            </Button>
                          )}
                          {can("add_payments") && (
                            <LinkButton
                              href={`/payments/new?patient=${encodeURIComponent(a.patient)}`}
                              size="sm"
                              variant="secondary"
                              icon={CreditCard}
                            >
                              Add Payment
                            </LinkButton>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
      <p className={cx("text-2xl font-bold", tone)}>{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
