"use client";

import { useEffect, useState } from "react";
import { useRecordDialogs } from "@/components/RecordDialogs";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ClinicLetterhead from "@/components/ClinicLetterhead";
import ReceiptSlipControls from "@/components/ReceiptSlip";
import RecordHistory from "@/components/RecordHistory";
import { CalendarDays, MessageCircle, Pencil, Printer, Trash2, Wallet } from "lucide-react";
import Avatar from "@/components/Avatar";
import RequirePermission from "@/components/Guard";
import {
  Button,
  Card,
  DetailLayout,
  NotFoundCard,
  PageContainer,
  PageHeader,
  ProfileCard,
  RecordLoading,
  StatusBadge,
  tooltip,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { label } from "@/i18n";
import { deleteDoc, errorMessage, getDoc, getList } from "@/lib/frappe";
import { formatDate } from "@/lib/format";
import { currencyOf, planAmountOf, roundMoney } from "@/lib/currency";
import { useDocument, useOpenBalances } from "@/lib/hooks";
import { patientHref, routeId, treatmentHref } from "@/lib/links";
import { whatsappLink } from "@/lib/whatsapp";
import { useDataVersion } from "@/lib/dataVersion";
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
  const { t } = useI18n();
  const openDialog = useRecordDialogs();
  const { can, displayName } = useSession();
  const { money, settings, clinicName, countryCode, currency, secondCurrency, rateText, owedText } = useSettings();
  const id = routeId(params.id);
  const { doc: payment, loading, notFound, error } = useDocument<Payment>("Payment", id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // The patient's phone and what is left to pay, for sending the receipt on WhatsApp.
  const [patientInfo, setPatientInfo] = useState<{ id: string; row: Patient | null } | null>(null);
  // An edit in the dialog changes what is left: the balance and the slip's figure load again.
  const saved = useDataVersion();
  const patientId = payment?.patient ?? "";
  const balances = useOpenBalances(patientId ? [patientId] : [], Boolean(secondCurrency));

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
  }, [patientId, saved]);

  // For the receipt slip: what was left on the treatment plan right after this payment (later payments do
  // not count, so a reprint shows the same figure). null when it could not be worked out.
  const planId = payment?.treatment_plan ?? "";
  const paidOn = payment?.payment_date ?? "";
  const [planBalance, setPlanBalance] = useState<{ key: string; left: number | null; currency: string } | null>(null);

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    const key = `${id}|${planId}|${paidOn}|${saved}`;
    const load = async () => {
      let left: number | null = null;
      let planCurrency = "";
      try {
        const [plan, payments] = await Promise.all([
          getDoc<TreatmentPlan>("Treatment Plan", planId),
          getList<Payment>("Payment", ["name", "payment_date", "amount", "plan_amount"], {
            filters: [["treatment_plan", "=", planId]],
            limit: 0,
          }),
        ]);
        planCurrency = currencyOf(plan, currency);
        if (plan.status !== "Cancelled") {
          // This payment and the ones before it (same day: by receipt number), each in the plan's currency.
          const paid = payments
            .filter((row) => row.payment_date < paidOn || (row.payment_date === paidOn && row.name <= id))
            .reduce((sum, row) => sum + planAmountOf(row), 0);
          left = Math.max(0, roundMoney((Number(plan.total_cost) || 0) - paid, planCurrency));
        }
      } catch (err) {
        console.error(err);
      }
      if (!cancelled) setPlanBalance({ key, left, currency: planCurrency });
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, planId, paidOn, currency, saved]);

  if (loading) return <RecordLoading />;
  if (notFound || !payment)
    return (
      <NotFoundCard
        error={error}
        what={label(t.enums.doctype, "Payment")}
        backHref="/payments"
        backLabel={t.payments.backToList}
      />
    );

  const p = t.payments;
  const r = t.receipt;
  const canChange = can("add_payments");
  const contact = patientInfo?.id === payment.patient ? patientInfo.row : null;
  const left = Number(contact?.total_remaining) || 0;
  const treatmentName = payment.treatment_type ? label(t.enums.treatmentType, payment.treatment_type) : "";
  const methodName = label(t.enums.paymentMethod, payment.payment_method);
  const receiptLink =
    settings.enable_whatsapp !== 0 && contact
      ? whatsappLink(
          contact.phone_number,
          [
            p.whatsappThanks(
              payment.patient_name || payment.patient,
              money(payment.amount, payment.currency),
              formatDate(payment.payment_date),
              treatmentName,
              clinicName,
            ),
            p.whatsappReceipt(id, methodName),
            left > 0 ? p.whatsappLeft(owedText(left, balances[payment.patient])) : p.whatsappNothingLeft,
          ].join(" "),
          countryCode,
        )
      : "";

  // The same receipt for a thermal receipt printer; Print Slip waits until the plan balance has loaded.
  const balance = planId && planBalance?.key === `${id}|${planId}|${paidOn}|${saved}` ? planBalance : null;
  // Two currencies met: the receipt says at what rate, and what the payment took off the plan.
  const payCurrency = currencyOf(payment, currency);
  const planCurrency = balance ? currencyOf(balance, currency) : payCurrency;
  const rate = Number(payment.exchange_rate) || 0;
  const rateLines: { label: string; value: string }[] = [];
  if (rate > 0 && (payCurrency !== currency || planCurrency !== currency)) {
    rateLines.push({ label: t.money.rateUsed, value: rateText(rate) });
  }
  if (balance && planCurrency !== payCurrency && payment.plan_amount !== undefined && payment.plan_amount !== null) {
    rateLines.push({ label: t.money.countedAs, value: money(payment.plan_amount, planCurrency) });
  }
  const slip = planId && !balance ? null : {
    clinicName,
    clinicAddress: settings.address,
    clinicPhone: settings.phone,
    taxNumber: settings.tax_number,
    receiptNo: id,
    date: formatDate(payment.payment_date),
    patient: payment.patient_name || payment.patient,
    forWhat: payment.treatment_plan ? treatmentName || r.treatment : r.generalPayment,
    method: methodName,
    amount: money(payment.amount, payment.currency),
    extra: rateLines,
    balance: balance && balance.left !== null ? { label: r.slip.leftOnTreatment, amount: money(balance.left, balance.currency) } : undefined,
    notes: payment.notes || undefined,
    printedBy: displayName,
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDoc("Payment", id);
      toast.success(p.deleted);
      router.push("/payments");
    } catch (err) {
      toast.error(errorMessage(err, p.deleteFailed));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <PageContainer section="money">
      <PageHeader title={p.receiptTitle} subtitle={id} back={{ href: "/payments", label: p.title }} />

      <DetailLayout
        aside={
          <ProfileCard
            avatar={<Avatar name={payment.patient_name || payment.patient} size={96} />}
            title={
              <Link href={patientHref(payment.patient)} className="hover:text-primary-600">
                {payment.patient_name || payment.patient}
              </Link>
            }
            subtitle={<span dir="ltr">{id}</span>}
            badges={<StatusBadge kind="method" status={payment.payment_method} />}
            stats={[
              { icon: Wallet, value: money(payment.amount, payment.currency), label: r.amountPaid, hue: "green" },
              { icon: CalendarDays, value: formatDate(payment.payment_date), label: r.date, hue: "blue" },
            ]}
            actions={
              <>
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              {t.common.print}
            </Button>
            {receiptLink && (
              <a
                href={receiptLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border border-green-200 bg-green-50 text-sm font-medium text-green-800 hover:bg-green-100"
              >
                <MessageCircle size={16} />
                {p.whatsapp}
              </a>
            )}
            {canChange && (
              <Button icon={Pencil} onClick={() => openDialog({ kind: "editPayment", id })}>
                {t.common.edit}
              </Button>
            )}
            {canChange && (
              <Button
                variant="ghost"
                icon={Trash2}
                onClick={() => setConfirmDelete(true)}
                aria-label={p.deleteLabel}
                {...tooltip(p.deleteLabel)}
                className="text-red-600 hover:bg-red-50 px-3"
              />
            )}
              </>
            }
          />
        }
      >
      <Card className="print:shadow-none print:border-0">
        <ClinicLetterhead kind={r.kind} reference={id} date={formatDate(payment.payment_date)} />

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 py-5">
          <div>
            <dt className="text-xs text-gray-500">{r.receivedFrom}</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">
              <Link href={patientHref(payment.patient)} className="hover:text-primary-600">
                {payment.patient_name || payment.patient}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">{r.for}</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">
              {payment.treatment_plan ? (
                <Link href={treatmentHref(payment.treatment_plan)} className="hover:text-primary-600">
                  {treatmentName || r.treatment} ({payment.treatment_plan})
                </Link>
              ) : (
                r.generalPayment
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">{r.paymentMethod}</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">{methodName}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">{r.date}</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">{formatDate(payment.payment_date)}</dd>
          </div>
          {payment.notes && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-500">{r.notes}</dt>
              <dd className="text-sm text-gray-700 mt-0.5 whitespace-pre-line">{payment.notes}</dd>
            </div>
          )}
        </dl>

        <div className="flex items-center justify-between rounded-xl bg-green-50 px-5 py-4">
          <span className="text-sm font-medium text-green-800">{r.amountPaid}</span>
          <span className="text-2xl font-semibold text-green-700">{money(payment.amount, payment.currency)}</span>
        </div>
        {rateLines.length > 0 && (
          <dl data-testid="receipt-rate" className="mt-3 space-y-1 text-sm">
            {rateLines.map((line) => (
              <div key={line.label} className="flex justify-between gap-4">
                <dt className="text-gray-500">{line.label}</dt>
                <dd className="font-medium text-gray-800">{line.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <ReceiptSlipControls data={slip} />
      </Card>

      <RecordHistory doctype="Payment" name={payment.name} changedAt={payment.modified} currency={payment.currency} />

      <ConfirmDialog
        open={confirmDelete}
        title={p.deleteTitle}
        message={
          <p>
            {p.deleteBefore}
            <strong>{money(payment.amount, payment.currency)}</strong>
            {p.deleteAfter}
          </p>
        }
        confirmLabel={p.deleteConfirm}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      </DetailLayout>
    </PageContainer>
  );
}
