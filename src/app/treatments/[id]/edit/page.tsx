"use client";

import { useParams, useRouter } from "next/navigation";
import RequirePermission from "@/components/Guard";
import TreatmentForm, { treatmentPayload, treatmentToForm, type TreatmentFormData } from "@/components/forms/TreatmentForm";
import { NotFoundCard, PageContainer, PageHeader, PageLoading } from "@/components/ui";
import { useToast } from "@/context/ToastContext";
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
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = routeId(params.id);
  const { doc: plan, loading, notFound, error } = useDocument<TreatmentPlan>("Treatment Plan", id);

  if (loading) return <PageLoading />;
  if (notFound || !plan) {
    return <NotFoundCard error={error} what="Treatment plan" backHref="/treatments" backLabel="Back to Treatment Plans" />;
  }

  const handleSubmit = async (data: TreatmentFormData) => {
    await updateDoc("Treatment Plan", id, treatmentPayload(data));
    toast.success("Treatment plan saved.");
    router.push(treatmentHref(id));
  };

  return (
    <PageContainer narrow>
      <PageHeader title="Edit Treatment Plan" subtitle={id} back={{ href: treatmentHref(id), label: "Treatment plan" }} />
      <TreatmentForm
        initial={treatmentToForm(plan)}
        patientLabel={plan.patient_name}
        doctorLabel={plan.doctor_name}
        showStatus
        submitLabel="Save Changes"
        cancelHref={treatmentHref(id)}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
