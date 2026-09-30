"use client";

import { useParams, useRouter } from "next/navigation";
import RequirePermission from "@/components/Guard";
import PrescriptionForm, { prescriptionPayload, prescriptionToForm, type PrescriptionFormData } from "@/components/forms/PrescriptionForm";
import { NotFoundCard, PageContainer, PageHeader, PageLoading } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { label } from "@/i18n";
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
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = routeId(params.id);
  const { doc, loading, notFound, error } = useDocument<Prescription>("Prescription", id);

  if (loading) return <PageLoading />;
  if (notFound || !doc) {
    return (
      <NotFoundCard
        error={error}
        what={label(t.enums.doctype, "Prescription")}
        backHref="/patients"
        backLabel={t.prescriptions.backToPatients}
      />
    );
  }

  const handleSubmit = async (data: PrescriptionFormData, medicines: DentalMedicine[]) => {
    await updateDoc("Prescription", id, prescriptionPayload(data, medicines));
    toast.success(t.prescriptions.saved);
    router.push(prescriptionHref(id));
  };

  return (
    <PageContainer narrow>
      <PageHeader
        title={t.prescriptions.editTitle}
        subtitle={<span dir="ltr">{id}</span>}
        back={{ href: prescriptionHref(id), label: t.prescriptions.backPrescription }}
      />
      <PrescriptionForm
        initial={prescriptionToForm(doc)}
        patientLabel={doc.patient_name}
        doctorLabel={doc.doctor_name}
        submitLabel={t.common.saveChanges}
        cancelHref={prescriptionHref(id)}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
