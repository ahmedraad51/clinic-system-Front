"use client";

import { Stethoscope } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import RequirePermission from "@/components/Guard";
import TreatmentForm, { treatmentPayload, treatmentToForm, type TreatmentFormData } from "@/components/forms/TreatmentForm";
import { NotFoundCard, PageContainer, PageHeader, PageLoading } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { messages } from "@/i18n";
import { updateDoc } from "@/lib/frappe";
import { useDocument } from "@/lib/hooks";
import { routeId, treatmentHref } from "@/lib/links";
import type { TreatmentPlan } from "@/lib/types";

export default function EditTreatmentPage() {
  return (
    <RequirePermission permission="edit_treatments">
      <EditTreatment />
    </RequirePermission>
  );
}

function EditTreatment() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = routeId(params.id);
  const { doc: plan, loading, notFound, error } = useDocument<TreatmentPlan>("Treatment Plan", id);

  if (loading) return <PageLoading />;
  if (notFound || !plan) {
    return <NotFoundCard error={error} what={t.treatments.what} backHref="/treatments" backLabel={t.treatments.backToList} />;
  }

  const handleSubmit = async (data: TreatmentFormData) => {
    await updateDoc("Treatment Plan", id, treatmentPayload(data));
    toast.success(messages().treatments.saved);
    router.push(treatmentHref(id));
  };

  return (
    <PageContainer section="treatments" narrow>
      <PageHeader icon={Stethoscope} section="treatments" title={t.treatments.editTitle} subtitle={id} back={{ href: treatmentHref(id), label: t.treatments.what }} />
      <TreatmentForm
        initial={treatmentToForm(plan)}
        patientLabel={plan.patient_name}
        doctorLabel={plan.doctor_name}
        showStatus
        submitLabel={t.common.saveChanges}
        cancelHref={treatmentHref(id)}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
