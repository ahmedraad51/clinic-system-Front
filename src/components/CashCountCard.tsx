"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { Alert, Badge, Button, Field, LoadError, NumberInput, PageLoading, Table, Td, TextArea, Th } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
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
        if (!cancelled) setFailed(errorMessage(err, "Could not load the cash count."));
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
      setError("Enter the cash counted.");
      return;
    }
    if (needsNote && !form.note.trim()) {
      setError("Write a note saying why the cash is short or over.");
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
      toast.success("Cash count saved.");
      setVersion((v) => v + 1);
      onSaved?.();
    } catch (err) {
      setError(errorMessage(err, "Could not save the cash count."));
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
      <p className="font-semibold text-gray-800">Cash in the drawer</p>
      {row("Cash payments", money(cashPayments))}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden">
        <Field label="Opening float" hint="Money put in the drawer this morning, for change.">
          <NumberInput decimals={decimals} value={form.float} onChange={(e) => change({ float: e.target.value })} disabled={!canSave} />
        </Field>
        <Field label="Cash counted" hint="All the cash in the drawer now.">
          <NumberInput decimals={decimals} value={form.counted} onChange={(e) => change({ counted: e.target.value })} disabled={!canSave} />
        </Field>
      </div>
      {/* On paper the typed numbers are printed; empty ones become lines to fill in. */}
      <div className="hidden print:block space-y-3">
        {row("Opening float", form.float === "" ? "________" : money(Number(form.float)))}
        {row("Cash counted", form.counted === "" ? "________" : money(Number(form.counted)))}
      </div>
      {row("Should be in the drawer", money(expected), true)}
      {result && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-gray-600">Result</span>
          <Badge tone={TONE[result.state]}>{cashStateLabel(result.state, money(Math.abs(result.difference)))}</Badge>
        </div>
      )}
      {(needsNote || form.note) && (
        <>
          <Field label="Note" required={needsNote} hint="What happened, for example change given twice." className="print:hidden">
            <TextArea rows={2} value={form.note} onChange={(e) => change({ note: e.target.value })} disabled={!canSave} />
          </Field>
          {form.note && <p className="hidden print:block text-gray-700">Note: {form.note}</p>}
        </>
      )}
      {paymentsChanged && (
        <Alert tone="yellow">
          Cash payments changed since the count was saved (then {money(current.cash_payments)}). Count again and save.
        </Alert>
      )}
      {error && <Alert tone="red">{error}</Alert>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          {current
            ? `Counted by ${current.counted_by_name || current.counted_by || "someone"}${current.counted_at ? `, ${formatDateTime(current.counted_at)}` : ""}`
            : "Not counted yet."}
        </p>
        {canSave && (
          <Button icon={Save} size="sm" loading={saving} onClick={handleSave} className="print:hidden">
            {current ? "Update Count" : "Save Count"}
          </Button>
        )}
      </div>
    </div>
  );
}

/** The last cash counts, newest first, so a manager can look back. Each day opens its report. */
export function RecentCashCounts({ refresh }: { refresh: number }) {
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
        if (!cancelled) setFailed(errorMessage(err, "Could not load the cash counts."));
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
  if (rows.length === 0) return <p className="px-5 pb-5 text-sm text-gray-500">No cash counts saved yet.</p>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Day</Th>
          <Th className="text-end">Should be</Th>
          <Th className="text-end">Counted</Th>
          <Th>Result</Th>
          <Th>Note</Th>
          <Th>Counted by</Th>
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
              <Td label="Should be" className="text-end whitespace-nowrap">{money(count.expected_cash)}</Td>
              <Td label="Counted" className="text-end whitespace-nowrap">{money(count.cash_counted)}</Td>
              <Td label="Result">
                <Badge tone={TONE[result.state]}>{cashStateLabel(result.state, money(Math.abs(result.difference)))}</Badge>
              </Td>
              <Td label="Note" className="min-w-56 max-sm:min-w-0">{count.note || null}</Td>
              <Td label="Counted by" className="whitespace-nowrap">{count.counted_by_name || count.counted_by || ""}</Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
