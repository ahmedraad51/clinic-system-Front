"use client";

import { useEffect, useState } from "react";
import { Download, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import RequirePermission from "@/components/Guard";
import { useRecordDialogs } from "@/components/RecordDialogs";
import {
  Badge, Button, Card, ClearFiltersButton, PageContainer, PageHeader, Pagination, SearchInput, SelectInput, StatusBadge, Table,
  TableError, TableLoading, TableMessage, Td, TextInput, Th, Toolbar,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { label } from "@/i18n";
import { bumpData, useDataVersion } from "@/lib/dataVersion";
import { deleteDoc, errorMessage, getList, type FilterRow } from "@/lib/frappe";
import { display, downloadCsv, formatDate } from "@/lib/format";
import { baseAmount, currencyOf, sumByCurrency, type MoneyTotals } from "@/lib/currency";
import { searchFilters, useDebounced, usePagedList } from "@/lib/hooks";
import { EXPENSE_CATEGORIES, type Expense } from "@/lib/types";

const FIELDS = [
  "name", "expense_date", "category", "amount", "currency", "exchange_rate", "base_amount", "doctor", "doctor_name",
  "description", "paid_to", "payment_method",
];

export default function ExpensesPage() {
  return (
    <RequirePermission permission="view_expenses">
      <ExpensesList />
    </RequirePermission>
  );
}

/** What the clinic spends: a list with search, category and dates, the total, and add / change / delete in a dialog. */
function ExpensesList() {
  const { t } = useI18n();
  const x = t.expenses;
  const { can } = useSession();
  const canEdit = can("add_expenses");
  const { money, moneyTotals, currency } = useSettings();
  const toast = useToast();
  const openDialog = useRecordDialogs();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sum, setSum] = useState<{ key: string; total: MoneyTotals } | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [busy, setBusy] = useState(false);
  const debounced = useDebounced(search);

  const filters: FilterRow[] = [
    ...(category ? [["category", "=", category] as FilterRow] : []),
    ...(from ? [["expense_date", ">=", from] as FilterRow] : []),
    ...(to ? [["expense_date", "<=", to] as FilterRow] : []),
  ];
  const orFilters = searchFilters(debounced, ["description", "paid_to", "doctor_name", "name"]);
  const list = usePagedList<Expense>("Expense", {
    fields: FIELDS,
    filters: filters.length ? filters : undefined,
    orFilters,
    orderBy: "expense_date desc, name desc",
  });

  // The total of every expense that matches, each currency on its own.
  const sumKey = JSON.stringify({ filters, orFilters });
  const saved = useDataVersion();
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const q = JSON.parse(sumKey) as { filters: FilterRow[]; orFilters?: FilterRow[] };
      try {
        const rows = await getList<Expense>("Expense", ["amount", "currency"], {
          filters: q.filters.length ? q.filters : undefined,
          orFilters: q.orFilters,
          limit: 0,
        });
        if (!cancelled) setSum({ key: sumKey, total: sumByCurrency(rows, (row) => Number(row.amount) || 0, (row) => currencyOf(row, currency)) });
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [sumKey, currency, saved]);

  const filtered = Boolean(debounced.trim() || category || from || to);
  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setFrom("");
    setTo("");
  };
  const what = (row: Expense) => row.description || label(t.enums.expenseCategory, row.category);

  const exportCsv = async () => {
    try {
      const rows = await getList<Expense>("Expense", FIELDS, {
        filters: filters.length ? filters : undefined,
        orFilters,
        orderBy: "expense_date desc, name desc",
        limit: 0,
      });
      downloadCsv(
        `expenses-${from || "start"}-to-${to || "today"}.csv`,
        x.csvHeader,
        rows.map((row) => [
          row.name,
          row.expense_date,
          label(t.enums.expenseCategory, row.category),
          row.description || "",
          row.paid_to || "",
          row.doctor_name || x.wholeClinic,
          row.payment_method ? label(t.enums.paymentMethod, row.payment_method) : "",
          Number(row.amount) || 0,
          currencyOf(row, currency),
          Number(row.exchange_rate) || "",
          baseAmount(row),
        ]),
      );
    } catch (err) {
      toast.error(errorMessage(err, t.errors.generic));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteDoc("Expense", deleting.name);
      toast.success(x.deleted);
      setDeleting(null);
      bumpData();
    } catch (err) {
      toast.error(errorMessage(err, x.deleteFailed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContainer section="money">
      <PageHeader
        icon={Wallet}
        section="money"
        title={x.title}
        subtitle={
          sum ? (
            <>
              {filtered ? x.totalFiltered : x.totalAll}
              <span data-testid="expenses-total" className={sum.key === sumKey ? "font-semibold text-gray-800" : "text-gray-500"}>
                {moneyTotals(sum.total)}
              </span>
            </>
          ) : (
            x.subtitle
          )
        }
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={list.total === 0}>
              {x.exportCsv}
            </Button>
            {canEdit && (
              <Button icon={Plus} onClick={() => openDialog({ kind: "newExpense" })}>
                {x.add}
              </Button>
            )}
          </>
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder={x.searchPlaceholder} />
        <SelectInput value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-52" aria-label={x.categoryFilter}>
          <option value="">{x.allCategories}</option>
          {EXPENSE_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {label(t.enums.expenseCategory, value)}
            </option>
          ))}
        </SelectInput>
        <div className="flex items-center gap-2 min-w-0">
          <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={x.fromDate} className="min-w-0 flex-1 sm:flex-none sm:w-40" />
          <span className="text-gray-500 text-sm">{x.to}</span>
          <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label={x.toDate} className="min-w-0 flex-1 sm:flex-none sm:w-40" />
        </div>
      </Toolbar>

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>{x.colDate}</Th>
              <Th>{x.colCategory}</Th>
              <Th>{x.colWhat}</Th>
              <Th>{x.colDoctor}</Th>
              <Th>{x.colMethod}</Th>
              <Th className="text-end">{x.colAmount}</Th>
              {canEdit && <Th className="w-0" />}
            </tr>
          </thead>
          <tbody>
            {list.error ? (
              <TableError colSpan={canEdit ? 7 : 6} message={list.error} onRetry={list.reload} />
            ) : list.initialLoading ? (
              <TableLoading colSpan={canEdit ? 7 : 6} />
            ) : list.rows.length === 0 ? (
              <TableMessage icon={Wallet} colSpan={canEdit ? 7 : 6}>
                {filtered ? (
                  <>
                    {x.noMatch}
                    <ClearFiltersButton onClick={clearFilters} />
                  </>
                ) : (
                  x.none
                )}
              </TableMessage>
            ) : (
              list.rows.map((row) => (
                <tr key={row.name} className={list.loading ? "opacity-60" : "hover:bg-gray-50"}>
                  <Td className="whitespace-nowrap">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => openDialog({ kind: "editExpense", id: row.name })}
                        className="font-medium text-gray-800 hover:text-primary-600 text-start pointer-coarse:min-h-11"
                      >
                        {formatDate(row.expense_date)}
                      </button>
                    ) : (
                      <span className="font-medium text-gray-800">{formatDate(row.expense_date)}</span>
                    )}
                    <span className="block text-xs text-gray-500">{row.name}</span>
                  </Td>
                  <Td label={x.colCategory}>
                    <Badge tone="gray">{label(t.enums.expenseCategory, row.category)}</Badge>
                  </Td>
                  <Td label={x.colWhat}>
                    <span className="block text-gray-800">{display(row.description)}</span>
                    {row.paid_to && <span className="block text-xs text-gray-500">{row.paid_to}</span>}
                  </Td>
                  <Td label={x.colDoctor}>{row.doctor ? row.doctor_name || row.doctor : <span className="text-gray-500">{x.wholeClinic}</span>}</Td>
                  <Td label={x.colMethod}>{row.payment_method ? <StatusBadge kind="method" status={row.payment_method} /> : display("")}</Td>
                  <Td label={x.colAmount} className="text-end font-medium text-red-600 whitespace-nowrap">
                    {money(row.amount, row.currency)}
                  </Td>
                  {canEdit && (
                    <Td className="text-end whitespace-nowrap">
                      <span className="inline-flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Pencil}
                          aria-label={x.editLabel(what(row))}
                          onClick={() => openDialog({ kind: "editExpense", id: row.name })}
                        />
                        <Button size="sm" variant="ghost" icon={Trash2} aria-label={x.deleteLabel(what(row))} onClick={() => setDeleting(row)} />
                      </span>
                    </Td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </Table>
        {!list.error && <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />}
      </Card>

      <ConfirmDialog
        open={deleting !== null}
        title={x.deleteTitle}
        message={<p>{deleting ? x.deleteText(what(deleting)) : ""}</p>}
        confirmLabel={t.common.delete}
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </PageContainer>
  );
}
