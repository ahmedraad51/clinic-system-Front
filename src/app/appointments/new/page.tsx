"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RequirePermission from "@/components/Guard";
import AppointmentForm, {
  EMPTY_APPOINTMENT, appointmentPayload, type AppointmentFormData,
} from "@/components/forms/AppointmentForm";
import { PageContainer, PageHeader, PageLoading } from "@/components/ui";
import { useToast } from "@/context/ToastContext";
import { createDoc } from "@/lib/frappe";
import { appointmentHref } from "@/lib/links";
import type { Appointment } from "@/lib/types";

export default function NewAppointmentPage() {
  return (
    <RequirePermission permission="add_appointments">
      <Suspense fallback={<PageLoading />}>
        <NewAppointment />
      </Suspense>
    </RequirePermission>
  );
}

function NewAppointment() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const initial: AppointmentFormData = {
    ...EMPTY_APPOINTMENT,
    patient: searchParams.get("patient") || "",
    appointment_date: searchParams.get("date") || "",
  };

  const handleSubmit = async (data: AppointmentFormData) => {
    const appointment = await createDoc<Appointment>("Appointment", appointmentPayload(data));
    toast.success("Appointment booked.");
    router.push(appointmentHref(appointment.name));
  };

  return (
    <PageContainer narrow>
      <PageHeader title="New Appointment" back={{ href: "/appointments", label: "Appointments" }} />
      <AppointmentForm
        initial={initial}
        submitLabel="Book Appointment"
        cancelHref="/appointments"
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
