"use client";

import { useParams, useRouter } from "next/navigation";
import RequirePermission from "@/components/Guard";
import AppointmentForm, {
  appointmentPayload, appointmentToForm, type AppointmentFormData,
} from "@/components/forms/AppointmentForm";
import { NotFoundCard, PageContainer, PageHeader, PageLoading } from "@/components/ui";
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
  const id = routeId(params.id);
  const { doc: appointment, loading, notFound, error } = useDocument<Appointment>("Appointment", id);

  if (loading) return <PageLoading />;
  if (notFound || !appointment) {
    return <NotFoundCard error={error} what="Appointment" backHref="/appointments" backLabel="Back to Appointments" />;
  }

  const handleSubmit = async (data: AppointmentFormData) => {
    await updateDoc("Appointment", id, appointmentPayload(data));
    toast.success("Appointment saved.");
    router.push(appointmentHref(id));
  };

  return (
    <PageContainer narrow>
      <PageHeader title="Edit Appointment" subtitle={id} back={{ href: appointmentHref(id), label: "Appointment" }} />
      <AppointmentForm
        initial={appointmentToForm(appointment)}
        currentName={id}
        patientLabel={appointment.patient_name}
        doctorLabel={appointment.doctor_name}
        showStatus
        submitLabel="Save Changes"
        cancelHref={appointmentHref(id)}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
