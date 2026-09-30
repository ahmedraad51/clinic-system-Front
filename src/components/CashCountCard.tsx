"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { Alert, Badge, Button, Field, LoadError, NumberInput, PageLoading, Table, Td, TextArea, Th } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { messages } from "@/i18n";
import { cashStateLabel, compareCash, type CashState } from "@/lib/cashCount";
import { createDoc, errorMessage, getList, updateDoc } from "@/lib/frappe";
import { currencyDecimals, formatDate, formatDateTime } from "@/lib/format";
import type { CashCount } from "@/lib/types";

const FIELDS = [
  "name", "count_date", "opening_float", "cash_payments", "expected_cash", "cash_counted", "difference", "note",
  "counted_by", "counted_by_name", "counted_at",
];

const TONE: Record<CashState, "green" | "red" | "yellow"> = { matched: "green", short: "red", over: "yellow" };

/**
 * The cash drawer on the end-of-day report: the opening float, what should be in the drawer (the float plus the
 * day's Cash payments), what was counted, and Matched / Short by / Over by. Saved as one Cash Count per day
 * (who counted it, and a note when it is short or over). Printed with the report.
 */
export function CashCountCard({ date, cashPayments, onSaved }: { date: string; cashPayments: number; onSaved?: () => void }) {
  const toast = useToast();
  const { t } = useI18n();
  const c = t.cash;
  const { user } = useAuth();
  const { can } = useSession();
  const { money, currency } = useSettings();
  const canSave = can("add_payments");
  const [saved, setSaved] = useState<{ date: string; count: CashCount | null } | null>(null);
  const [failed, setFailed] = useState("");
  const [version, setVersion] = useState(0);
  const [draft, setDraft] = useState<{ date: string; float: string; counted: string; note: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<CashCount>("Cash Count", FIELDS, { filters: [["count_date", "=", date]], limit: 1 });
        if (!cancelled) {
          setSaved({ date, count: rows[0] ?? null });
          setFailed("");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setFailed(errorMessage(err, messages().cash.countLoadFailed));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [date, version]);

  const current = saved?.date === date ? saved.count : undefined;
  if (failed && current === undefined) {
    return (
      <LoadError
        message={failed}
        onRetry={() => {
          setFailed("");
          setVersion((v) => v + 1);
        }}
      />
    );
  }
  if (current === undefined) return <PageLoading />;

  // What is typed, or else what was saved for this day.
  const form =
    draft?.date === date
      ? draft
      : {
          date,
          float: current ? String(current.opening_float ?? "") : "",
          counted: current ? String(current.cash_counted ?? "") : "",
          note: current?.note ?? "",
        };
  const change = (patch: Partial<typeof form>) => setDraft({ ...form, ...patch });
  const decimals = currencyDecimals(currency) > 0;
  const expected = (Number(form.float) || 0) + cashPayments;
  const result = form.counted === "" ? null : compareCash(expected, Number(form.counted) || 0);
  const needsNote = result !== null && result.state !== "matched";
  const paymentsChanged = current && Math.abs((Number(current.cash_payments) || 0) - cashPayments) >= 0.005;

  const handleSave = async () => {
    if (form.counted === "") {
      setError(c.enterCounted);
      return;
    }
    if (needsNote && !form.note.trim()) {
      setError(c.noteRequired);
      return;
    }
    setSaving(true);
    setError("");
    const data = {
      count_date: date,
      opening_float: Number(form.float) || 0,
      cash_counted: Number(form.counted) || 0,
      note: form.note.trim(),
      counted_by: user,
      // The server works these out again when it saves.
      cash_payments: cashPayments,
      expected_cash: expected,
      difference: result?.difference ?? 0,
    };
    try {
      const count = current
        ? await updateDoc<CashCount>("Cash Count", current.name, data)
        : await createDoc<CashCount>("Cash Count", data);
      setSaved({ date, count });
      setDraft(null);
      toast.success(c.countSaved);
      setVersion((v) => v + 1);
      onSaved?.();
    } catch (err) {
      setError(errorMessage(err, c.countSaveFailed));
    } finally {
      setSaving(false);
    }
  };

  const row = (label: string, value: string, strong = false) => (
    <div className="flex flex-wrap justify-between gap-2">
      <span className="text-gray-600">{label}</span>
      <span className={strong ? "font-bold text-gray-800" : "font-medium text-gray-800"}>{value}</span>
    </div>
  );

  return (
    <div className="rounded-xl border border-gray-200 px-4 py-4 text-sm space-y-3">
      <p className="font-semibold text-gray-800">{c.drawer}</p>
      {row(c.cashPayments, money(cashPayments))}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden">
        <Field label={c.openingFloat} hint={c.openingFloatHint}>
          <NumberInput decimals={decimals} value={form.float} onChange={(e) => change({ float: e.target.value })} disabled={!canSave} />
        </Field>
        <Field label={c.cashCounted} hint={c.cashCountedHint}>
          <NumberInput decimals={decimals} value={form.counted} onChange={(e) => change({ counted: e.target.value })} disabled={!canSave} />
        </Field>
      </div>
      {/* On paper the typed numbers are printed; empty ones become lines to fill in. */}
      <div className="hidden print:block space-y-3">
        {row(c.openingFloat, form.float === "" ? c.blank : money(Number(form.float)))}
        {row(c.cashCounted, form.counted === "" ? c.blank : money(Number(form.counted)))}
      </div>
      {row(c.shouldBe, money(expected), true)}
      {result && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-gray-600">{c.result}</span>
          <Badge tone={TONE[result.state]}>{cashStateLabel(result.state, money(Math.abs(result.difference)))}</Badge>
        </div>
      )}
      {(needsNote || form.note) && (
        <>
          <Field label={c.note} required={needsNote} hint={c.noteHint} className="print:hidden">
            <TextArea rows={2} value={form.note} onChange={(e) => change({ note: e.target.value })} disabled={!canSave} />
          </Field>
          {form.note && <p className="hidden print:block text-gray-700">{c.notePrinted(form.note)}</p>}
        </>
      )}
      {paymentsChanged && <Alert tone="yellow">{c.paymentsChanged(money(current.cash_payments))}</Alert>}
      {error && <Alert tone="red">{error}</Alert>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          {current
            ? c.countedByLine(
                current.counted_by_name || current.counted_by || c.someone,
                current.counted_at ? formatDateTime(current.counted_at) : "",
              )
            : c.notCounted}
        </p>
        {canSave && (
          <Button icon={Save} size="sm" loading={saving} onClick={handleSave} className="print:hidden">
            {current ? c.updateCount : c.saveCount}
          </Button>
        )}
      </div>
    </div>
  );
}

/** The last cash counts, newest first, so a manager can look back. Each day opens its report. */
export function RecentCashCounts({ refresh }: { refresh: number }) {
  const { t } = useI18n();
  const c = t.cash;
  const { money } = useSettings();
  const [rows, setRows] = useState<CashCount[] | null>(null);
  const [failed, setFailed] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const list = await getList<CashCount>("Cash Count", FIELDS, { orderBy: "count_date desc", limit: 14 });
        if (!cancelled) {
          setRows(list);
          setFailed("");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setFailed(errorMessage(err, messages().cash.recentLoadFailed));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [refresh, version]);

  if (failed)
    return (
      <div className="px-5 pb-5">
        <LoadError
          message={failed}
          onRetry={() => {
            setFailed("");
            setVersion((v) => v + 1);
          }}
        />
      </div>
    );
  if (!rows) return <PageLoading />;
  if (rows.length === 0) return <p className="px-5 pb-5 text-sm text-gray-500">{c.noCounts}</p>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>{c.colDay}</Th>
          <Th className="text-end">{c.colShouldBe}</Th>
          <Th className="text-end">{c.colCounted}</Th>
          <Th>{c.colResult}</Th>
          <Th>{c.colNote}</Th>
          <Th>{c.colCountedBy}</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((count) => {
          const result = compareCash(Number(count.expected_cash) || 0, Number(count.cash_counted) || 0);
          return (
            <tr key={count.name}>
              <Td className="whitespace-nowrap">
                <Link href={`/payments/day?date=${count.count_date}`} className="font-medium text-gray-800 hover:text-primary-600">
                  {formatDate(count.count_date)}
                </Link>
              </Td>
              <Td label={c.colShouldBe} className="text-end whitespace-nowrap">{money(count.expected_cash)}</Td>
              <Td label={c.colCounted} className="text-end whitespace-nowrap">{money(count.cash_counted)}</Td>
              <Td label={c.colResult}>
                <Badge tone={TONE[result.state]}>{cashStateLabel(result.state, money(Math.abs(result.difference)))}</Badge>
              </Td>
              <Td label={c.colNote} className="min-w-56 max-sm:min-w-0">{count.note || null}</Td>
              <Td label={c.colCountedBy} className="whitespace-nowrap">{count.counted_by_name || count.counted_by || ""}</Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
