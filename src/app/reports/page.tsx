"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, BarChart2, BriefcaseMedical, CalendarCheck, CalendarDays, CreditCard, Download, PieChart, Receipt, TrendingUp } from "lucide-react";
import { BarChart, DonutChart, type ChartPoint } from "@/components/Charts";
import RequirePermission from "@/components/Guard";
import {
  Button, Card, EmptyState, LoadError, PageContainer, PageHeader, PageLoading, SelectInput, StatCard,
  StatusBadge, Table, TableMessage, Td, TextInput, Th, Toolbar,
} from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { label, messages, num } from "@/i18n";
import { errorMessage, getList, type FilterRow } from "@/lib/frappe";
import { addDays, addMonths, downloadCsv, formatCompact, formatDate, formatMonth, formatMonthName, monthStart, todayISO } from "@/lib/format";
import { baseAmount, currencyOf, sumByCurrency, totalsOrder } from "@/lib/currency";
import { patientHref, paymentHref, treatmentHref } from "@/lib/links";
import type { Appointment, Payment, TreatmentPlan } from "@/lib/types";

/** The period picker; the labels are t.reports.ranges[value]. */
const RANGES = ["this_month", "last_month", "last_3_months", "this_year", "all", "custom"] as const;
type Range = (typeof RANGES)[number];

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
  /** Appointments in the period up to today, for the outcomes and the per-day chart. */
  appointments: Appointment[];
  /** Plans started in the period, for the ring of treatment types. */
  plans: TreatmentPlan[];
}

/** A period up to this many days is charted day by day; a longer one month by month. */
const DAILY_UP_TO = 45;
/** The longest a chart goes back when the period has no start ("All time"). */
const MOST_MONTHS = 24;

/**
 * The buckets of a chart from `from` to `to`: days for a short period, months for a long one. Each has its key
 * (the start of a date, "2026-09-26" or "2026-09"), a short label and a long one.
 */
function chartBuckets(from: string, to: string): Array<{ key: string; label: string; fullLabel: string }> {
  const days: string[] = [];
  for (let day = from; day <= to && days.length <= DAILY_UP_TO; day = addDays(day, 1)) days.push(day);
  if (days.length <= DAILY_UP_TO) {
    return days.map((day) => ({ key: day, label: num(Number(day.slice(8))), fullLabel: formatDate(day) }));
  }
  const months: string[] = [];
  for (let month = monthStart(from); month <= to && months.length < MOST_MONTHS * 2; month = addMonths(month, 1)) {
    months.push(month.slice(0, 7));
  }
  return months.slice(-MOST_MONTHS).map((month) => ({ key: month, label: formatMonthName(month), fullLabel: formatMonth(month) }));
}

/** Adds up `value` of each row into its bucket (by the start of its date). */
function sumInto<T>(buckets: ReturnType<typeof chartBuckets>, rows: T[], date: (row: T) => string, value: (row: T) => number): ChartPoint[] {
  const length = buckets[0]?.key.length ?? 10;
  const totals = new Map(buckets.map((bucket) => [bucket.key, 0]));
  rows.forEach((row) => {
    const key = (date(row) || "").slice(0, length);
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + value(row));
  });
  return buckets.map((bucket) => ({ label: bucket.label, fullLabel: bucket.fullLabel, value: totals.get(bucket.key) ?? 0 }));
}

function groupSum(rows: Payment[], keyOf: (row: Payment) => string): Array<[string, number]> {
  const totals = new Map<string, number>();
  // In the clinic's currency: a payment in the other one counts at the rate of its day.
  rows.forEach((row) => totals.set(keyOf(row), (totals.get(keyOf(row)) ?? 0) + baseAmount(row)));
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
  const { t } = useI18n();
  const r = t.reports;
  const { settings, money, moneyTotals, currency, toMain } = useSettings();
  const [range, setRange] = useState<Range>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [failed, setFailed] = useState("");
  const [version, setVersion] = useState(0);

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
        const [payments, outstanding, plans, appointments, started] = await Promise.all([
          getList<Payment>(
            "Payment",
            ["name", "patient", "patient_name", "payment_date", "amount", "currency", "exchange_rate", "base_amount", "payment_method", "treatment_type", "treatment_plan"],
            { filters: filters.length ? filters : undefined, orderBy: "payment_date desc, name desc", limit: 0 },
          ),
          getList<TreatmentPlan>(
            "Treatment Plan",
            ["name", "patient", "patient_name", "treatment_type", "tooth_number", "status", "currency", "total_cost", "paid_amount", "remaining_amount"],
            { filters: [["remaining_amount", ">", 0]], orderBy: "remaining_amount desc", limit: 0 },
          ),
          getList<TreatmentPlan>("Treatment Plan", ["name", "doctor_name"], { limit: 0 }),
          getList<Appointment>("Appointment", ["name", "status", "appointment_date"], {
            filters: [
              ...(start ? [["appointment_date", ">=", start] as FilterRow] : []),
              ["appointment_date", "<=", end && end < today ? end : today],
            ],
            limit: 0,
          }),
          // Plans started in the period (Frappe's own creation time).
          getList<TreatmentPlan>("Treatment Plan", ["name", "treatment_type", "status", "creation"], {
            filters: [
              ...(start ? [["creation", ">=", start] as FilterRow] : []),
              ...(end ? [["creation", "<", addDays(end, 1)] as FilterRow] : []),
              ["status", "!=", "Cancelled"],
            ],
            limit: 0,
          }),
        ]);
        const planDoctors = Object.fromEntries(plans.map((plan) => [plan.name, plan.doctor_name || ""]));
        if (!cancelled) {
          setData({ key, payments, outstanding, planDoctors, appointments, plans: started });
          setFailed("");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setFailed(errorMessage(err, messages().reports.loadFailed));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  if (settings.enable_financial_reports === 0) {
    return (
      <PageContainer section="reports" narrow>
        <Card>
          <EmptyState
            icon={TrendingUp}
            title={r.offTitle}
            text={r.offText}
          />
        </Card>
      </PageContainer>
    );
  }

  const retry = () => {
    setFailed("");
    setVersion((v) => v + 1);
  };
  // Never report zeros for a period that could not load.
  if (!data)
    return failed ? (
      <PageContainer section="reports">
        <PageHeader title={r.shortTitle} />
        <LoadError message={failed} onRetry={retry} />
      </PageContainer>
    ) : (
      <PageLoading />
    );

  const stale = data.key !== key;
  const payments = data.payments;
  // Totals in the clinic's currency (each payment at the rate of its day), and what came in, per currency.
  const revenue = payments.reduce((sum, row) => sum + baseAmount(row), 0);
  const received = sumByCurrency(payments, (row) => Number(row.amount) || 0, (row) => currencyOf(row, currency));
  const twoCurrencies = totalsOrder(received, currency).length > 1;
  // What is left on a dollar plan counts at today's rate.
  const outstandingTotal = data.outstanding.reduce((sum, row) => sum + toMain(row.remaining_amount, row.currency), 0);
  const outstandingInOther = data.outstanding.some((row) => currencyOf(row, currency) !== currency);
  // Biggest first, comparing every plan in the clinic's currency (the server sorts the raw numbers).
  const outstanding = [...data.outstanding].sort((a, b) => toMain(b.remaining_amount, b.currency) - toMain(a.remaining_amount, a.currency));
  // Grouped by the label shown, so saved English values appear in the screen's language.
  const byType = groupSum(payments, (row) =>
    row.treatment_type ? label(t.enums.treatmentType, row.treatment_type) : r.noPlan,
  ).sort((a, b) => b[1] - a[1]);
  const byMethod = groupSum(payments, (row) =>
    row.payment_method ? label(t.enums.paymentMethod, row.payment_method) : r.otherMethod,
  ).sort((a, b) => b[1] - a[1]);
  const byDoctor = groupSum(payments, (row) =>
    row.treatment_plan ? data.planDoctors[row.treatment_plan] || r.noDoctor : r.generalPayments,
  ).sort((a, b) => b[1] - a[1]);
  const outcome = (status: string) => data.appointments.filter((a) => a.status === status).length;
  const completed = outcome("Completed");
  const noShows = outcome("No Show");
  const cancelledVisits = outcome("Cancelled");
  const stillOpen = outcome("Scheduled") + outcome("Confirmed");
  const noShowRate = completed + noShows > 0 ? Math.round((noShows / (completed + noShows)) * 100) : null;
  // The charts: from the period's start (or the first record) to its end (or today).
  const chartTo = to || todayISO();
  const firstDate = [...payments.map((row) => row.payment_date), ...data.appointments.map((a) => a.appointment_date)]
    .filter(Boolean)
    .sort()[0];
  const chartFrom = from || (firstDate && firstDate > addMonths(chartTo, -MOST_MONTHS) ? firstDate : addMonths(chartTo, -MOST_MONTHS + 1));
  const buckets = chartFrom && chartFrom <= chartTo ? chartBuckets(chartFrom, chartTo) : [];
  const daily = (buckets[0]?.key.length ?? 10) === 10;
  const revenueSeries = sumInto(buckets, payments, (row) => row.payment_date, baseAmount);
  const visitSeries = sumInto(buckets, data.appointments.filter((a) => a.status !== "Cancelled"), (a) => a.appointment_date, () => 1);
  const typeCounts = new Map<string, number>();
  data.plans.forEach((plan) => typeCounts.set(plan.treatment_type || "", (typeCounts.get(plan.treatment_type || "") ?? 0) + 1));
  const typeSeries: ChartPoint[] = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, value]) => ({ label: type ? label(t.enums.treatmentType, type) : r.otherType, value }));
  const rangeLabel =
    from || to ? r.rangeText(from ? formatDate(from) : r.theStart, to ? formatDate(to) : r.today) : r.allTime;

  const exportPayments = () =>
    downloadCsv(
      `payments-${from || "start"}-to-${to || "today"}.csv`,
      r.csvPayments,
      payments.map((row) => [
        row.name,
        row.payment_date,
        row.patient_name || row.patient,
        label(t.enums.treatmentType, row.treatment_type),
        label(t.enums.paymentMethod, row.payment_method),
        Number(row.amount) || 0,
        currencyOf(row, currency),
        Number(row.exchange_rate) || "",
        baseAmount(row),
      ]),
    );

  const exportOutstanding = () =>
    downloadCsv(
      `outstanding-${todayISO()}.csv`,
      r.csvOutstanding,
      outstanding.map((row) => [
        row.name, row.patient_name || row.patient, label(t.enums.treatmentType, row.treatment_type), row.tooth_number || "",
        label(t.enums.treatmentStatus, row.status),
        currencyOf(row, currency),
        Number(row.total_cost) || 0, Number(row.paid_amount) || 0, Number(row.remaining_amount) || 0,
      ]),
    );

  return (
    <PageContainer section="reports">
      <PageHeader title={r.title} subtitle={r.subtitle(rangeLabel)} icon={BarChart2} section="reports" />

      <Toolbar>
        <SelectInput value={range} onChange={(e) => setRange(e.target.value as Range)} className="sm:w-48" aria-label={r.period}>
          {RANGES.map((value) => (
            <option key={value} value={value}>
              {r.ranges[value]}
            </option>
          ))}
        </SelectInput>
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <TextInput type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} aria-label={r.fromDate} className="sm:w-40" />
            <span className="text-gray-500 text-sm">{r.to}</span>
            <TextInput type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} aria-label={r.toDate} className="sm:w-40" />
          </div>
        )}
      </Toolbar>

      <div className={stale ? "opacity-60 transition-opacity space-y-6" : "space-y-6"}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={r.revenue}
            value={money(revenue)}
            icon={TrendingUp}
            section="money"
            order={0}
            hint={twoCurrencies ? r.received(moneyTotals(received)) : undefined}
          />
          <StatCard title={r.payments} value={num(payments.length)} icon={CreditCard} section="reports" order={1} />
          <StatCard
            title={r.average}
            value={money(payments.length ? revenue / payments.length : 0)}
            icon={Receipt}
            section="patients"
            order={2}
          />
          <StatCard title={r.outstanding} value={money(outstandingTotal)} icon={AlertCircle} tone="red" hint={outstandingInOther ? `${r.outstandingHint}${t.common.dot}${r.outstandingNote}` : r.outstandingHint} order={3} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title={r.byTreatment} icon={Receipt} section="treatments">
            <Bars rows={byType} money={money} empty={r.noPayments} />
          </Card>
          <Card title={r.byMethod} icon={CreditCard} section="money">
            <Bars rows={byMethod} money={money} empty={r.noPayments} />
          </Card>
        </div>

        {/* The charts: money over time, visits per day (or month) and the kinds of treatment started. */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card title={r.revenueChart} icon={TrendingUp} section="money">
            <BarChart
              label={r.revenueChartLabel(settings.currency || "IQD")}
              data={revenueSeries}
              format={(value) => formatCompact(value)}
              empty={r.noPayments}
            />
            <p className="text-xs text-gray-500 mt-3">
              {daily ? r.byDayNote(settings.currency || "IQD") : r.byMonthNote(settings.currency || "IQD")}
            </p>
          </Card>
          <Card title={daily ? r.visitsChart : r.visitsChartMonths} icon={CalendarDays} section="appointments">
            <BarChart label={r.visitsChartLabel} data={visitSeries} empty={r.noVisits} />
            <p className="text-xs text-gray-500 mt-3">{r.visitsNote}</p>
          </Card>
        </div>
        <Card title={r.typesChart} icon={PieChart} section="treatments">
          <DonutChart label={r.typesChartLabel} data={typeSeries} centerLabel={r.plans} empty={r.noPlans} />
          <p className="text-xs text-gray-500 mt-3">{r.typesNote}</p>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title={r.byDoctor} icon={BriefcaseMedical} section="system">
            <Bars rows={byDoctor} money={money} empty={r.noPayments} />
          </Card>
          <Card title={r.appointments} icon={CalendarCheck} section="appointments">
            {data.appointments.length === 0 ? (
              <p className="text-sm text-gray-500">{r.noAppointments}</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className={noShowRate !== null && noShowRate >= 15 ? "text-3xl font-semibold text-red-600" : "text-3xl font-semibold text-gray-800"}>
                    {noShowRate === null ? t.common.dash : r.rate(noShowRate)}
                  </span>
                  <span className="text-sm text-gray-500">{r.rateText}</span>
                </div>
                <Bars
                  rows={[
                    [r.completed, completed],
                    [r.noShow, noShows],
                    [r.cancelled, cancelledVisits],
                    [r.stillOpen, stillOpen],
                  ]}
                  money={(n) => num(n)}
                  empty=""
                />
              </div>
            )}
          </Card>
        </div>

        <Card
          title={r.latestTitle}
          icon={Receipt}
          section="money"
          flush
          actions={
            payments.length > 0 && (
              <Button size="sm" variant="secondary" icon={Download} onClick={exportPayments}>
                {r.exportCsv}
              </Button>
            )
          }
        >
          <Table>
            <thead>
              <tr>
                <Th>{r.colDate}</Th>
                <Th>{r.colPatient}</Th>
                <Th>{r.colTreatment}</Th>
                <Th>{r.colMethod}</Th>
                <Th className="text-end">{r.colAmount}</Th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <TableMessage colSpan={5}>{r.noPayments}</TableMessage>
              ) : (
                payments.slice(0, 10).map((row) => (
                  <tr key={row.name} className="hover:bg-gray-50">
                    <Td className="whitespace-nowrap">
                      <Link href={paymentHref(row.name)} className="text-gray-800 hover:text-primary-600">
                        {formatDate(row.payment_date)}
                      </Link>
                    </Td>
                    <Td label={r.colPatient}>
                      <Link href={patientHref(row.patient)} className="text-gray-700 hover:text-primary-600">
                        {row.patient_name || row.patient}
                      </Link>
                    </Td>
                    <Td label={r.colTreatment}>{row.treatment_type ? label(t.enums.treatmentType, row.treatment_type) : t.common.dash}</Td>
                    <Td label={r.colMethod}>
                      <StatusBadge kind="method" status={row.payment_method} />
                    </Td>
                    <Td label={r.colAmount} className="text-end font-medium text-green-600 whitespace-nowrap">{money(row.amount, row.currency)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
          {payments.length > 10 && (
            <p className="px-5 py-3 text-xs text-gray-500">{r.showingLatest(10, payments.length)}</p>
          )}
        </Card>

        <Card
          title={r.outstandingTitle}
          icon={AlertCircle}
          section="red"
          flush
          actions={
            data.outstanding.length > 0 && (
              <Button size="sm" variant="secondary" icon={Download} onClick={exportOutstanding}>
                {r.exportCsv}
              </Button>
            )
          }
        >
          <Table>
            <thead>
              <tr>
                <Th>{r.colPatient}</Th>
                <Th>{r.colTreatment}</Th>
                <Th>{r.colStatus}</Th>
                <Th className="text-end">{r.colTotalCost}</Th>
                <Th className="text-end">{r.colPaid}</Th>
                <Th className="text-end">{r.colRemaining}</Th>
              </tr>
            </thead>
            <tbody>
              {data.outstanding.length === 0 ? (
                <TableMessage colSpan={6}>{r.noOutstanding}</TableMessage>
              ) : (
                outstanding.map((row) => (
                  <tr key={row.name} className="hover:bg-gray-50">
                    <Td>
                      <Link href={patientHref(row.patient)} className="font-medium text-gray-800 hover:text-primary-600">
                        {row.patient_name || row.patient}
                      </Link>
                    </Td>
                    <Td label={r.colTreatment}>
                      <Link href={treatmentHref(row.name)} className="text-gray-700 hover:text-primary-600">
                        {label(t.enums.treatmentType, row.treatment_type)}
                        {row.tooth_number ? ` · ${row.tooth_number}` : ""}
                      </Link>
                    </Td>
                    <Td label={r.colStatus}>
                      <StatusBadge kind="treatment" status={row.status} />
                    </Td>
                    <Td label={r.colTotalCost} className="text-end whitespace-nowrap">{money(row.total_cost, row.currency)}</Td>
                    <Td label={r.colPaid} className="text-end whitespace-nowrap text-green-600">{money(row.paid_amount, row.currency)}</Td>
                    <Td label={r.colRemaining} className="text-end whitespace-nowrap font-semibold text-red-600">{money(row.remaining_amount, row.currency)}</Td>
                  </tr>
                ))
              )}
            </tbody>
            {data.outstanding.length > 0 && (
              <tfoot>
                <tr>
                  <Td className="font-semibold text-gray-800">{r.total}</Td>
                  <Td />
                  <Td />
                  <Td />
                  <Td />
                  <Td label={r.colRemaining} className="text-end whitespace-nowrap font-semibold text-red-600">{money(outstandingTotal)}</Td>
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
      {rows.map(([name, amount]) => (
        <div key={name}>
          <div className="flex justify-between gap-3 text-sm mb-1">
            <span className="text-gray-600 font-medium truncate">{name}</span>
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
