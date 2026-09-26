"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ClinicLetterhead from "@/components/ClinicLetterhead";
import { MessageCircle, Pencil, Printer, Trash2 } from "lucide-react";
import RequirePermission from "@/components/Guard";
import { Button, Card, LinkButton, NotFoundCard, PageContainer, PageHeader, PageLoading } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { deleteDoc, errorMessage, getList } from "@/lib/frappe";
import { formatDate } from "@/lib/format";
import { useDocument } from "@/lib/hooks";
import { patientHref, paymentHref, routeId, treatmentHref } from "@/lib/links";
import { whatsappLink } from "@/lib/whatsapp";
import type { Patient, Payment } from "@/lib/types";

export default function PaymentDetailPage() {
  return (
    <RequirePermission permission="view_payments">
      <PaymentDetail />
    </RequirePermission>
  );
}

function PaymentDetail() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { can } = useSession();
  const { money, settings, clinicName, countryCode } = useSettings();
  const id = routeId(params.id);
  const { doc: payment, loading, notFound, error } = useDocument<Payment>("Payment", id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // The patient's phone and what is left to pay, for sending the receipt on WhatsApp.
  const [patientInfo, setPatientInfo] = useState<{ id: string; row: Patient | null } | null>(null);
  const patientId = payment?.patient ?? "";

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<Patient>("Patient", ["name", "phone_number", "total_remaining"], {
          filters: [["name", "=", patientId]],
          limit: 1,
        });
        if (!cancelled) setPatientInfo({ id: patientId, row: rows[0] ?? null });
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (loading) return <PageLoading />;
  if (notFound || !payment) return <NotFoundCard error={error} what="Payment" backHref="/payments" backLabel="Back to Payments" />;

  const canChange = can("add_payments");
  const contact = patientInfo?.id === payment.patient ? patientInfo.row : null;
  const left = Number(contact?.total_remaining) || 0;
  const receiptLink =
    settings.enable_whatsapp !== 0 && contact
      ? whatsappLink(
          contact.phone_number,
          [
            `Hello ${payment.patient_name || payment.patient}, thank you for your payment of ${money(payment.amount)} on ${formatDate(payment.payment_date)}` +
              `${payment.treatment_type ? ` for ${payment.treatment_type.toLowerCase()}` : ""} at ${clinicName}.`,
            `Receipt: ${id} (${payment.payment_method}).`,
            left > 0 ? `Still to pay: ${money(left)}.` : "Nothing is left to pay. Thank you!",
          ].join(" "),
          countryCode,
        )
      : "";

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDoc("Payment", id);
      toast.success("Payment deleted.");
      router.push("/payments");
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete the payment."));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <PageContainer narrow>
      <PageHeader
        title="Payment Receipt"
        subtitle={id}
        back={{ href: "/payments", label: "Payments" }}
        actions={
          <>
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              Print
            </Button>
            {receiptLink && (
              <a
                href={receiptLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border border-green-200 bg-green-50 text-sm font-medium text-green-800 hover:bg-green-100"
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
            )}
            {canChange && (
              <LinkButton href={`${paymentHref(id)}/edit`} icon={Pencil}>
                Edit
              </LinkButton>
            )}
            {canChange && (
              <Button
                variant="ghost"
                icon={Trash2}
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete payment"
                title="Delete payment"
                className="text-red-600 hover:bg-red-50 px-3"
              />
            )}
          </>
        }
      />

      <Card className="print:shadow-none print:border-0">
        <ClinicLetterhead kind="Receipt" reference={id} date={formatDate(payment.payment_date)} />

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 py-5">
          <div>
            <dt className="text-xs text-gray-500">Received from</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">
              <Link href={patientHref(payment.patient)} className="hover:text-primary-600">
                {payment.patient_name || payment.patient}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">For</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">
              {payment.treatment_plan ? (
                <Link href={treatmentHref(payment.treatment_plan)} className="hover:text-primary-600">
                  {payment.treatment_type || "Treatment"} ({payment.treatment_plan})
                </Link>
              ) : (
                "General payment"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Payment method</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">{payment.payment_method}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Date</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">{formatDate(payment.payment_date)}</dd>
          </div>
          {payment.notes && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-500">Notes</dt>
              <dd className="text-sm text-gray-700 mt-0.5 whitespace-pre-line">{payment.notes}</dd>
            </div>
          )}
        </dl>

        <div className="flex items-center justify-between rounded-xl bg-green-50 px-5 py-4">
          <span className="text-sm font-medium text-green-800">Amount paid</span>
          <span className="text-2xl font-bold text-green-700">{money(payment.amount)}</span>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this payment?"
        message={
          <p>
            The payment of <strong>{money(payment.amount)}</strong> will be removed and the plan balance will go back up
            by the same amount.
          </p>
        }
        confirmLabel="Delete Payment"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </PageContainer>
  );
}
