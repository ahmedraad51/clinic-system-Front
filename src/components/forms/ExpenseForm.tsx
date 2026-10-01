"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Save } from "lucide-react";
import { Alert, Button, Card, DateInput, Field, focusField, FormActions, NumberInput, SelectInput, TextInput } from "@/components/ui";
import UnsavedChangesGuard from "@/components/UnsavedChangesGuard";
import CurrencySelect from "@/components/CurrencySelect";
import { useI18n } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { label } from "@/i18n";
import { errorMessage } from "@/lib/frappe";
import { currencyDecimals, formatDate, todayISO } from "@/lib/format";
import { useDoctors } from "@/lib/hooks";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, type Expense } from "@/lib/types";
import { doctorMedia } from "@/components/Avatar";

export interface ExpenseFormData {
  expense_date: string;
  category: string;
  amount: string;
  /** "" is the clinic's own currency. */
  currency: string;
  /** "" is the whole clinic. */
  doctor: string;
  description: string;
  paid_to: string;
  payment_method: string;
}

export const emptyExpense = (): ExpenseFormData => ({
  expense_date: todayISO(),
  category: "",
  amount: "",
  currency: "",
  doctor: "",
  description: "",
  paid_to: "",
  payment_method: "Cash",
});

export function expenseToForm(expense: Expense): ExpenseFormData {
  return {
    expense_date: expense.expense_date ?? "",
    category: expense.category ?? "",
    amount: String(expense.amount ?? ""),
    currency: expense.currency ?? "",
    doctor: expense.doctor ?? "",
    description: expense.description ?? "",
    paid_to: expense.paid_to ?? "",
    payment_method: expense.payment_method ?? "",
  };
}

export function expensePayload(form: ExpenseFormData) {
  return {
    ...form,
    amount: Number(form.amount) || 0,
    description: form.description.trim(),
    paid_to: form.paid_to.trim(),
    // Empty Link and Select fields go as null (the server sets the rate of the day itself).
    doctor: form.doctor || null,
    payment_method: form.payment_method || null,
  };
}

type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement>;

/** Add or change an expense (in the dialog on /expenses). */
export default function ExpenseForm({
  initial,
  doctorLabel,
  submitLabel,
  onCancel,
  onDirtyChange,
  onSubmit,
}: {
  initial: ExpenseFormData;
  /** The saved doctor's name, in case that doctor is no longer active. */
  doctorLabel?: string;
  submitLabel: string;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSubmit: (data: ExpenseFormData) => Promise<void>;
}) {
  const { t } = useI18n();
  const x = t.expenses;
  const { currency, currencies, rateOn, rateText, secondCurrency } = useSettings();
  const doctors = useDoctors();
  const [form, setForm] = useState<ExpenseFormData>(initial);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [amountError, setAmountError] = useState("");

  const handleChange = (event: InputEvent) => {
    if (event.target.name === "amount") setAmountError("");
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const code = form.currency || currency;
  const inOther = code !== currency;
  const rate = inOther && form.expense_date ? rateOn(form.expense_date) : null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(Number(form.amount) > 0)) {
      setAmountError(x.amountAboveZero);
      focusField(event.currentTarget, "amount");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit(form);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, x.saveFailed));
    } finally {
      setSaving(false);
    }
  };

  const dirty = !done && JSON.stringify(form) !== JSON.stringify(initial);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const savedDoctorGone = form.doctor && doctors && !doctors.some((doctor) => doctor.name === form.doctor);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <UnsavedChangesGuard when={dirty} />
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={x.date} required>
            <DateInput name="expense_date" value={form.expense_date} onChange={handleChange} required />
          </Field>
          <Field label={x.category} required>
            <SelectInput name="category" value={form.category} onChange={handleChange} required>
              <option value="">{t.common.select}</option>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {label(t.enums.expenseCategory, category)}
                </option>
              ))}
            </SelectInput>
          </Field>
          {currencies.length > 1 && (
            <Field label={t.money.currency}>
              <CurrencySelect value={form.currency} onChange={(value) => setForm({ ...form, currency: value === currency ? "" : value })} />
            </Field>
          )}
          <Field
            label={x.amount(t.dates.currencySymbols[code] ?? code)}
            required
            error={amountError}
            hint={
              inOther ? (
                <span data-testid="expense-rate">
                  {rate ? t.money.rateOnDay(formatDate(form.expense_date), rateText(rate)) : t.money.noRate(secondCurrency || code)}
                </span>
              ) : undefined
            }
          >
            <NumberInput
              name="amount"
              decimals={currencyDecimals(code) > 0}
              value={form.amount}
              onChange={handleChange}
              required
              aria-invalid={amountError ? true : undefined}
            />
          </Field>
          <Field label={x.description} hint={x.descriptionHint} className="sm:col-span-2">
            <TextInput name="description" value={form.description} onChange={handleChange} autoComplete="off" />
          </Field>
          <Field label={x.paidTo} hint={x.paidToHint}>
            <TextInput name="paid_to" value={form.paid_to} onChange={handleChange} autoComplete="off" />
          </Field>
          <Field label={x.method}>
            <SelectInput name="payment_method" value={form.payment_method} onChange={handleChange}>
              <option value="">{x.noMethod}</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {label(t.enums.paymentMethod, method)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={x.doctor} hint={x.doctorHint} className="sm:col-span-2">
            <SelectInput name="doctor" value={form.doctor} onChange={handleChange} media={doctorMedia(doctors)}>
              <option value="">{x.noDoctor}</option>
              {savedDoctorGone && <option value={form.doctor}>{doctorLabel || form.doctor}</option>}
              {(doctors ?? []).map((doctor) => (
                <option key={doctor.name} value={doctor.name}>
                  {doctor.full_name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </Card>

      {error && <Alert tone="red">{error}</Alert>}

      <FormActions>
        <Button type="submit" icon={Save} loading={saving}>
          {submitLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t.common.cancel}
        </Button>
      </FormActions>
    </form>
  );
}
