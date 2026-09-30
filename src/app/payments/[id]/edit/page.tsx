"use client";

import { CreditCard } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import RequirePermission from "@/components/Guard";
import PaymentForm, { paymentPayload, paymentToForm, type PaymentFormData } from "@/components/forms/PaymentForm";
import { NotFoundCard, PageContainer, PageHeader, PageLoading } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { label } from "@/i18n";
import { updateDoc } from "@/lib/frappe";
import { useDocument } from "@/lib/hooks";
import { paymentHref, routeId } from "@/lib/links";
import type { Payment } from "@/lib/types";

export default function EditPaymentPage() {
  return (
    <RequirePermission permission="add_payments">
      <EditPayment />
    </RequirePermission>
  );
}

function EditPayment() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();
  const id = routeId(params.id);
  const { doc: payment, loading, notFound, error } = useDocument<Payment>("Payment", id);

  if (loading) return <PageLoading />;
  if (notFound || !payment)
    return (
      <NotFoundCard
        error={error}
        what={label(t.enums.doctype, "Payment")}
        backHref="/payments"
        backLabel={t.payments.backToList}
      />
    );

  const handleSubmit = async (data: PaymentFormData) => {
    await updateDoc("Payment", id, paymentPayload(data));
    toast.success(t.payments.saved);
    router.push(paymentHref(id));
  };

  return (
    <PageContainer section="money" narrow>
      <PageHeader icon={CreditCard} section="money" title={t.payments.editTitle} subtitle={id} back={{ href: paymentHref(id), label: t.payments.backToPayment }} />
      <PaymentForm
        initial={paymentToForm(payment)}
        patientLabel={payment.patient_name}
        submitLabel={t.common.saveChanges}
        cancelHref={paymentHref(id)}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
