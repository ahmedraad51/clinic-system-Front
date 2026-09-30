"use client";

import { useRouter } from "next/navigation";
import RequirePermission from "@/components/Guard";
import PatientForm, { EMPTY_PATIENT, patientPayload, type PatientFormData } from "@/components/forms/PatientForm";
import { PageContainer, PageHeader } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
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
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();

  const handleSubmit = async (data: PatientFormData) => {
    const patient = await createDoc<Patient>("Patient", patientPayload(data));
    toast.success(t.patients.added(patient.full_name));
    router.push(patientHref(patient.name));
  };

  return (
    <PageContainer narrow>
      <PageHeader title={t.patients.newTitle} back={{ href: "/patients", label: t.patients.title }} />
      <PatientForm initial={EMPTY_PATIENT} submitLabel={t.patients.savePatient} cancelHref="/patients" onSubmit={handleSubmit} />
    </PageContainer>
  );
}
