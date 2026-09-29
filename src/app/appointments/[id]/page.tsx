"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ClipboardList, ListChecks, MessageCircle, Pencil, Pill, Printer, Stethoscope, Trash2 } from "lucide-react";
import FinishVisitDialog from "@/components/FinishVisitDialog";
import RecordHistory from "@/components/RecordHistory";
import SendWhatsAppDialog from "@/components/SendWhatsAppDialog";
import { useSettings } from "@/context/SettingsContext";
import RequirePermission from "@/components/Guard";
import MedicalAlerts from "@/components/MedicalAlerts";
import {
  Button, Card, DetailList, DetailRow, LinkButton, NotFoundCard, PageContainer, PageHeader, RecordLoading, StatusBadge,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
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
  }, [id, showPrescriptions]);

  if (loading) return <RecordLoading />;
  if (notFound || !appointment) {
    return <NotFoundCard error={error} what="Appointment" backHref="/appointments" backLabel="Back to Appointments" />;
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
      toast.success(`Marked as ${status}.`);
      reload();
      if (status === "Completed" && can("edit_treatments")) setFinishing(true);
    } catch (err) {
      toast.error(errorMessage(err, "Could not change the status."));
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDoc("Appointment", id);
      toast.success("Appointment deleted.");
      router.push("/appointments");
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete the appointment."));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <PageContainer narrow>
      <PageHeader
        title={appointment.patient_name || appointment.patient}
        subtitle={`${formatDate(appointment.appointment_date)} at ${formatTime(appointment.appointment_time)} · ${id}`}
        badge={<StatusBadge kind="appointment" status={appointment.status} />}
        back={{ href: "/appointments", label: "Appointments" }}
        actions={
          <>
            {can("add_treatments") && (
              <LinkButton
                href={`/treatments/new?patient=${encodeURIComponent(appointment.patient)}`}
                variant="secondary"
                icon={Stethoscope}
              >
                New Treatment
              </LinkButton>
            )}
            {canEdit && (
              <LinkButton href={`${appointmentHref(id)}/edit`} icon={Pencil}>
                Edit
              </LinkButton>
            )}
            {canEdit && (
              <Button
                variant="ghost"
                icon={Trash2}
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete appointment"
                title="Delete appointment"
                className="text-red-600 hover:bg-red-50 px-3"
              />
            )}
          </>
        }
      />

      <MedicalAlerts patient={medical} />

      <Card
        title="Details"
        icon={ClipboardList}
        actions={
          <LinkButton href={`${appointmentHref(id)}/card`} variant="secondary" size="sm" icon={Printer}>
            Print Card
          </LinkButton>
        }
      >
        <DetailList>
          <DetailRow label="Patient">
            <Link href={patientHref(appointment.patient)} className="text-primary-600 hover:underline">
              {appointment.patient_name || appointment.patient}
            </Link>
          </DetailRow>
          <DetailRow label="Doctor">{appointment.doctor_name || appointment.doctor}</DetailRow>
          <DetailRow label="Date">{formatDate(appointment.appointment_date)}</DetailRow>
          <DetailRow label="Time">{formatTime(appointment.appointment_time)}</DetailRow>
          <DetailRow label="Duration">
            {appointment.duration_minutes ? `${appointment.duration_minutes} minutes` : ""}
          </DetailRow>
          <DetailRow label="Reason">{appointment.reason_for_visit}</DetailRow>
          <DetailRow label="Notes">{appointment.notes}</DetailRow>
        </DetailList>
      </Card>

      {canEdit && (
        <Card title="Update Status" icon={ListChecks}>
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
                    current ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50",
                  )}
                >
                  {updating === status ? "Saving..." : status}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {(messages.length > 0 || canMessage) && (
        <Card
          title="WhatsApp Messages"
          icon={MessageCircle}
          actions={
            canMessage && (
              <Button variant="secondary" size="sm" icon={MessageCircle} onClick={() => setMessaging(true)}>
                Send Message
              </Button>
            )
          }
        >
          {messages.length === 0 && <p className="text-sm text-gray-500">No messages for this appointment yet.</p>}
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
          title="Prescriptions"
          icon={Pill}
          actions={
            can("add_treatments") && (
              <LinkButton href={newPrescriptionHref} variant="secondary" size="sm" icon={Pill}>
                Write Prescription
              </LinkButton>
            )
          }
        >
          {written.length === 0 ? (
            <p className="text-sm text-gray-500">No prescription written at this visit.</p>
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
        title="Delete this appointment?"
        message={
          <p>
            The appointment on {formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_time)} will
            be removed for good. To keep a record, set its status to Cancelled instead.
          </p>
        }
        confirmLabel="Delete Appointment"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      {messaging && medical?.phone_number && (
        <SendWhatsAppDialog appointment={appointment} phone={medical.phone_number} onClose={() => setMessaging(false)} />
      )}
      {finishing && <FinishVisitDialog appointment={appointment} onClose={() => setFinishing(false)} />}
    </PageContainer>
  );
}
