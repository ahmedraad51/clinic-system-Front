"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import ClinicLetterhead from "@/components/ClinicLetterhead";
import RequirePermission from "@/components/Guard";
import { Button, Card, NotFoundCard, PageContainer, PageHeader, PageLoading, StatusBadge, Table, Td, Th } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { label } from "@/i18n";
import { getList } from "@/lib/frappe";
import { display, formatDate, todayISO } from "@/lib/format";
import { currencyOf, planAmountOf, sumByCurrency } from "@/lib/currency";
import { useDocument } from "@/lib/hooks";
import { patientHref, routeId } from "@/lib/links";
import type { Patient, Payment, TreatmentPlan } from "@/lib/types";

export default function StatementPage() {
  return (
    <RequirePermission permission={["view_patients", "view_payments"]}>
      <Statement />
    </RequirePermission>
  );
}

interface Data {
  id: string;
  plans: TreatmentPlan[];
  payments: Payment[];
}

/** A printable account of a patient: every treatment plan, every payment, and the balance. */
function Statement() {
  const params = useParams();
  const id = routeId(params.id);
  const { t } = useI18n();
  const s = t.statement;
  const { money, moneyTotals, currency } = useSettings();
  const { doc: patient, loading, notFound, error } = useDocument<Patient>("Patient", id);
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [plans, payments] = await Promise.all([
          getList<TreatmentPlan>(
            "Treatment Plan",
            ["name", "treatment_type", "tooth_number", "status", "currency", "total_cost", "paid_amount", "remaining_amount"],
            { filters: [["patient", "=", id], ["status", "!=", "Cancelled"]], orderBy: "name asc", limit: 0 },
          ),
          getList<Payment>("Payment", ["name", "payment_date", "amount", "currency", "plan_amount", "treatment_plan", "payment_method", "treatment_type"], {
            filters: [["patient", "=", id]],
            orderBy: "payment_date asc",
            limit: 0,
          }),
        ]);
        if (!cancelled) setData({ id, plans, payments });
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <PageLoading />;
  if (notFound || !patient)
    return (
      <NotFoundCard error={error} what={label(t.enums.doctype, "Patient")} backHref="/patients" backLabel={s.backToPatients} />
    );

  const ready = data?.id === id ? data : null;
  // Each currency adds up on its own: "IQD 250,000 + $300".
  const inCurrency = (row: { currency?: string }) => currencyOf(row, currency);
  const charged = moneyTotals(sumByCurrency(ready?.plans ?? [], (plan) => Number(plan.total_cost) || 0, inCurrency));
  // A payment on a plan counts in the plan's currency (what it took off the plan); a general payment in its own.
  const planCurrencies = new Map((ready?.plans ?? []).map((plan) => [plan.name, inCurrency(plan)]));
  const paid = moneyTotals(
    sumByCurrency(
      ready?.payments ?? [],
      (pay) => (pay.treatment_plan && planCurrencies.has(pay.treatment_plan) ? planAmountOf(pay) : Number(pay.amount) || 0),
      (pay) => (pay.treatment_plan && planCurrencies.get(pay.treatment_plan)) || inCurrency(pay),
    ),
  );
  const balance = moneyTotals(sumByCurrency(ready?.plans ?? [], (plan) => Number(plan.remaining_amount) || 0, inCurrency));

  return (
    <PageContainer section="money" narrow>
      <PageHeader
        title={s.title}
        subtitle={patient.full_name}
        back={{ href: patientHref(id), label: patient.full_name }}
        actions={
          <Button icon={Printer} onClick={() => window.print()} disabled={!ready}>
            {t.common.print}
          </Button>
        }
      />

      <Card className="print:shadow-none print:border-0">
        <ClinicLetterhead kind={s.kind} reference={patient.name} date={formatDate(todayISO())} />

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 py-5">
          <div>
            <dt className="text-xs text-gray-500">{s.patient}</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">{patient.full_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">{s.phone}</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">
              <span dir="ltr">{display(patient.phone_number)}</span>
            </dd>
          </div>
        </dl>

        {!ready ? (
          <PageLoading />
        ) : (
          <div className="space-y-6">
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">{s.treatments}</h2>
              <div className="-mx-5 sm:-mx-6 border-t border-gray-100">
                <Table>
                  <thead>
                    <tr>
                      <Th>{s.colTreatment}</Th>
                      <Th>{s.colStatus}</Th>
                      <Th className="text-end">{s.colCost}</Th>
                      <Th className="text-end">{s.colPaid}</Th>
                      <Th className="text-end">{s.colLeft}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {ready.plans.length === 0 ? (
                      <tr>
                        <Td className="text-gray-500">{s.noTreatments}</Td>
                      </tr>
                    ) : (
                      ready.plans.map((plan) => (
                        <tr key={plan.name}>
                          <Td className="font-medium text-gray-800">
                            {label(t.enums.treatmentType, plan.treatment_type)}
                            {plan.tooth_number ? s.tooth(plan.tooth_number) : ""}
                          </Td>
                          <Td label={s.colStatus}>
                            <StatusBadge kind="treatment" status={plan.status} />
                          </Td>
                          <Td label={s.colCost} className="text-end whitespace-nowrap">{money(plan.total_cost, plan.currency)}</Td>
                          <Td label={s.colPaid} className="text-end whitespace-nowrap">{money(plan.paid_amount, plan.currency)}</Td>
                          <Td label={s.colLeft} className="text-end whitespace-nowrap">{money(plan.remaining_amount, plan.currency)}</Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">{s.payments}</h2>
              <div className="-mx-5 sm:-mx-6 border-t border-gray-100">
                <Table>
                  <thead>
                    <tr>
                      <Th>{s.colDate}</Th>
                      <Th>{s.colFor}</Th>
                      <Th>{s.colMethod}</Th>
                      <Th className="text-end">{s.colAmount}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {ready.payments.length === 0 ? (
                      <tr>
                        <Td className="text-gray-500">{s.noPayments}</Td>
                      </tr>
                    ) : (
                      ready.payments.map((pay) => (
                        <tr key={pay.name}>
                          <Td className="whitespace-nowrap font-medium text-gray-800">{formatDate(pay.payment_date)}</Td>
                          <Td label={s.colFor}>
                            {pay.treatment_type ? label(t.enums.treatmentType, pay.treatment_type) : s.generalPayment}
                          </Td>
                          <Td label={s.colMethod}>{label(t.enums.paymentMethod, pay.payment_method)}</Td>
                          <Td label={s.colAmount} className="text-end whitespace-nowrap">{money(pay.amount, pay.currency)}</Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </section>

            <div className="ms-auto max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">{s.totalTreatments}</span>
                <span className="text-gray-800">{charged}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">{s.totalPaid}</span>
                <span className="text-gray-800">{paid}</span>
              </div>
              <div className="flex justify-between gap-4 rounded-xl bg-primary-50 px-3 py-2 print:bg-white print:border print:border-gray-300">
                <span className="font-semibold text-primary-900">{s.balance}</span>
                <span className="font-semibold text-primary-900">{balance}</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
