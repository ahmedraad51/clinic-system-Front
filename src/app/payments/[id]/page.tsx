"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ClinicLetterhead from "@/components/ClinicLetterhead";
import ReceiptSlipControls from "@/components/ReceiptSlip";
import { MessageCircle, Pencil, Printer, Trash2 } from "lucide-react";
import RequirePermission from "@/components/Guard";
import { Button, Card, LinkButton, NotFoundCard, PageContainer, PageHeader, RecordLoading } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { deleteDoc, errorMessage, getDoc, getList } from "@/lib/frappe";
import { formatDate } from "@/lib/format";
import { useDocument } from "@/lib/hooks";
import { patientHref, paymentHref, routeId, treatmentHref } from "@/lib/links";
import { whatsappLink } from "@/lib/whatsapp";
import type { Patient, Payment, TreatmentPlan } from "@/lib/types";

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
  const { can, displayName } = useSession();
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

  // For the receipt slip: what was left on the treatment plan right after this payment (later payments do
  // not count, so a reprint shows the same figure). null when it could not be worked out.
  const planId = payment?.treatment_plan ?? "";
  const paidOn = payment?.payment_date ?? "";
  const [planBalance, setPlanBalance] = useState<{ key: string; left: number | null } | null>(null);

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    const key = `${id}|${planId}|${paidOn}`;
    const load = async () => {
      let left: number | null = null;
      try {
        const [plan, payments] = await Promise.all([
          getDoc<TreatmentPlan>("Treatment Plan", planId),
          getList<Payment>("Payment", ["name", "payment_date", "amount"], { filters: [["treatment_plan", "=", planId]], limit: 0 }),
        ]);
        if (plan.status !== "Cancelled") {
          // This payment and the ones before it (same day: by receipt number).
          const paid = payments
            .filter((row) => row.payment_date < paidOn || (row.payment_date === paidOn && row.name <= id))
            .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
          left = Math.max(0, (Number(plan.total_cost) || 0) - paid);
        }
      } catch (err) {
        console.error(err);
      }
      if (!cancelled) setPlanBalance({ key, left });
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, planId, paidOn]);

  if (loading) return <RecordLoading />;
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

  // The same receipt for a thermal receipt printer; Print Slip waits until the plan balance has loaded.
  const balance = planId && planBalance?.key === `${id}|${planId}|${paidOn}` ? planBalance : null;
  const slip = planId && !balance ? null : {
    clinicName,
    clinicAddress: settings.address,
    clinicPhone: settings.phone,
    taxNumber: settings.tax_number,
    receiptNo: id,
    date: formatDate(payment.payment_date),
    patient: payment.patient_name || payment.patient,
    forWhat: payment.treatment_plan ? payment.treatment_type || "Treatment" : "General payment",
    method: payment.payment_method,
    amount: money(payment.amount),
    balance: balance && balance.left !== null ? { label: "Left on this treatment", amount: money(balance.left) } : undefined,
    notes: payment.notes || undefined,
    printedBy: displayName,
  };

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

        <ReceiptSlipControls data={slip} />
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
