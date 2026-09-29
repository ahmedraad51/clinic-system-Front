"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RequirePermission from "@/components/Guard";
import PrescriptionForm, { emptyPrescription, prescriptionPayload, type PrescriptionFormData } from "@/components/forms/PrescriptionForm";
import { PageContainer, PageHeader, PageLoading } from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useToast } from "@/context/ToastContext";
import { createDoc } from "@/lib/frappe";
import { appointmentHref, patientHref, prescriptionHref } from "@/lib/links";
import type { DentalMedicine, Prescription } from "@/lib/types";

export default function NewPrescriptionPage() {
  return (
    <RequirePermission permission="add_treatments">
      {/* useSearchParams() needs a Suspense boundary, or the production build fails. */}
      <Suspense fallback={<PageLoading />}>
        <NewPrescription />
      </Suspense>
    </RequirePermission>
  );
}

function NewPrescription() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { doctor: myDoctor } = useSession();
  const patient = searchParams.get("patient") || "";
  const appointment = searchParams.get("appointment") || "";
  const initial: PrescriptionFormData = {
    ...emptyPrescription(),
    patient,
    appointment,
    // The visit's doctor, else the doctor using the app.
    doctor: searchParams.get("doctor") || myDoctor?.name || "",
  };
  const backHref = appointment ? appointmentHref(appointment) : patient ? patientHref(patient) : "/patients";

  const handleSubmit = async (data: PrescriptionFormData, medicines: DentalMedicine[]) => {
    const doc = await createDoc<Prescription>("Prescription", prescriptionPayload(data, medicines));
    toast.success("Prescription saved.");
    router.push(prescriptionHref(doc.name));
  };

  return (
    <PageContainer narrow>
      <PageHeader title="New Prescription" back={{ href: backHref, label: appointment ? "Appointment" : "Patient" }} />
      <PrescriptionForm initial={initial} submitLabel="Save Prescription" cancelHref={backHref} onSubmit={handleSubmit} />
    </PageContainer>
  );
}
