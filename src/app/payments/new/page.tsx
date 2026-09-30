"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RequirePermission from "@/components/Guard";
import PaymentForm, { emptyPayment, paymentPayload, type PaymentFormData } from "@/components/forms/PaymentForm";
import { PageContainer, PageHeader, PageLoading } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { createDoc } from "@/lib/frappe";
import { paymentHref, treatmentHref } from "@/lib/links";
import type { Payment } from "@/lib/types";

export default function NewPaymentPage() {
  return (
    <RequirePermission permission="add_payments">
      {/* useSearchParams() needs a Suspense boundary, or the production build fails. */}
      <Suspense fallback={<PageLoading />}>
        <NewPayment />
      </Suspense>
    </RequirePermission>
  );
}

function NewPayment() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { t } = useI18n();
  const plan = searchParams.get("treatment") || "";
  const initial: PaymentFormData = {
    ...emptyPayment(),
    patient: searchParams.get("patient") || "",
    treatment_plan: plan,
  };
  const backHref = plan ? treatmentHref(plan) : "/payments";

  const handleSubmit = async (data: PaymentFormData) => {
    const payment = await createDoc<Payment>("Payment", paymentPayload(data));
    toast.success(t.payments.recorded);
    router.push(paymentHref(payment.name));
  };

  return (
    <PageContainer narrow>
      <PageHeader
        title={t.payments.newTitle}
        back={{ href: backHref, label: plan ? t.payments.backToPlan : t.payments.title }}
      />
      <PaymentForm initial={initial} submitLabel={t.payments.savePayment} cancelHref={backHref} onSubmit={handleSubmit} />
    </PageContainer>
  );
}
