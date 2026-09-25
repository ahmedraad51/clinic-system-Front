"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { MessageCircle, Pencil, Stethoscope, Trash2 } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Button, Card, DetailList, DetailRow, LinkButton, NotFoundCard, PageContainer, PageHeader, PageLoading, StatusBadge,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useSession } from "@/context/SessionContext";
import { useToast } from "@/context/ToastContext";
import { deleteDoc, errorMessage, getList, updateDoc } from "@/lib/frappe";
import { cx, formatDate, formatDateTime, formatTime } from "@/lib/format";
import { useDocument } from "@/lib/hooks";
import { appointmentHref, patientHref, routeId } from "@/lib/links";
import { APPOINTMENT_STATUSES, type Appointment, type AppointmentStatus, type WhatsAppLog } from "@/lib/types";

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
  const [updating, setUpdating] = useState<AppointmentStatus | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [logs, setLogs] = useState<{ id: string; rows: WhatsAppLog[] }>({ id: "", rows: [] });

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

  if (loading) return <PageLoading />;
  if (notFound || !appointment) {
    return <NotFoundCard error={error} what="Appointment" backHref="/appointments" backLabel="Back to Appointments" />;
  }

  const canEdit = can("edit_appointments");
  const messages = logs.id === id ? logs.rows : [];

  const changeStatus = async (status: AppointmentStatus) => {
    setUpdating(status);
    try {
      await updateDoc("Appointment", id, { status });
      toast.success(`Marked as ${status}.`);
      reload();
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
              <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)} className="text-red-600 hover:bg-red-50">
                Delete
              </Button>
            )}
          </>
        }
      />

      <Card title="Details">
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
        <Card title="Update Status">
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

      {messages.length > 0 && (
        <Card title="WhatsApp Messages">
          <ul className="space-y-3">
            {messages.map((log) => (
              <li key={log.name} className="flex gap-3">
                <span className="w-8 h-8 shrink-0 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                  <MessageCircle size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge kind="whatsapp" status={log.status} />
                    <span className="text-xs text-gray-400">{formatDateTime(log.sent_at)}</span>
                  </div>
                  {log.message && <p className="text-sm text-gray-600 mt-1">{log.message}</p>}
                  {log.error_message && <p className="text-xs text-red-600 mt-1">{log.error_message}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

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
    </PageContainer>
  );
}
