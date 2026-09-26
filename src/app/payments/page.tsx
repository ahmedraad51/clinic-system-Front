"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Plus, Receipt } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Alert, Card, ClickableRow, LinkButton, PageContainer, PageHeader, Pagination,
  SearchInput, SelectInput, StatusBadge, Table, TableMessage, Td, TextInput, Th, Toolbar,
} from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { getList, type FilterRow } from "@/lib/frappe";
import { display, formatDate } from "@/lib/format";
import { searchFilters, useDebounced, usePagedList } from "@/lib/hooks";
import { patientHref, paymentHref, treatmentHref } from "@/lib/links";
import { PAYMENT_METHODS, type Payment } from "@/lib/types";

export default function PaymentsPage() {
  return (
    <RequirePermission permission="view_payments">
      <PaymentsList />
    </RequirePermission>
  );
}

function PaymentsList() {
  const { can } = useSession();
  const { money } = useSettings();
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sum, setSum] = useState<{ key: string; total: number } | null>(null);
  const debounced = useDebounced(search);

  const filters: FilterRow[] = [
    ...(method ? [["payment_method", "=", method] as FilterRow] : []),
    ...(from ? [["payment_date", ">=", from] as FilterRow] : []),
    ...(to ? [["payment_date", "<=", to] as FilterRow] : []),
  ];
  const orFilters = searchFilters(debounced, ["patient_name", "treatment_type", "name", "notes"]);

  const list = usePagedList<Payment>("Payment", {
    fields: ["name", "patient", "patient_name", "treatment_plan", "treatment_type", "payment_date", "amount", "payment_method"],
    filters: filters.length ? filters : undefined,
    orFilters,
    orderBy: "payment_date desc, name desc",
  });

  // The total of every payment that matches, not just this page.
  const sumKey = JSON.stringify({ filters, orFilters });
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const q = JSON.parse(sumKey) as { filters: FilterRow[]; orFilters?: FilterRow[] };
      try {
        const rows = await getList<Payment>("Payment", ["amount"], {
          filters: q.filters.length ? q.filters : undefined,
          orFilters: q.orFilters,
          limit: 0,
        });
        if (!cancelled) setSum({ key: sumKey, total: rows.reduce((total, row) => total + (Number(row.amount) || 0), 0) });
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [sumKey]);

  const filtered = Boolean(debounced.trim() || method || from || to);

  return (
    <PageContainer>
      <PageHeader
        title="Payments"
        subtitle={
          sum ? (
            <>
              {filtered ? "Total for these filters: " : "Total received: "}
              <span className={sum.key === sumKey ? "font-semibold text-gray-800" : "text-gray-400"}>{money(sum.total)}</span>
            </>
          ) : (
            "Every payment received, newest first."
          )
        }
        actions={
          <>
            <LinkButton href="/payments/day" variant="secondary" icon={FileText}>
              End-of-Day Report
            </LinkButton>
            {can("add_payments") && (
              <LinkButton href="/payments/new" icon={Plus}>
                Add Payment
              </LinkButton>
            )}
          </>
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by patient, treatment or note..." />
        <SelectInput value={method} onChange={(e) => setMethod(e.target.value)} className="sm:w-44" aria-label="Payment method">
          <option value="">All methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </SelectInput>
        <div className="flex items-center gap-2 min-w-0">
          <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" className="min-w-0 flex-1 sm:flex-none sm:w-40" />
          <span className="text-gray-400 text-sm">to</span>
          <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" className="min-w-0 flex-1 sm:flex-none sm:w-40" />
        </div>
      </Toolbar>

      {list.error && <Alert tone="red">{list.error}</Alert>}

      <Card flush>
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
            {list.initialLoading ? (
              <TableMessage colSpan={5}>Loading...</TableMessage>
            ) : list.rows.length === 0 ? (
              <TableMessage icon={Receipt} colSpan={5}>{filtered ? "No payments match these filters." : "No payments yet."}</TableMessage>
            ) : (
              list.rows.map((pay) => (
                <ClickableRow key={pay.name} href={paymentHref(pay.name)} dimmed={list.loading}>
                  <Td className="whitespace-nowrap">
                    <Link href={paymentHref(pay.name)} className="font-medium text-gray-800 hover:text-primary-600">
                      {formatDate(pay.payment_date)}
                    </Link>
                    <span className="block text-xs text-gray-400">{pay.name}</span>
                  </Td>
                  <Td label="Patient">
                    <Link href={patientHref(pay.patient)} className="text-gray-700 hover:text-primary-600">
                      {pay.patient_name || pay.patient}
                    </Link>
                  </Td>
                  <Td label="Treatment">
                    {pay.treatment_plan ? (
                      <Link href={treatmentHref(pay.treatment_plan)} className="text-gray-700 hover:text-primary-600">
                        {pay.treatment_type || pay.treatment_plan}
                      </Link>
                    ) : (
                      display("")
                    )}
                  </Td>
                  <Td label="Method">
                    <StatusBadge kind="method" status={pay.payment_method} />
                  </Td>
                  <Td label="Amount" className="text-end font-medium text-green-600 whitespace-nowrap">{money(pay.amount)}</Td>
                </ClickableRow>
              ))
            )}
          </tbody>
        </Table>
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />
      </Card>
    </PageContainer>
  );
}
