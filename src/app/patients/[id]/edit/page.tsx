"use client";

import { useParams, useRouter } from "next/navigation";
import RequirePermission from "@/components/Guard";
import PatientForm, { patientPayload, patientToForm, type PatientFormData } from "@/components/forms/PatientForm";
import { NotFoundCard, PageContainer, PageHeader, PageLoading } from "@/components/ui";
import { useToast } from "@/context/ToastContext";
import { updateDoc } from "@/lib/frappe";
import { useDocument } from "@/lib/hooks";
import { patientHref, routeId } from "@/lib/links";
import type { Patient } from "@/lib/types";

export default function EditPatientPage() {
  return (
    <RequirePermission permission="edit_patients">
      <EditPatient />
    </RequirePermission>
  );
}

function EditPatient() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = routeId(params.id);
  const { doc: patient, loading, notFound, error } = useDocument<Patient>("Patient", id);

  if (loading) return <PageLoading />;
  if (notFound || !patient) return <NotFoundCard error={error} what="Patient" backHref="/patients" backLabel="Back to Patients" />;

  const handleSubmit = async (data: PatientFormData) => {
    await updateDoc("Patient", id, patientPayload(data));
    toast.success("Patient details saved.");
    router.push(patientHref(id));
  };

  return (
    <PageContainer narrow>
      <PageHeader title={`Edit ${patient.full_name}`} back={{ href: patientHref(id), label: patient.full_name }} />
      <PatientForm
        initial={patientToForm(patient)}
        currentName={id}
        submitLabel="Save Changes"
        cancelHref={patientHref(id)}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
