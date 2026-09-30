"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, FileText, Plus, Receipt } from "lucide-react";
import { PatientLink } from "@/components/Avatar";
import RequirePermission from "@/components/Guard";
import {
  Card, ClearFiltersButton, ClickableRow, LinkButton, PageContainer, PageHeader, Pagination, SearchInput,
  SelectInput, StatusBadge, Table, TableError, TableLoading, TableMessage, Td, TextInput, Th, Toolbar,
} from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { label } from "@/i18n";
import { getList, type FilterRow } from "@/lib/frappe";
import { display, formatDate } from "@/lib/format";
import { searchFilters, useDebounced, usePagedList, usePatientLooks } from "@/lib/hooks";
import { paymentHref, treatmentHref } from "@/lib/links";
import { PAYMENT_METHODS, type Payment } from "@/lib/types";

export default function PaymentsPage() {
  return (
    <RequirePermission permission="view_payments">
      <PaymentsList />
    </RequirePermission>
  );
}

function PaymentsList() {
  const { t } = useI18n();
  const p = t.payments;
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
  const looks = usePatientLooks(list.rows.map((row) => row.patient));

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
  const clearFilters = () => {
    setSearch("");
    setMethod("");
    setFrom("");
    setTo("");
  };

  return (
    <PageContainer section="money">
      <PageHeader icon={CreditCard} section="money"
        title={p.title}
        subtitle={
          sum ? (
            <>
              {filtered ? p.totalFiltered : p.totalAll}
              <span className={sum.key === sumKey ? "font-semibold text-gray-800" : "text-gray-500"}>{money(sum.total)}</span>
            </>
          ) : (
            p.subtitle
          )
        }
        actions={
          <>
            <LinkButton href="/payments/day" variant="secondary" icon={FileText}>
              {p.dayReport}
            </LinkButton>
            {can("add_payments") && (
              <LinkButton href="/payments/new" icon={Plus}>
                {p.add}
              </LinkButton>
            )}
          </>
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder={p.searchPlaceholder} />
        <SelectInput value={method} onChange={(e) => setMethod(e.target.value)} className="sm:w-44" aria-label={p.methodFilter}>
          <option value="">{p.allMethods}</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {label(t.enums.paymentMethod, m)}
            </option>
          ))}
        </SelectInput>
        <div className="flex items-center gap-2 min-w-0">
          <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={p.fromDate} className="min-w-0 flex-1 sm:flex-none sm:w-40" />
          <span className="text-gray-500 text-sm">{p.to}</span>
          <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label={p.toDate} className="min-w-0 flex-1 sm:flex-none sm:w-40" />
        </div>
      </Toolbar>

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>{p.colDate}</Th>
              <Th>{p.colPatient}</Th>
              <Th>{p.colTreatment}</Th>
              <Th>{p.colMethod}</Th>
              <Th className="text-end">{p.colAmount}</Th>
            </tr>
          </thead>
          <tbody>
            {list.error ? (
              <TableError colSpan={5} message={list.error} onRetry={list.reload} />
            ) : list.initialLoading ? (
              <TableLoading colSpan={5} />
            ) : list.rows.length === 0 ? (
              <TableMessage icon={Receipt} colSpan={5}>
                {filtered ? (
                  <>
                    {p.noMatch}
                    <ClearFiltersButton onClick={clearFilters} />
                  </>
                ) : (
                  p.none
                )}
              </TableMessage>
            ) : (
              list.rows.map((pay) => (
                <ClickableRow key={pay.name} href={paymentHref(pay.name)} dimmed={list.loading}>
                  <Td className="whitespace-nowrap">
                    <Link href={paymentHref(pay.name)} className="font-medium text-gray-800 hover:text-primary-600">
                      {formatDate(pay.payment_date)}
                    </Link>
                    <span className="block text-xs text-gray-500">{pay.name}</span>
                  </Td>
                  <Td label={p.colPatient}>
                    <PatientLink id={pay.patient} name={pay.patient_name} look={looks[pay.patient]} />
                  </Td>
                  <Td label={p.colTreatment}>
                    {pay.treatment_plan ? (
                      <Link href={treatmentHref(pay.treatment_plan)} className="text-gray-700 hover:text-primary-600">
                        {pay.treatment_type ? label(t.enums.treatmentType, pay.treatment_type) : pay.treatment_plan}
                      </Link>
                    ) : (
                      display("")
                    )}
                  </Td>
                  <Td label={p.colMethod}>
                    <StatusBadge kind="method" status={pay.payment_method} />
                  </Td>
                  <Td label={p.colAmount} className="text-end font-medium text-green-600 whitespace-nowrap">{money(pay.amount)}</Td>
                </ClickableRow>
              ))
            )}
          </tbody>
        </Table>
        {!list.error && <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />}
      </Card>
    </PageContainer>
  );
}
