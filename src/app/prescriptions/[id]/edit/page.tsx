"use client";

import { useParams, useRouter } from "next/navigation";
import RequirePermission from "@/components/Guard";
import PrescriptionForm, { prescriptionPayload, prescriptionToForm, type PrescriptionFormData } from "@/components/forms/PrescriptionForm";
import { NotFoundCard, PageContainer, PageHeader, PageLoading } from "@/components/ui";
import { useToast } from "@/context/ToastContext";
import { updateDoc } from "@/lib/frappe";
import { useDocument } from "@/lib/hooks";
import { prescriptionHref, routeId } from "@/lib/links";
import type { DentalMedicine, Prescription } from "@/lib/types";

export default function EditPrescriptionPage() {
  return (
    <RequirePermission permission="add_treatments">
      <EditPrescription />
    </RequirePermission>
  );
}

function EditPrescription() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = routeId(params.id);
  const { doc, loading, notFound, error } = useDocument<Prescription>("Prescription", id);

  if (loading) return <PageLoading />;
  if (notFound || !doc) return <NotFoundCard error={error} what="Prescription" backHref="/patients" backLabel="Back to Patients" />;

  const handleSubmit = async (data: PrescriptionFormData, medicines: DentalMedicine[]) => {
    await updateDoc("Prescription", id, prescriptionPayload(data, medicines));
    toast.success("Prescription saved.");
    router.push(prescriptionHref(id));
  };

  return (
    <PageContainer narrow>
      <PageHeader title="Edit Prescription" subtitle={id} back={{ href: prescriptionHref(id), label: "Prescription" }} />
      <PrescriptionForm
        initial={prescriptionToForm(doc)}
        patientLabel={doc.patient_name}
        doctorLabel={doc.doctor_name}
        submitLabel="Save Changes"
        cancelHref={prescriptionHref(id)}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
