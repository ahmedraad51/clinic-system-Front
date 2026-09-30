"use client";

import { useEffect, useState } from "react";
import { useRecordDialogs } from "@/components/RecordDialogs";
import { useDataVersion } from "@/lib/dataVersion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CalendarDays, Clock, ListChecks, MessageCircle, Pencil, Pill, Printer, Stethoscope, Trash2 } from "lucide-react";
import Avatar from "@/components/Avatar";
import FinishVisitDialog from "@/components/FinishVisitDialog";
import RecordHistory from "@/components/RecordHistory";
import SendWhatsAppDialog from "@/components/SendWhatsAppDialog";
import { useSettings } from "@/context/SettingsContext";
import RequirePermission from "@/components/Guard";
import MedicalAlerts from "@/components/MedicalAlerts";
import {
  Button, Card, DetailLayout, LinkButton, NotFoundCard, PageContainer, PageHeader, ProfileCard, RecordLoading, StatusBadge, statusLabel,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useToast } from "@/context/ToastContext";
import { deleteDoc, errorMessage, getList, updateDoc } from "@/lib/frappe";
import { cx, formatDate, formatDateTime, formatTime } from "@/lib/format";
import { useDocument, usePatientMedical } from "@/lib/hooks";
import { appointmentHref, patientHref, prescriptionHref, routeId } from "@/lib/links";
import { APPOINTMENT_STATUSES, type Appointment, type AppointmentStatus, type Prescription, type WhatsAppLog } from "@/lib/types";

export default function AppointmentDetailPage() {
  return (
    <RequirePermission permission="view_appointments">
      <AppointmentDetail />
    </RequirePermission>
  );
}

function AppointmentDetail() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();
  const openDialog = useRecordDialogs();
  const { can } = useSession();
  const id = routeId(params.id);
  const { doc: appointment, loading, notFound, error, reload } = useDocument<Appointment>("Appointment", id);
  const medical = usePatientMedical(appointment?.patient);
  const [updating, setUpdating] = useState<AppointmentStatus | null>(null);
  // After "Completed": ask what was done.
  const [finishing, setFinishing] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const { settings } = useSettings();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [logs, setLogs] = useState<{ id: string; rows: WhatsAppLog[] }>({ id: "", rows: [] });
  const [prescriptions, setPrescriptions] = useState<{ id: string; rows: Prescription[] }>({ id: "", rows: [] });
  const showPrescriptions = can("view_treatments");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<WhatsAppLog>(
          "WhatsApp Log",
          ["name", "status", "sent_at", "message", "error_message"],
          { filters: [["appointment", "=", id]], orderBy: "sent_at desc", limit: 20 },
        );
        if (!cancelled) setLogs({ id, rows });
      } catch (err) {
        // Not every role can read the WhatsApp log; the page works without it.
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // The prescriptions written at this visit.
  // A dialog saved something: load again.
  const saved = useDataVersion();
  useEffect(() => {
    if (!showPrescriptions) return;
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<Prescription>("Prescription", ["name", "prescription_date", "doctor_name", "summary"], {
          filters: [["appointment", "=", id]],
          orderBy: "prescription_date desc, name desc",
          limit: 20,
        });
        if (!cancelled) setPrescriptions({ id, rows });
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, showPrescriptions, saved]);

  if (loading) return <RecordLoading />;
  if (notFound || !appointment) {
    return (
      <NotFoundCard error={error} what={t.enums.doctype.Appointment} backHref="/appointments" backLabel={t.appointments.backToList} />
    );
  }

  const canEdit = can("edit_appointments");
  const messages = logs.id === id ? logs.rows : [];
  const written = prescriptions.id === id ? prescriptions.rows : [];
  const newPrescriptionHref = `/prescriptions/new?${new URLSearchParams({
    patient: appointment.patient,
    appointment: id,
    ...(appointment.doctor ? { doctor: appointment.doctor } : {}),
  }).toString()}`;
  const canMessage = settings.enable_whatsapp !== 0 && Boolean(medical?.phone_number);

  const changeStatus = async (status: AppointmentStatus) => {
    setUpdating(status);
    try {
      await updateDoc("Appointment", id, { status });
      toast.success(t.appointments.markedAs(statusLabel("appointment", status)));
      reload();
      if (status === "Completed" && can("edit_treatments")) setFinishing(true);
    } catch (err) {
      toast.error(errorMessage(err, t.appointments.statusFailed));
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDoc("Appointment", id);
      toast.success(t.appointments.deleted);
      router.push("/appointments");
    } catch (err) {
      toast.error(errorMessage(err, t.appointments.deleteFailed));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <PageContainer section="appointments">
      <PageHeader back={{ href: "/appointments", label: t.appointments.title }} />
      {/* Above both columns, so it is the first thing on a tablet or phone too. */}
      <MedicalAlerts patient={medical} />

      <DetailLayout
        aside={
          <ProfileCard
            titleLevel={1}
            avatar={<Avatar name={appointment.patient_name || appointment.patient} size={96} />}
            title={appointment.patient_name || appointment.patient}
            subtitle={<span dir="ltr">{id}</span>}
            badges={<StatusBadge kind="appointment" status={appointment.status} />}
            stats={[
              { icon: CalendarDays, value: formatDate(appointment.appointment_date), label: t.common.date, hue: "blue" },
              { icon: Clock, value: formatTime(appointment.appointment_time), label: t.common.time, hue: "blue" },
            ]}
            detailsTitle={t.common.details}
            details={[
              {
                label: t.common.patient,
                value: (
                  <Link href={patientHref(appointment.patient)} className="text-primary-600 hover:underline">
                    {appointment.patient_name || appointment.patient}
                  </Link>
                ),
              },
              { label: t.common.doctor, value: appointment.doctor_name || appointment.doctor },
              {
                label: t.appointments.duration,
                value: appointment.duration_minutes ? t.appointmentForm.minutes(Number(appointment.duration_minutes)) : "",
              },
              { label: t.appointments.reason, value: appointment.reason_for_visit },
              { label: t.common.notes, value: appointment.notes },
            ]}
            actions={
              <>
            {can("add_treatments") && (
              <Button
                variant="secondary"
                icon={Stethoscope}
                onClick={() =>
                  openDialog({ kind: "newTreatment", prefill: { patient: appointment.patient }, patientName: appointment.patient_name })
                }
              >
                {t.appointments.newTreatment}
              </Button>
            )}
            {canEdit && (
              <Button icon={Pencil} onClick={() => openDialog({ kind: "editAppointment", id })}>
                {t.common.edit}
              </Button>
            )}
            {canEdit && (
              <Button
                variant="ghost"
                icon={Trash2}
                onClick={() => setConfirmDelete(true)}
                aria-label={t.appointments.deleteAppointment}
                title={t.appointments.deleteAppointment}
                className="text-red-600 hover:bg-red-50 px-3"
              />
            )}
                <LinkButton href={`${appointmentHref(id)}/card`} variant="secondary" icon={Printer}>
                  {t.appointments.printCard}
                </LinkButton>
              </>
            }
          />
        }
      >

      {canEdit && (
        <Card title={t.appointments.updateStatus} icon={ListChecks}>
          <div className="flex flex-wrap gap-2">
            {APPOINTMENT_STATUSES.map((status) => {
              const current = appointment.status === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => changeStatus(status)}
                  disabled={updating !== null || current}
                  className={cx(
                    "min-h-11 px-4 py-2 rounded-xl text-sm font-medium transition disabled:cursor-not-allowed",
                    current ? "bg-brand text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50",
                  )}
                >
                  {updating === status ? t.common.saving : statusLabel("appointment", status)}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {(messages.length > 0 || canMessage) && (
        <Card
          title={t.appointments.whatsappMessages}
          icon={MessageCircle}
          actions={
            canMessage && (
              <Button variant="secondary" size="sm" icon={MessageCircle} onClick={() => setMessaging(true)}>
                {t.appointments.sendMessage}
              </Button>
            )
          }
        >
          {messages.length === 0 && <p className="text-sm text-gray-500">{t.appointments.noMessages}</p>}
          <ul className="space-y-3">
            {messages.map((log) => (
              <li key={log.name} className="flex gap-3">
                <span className="w-8 h-8 shrink-0 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                  <MessageCircle size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge kind="whatsapp" status={log.status} />
                    <span className="text-xs text-gray-500">{formatDateTime(log.sent_at)}</span>
                  </div>
                  {log.message && <p className="text-sm text-gray-600 mt-1">{log.message}</p>}
                  {log.error_message && <p className="text-xs text-red-600 mt-1">{log.error_message}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {showPrescriptions && (
        <Card
          title={t.appointments.prescriptions}
          icon={Pill}
          actions={
            can("add_treatments") && (
              <LinkButton href={newPrescriptionHref} variant="secondary" size="sm" icon={Pill}>
                {t.appointments.writePrescription}
              </LinkButton>
            )
          }
        >
          {written.length === 0 ? (
            <p className="text-sm text-gray-500">{t.appointments.noPrescription}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {written.map((rx) => (
                <li key={rx.name}>
                  <Link href={prescriptionHref(rx.name)} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 min-h-11 hover:bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-800">{formatDate(rx.prescription_date)}</span>
                    <span className="text-sm text-gray-700 flex-1 min-w-[10rem]">{rx.summary || rx.name}</span>
                    {rx.doctor_name && <span className="text-xs text-gray-500">{rx.doctor_name}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <RecordHistory doctype="Appointment" name={appointment.name} changedAt={appointment.modified} />

      <ConfirmDialog
        open={confirmDelete}
        title={t.appointments.deleteTitle}
        message={<p>{t.appointments.deleteText(formatDate(appointment.appointment_date), formatTime(appointment.appointment_time))}</p>}
        confirmLabel={t.appointments.deleteConfirm}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      {messaging && medical?.phone_number && (
        <SendWhatsAppDialog appointment={appointment} phone={medical.phone_number} onClose={() => setMessaging(false)} />
      )}
      {finishing && <FinishVisitDialog appointment={appointment} onClose={() => setFinishing(false)} />}
      </DetailLayout>
    </PageContainer>
  );
}
