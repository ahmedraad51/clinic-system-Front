"use client";

import { useEffect, useState } from "react";
import { useRecordDialogs } from "@/components/RecordDialogs";
import { useDataVersion } from "@/lib/dataVersion";
import Link from "next/link";
import { ClipboardCheck,
  AlarmClock, Armchair, Check, CheckCheck, Clock, CreditCard, DoorOpen, FileText, FlaskConical, HeartPulse, History, Hourglass, MessageCircle,
  Plus, RefreshCw, Tv, Undo2, UserX,
  type LucideIcon,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import FinishVisitDialog from "@/components/FinishVisitDialog";
import { LAB_BADGES, labState } from "@/components/LabWorkCard";
import RequirePermission from "@/components/Guard";
import {
  Badge, Button, Card, CARD_CLASS, EmptyState, hueClass, IconTile, LinkButton, LoadError, PageContainer, PageHeader, PageLoading, Segmented, StatusBadge, statusLabel, type Hue,
} from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { label, messages, num } from "@/i18n";
import { errorMessage, getList, updateDoc } from "@/lib/frappe";
import { addDays, cx, formatDate, formatLongDate, formatTime, fromMinutes, nowDateTime, todayISO, toMinutes } from "@/lib/format";
import { useDoctors, useOpenBalances } from "@/lib/hooks";
import { appointmentHref, patientHref, treatmentHref } from "@/lib/links";
import { MEDICAL_FIELDS, medicalFlags } from "@/lib/medical";
import { fillAppointmentMessage, pickTemplate, whatsappLink } from "@/lib/whatsapp";
import { minutesSince, visitStep } from "@/lib/waitingRoom";
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
  /** The active templates; the reminders use the "24 Hours Before" one in the screen's language when there is one. */
  templates: WhatsAppTemplate[];
  /** Lab work sent and not back yet. */
  lab: TreatmentPlan[];
}

/**
 * The front desk's day: today's appointments by doctor, with one tap to confirm, complete or mark a
 * no-show, late patients highlighted, medical alerts and balances at a glance, and quick payments.
 */
function TodayBoard() {
  const { t, lang } = useI18n();
  const { can, doctor: myDoctor } = useSession();
  const openDialog = useRecordDialogs();
  // A doctor sees their own patients first; "Everyone" shows the whole clinic.
  const [everyone, setEveryone] = useState(false);
  const mine = myDoctor && !everyone ? myDoctor.name : "";
  const { settings, clinicName, countryCode, secondCurrency, owedText } = useSettings();
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
  // With two currencies, what is left on each plan, so a dollar balance shows in dollars.
  const balances = useOpenBalances(
    Object.values(board?.patients ?? {})
      .filter((row) => Number(row.total_remaining) > 0)
      .map((row) => row.name),
    showMoney && Boolean(secondCurrency),
  );
  // For each doctor's photo or drawing above their patients.
  const doctors = useDoctors();

  // A dialog saved something: load again.
  const saved = useDataVersion();
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const appointments = await getList<Appointment>(
          "Appointment",
          [
            "name", "patient", "patient_name", "doctor", "doctor_name", "appointment_time", "duration_minutes",
            "status", "reason_for_visit", "arrived_at", "in_chair_at",
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
          getList<WhatsAppTemplate>("WhatsApp Template", ["name", "template_name", "trigger", "message", "language"], {
            filters: [["is_active", "=", 1]],
            limit: 0,
          }).catch(() => [] as WhatsAppTemplate[]),
        ]);
        const lab = await getList<TreatmentPlan>(
          "Treatment Plan",
          ["name", "patient", "patient_name", "doctor", "treatment_type", "tooth_number", "lab_name", "lab_sent_date", "lab_due_date", "lab_received_date"],
          { filters: [["lab_sent_date", "is", "set"], ["lab_received_date", "is", "not set"]], orderBy: "lab_due_date asc", limit: 0 },
        ).catch(() => [] as TreatmentPlan[]);
        const ids = [...new Set([...appointments, ...tomorrow].map((a) => a.patient))];
        const rows = ids.length
          ? await getList<Patient>("Patient", ["name", "phone_number", "total_remaining", "gender", "age", ...MEDICAL_FIELDS], {
              filters: [["name", "in", ids]],
              limit: 0,
            })
          : [];
        if (!cancelled) {
          setBoard({ date: today, appointments, earlier, tomorrow, templates, lab, patients: Object.fromEntries(rows.map((p) => [p.name, p])) });
          setError("");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(errorMessage(err, messages().today.loadFailed));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [today, version, saved]);

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
      toast.success(t.today.statusChanged(appointment.patient_name || appointment.patient, statusLabel("appointment", status)));
      if (status === "Completed" && can("edit_treatments")) {
        setFinishing({ ...appointment, appointment_date: appointment.appointment_date || today });
      }
    } catch (err) {
      toast.error(errorMessage(err, t.today.statusFailed));
    } finally {
      setSaving(null);
    }
  };

  // The waiting room steps: arrived at the desk, then in the chair (and back one step if tapped by mistake).
  const setStep = async (appointment: Appointment, change: Pick<Appointment, "arrived_at" | "in_chair_at">, step: string) => {
    setSaving(appointment.name);
    try {
      await updateDoc("Appointment", appointment.name, change);
      setBoard(
        (prev) => prev && { ...prev, appointments: prev.appointments.map((a) => (a.name === appointment.name ? { ...a, ...change } : a)) },
      );
      toast.success(t.today.stepSaved(appointment.patient_name || appointment.patient, step));
    } catch (err) {
      toast.error(errorMessage(err, t.today.statusFailed));
    } finally {
      setSaving(null);
    }
  };

  if (!board && !error) return <PageLoading />;

  const appointments = (board?.appointments ?? []).filter((a) => !mine || a.doctor === mine);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const open = (a: Appointment) => a.status === "Scheduled" || a.status === "Confirmed";
  // Someone already in the waiting room is not late.
  const minutesLate = (a: Appointment) => (open(a) && !a.arrived_at ? nowMinutes - toMinutes(a.appointment_time) : 0);
  const isLate = (a: Appointment) => minutesLate(a) >= LATE_AFTER;

  const counts = {
    toCome: appointments.filter((a) => open(a) && !a.arrived_at).length,
    waiting: appointments.filter((a) => visitStep(a) === "waiting").length,
    inChair: appointments.filter((a) => visitStep(a) === "in_chair").length,
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
  // The "24 Hours Before" template in the screen's language when there is one.
  const template = pickTemplate(board?.templates ?? [], "24 Hours Before", lang);
  // Dates and times in the template's own language (the built-in message is in the screen's language).
  const reminderText = (a: Appointment) =>
    fillAppointmentMessage(template?.message ?? t.today.defaultReminder, template ? template.language : lang, lang, {
      patient_name: a.patient_name || a.patient,
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time,
      doctor_name: a.doctor_name || "",
      clinic_name: clinicName,
    });
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
    <PageContainer section="appointments">
      <PageHeader icon={ClipboardCheck} section="appointments"
        title={mine ? t.today.titleMine : t.today.title}
        subtitle={formatLongDate(today)}
        actions={
          <>
            {myDoctor && (
              <Segmented
                label={t.today.whose}
                value={everyone ? "everyone" : "mine"}
                onChange={(next) => setEveryone(next === "everyone")}
                options={[
                  { value: "mine", label: t.dashboard.mine },
                  { value: "everyone", label: t.dashboard.everyone },
                ]}
              />
            )}
            {showMoney && (
              <LinkButton href="/payments/day" variant="secondary" icon={FileText}>
                {t.today.dayReport}
              </LinkButton>
            )}
            <LinkButton href="/waiting-room" variant="secondary" icon={Tv}>
              {t.today.waitingRoomScreen}
            </LinkButton>
            <Button variant="secondary" icon={RefreshCw} onClick={() => setVersion((v) => v + 1)}>
              {t.common.refresh}
            </Button>
            {can("add_appointments") && (
              <Button icon={Plus} onClick={() => openDialog({ kind: "newAppointment", prefill: { appointment_date: today, appointment_time: walkInTime } })}>
                {t.today.walkIn}
              </Button>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <Count label={t.today.counts.toCome} value={counts.toCome} icon={Clock} hue="appointments" />
            <Count label={t.today.counts.waiting} value={counts.waiting} icon={Hourglass} hue={counts.waiting ? "yellow" : "gray"} />
            <Count label={t.today.counts.inChair} value={counts.inChair} icon={Armchair} hue={counts.inChair ? "blue" : "gray"} />
            <Count label={t.today.counts.late} value={counts.late} icon={AlarmClock} hue={counts.late ? "yellow" : "gray"} />
            <Count label={t.today.counts.completed} value={counts.done} icon={CheckCheck} hue="green" />
            <Count label={t.today.counts.noShow} value={counts.missed} icon={UserX} hue={counts.missed ? "red" : "gray"} />
          </div>

          {groups.length === 0 ? (
            <Card>
              <EmptyState
                icon={Clock}
                title={mine ? t.today.noneMine : t.today.none}
                text={t.today.noneText}
                action={
                  <LinkButton href="/appointments?view=week" variant="secondary">
                    {t.today.openWeek}
                  </LinkButton>
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              {groups.map((group) => {
                const doctor = doctors.find((d) => d.name === group.doctor);
                return (
                <Card
                  key={group.doctor}
                  title={
                    <span className="flex items-center gap-3">
                      <Avatar name={group.name} gender={doctor?.gender} photo={doctor?.photo} role="doctor" size={40} />
                      {group.name}
                    </span>
                  }
                  section="appointments"
                  flush
                  actions={
                    <span className="text-xs text-gray-500">
                      {t.today.groupSummary(group.items.filter(open).length, group.items.length)}
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
                      const step = visitStep(a);
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
                            <div className="w-[5.5rem] shrink-0 pt-1">
                              <p className="text-base font-semibold text-gray-800 whitespace-nowrap">{formatTime(a.appointment_time)}</p>
                              {late && (
                                <p className="text-xs font-semibold text-amber-700">{t.today.minutesLate(minutesLate(a))}</p>
                              )}
                            </div>
                            <Avatar name={a.patient_name || a.patient} gender={patient?.gender} age={patient?.age} size={40} className="-ms-1" />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={patientHref(a.patient)}
                                  className="text-base font-semibold text-gray-800 hover:text-primary-600"
                                >
                                  {a.patient_name || a.patient}
                                </Link>
                                {step === "waiting" ? (
                                  <Badge tone="yellow">{t.today.waitingFor(minutesSince(a.arrived_at, now))}</Badge>
                                ) : step === "in_chair" ? (
                                  <Badge tone="blue">{t.today.inChairSince(formatTime((a.in_chair_at ?? "").slice(11, 16)))}</Badge>
                                ) : (
                                  <StatusBadge kind="appointment" status={a.status} />
                                )}
                                {urgent.length > 0 && (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium"
                                    title={urgent.map((f) => t.today.flagDetail(f.label, f.detail)).join(t.common.dot)}
                                  >
                                    <HeartPulse size={13} />
                                    {urgent.map((f) => f.label).join(t.today.listSeparator)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 mt-0.5">
                                <Link href={appointmentHref(a.name)} className="hover:text-primary-600">
                                  {a.reason_for_visit || t.today.appointment}
                                </Link>
                                {t.common.dot}
                                {t.common.minutes(Number(a.duration_minutes) || 30)}
                                {showMoney && owes > 0 && (
                                  <span className="text-red-600 font-medium">
                                    {t.common.dot}
                                    {t.today.owes(owedText(owes, balances[a.patient]))}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {(canEdit || (showMoney && can("add_payments"))) && (
                            <div className="flex flex-wrap gap-2 sm:ps-[9.25rem]">
                              {canEdit && a.status === "Scheduled" && !a.arrived_at && (
                                <Button size="sm" variant="secondary" icon={Check} loading={busy} onClick={() => setStatus(a, "Confirmed")}>
                                  {t.today.confirm}
                                </Button>
                              )}
                              {canEdit && open(a) && !a.arrived_at && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  icon={DoorOpen}
                                  disabled={busy}
                                  onClick={() => setStep(a, { arrived_at: nowDateTime() }, t.today.stepArrived)}
                                >
                                  {t.today.arrived}
                                </Button>
                              )}
                              {canEdit && step === "waiting" && (
                                <Button size="sm" icon={Armchair} disabled={busy} onClick={() => setStep(a, { in_chair_at: nowDateTime() }, t.today.stepInChair)}>
                                  {t.today.inChair}
                                </Button>
                              )}
                              {canEdit && open(a) && (
                                <Button size="sm" variant="success" icon={CheckCheck} disabled={busy} onClick={() => setStatus(a, "Completed")}>
                                  {t.today.completed}
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
                                  {t.today.noShow}
                                </Button>
                              )}
                              {canEdit && step && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon={Undo2}
                                  disabled={busy}
                                  onClick={() =>
                                    setStep(a, step === "in_chair" ? { in_chair_at: null } : { arrived_at: null }, t.today.stepUndone)
                                  }
                                >
                                  {t.today.undoStep}
                                </Button>
                              )}
                              {canEdit && (a.status === "Completed" || a.status === "No Show") && (
                                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setStatus(a, "Confirmed")}>
                                  {t.today.undo}
                                </Button>
                              )}
                              {can("add_payments") && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  icon={CreditCard}
                                  onClick={() => openDialog({ kind: "newPayment", prefill: { patient: a.patient }, patientName: a.patient_name })}
                                >
                                  {t.today.addPayment}
                                </Button>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Card>
                );
              })}
            </div>
          )}
          {settings.enable_whatsapp !== 0 && tomorrowList.length > 0 && (
            <Card
              title={t.today.remindersTitle(tomorrowList.filter((a) => !reminded.includes(a.name)).length)}
              icon={MessageCircle}
              section="whatsapp"
              flush
              actions={<span className="text-xs text-gray-500">{template ? template.template_name : t.today.defaultMessage}</span>}
            >
              <ul className="divide-y divide-gray-100">
                {tomorrowList.map((a) => {
                  const link = whatsappLink(board?.patients[a.patient]?.phone_number, reminderText(a), countryCode);
                  const done = reminded.includes(a.name);
                  return (
                    <li key={a.name} className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="w-[5.5rem] shrink-0 font-semibold text-gray-800 whitespace-nowrap">{formatTime(a.appointment_time)}</span>
                      <div className="min-w-[10rem] flex-1">
                        <Link href={appointmentHref(a.name)} className="font-medium text-gray-800 hover:text-primary-600">
                          {a.patient_name || a.patient}
                        </Link>
                        <p className="text-sm text-gray-500">{a.doctor_name}</p>
                      </div>
                      {done ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
                          <Check size={15} />
                          {t.today.reminderOpened}
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
                          {t.today.sendReminder}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500">{t.today.noPhone}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {can("view_treatments") && labDue.length > 0 && (
            <Card title={t.today.labTitle(labDue.length)} icon={FlaskConical} section="treatments" flush actions={<span className="text-xs text-gray-500">{t.today.labHint}</span>}>
              <ul className="divide-y divide-gray-100">
                {labDue.map((p) => {
                  const state = labState(p, today);
                  return (
                    <li key={p.name}>
                      <Link href={treatmentHref(p.name)} className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 hover:bg-gray-50">
                        <span className="min-w-[10rem] flex-1">
                          <span className="block font-medium text-gray-800">{p.patient_name || p.patient}</span>
                          <span className="block text-sm text-gray-500">
                            {label(t.enums.treatmentType, p.treatment_type)}
                            {p.tooth_number ? `${t.common.dot}${t.today.tooth(p.tooth_number)}` : ""}
                            {p.lab_name ? `${t.common.dot}${p.lab_name}` : ""}
                          </span>
                        </span>
                        <span className="text-sm text-gray-600 whitespace-nowrap">
                          {p.lab_due_date ? t.today.labDue(formatDate(p.lab_due_date)) : t.today.noDueDate}
                        </span>
                        <Badge tone={LAB_BADGES[state].tone}>{t.today.labState[state]}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {earlierOpen.length > 0 && (
            <Card
              title={t.today.earlierTitle(earlierOpen.length)}
              icon={History}
              section="yellow"
              flush
              actions={<span className="text-xs text-gray-500">{t.today.earlierHint}</span>}
            >
              <ul className="divide-y divide-gray-100">
                {earlierOpen.map((a) => (
                  <li key={a.name} className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="min-w-[10rem] flex-1">
                      <Link href={appointmentHref(a.name)} className="font-medium text-gray-800 hover:text-primary-600">
                        {a.patient_name || a.patient}
                      </Link>
                      <p className="text-sm text-gray-500">
                        {t.today.dateTime(formatDate(a.appointment_date), formatTime(a.appointment_time))}
                        {a.doctor_name ? `${t.common.dot}${a.doctor_name}` : ""}
                        {a.reason_for_visit ? `${t.common.dot}${a.reason_for_visit}` : ""}
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" icon={CheckCheck} disabled={saving === a.name} onClick={() => setStatus(a, "Completed")}>
                          {t.today.completed}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={UserX}
                          disabled={saving === a.name}
                          onClick={() => setStatus(a, "No Show")}
                          className="text-red-600 hover:bg-red-50"
                        >
                          {t.today.noShow}
                        </Button>
                        <Button size="sm" variant="ghost" disabled={saving === a.name} onClick={() => setStatus(a, "Cancelled")}>
                          {t.today.cancelled}
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

/** One of the day's counts, in its own colour (grey while it is zero and nothing needs doing). */
function Count({ label, value, icon, hue }: { label: string; value: number; icon: LucideIcon; hue: Hue }) {
  return (
    <div className={cx(hueClass(hue), CARD_CLASS, "flex items-center gap-3 px-4 py-3")}>
      <IconTile icon={icon} />
      <div>
        <p className="text-2xl font-medium text-gray-900 leading-tight">{num(value)}</p>
        <p className="text-sm text-gray-600">{label}</p>
      </div>
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
