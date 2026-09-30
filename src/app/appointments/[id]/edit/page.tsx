"use client";

import { CalendarClock } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import RequirePermission from "@/components/Guard";
import AppointmentForm, {
  appointmentPayload, appointmentToForm, type AppointmentFormData,
} from "@/components/forms/AppointmentForm";
import { NotFoundCard, PageContainer, PageHeader, PageLoading } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { updateDoc } from "@/lib/frappe";
import { useDocument } from "@/lib/hooks";
import { appointmentHref, routeId } from "@/lib/links";
import type { Appointment } from "@/lib/types";

export default function EditAppointmentPage() {
  return (
    <RequirePermission permission="edit_appointments">
      <EditAppointment />
    </RequirePermission>
  );
}

function EditAppointment() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();
  const id = routeId(params.id);
  const { doc: appointment, loading, notFound, error } = useDocument<Appointment>("Appointment", id);

  if (loading) return <PageLoading />;
  if (notFound || !appointment) {
    return (
      <NotFoundCard error={error} what={t.enums.doctype.Appointment} backHref="/appointments" backLabel={t.appointments.backToList} />
    );
  }

  const handleSubmit = async (data: AppointmentFormData) => {
    await updateDoc("Appointment", id, appointmentPayload(data));
    toast.success(t.appointments.saved);
    router.push(appointmentHref(id));
  };

  return (
    <PageContainer section="appointments" narrow>
      <PageHeader icon={CalendarClock} section="appointments" title={t.appointments.editTitle} subtitle={id} back={{ href: appointmentHref(id), label: t.appointments.appointment }} />
      <AppointmentForm
        initial={appointmentToForm(appointment)}
        currentName={id}
        patientLabel={appointment.patient_name}
        doctorLabel={appointment.doctor_name}
        showStatus
        submitLabel={t.common.saveChanges}
        cancelHref={appointmentHref(id)}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
