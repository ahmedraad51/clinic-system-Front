"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CreditCard, Download, Receipt, TrendingUp } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Button, Card, EmptyState, PageContainer, PageHeader, PageLoading, SelectInput, StatCard,
  StatusBadge, Table, TableMessage, Td, TextInput, Th, Toolbar,
} from "@/components/ui";
import { useSettings } from "@/context/SettingsContext";
import { getList, type FilterRow } from "@/lib/frappe";
import { addDays, downloadCsv, formatDate, formatMonth, monthStart, todayISO } from "@/lib/format";
import { patientHref, paymentHref, treatmentHref } from "@/lib/links";
import type { Appointment, Payment, TreatmentPlan } from "@/lib/types";

const RANGES = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_3_months", label: "Last 3 months" },
  { value: "this_year", label: "This year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom dates" },
] as const;
type Range = (typeof RANGES)[number]["value"];

/** [from, to] as ISO dates; empty strings mean no limit. */
function rangeDates(range: Range, customFrom: string, customTo: string): [string, string] {
  const today = todayISO();
  switch (range) {
    case "this_month":
      return [monthStart(today), today];
    case "last_month":
      return [monthStart(today, -1), addDays(monthStart(today), -1)];
    case "last_3_months":
      return [monthStart(today, -2), today];
    case "this_year":
      return [`${today.slice(0, 4)}-01-01`, today];
    case "custom":
      return [customFrom, customTo];
    default:
      return ["", ""];
  }
}

interface ReportData {
  key: string;
  payments: Payment[];
  outstanding: TreatmentPlan[];
  /** Plan → doctor, to share revenue out by doctor. */
  planDoctors: Record<string, string>;
  /** Appointments in the period up to today, for the outcomes. */
  appointments: Appointment[];
}

function groupSum(rows: Payment[], keyOf: (row: Payment) => string): Array<[string, number]> {
  const totals = new Map<string, number>();
  rows.forEach((row) => totals.set(keyOf(row), (totals.get(keyOf(row)) ?? 0) + (Number(row.amount) || 0)));
  return [...totals.entries()];
}

export default function ReportsPage() {
  return (
    <RequirePermission permission="view_reports">
      <Reports />
    </RequirePermission>
  );
}

function Reports() {
  const { settings, money } = useSettings();
  const [range, setRange] = useState<Range>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<ReportData | null>(null);

  const [from, to] = rangeDates(range, customFrom, customTo);
  const key = `${from}|${to}`;

  useEffect(() => {
    let cancelled = false;
    const [start, end] = key.split("|");
    const load = async () => {
      const filters: FilterRow[] = [
        ...(start ? [["payment_date", ">=", start] as FilterRow] : []),
        ...(end ? [["payment_date", "<=", end] as FilterRow] : []),
      ];
      try {
        const today = todayISO();
        const [payments, outstanding, plans, appointments] = await Promise.all([
          getList<Payment>(
            "Payment",
            ["name", "patient", "patient_name", "payment_date", "amount", "payment_method", "treatment_type", "treatment_plan"],
            { filters: filters.length ? filters : undefined, orderBy: "payment_date desc, name desc", limit: 0 },
          ),
          getList<TreatmentPlan>(
            "Treatment Plan",
            ["name", "patient", "patient_name", "treatment_type", "tooth_number", "status", "total_cost", "paid_amount", "remaining_amount"],
            { filters: [["remaining_amount", ">", 0]], orderBy: "remaining_amount desc", limit: 0 },
          ),
          getList<TreatmentPlan>("Treatment Plan", ["name", "doctor_name"], { limit: 0 }),
          getList<Appointment>("Appointment", ["name", "status"], {
            filters: [
              ...(start ? [["appointment_date", ">=", start] as FilterRow] : []),
              ["appointment_date", "<=", end && end < today ? end : today],
            ],
            limit: 0,
          }),
        ]);
        const planDoctors = Object.fromEntries(plans.map((plan) => [plan.name, plan.doctor_name || ""]));
        if (!cancelled) setData({ key, payments, outstanding, planDoctors, appointments });
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (settings.enable_financial_reports === 0) {
    return (
      <PageContainer narrow>
        <Card>
          <EmptyState
            icon={TrendingUp}
            title="Financial reports are turned off"
            text="A manager can turn them on again under Settings."
          />
        </Card>
      </PageContainer>
    );
  }

  if (!data) return <PageLoading />;

  const stale = data.key !== key;
  const payments = data.payments;
  const revenue = payments.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const outstandingTotal = data.outstanding.reduce((sum, row) => sum + (Number(row.remaining_amount) || 0), 0);
  const byType = groupSum(payments, (row) => row.treatment_type || "No treatment plan").sort((a, b) => b[1] - a[1]);
  const byMethod = groupSum(payments, (row) => row.payment_method || "Other").sort((a, b) => b[1] - a[1]);
  const byMonth = groupSum(payments, (row) => (row.payment_date || "").slice(0, 7))
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([month, total]): [string, number] => [formatMonth(month), total]);
  const byDoctor = groupSum(payments, (row) =>
    row.treatment_plan ? data.planDoctors[row.treatment_plan] || "No doctor on the plan" : "General payments",
  ).sort((a, b) => b[1] - a[1]);
  const outcome = (status: string) => data.appointments.filter((a) => a.status === status).length;
  const completed = outcome("Completed");
  const noShows = outcome("No Show");
  const cancelledVisits = outcome("Cancelled");
  const stillOpen = outcome("Scheduled") + outcome("Confirmed");
  const noShowRate = completed + noShows > 0 ? Math.round((noShows / (completed + noShows)) * 100) : null;
  const rangeLabel = from || to ? `${from ? formatDate(from) : "the start"} to ${to ? formatDate(to) : "today"}` : "all time";

  const exportPayments = () =>
    downloadCsv(
      `payments-${from || "start"}-to-${to || "today"}.csv`,
      ["Payment", "Date", "Patient", "Treatment", "Method", "Amount"],
      payments.map((row) => [
        row.name, row.payment_date, row.patient_name || row.patient, row.treatment_type || "", row.payment_method, Number(row.amount) || 0,
      ]),
    );

  const exportOutstanding = () =>
    downloadCsv(
      `outstanding-${todayISO()}.csv`,
      ["Plan", "Patient", "Treatment", "Tooth", "Status", "Total Cost", "Paid", "Remaining"],
      data.outstanding.map((row) => [
        row.name, row.patient_name || row.patient, row.treatment_type, row.tooth_number || "", row.status,
        Number(row.total_cost) || 0, Number(row.paid_amount) || 0, Number(row.remaining_amount) || 0,
      ]),
    );

  return (
    <PageContainer>
      <PageHeader title="Financial Reports" subtitle={`Payments from ${rangeLabel}. Outstanding balances are always as of today.`} />

      <Toolbar>
        <SelectInput value={range} onChange={(e) => setRange(e.target.value as Range)} className="sm:w-48" aria-label="Period">
          {RANGES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectInput>
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <TextInput type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} aria-label="From date" className="sm:w-40" />
            <span className="text-gray-500 text-sm">to</span>
            <TextInput type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} aria-label="To date" className="sm:w-40" />
          </div>
        )}
      </Toolbar>

      <div className={stale ? "opacity-60 transition-opacity space-y-6" : "space-y-6"}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Revenue" value={money(revenue)} icon={TrendingUp} tone="primary" />
          <StatCard title="Payments" value={payments.length} icon={CreditCard} tone="purple" />
          <StatCard
            title="Average payment"
            value={money(payments.length ? revenue / payments.length : 0)}
            icon={Receipt}
            tone="green"
          />
          <StatCard title="Outstanding" value={money(outstandingTotal)} icon={AlertCircle} tone="red" hint="All open plans" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Revenue by Treatment">
            <Bars rows={byType} money={money} empty="No payments in this period." />
          </Card>
          <Card title="Revenue by Method">
            <Bars rows={byMethod} money={money} empty="No payments in this period." />
          </Card>
          <Card title="Revenue by Month">
            <Bars rows={byMonth} money={money} empty="No payments in this period." />
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Revenue by Doctor">
            <Bars rows={byDoctor} money={money} empty="No payments in this period." />
          </Card>
          <Card title="Appointments">
            {data.appointments.length === 0 ? (
              <p className="text-sm text-gray-500">No appointments in this period.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className={noShowRate !== null && noShowRate >= 15 ? "text-3xl font-bold text-red-600" : "text-3xl font-bold text-gray-800"}>
                    {noShowRate === null ? "—" : `${noShowRate}%`}
                  </span>
                  <span className="text-sm text-gray-500">no-show rate (no-shows out of visits that were due)</span>
                </div>
                <Bars
                  rows={[
                    ["Completed", completed],
                    ["No show", noShows],
                    ["Cancelled", cancelledVisits],
                    ["Still open (not marked)", stillOpen],
                  ]}
                  money={(n) => String(n)}
                  empty=""
                />
              </div>
            )}
          </Card>
        </div>

        <Card
          title="Payments in this Period"
          flush
          actions={
            payments.length > 0 && (
              <Button size="sm" variant="secondary" icon={Download} onClick={exportPayments}>
                Export CSV
              </Button>
            )
          }
        >
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Patient</Th>
                <Th>Treatment</Th>
                <Th>Method</Th>
                <Th className="text-end">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <TableMessage colSpan={5}>No payments in this period.</TableMessage>
              ) : (
                payments.slice(0, 10).map((row) => (
                  <tr key={row.name} className="hover:bg-gray-50">
                    <Td className="whitespace-nowrap">
                      <Link href={paymentHref(row.name)} className="text-gray-800 hover:text-primary-600">
                        {formatDate(row.payment_date)}
                      </Link>
                    </Td>
                    <Td label="Patient">
                      <Link href={patientHref(row.patient)} className="text-gray-700 hover:text-primary-600">
                        {row.patient_name || row.patient}
                      </Link>
                    </Td>
                    <Td label="Treatment">{row.treatment_type || "—"}</Td>
                    <Td label="Method">
                      <StatusBadge kind="method" status={row.payment_method} />
                    </Td>
                    <Td label="Amount" className="text-end font-medium text-green-600 whitespace-nowrap">{money(row.amount)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
          {payments.length > 10 && (
            <p className="px-5 py-3 text-xs text-gray-500">
              Showing the latest 10 of {payments.length}. Export CSV for the full list.
            </p>
          )}
        </Card>

        <Card
          title="Outstanding Balances"
          flush
          actions={
            data.outstanding.length > 0 && (
              <Button size="sm" variant="secondary" icon={Download} onClick={exportOutstanding}>
                Export CSV
              </Button>
            )
          }
        >
          <Table>
            <thead>
              <tr>
                <Th>Patient</Th>
                <Th>Treatment</Th>
                <Th>Status</Th>
                <Th className="text-end">Total Cost</Th>
                <Th className="text-end">Paid</Th>
                <Th className="text-end">Remaining</Th>
              </tr>
            </thead>
            <tbody>
              {data.outstanding.length === 0 ? (
                <TableMessage colSpan={6}>No outstanding balances.</TableMessage>
              ) : (
                data.outstanding.map((row) => (
                  <tr key={row.name} className="hover:bg-gray-50">
                    <Td>
                      <Link href={patientHref(row.patient)} className="font-medium text-gray-800 hover:text-primary-600">
                        {row.patient_name || row.patient}
                      </Link>
                    </Td>
                    <Td label="Treatment">
                      <Link href={treatmentHref(row.name)} className="text-gray-700 hover:text-primary-600">
                        {row.treatment_type}
                        {row.tooth_number ? ` · ${row.tooth_number}` : ""}
                      </Link>
                    </Td>
                    <Td label="Status">
                      <StatusBadge kind="treatment" status={row.status} />
                    </Td>
                    <Td label="Total Cost" className="text-end whitespace-nowrap">{money(row.total_cost)}</Td>
                    <Td label="Paid" className="text-end whitespace-nowrap text-green-600">{money(row.paid_amount)}</Td>
                    <Td label="Remaining" className="text-end whitespace-nowrap font-semibold text-red-600">{money(row.remaining_amount)}</Td>
                  </tr>
                ))
              )}
            </tbody>
            {data.outstanding.length > 0 && (
              <tfoot>
                <tr>
                  <Td className="font-semibold text-gray-800">Total</Td>
                  <Td />
                  <Td />
                  <Td />
                  <Td />
                  <Td label="Remaining" className="text-end whitespace-nowrap font-bold text-red-600">{money(outstandingTotal)}</Td>
                </tr>
              </tfoot>
            )}
          </Table>
        </Card>
      </div>
    </PageContainer>
  );
}

/** A simple bar list: label, amount and a bar scaled to the biggest amount. */
function Bars({
  rows,
  money,
  empty,
}: {
  rows: Array<[string, number]>;
  money: (amount: number) => string;
  empty: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-gray-500">{empty}</p>;
  const max = Math.max(...rows.map(([, amount]) => amount));
  return (
    <div className="space-y-3">
      {rows.map(([label, amount]) => (
        <div key={label}>
          <div className="flex justify-between gap-3 text-sm mb-1">
            <span className="text-gray-600 font-medium truncate">{label}</span>
            <span className="text-gray-800 font-semibold whitespace-nowrap">{money(amount)}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all"
              style={{ width: `${max > 0 ? (amount / max) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
