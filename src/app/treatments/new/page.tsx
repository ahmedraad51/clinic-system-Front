"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RequirePermission from "@/components/Guard";
import TreatmentForm, { EMPTY_TREATMENT, treatmentPayload, type TreatmentFormData } from "@/components/forms/TreatmentForm";
import { PageContainer, PageHeader, PageLoading } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { messages } from "@/i18n";
import { createDoc } from "@/lib/frappe";
import { treatmentHref } from "@/lib/links";
import type { TreatmentPlan } from "@/lib/types";

export default function NewTreatmentPage() {
  return (
    <RequirePermission permission="add_treatments">
      <Suspense fallback={<PageLoading />}>
        <NewTreatment />
      </Suspense>
    </RequirePermission>
  );
}

function NewTreatment() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const initial: TreatmentFormData = {
    ...EMPTY_TREATMENT,
    patient: searchParams.get("patient") || "",
    tooth_number: searchParams.get("tooth") || "",
  };

  const handleSubmit = async (data: TreatmentFormData) => {
    // New plans always start as Planned; the status changes on the plan page.
    const plan = await createDoc<TreatmentPlan>("Treatment Plan", { ...treatmentPayload(data), status: "Planned" });
    toast.success(messages().treatments.created);
    router.push(treatmentHref(plan.name));
  };

  return (
    <PageContainer narrow>
      <PageHeader title={t.treatments.newTitle} back={{ href: "/treatments", label: t.treatments.title }} />
      <TreatmentForm initial={initial} submitLabel={t.treatments.saveTreatment} cancelHref="/treatments" onSubmit={handleSubmit} />
    </PageContainer>
  );
}
