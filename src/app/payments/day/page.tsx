"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, Receipt } from "lucide-react";
import ClinicLetterhead from "@/components/ClinicLetterhead";
import RequirePermission from "@/components/Guard";
import {
  Alert, Button, Card, EmptyState, Field, PageContainer, PageHeader, PageLoading, StatusBadge, Table, Td, TextInput, Th,
} from "@/components/ui";
import { useSettings } from "@/context/SettingsContext";
import { errorMessage, getList } from "@/lib/frappe";
import { formatDate, formatLongDate, todayISO } from "@/lib/format";
import { patientHref, paymentHref } from "@/lib/links";
import { PAYMENT_METHODS, type Payment } from "@/lib/types";

export default function DayReportPage() {
  return (
    <RequirePermission permission="view_payments">
      <Suspense fallback={<PageLoading />}>
        <DayReport />
      </Suspense>
    </RequirePermission>
  );
}

/**
 * The end-of-day cash report: every payment of one day, totals by method, and the cash that should be in
 * the drawer, with lines to sign when the day is closed. ?date=YYYY-MM-DD picks the day (default today).
 */
function DayReport() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { money } = useSettings();
  const param = searchParams.get("date") || "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : todayISO();
  const [result, setResult] = useState<{ date: string; rows: Payment[]; error: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<Payment>(
          "Payment",
          ["name", "patient", "patient_name", "treatment_type", "amount", "payment_method", "notes"],
          { filters: [["payment_date", "=", date]], orderBy: "name asc", limit: 0 },
        );
        if (!cancelled) setResult({ date, rows, error: "" });
      } catch (err) {
        console.error(err);
        if (!cancelled) setResult({ date, rows: [], error: errorMessage(err, "Could not load the payments.") });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const ready = result?.date === date ? result : null;
  const rows = ready?.rows ?? [];
  const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const byMethod = PAYMENT_METHODS.map((method) => {
    const matching = rows.filter((row) => row.payment_method === method);
    return { method, count: matching.length, total: matching.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) };
  });

  return (
    <PageContainer narrow>
      <PageHeader
        title="End-of-Day Report"
        subtitle={formatLongDate(date)}
        back={{ href: "/payments", label: "Payments" }}
        actions={
          <Button icon={Printer} onClick={() => window.print()} disabled={!ready}>
            Print
          </Button>
        }
      />

      <div className="print:hidden">
        <Field label="Day" className="max-w-xs">
          <TextInput
            type="date"
            value={date}
            max={todayISO()}
            onChange={(event) => {
              if (event.target.value) router.replace(`/payments/day?date=${event.target.value}`, { scroll: false });
            }}
          />
        </Field>
      </div>

      {ready?.error && <Alert tone="red">{ready.error}</Alert>}

      <Card className="print:shadow-none print:border-0">
        <ClinicLetterhead kind="End-of-day report" reference={formatDate(date)} />

        {!ready ? (
          <PageLoading />
        ) : (
          <div className="space-y-6 pt-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {byMethod.map((row) => (
                <div key={row.method} className="rounded-xl border border-gray-100 px-4 py-3">
                  <p className="text-xs text-gray-500">{row.method}</p>
                  <p className="text-lg font-bold text-gray-800">{money(row.total)}</p>
                  <p className="text-xs text-gray-500">{row.count === 1 ? "1 payment" : `${row.count} payments`}</p>
                </div>
              ))}
              <div className="rounded-xl bg-primary-50 px-4 py-3 print:bg-white print:border print:border-gray-300">
                <p className="text-xs text-primary-800">Total</p>
                <p className="text-lg font-bold text-primary-900">{money(total)}</p>
                <p className="text-xs text-primary-800">{rows.length === 1 ? "1 payment" : `${rows.length} payments`}</p>
              </div>
            </div>

            {rows.length === 0 ? (
              <EmptyState icon={Receipt} title="No payments on this day" />
            ) : (
              <div className="-mx-5 sm:-mx-6 border-t border-gray-100">
                <Table>
                  <thead>
                    <tr>
                      <Th>Patient</Th>
                      <Th>For</Th>
                      <Th>Method</Th>
                      <Th>Receipt</Th>
                      <Th className="text-end">Amount</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.name}>
                        <Td>
                          <Link href={patientHref(row.patient)} className="font-medium text-gray-800 hover:text-primary-600">
                            {row.patient_name || row.patient}
                          </Link>
                        </Td>
                        <Td label="For">{row.treatment_type || "General payment"}</Td>
                        <Td label="Method">
                          <StatusBadge kind="method" status={row.payment_method} />
                        </Td>
                        <Td label="Receipt">
                          <Link href={paymentHref(row.name)} className="text-gray-500 hover:text-primary-600">
                            {row.name}
                          </Link>
                        </Td>
                        <Td label="Amount" className="text-end whitespace-nowrap font-medium text-gray-800">
                          {money(row.amount)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 px-4 py-3 text-sm flex flex-wrap justify-between gap-2">
              <span className="text-gray-600">Cash that should be in the drawer (without the opening float)</span>
              <span className="font-bold text-gray-800">{money(byMethod.find((m) => m.method === "Cash")?.total ?? 0)}</span>
            </div>

            <div className="pt-8 grid grid-cols-2 gap-10 text-xs text-gray-500">
              <div className="border-t border-gray-300 pt-2">Counted by</div>
              <div className="border-t border-gray-300 pt-2">Checked by</div>
            </div>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
