"use client";

import { useParams, useRouter } from "next/navigation";
import RequirePermission from "@/components/Guard";
import PaymentForm, { paymentPayload, paymentToForm, type PaymentFormData } from "@/components/forms/PaymentForm";
import { NotFoundCard, PageContainer, PageHeader, PageLoading } from "@/components/ui";
import { useToast } from "@/context/ToastContext";
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
  const id = routeId(params.id);
  const { doc: payment, loading, notFound, error } = useDocument<Payment>("Payment", id);

  if (loading) return <PageLoading />;
  if (notFound || !payment) return <NotFoundCard error={error} what="Payment" backHref="/payments" backLabel="Back to Payments" />;

  const handleSubmit = async (data: PaymentFormData) => {
    await updateDoc("Payment", id, paymentPayload(data));
    toast.success("Payment saved.");
    router.push(paymentHref(id));
  };

  return (
    <PageContainer narrow>
      <PageHeader title="Edit Payment" subtitle={id} back={{ href: paymentHref(id), label: "Payment" }} />
      <PaymentForm
        initial={paymentToForm(payment)}
        patientLabel={payment.patient_name}
        submitLabel="Save Changes"
        cancelHref={paymentHref(id)}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
