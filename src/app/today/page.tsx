"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, CheckCheck, Clock, CreditCard, FileText, HeartPulse, MessageCircle, Plus, RefreshCw, UserX } from "lucide-react";
import FinishVisitDialog from "@/components/FinishVisitDialog";
import { LAB_BADGES, labState } from "@/components/LabWorkCard";
import RequirePermission from "@/components/Guard";
import {
  Badge, Button, Card, EmptyState, LinkButton, LoadError, PageContainer, PageHeader, PageLoading, Segmented, StatusBadge,
} from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { errorMessage, getList, updateDoc } from "@/lib/frappe";
import { addDays, cx, formatDate, formatLongDate, formatTime, fromMinutes, todayISO, toMinutes } from "@/lib/format";
import { appointmentHref, patientHref, treatmentHref } from "@/lib/links";
import { MEDICAL_FIELDS, medicalFlags } from "@/lib/medical";
import { fillTemplate, whatsappLink } from "@/lib/whatsapp";
import type { Appointment, AppointmentStatus, Patient, TreatmentPlan, WhatsAppTemplate } from "@/lib/types";

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
  /** Past appointments never marked Completed, No Show or Cancelled. */
  earlier: Appointment[];
  /** Tomorrow's booked appointments, to remind by hand. */
  tomorrow: Appointment[];
  /** The template used for those reminders (the "24 Hours Before" one when there is one). */
  template: WhatsAppTemplate | null;
  /** Lab work sent and not back yet. */
  lab: TreatmentPlan[];
}

/**
 * The front desk's day: today's appointments by doctor, with one tap to confirm, complete or mark a
 * no-show, late patients highlighted, medical alerts and balances at a glance, and quick payments.
 */
function TodayBoard() {
  const { can, doctor: myDoctor } = useSession();
  // A doctor sees their own patients first; "Everyone" shows the whole clinic.
  const [everyone, setEveryone] = useState(false);
  const mine = myDoctor && !everyone ? myDoctor.name : "";
  const { money, settings, clinicName, countryCode } = useSettings();
  // Reminders opened from this computer, so nobody gets two.
  const [reminded, setReminded] = useState<string[]>(() => readReminded());
  const toast = useToast();
  const today = todayISO();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);
  // After "Completed": ask what was done.
  const [finishing, setFinishing] = useState<Appointment | null>(null);
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
        const earlier = await getList<Appointment>(
          "Appointment",
          ["name", "patient", "patient_name", "doctor", "doctor_name", "appointment_date", "appointment_time", "status", "reason_for_visit"],
          {
            filters: [["appointment_date", "<", today], ["status", "in", ["Scheduled", "Confirmed"]]],
            orderBy: "appointment_date desc, appointment_time desc",
            limit: 50,
          },
        );
        const [tomorrow, templates] = await Promise.all([
          getList<Appointment>(
            "Appointment",
            ["name", "patient", "patient_name", "doctor", "doctor_name", "appointment_date", "appointment_time", "status"],
            {
              filters: [["appointment_date", "=", addDays(today, 1)], ["status", "in", ["Scheduled", "Confirmed"]]],
              orderBy: "appointment_time asc",
              limit: 0,
            },
          ),
          getList<WhatsAppTemplate>("WhatsApp Template", ["name", "template_name", "trigger", "message"], {
            filters: [["is_active", "=", 1]],
            limit: 0,
          }).catch(() => [] as WhatsAppTemplate[]),
        ]);
        const lab = await getList<TreatmentPlan>(
          "Treatment Plan",
          ["name", "patient", "patient_name", "doctor", "treatment_type", "tooth_number", "lab_name", "lab_sent_date", "lab_due_date", "lab_received_date"],
          { filters: [["lab_sent_date", "is", "set"], ["lab_received_date", "is", "not set"]], orderBy: "lab_due_date asc", limit: 0 },
        ).catch(() => [] as TreatmentPlan[]);
        const template = templates.find((t) => t.trigger === "24 Hours Before") ?? templates[0] ?? null;
        const ids = [...new Set([...appointments, ...tomorrow].map((a) => a.patient))];
        const rows = ids.length
          ? await getList<Patient>("Patient", ["name", "phone_number", "total_remaining", ...MEDICAL_FIELDS], {
              filters: [["name", "in", ids]],
              limit: 0,
            })
          : [];
        if (!cancelled) {
          setBoard({ date: today, appointments, earlier, tomorrow, template, lab, patients: Object.fromEntries(rows.map((p) => [p.name, p])) });
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
          earlier: prev.earlier.map((a) => (a.name === appointment.name ? { ...a, status } : a)),
        },
      );
      toast.success(`${appointment.patient_name || appointment.patient}: ${status}.`);
      if (status === "Completed" && can("edit_treatments")) {
        setFinishing({ ...appointment, appointment_date: appointment.appointment_date || today });
      }
    } catch (err) {
      toast.error(errorMessage(err, "Could not change the status."));
    } finally {
      setSaving(null);
    }
  };

  if (!board && !error) return <PageLoading />;

  const appointments = (board?.appointments ?? []).filter((a) => !mine || a.doctor === mine);
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
  // Resolved ones drop off the list straight away.
  const tomorrowList = (board?.tomorrow ?? []).filter((a) => !mine || a.doctor === mine);
  const reminderText = (a: Appointment) =>
    fillTemplate(
      board?.template?.message ??
        "Hello {{ patient_name }}, this is a reminder of your appointment at {{ clinic_name }} on {{ appointment_date }} at {{ appointment_time }}.",
      {
        patient_name: a.patient_name || a.patient,
        appointment_date: formatDate(a.appointment_date),
        appointment_time: formatTime(a.appointment_time),
        doctor_name: a.doctor_name || "",
        clinic_name: clinicName,
      },
    );
  const markReminded = (name: string) => {
    const next = [...reminded.filter((n) => n !== name), name];
    setReminded(next);
    saveReminded(next);
  };

  // Late, or due back within two days.
  const labDue = (board?.lab ?? []).filter(
    (p) => (!mine || p.doctor === mine) && (!p.lab_due_date || p.lab_due_date <= addDays(today, 2)),
  );

  const earlierOpen = (board?.earlier ?? []).filter(
    (a) => (a.status === "Scheduled" || a.status === "Confirmed") && (!mine || a.doctor === mine),
  );
  // A walk-in: book now, rounded up to the next quarter hour.
  const walkInTime = fromMinutes(Math.min(23 * 60 + 45, Math.ceil(nowMinutes / 15) * 15));

  return (
    <PageContainer>
      <PageHeader
        title={mine ? "My Day" : "Today"}
        subtitle={formatLongDate(today)}
        actions={
          <>
            {myDoctor && (
              <Segmented
                label="Whose patients"
                value={everyone ? "everyone" : "mine"}
                onChange={(next) => setEveryone(next === "everyone")}
                options={[
                  { value: "mine", label: "My patients" },
                  { value: "everyone", label: "Everyone" },
                ]}
              />
            )}
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

      {error && (
        <LoadError
          message={error}
          onRetry={() => {
            setError("");
            setVersion((v) => v + 1);
          }}
        />
      )}

      {/* Nothing loaded yet: no zeros and no "No appointments today", only the error above. */}
      {board && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Count label="Still to come" value={counts.toCome} tone="text-primary-700" />
            <Count label="Late" value={counts.late} tone={counts.late ? "text-amber-600" : "text-gray-500"} />
            <Count label="Completed" value={counts.done} tone="text-green-700" />
            <Count label="No show" value={counts.missed} tone={counts.missed ? "text-red-600" : "text-gray-500"} />
          </div>

          {groups.length === 0 ? (
            <Card>
              <EmptyState
                icon={Clock}
                title={mine ? "You have no patients today" : "No appointments today"}
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
          {settings.enable_whatsapp !== 0 && tomorrowList.length > 0 && (
            <Card
              title={`Tomorrow's reminders (${tomorrowList.filter((a) => !reminded.includes(a.name)).length} to send)`}
              flush
              actions={<span className="text-xs text-gray-500">{board?.template ? board.template.template_name : "Default message"}</span>}
            >
              <ul className="divide-y divide-gray-100">
                {tomorrowList.map((a) => {
                  const link = whatsappLink(board?.patients[a.patient]?.phone_number, reminderText(a), countryCode);
                  const done = reminded.includes(a.name);
                  return (
                    <li key={a.name} className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="w-[5.5rem] shrink-0 font-semibold text-gray-800 whitespace-nowrap">{formatTime(a.appointment_time)}</span>
                      <div className="min-w-0 flex-1">
                        <Link href={appointmentHref(a.name)} className="font-medium text-gray-800 hover:text-primary-600">
                          {a.patient_name || a.patient}
                        </Link>
                        <p className="text-sm text-gray-500">{a.doctor_name}</p>
                      </div>
                      {done ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
                          <Check size={15} />
                          Reminder opened
                        </span>
                      ) : link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => markReminded(a.name)}
                          className="inline-flex items-center gap-1.5 min-h-9 pointer-coarse:min-h-11 px-3 rounded-xl bg-green-50 border border-green-200 text-sm font-medium text-green-800 hover:bg-green-100"
                        >
                          <MessageCircle size={15} />
                          Send reminder
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500">No phone number</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {can("view_treatments") && labDue.length > 0 && (
            <Card title={`Lab work due (${labDue.length})`} flush actions={<span className="text-xs text-gray-500">Check it is back before the patient comes</span>}>
              <ul className="divide-y divide-gray-100">
                {labDue.map((p) => {
                  const state = labState(p, today);
                  return (
                    <li key={p.name}>
                      <Link href={treatmentHref(p.name)} className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 hover:bg-gray-50">
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-gray-800">{p.patient_name || p.patient}</span>
                          <span className="block text-sm text-gray-500">
                            {p.treatment_type}
                            {p.tooth_number ? ` · tooth ${p.tooth_number}` : ""}
                            {p.lab_name ? ` · ${p.lab_name}` : ""}
                          </span>
                        </span>
                        <span className="text-sm text-gray-600 whitespace-nowrap">
                          {p.lab_due_date ? `Due ${formatDate(p.lab_due_date)}` : "No due date"}
                        </span>
                        <Badge tone={LAB_BADGES[state].tone}>{LAB_BADGES[state].label}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {earlierOpen.length > 0 && (
            <Card
              title={`Earlier, still open (${earlierOpen.length})`}
              flush
              actions={<span className="text-xs text-gray-500">Mark what happened, so the records stay right</span>}
            >
              <ul className="divide-y divide-gray-100">
                {earlierOpen.map((a) => (
                  <li key={a.name} className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="min-w-0 flex-1">
                      <Link href={appointmentHref(a.name)} className="font-medium text-gray-800 hover:text-primary-600">
                        {a.patient_name || a.patient}
                      </Link>
                      <p className="text-sm text-gray-500">
                        {formatDate(a.appointment_date)}, {formatTime(a.appointment_time)}
                        {a.doctor_name ? ` · ${a.doctor_name}` : ""}
                        {a.reason_for_visit ? ` · ${a.reason_for_visit}` : ""}
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" icon={CheckCheck} disabled={saving === a.name} onClick={() => setStatus(a, "Completed")}>
                          Completed
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={UserX}
                          disabled={saving === a.name}
                          onClick={() => setStatus(a, "No Show")}
                          className="text-red-600 hover:bg-red-50"
                        >
                          No show
                        </Button>
                        <Button size="sm" variant="ghost" disabled={saving === a.name} onClick={() => setStatus(a, "Cancelled")}>
                          Cancelled
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {finishing && <FinishVisitDialog appointment={finishing} onClose={() => setFinishing(null)} />}
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

const REMINDED_KEY = "reminders_opened";

/** Reminders opened on this computer (appointment names). Kept for a few days' worth of appointments. */
function readReminded(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const list = JSON.parse(localStorage.getItem(REMINDED_KEY) || "[]") as unknown;
    return Array.isArray(list) ? list.filter((n): n is string => typeof n === "string") : [];
  } catch {
    return [];
  }
}

function saveReminded(list: string[]): void {
  try {
    localStorage.setItem(REMINDED_KEY, JSON.stringify(list.slice(-200)));
  } catch {
    // Not remembering is fine.
  }
}
