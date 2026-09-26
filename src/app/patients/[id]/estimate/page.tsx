"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ClipboardList, Printer } from "lucide-react";
import ClinicLetterhead from "@/components/ClinicLetterhead";
import RequirePermission from "@/components/Guard";
import {
  Button, Card, EmptyState, NotFoundCard, PageContainer, PageHeader, PageLoading, Table, Td, Th,
} from "@/components/ui";
import { useSettings } from "@/context/SettingsContext";
import { getList } from "@/lib/frappe";
import { display, formatDate, todayISO } from "@/lib/format";
import { useDocument } from "@/lib/hooks";
import { patientHref, routeId } from "@/lib/links";
import type { Patient, TreatmentPlan } from "@/lib/types";

/** How long an estimate is valid, printed on it. */
const VALID_DAYS = 30;

export default function EstimatePage() {
  return (
    <RequirePermission permission={["view_patients", "view_treatments"]}>
      <Estimate />
    </RequirePermission>
  );
}

/**
 * A printable treatment estimate: the patient's open plans (Planned and In Progress) with cost, what is
 * already paid and what is left, on the clinic letterhead, with lines to sign.
 */
function Estimate() {
  const params = useParams();
  const id = routeId(params.id);
  const { money } = useSettings();
  const { doc: patient, loading, notFound, error } = useDocument<Patient>("Patient", id);
  const [plans, setPlans] = useState<{ id: string; rows: TreatmentPlan[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<TreatmentPlan>(
          "Treatment Plan",
          ["name", "treatment_type", "tooth_number", "doctor_name", "status", "total_cost", "paid_amount", "remaining_amount"],
          { filters: [["patient", "=", id], ["status", "in", ["Planned", "In Progress"]]], orderBy: "name asc", limit: 0 },
        );
        if (!cancelled) setPlans({ id, rows });
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
  if (notFound || !patient) return <NotFoundCard error={error} what="Patient" backHref="/patients" backLabel="Back to Patients" />;

  const rows = plans?.id === id ? plans.rows : null;
  const sum = (key: "total_cost" | "paid_amount" | "remaining_amount") =>
    (rows ?? []).reduce((total, row) => total + (Number(row[key]) || 0), 0);
  const today = todayISO();

  return (
    <PageContainer narrow>
      <PageHeader
        title="Treatment Estimate"
        subtitle={patient.full_name}
        back={{ href: patientHref(id), label: patient.full_name }}
        actions={
          <Button icon={Printer} onClick={() => window.print()} disabled={!rows || rows.length === 0}>
            Print
          </Button>
        }
      />

      <Card className="print:shadow-none print:border-0">
        <ClinicLetterhead kind="Treatment estimate" reference={patient.name} date={formatDate(today)} />

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 py-5">
          <div>
            <dt className="text-xs text-gray-400">Patient</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">{patient.full_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Phone</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">{display(patient.phone_number)}</dd>
          </div>
        </dl>

        {!rows ? (
          <PageLoading />
        ) : rows.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No open treatment plans" text="Plans that are Planned or In Progress appear here." />
        ) : (
          <>
            <div className="-mx-5 sm:-mx-6 border-t border-gray-100">
              <Table>
                <thead>
                  <tr>
                    <Th>Treatment</Th>
                    <Th>Tooth</Th>
                    <Th>Doctor</Th>
                    <Th className="text-end">Cost</Th>
                    <Th className="text-end">Paid</Th>
                    <Th className="text-end">To pay</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((plan) => (
                    <tr key={plan.name}>
                      <Td className="font-medium text-gray-800">{plan.treatment_type}</Td>
                      <Td label="Tooth">{display(plan.tooth_number)}</Td>
                      <Td label="Doctor">{display(plan.doctor_name)}</Td>
                      <Td label="Cost" className="text-end whitespace-nowrap">{money(plan.total_cost)}</Td>
                      <Td label="Paid" className="text-end whitespace-nowrap">{money(plan.paid_amount)}</Td>
                      <Td label="To pay" className="text-end whitespace-nowrap font-medium text-gray-800">
                        {money(plan.remaining_amount)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            <div className="mt-5 ms-auto max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Total cost</span>
                <span className="text-gray-800">{money(sum("total_cost"))}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Already paid</span>
                <span className="text-gray-800">{money(sum("paid_amount"))}</span>
              </div>
              <div className="flex justify-between gap-4 rounded-xl bg-primary-50 px-3 py-2 print:bg-white print:border print:border-gray-300">
                <span className="font-semibold text-primary-900">Left to pay</span>
                <span className="font-bold text-primary-900">{money(sum("remaining_amount"))}</span>
              </div>
            </div>

            <p className="mt-6 text-xs text-gray-500">
              This estimate is valid for {VALID_DAYS} days from {formatDate(today)}. The final cost may change if the
              treatment plan changes after examination.
            </p>

            <div className="mt-12 grid grid-cols-2 gap-10 text-xs text-gray-500">
              <div className="border-t border-gray-300 pt-2">Patient signature</div>
              <div className="border-t border-gray-300 pt-2">Doctor signature</div>
            </div>
          </>
        )}
      </Card>
    </PageContainer>
  );
}
