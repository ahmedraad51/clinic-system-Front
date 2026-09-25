"use client";

import { useRouter } from "next/navigation";
import RequirePermission from "@/components/Guard";
import PatientForm, { EMPTY_PATIENT, patientPayload, type PatientFormData } from "@/components/forms/PatientForm";
import { PageContainer, PageHeader } from "@/components/ui";
import { useToast } from "@/context/ToastContext";
import { createDoc } from "@/lib/frappe";
import { patientHref } from "@/lib/links";
import type { Patient } from "@/lib/types";

export default function NewPatientPage() {
  return (
    <RequirePermission permission="add_patients">
      <NewPatient />
    </RequirePermission>
  );
}

function NewPatient() {
  const router = useRouter();
  const toast = useToast();

  const handleSubmit = async (data: PatientFormData) => {
    const patient = await createDoc<Patient>("Patient", patientPayload(data));
    toast.success(`${patient.full_name} was added.`);
    router.push(patientHref(patient.name));
  };

  return (
    <PageContainer narrow>
      <PageHeader title="New Patient" back={{ href: "/patients", label: "Patients" }} />
      <PatientForm initial={EMPTY_PATIENT} submitLabel="Save Patient" cancelHref="/patients" onSubmit={handleSubmit} />
    </PageContainer>
  );
}
