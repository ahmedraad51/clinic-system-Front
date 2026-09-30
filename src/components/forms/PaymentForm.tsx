"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Save } from "lucide-react";
import { Alert, Button, Card, Field, FormActions, LinkButton, NumberInput, focusField, SelectInput, TextArea, TextInput } from "@/components/ui";
import UnsavedChangesGuard from "@/components/UnsavedChangesGuard";
import LinkSelect from "@/components/ui/LinkSelect";
import CurrencySelect from "@/components/CurrencySelect";
import { errorMessage, getList } from "@/lib/frappe";
import { convertMoney, currencyOf, roundMoney, settleTolerance } from "@/lib/currency";
import { currencyDecimals, formatDate, todayISO } from "@/lib/format";
import { useI18n } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { label } from "@/i18n";
import { PAYMENT_METHODS, type Payment, type TreatmentPlan } from "@/lib/types";

export interface PaymentFormData {
  patient: string;
  treatment_plan: string;
  payment_date: string;
  amount: string;
  /** "" is the clinic's own currency. */
  currency: string;
  /** The rate kept on a saved payment, shown while its day, currency and plan stay (the server sets it; never sent). */
  exchange_rate: string;
  payment_method: string;
  notes: string;
}

export const emptyPayment = (): PaymentFormData => ({
  patient: "",
  treatment_plan: "",
  payment_date: todayISO(),
  amount: "",
  currency: "",
  exchange_rate: "",
  payment_method: "Cash",
  notes: "",
});

export function paymentToForm(payment: Payment): PaymentFormData {
  return {
    patient: payment.patient ?? "",
    treatment_plan: payment.treatment_plan ?? "",
    payment_date: payment.payment_date ?? "",
    amount: String(payment.amount ?? ""),
    currency: payment.currency ?? "",
    exchange_rate: Number(payment.exchange_rate) > 0 ? String(payment.exchange_rate) : "",
    payment_method: payment.payment_method ?? "Cash",
    notes: payment.notes ?? "",
  };
}

export function paymentPayload(form: PaymentFormData) {
  return {
    ...form,
    treatment_plan: form.treatment_plan || null,
    amount: Number(form.amount) || 0,
    // The server sets the rate from Clinic Settings (the payment's day); it never takes one from the browser.
    exchange_rate: undefined,
  };
}

type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

export default function PaymentForm({
  initial,
  patientLabel,
  submitLabel,
  cancelHref,
  onCancel,
  onDirtyChange,
  onSubmit,
}: {
  initial: PaymentFormData;
  patientLabel?: string;
  submitLabel: string;
  cancelHref: string;
  /** In a dialog: Cancel closes it instead of following cancelHref. */
  onCancel?: () => void;
  /** In a dialog: told whether there are unsaved changes, so closing it can ask first. */
  onDirtyChange?: (dirty: boolean) => void;
  onSubmit: (data: PaymentFormData) => Promise<void>;
}) {
  const { t } = useI18n();
  const f = t.paymentForm;
  const { money, currency, currencies, secondCurrency, rateOn, rateText } = useSettings();
  // Editing keeps what was saved; only a new payment gets its plan picked automatically.
  const isNew = initial.amount === "";
  const [form, setForm] = useState<PaymentFormData>(initial);
  // What the form started from, with the plan it picked by itself: that is not an unsaved change.
  const [baseline, setBaseline] = useState<PaymentFormData>(initial);
  const [plansFor, setPlansFor] = useState<{ patient: string; plans: TreatmentPlan[] }>({ patient: "", plans: [] });
  const [saving, setSaving] = useState(false);
  // Set once saved, so the page can move on without the unsaved-changes question.
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [amountError, setAmountError] = useState("");

  // Load the chosen patient's treatment plans.
  useEffect(() => {
    if (!form.patient) return;
    let cancelled = false;
    const patient = form.patient;
    const load = async () => {
      try {
        const plans = await getList<TreatmentPlan>(
          "Treatment Plan",
          ["name", "treatment_type", "tooth_number", "status", "currency", "total_cost", "remaining_amount"],
          { filters: [["patient", "=", patient]], orderBy: "name desc", limit: 0 },
        );
        if (cancelled) return;
        setPlansFor({ patient, plans });
        // A new payment for a patient with exactly one plan to pay off: choose that plan.
        const open = plans.filter((p) => p.status !== "Cancelled" && Number(p.remaining_amount) > 0);
        // A new payment takes the currency of its plan (one given in the address, or the only one) until an amount is typed.
        if (isNew) {
          const pick = (prev: PaymentFormData) => {
            if (prev.patient !== patient) return prev;
            const chosen = prev.treatment_plan ? plans.find((p) => p.name === prev.treatment_plan) : open.length === 1 ? open[0] : undefined;
            if (!chosen) return prev;
            const currency = prev.amount === "" ? chosen.currency || "" : prev.currency;
            return chosen.name === prev.treatment_plan && currency === prev.currency ? prev : { ...prev, treatment_plan: chosen.name, currency };
          };
          setForm(pick);
          setBaseline(pick);
        }
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [form.patient, isNew]);

  const plans = plansFor.patient === form.patient ? plansFor.plans : [];
  const selectedPlan = plans.find((plan) => plan.name === form.treatment_plan);
  const payCurrency = currencyOf(form, currency);
  const planCurrency = selectedPlan ? currencyOf(selectedPlan, currency) : payCurrency;
  // Two currencies meet: the payment uses the rate of its day (a saved payment keeps its own while its day stays).
  const needsRate = payCurrency !== currency || planCurrency !== currency;
  const keptRate =
    Number(initial.exchange_rate) > 0 &&
    form.payment_date === initial.payment_date &&
    currencyOf(form, currency) === currencyOf(initial, currency) &&
    form.treatment_plan === initial.treatment_plan
      ? Number(initial.exchange_rate)
      : null;
  const rate = needsRate ? keptRate ?? rateOn(form.payment_date || todayISO()) : null;
  const toPlan = (amount: number) => convertMoney(amount, payCurrency, planCurrency, rate, currency);
  // When editing, this payment is already inside the plan's paid amount, so it may be kept.
  const ownAmount =
    initial.treatment_plan && initial.treatment_plan === form.treatment_plan
      ? convertMoney(Number(initial.amount) || 0, currencyOf(initial, currency), planCurrency, Number(initial.exchange_rate) || rate, currency) ?? 0
      : 0;
  const maxAmount = selectedPlan ? (Number(selectedPlan.remaining_amount) || 0) + ownAmount : undefined;
  // In another currency a payment may go over what is left by less than one of its smallest units (a cent cannot be
  // split); the server then takes off only what was left, so "Pay full balance" closes the plan.
  const tolerance = settleTolerance(payCurrency, planCurrency, rate, currency);
  // The same limit in the payment's currency: rounded up to its smallest unit when the currencies differ.
  const maxInPay = (() => {
    if (maxAmount === undefined) return undefined;
    if (payCurrency === planCurrency) return roundMoney(maxAmount, planCurrency);
    const converted = rate ? (planCurrency === currency ? maxAmount / rate : maxAmount * rate) : null;
    if (converted === null) return undefined;
    const factor = 10 ** currencyDecimals(payCurrency);
    return Math.ceil(converted * factor - 1e-6) / factor;
  })();
  const converted = needsRate && selectedPlan && payCurrency !== planCurrency && Number(form.amount) > 0 ? toPlan(Number(form.amount)) : null;
  const inPlan = converted !== null && maxAmount !== undefined ? Math.min(converted, roundMoney(maxAmount, planCurrency)) : converted;
  const visiblePlans = plans.filter(
    (plan) => plan.name === form.treatment_plan || (plan.status !== "Cancelled" && Number(plan.remaining_amount) > 0),
  );

  const handleChange = (event: InputEvent) => {
    const { name, value } = event.target;
    // Choosing another plan changes how much is allowed, so that clears the message too.
    if (name === "amount" || name === "treatment_plan") setAmountError("");
    if (name === "treatment_plan" && form.amount === "") {
      // Before an amount is typed, the payment takes the plan's currency.
      const plan = plans.find((row) => row.name === value);
      setForm({ ...form, treatment_plan: value, currency: plan ? plan.currency || "" : form.currency });
      return;
    }
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(form.amount);
    const onPlan = toPlan(amount);
    const amountProblem = !(amount > 0)
      ? f.amountZero
      : needsRate && !rate
        ? t.money.noRate(secondCurrency || payCurrency)
        : maxAmount !== undefined && onPlan !== null && onPlan > maxAmount + tolerance + 0.004
          ? f.amountMax(money(maxInPay ?? maxAmount, maxInPay !== undefined ? payCurrency : planCurrency))
          : "";
    if (amountProblem) {
      setAmountError(amountProblem);
      focusField(event.currentTarget, "amount");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // The rate of the day goes with the payment when two currencies meet, and is kept on it from then on.
      await onSubmit({ ...form, currency: payCurrency === currency ? "" : payCurrency });
      setDone(true);
    } catch (err) {
      console.error(err);
      setError(errorMessage(err, f.saveFailed));
    } finally {
      setSaving(false);
    }
  };

  const dirty = !done && JSON.stringify(form) !== JSON.stringify(baseline);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <UnsavedChangesGuard when={dirty} />
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={f.patient} required className="sm:col-span-2">
            <LinkSelect
              doctype="Patient"
              value={form.patient}
              onChange={(patient) => setForm({ ...form, patient, treatment_plan: "" })}
              detailField="phone_number"
              initialLabel={patientLabel}
              placeholder={f.searchPatient}
              required
            />
          </Field>
          <Field
            label={f.plan}
            className="sm:col-span-2"
            hint={form.patient && visiblePlans.length === 0 ? f.noPlansHint : undefined}
          >
            <SelectInput
              name="treatment_plan"
              value={form.treatment_plan}
              onChange={handleChange}
              disabled={!form.patient}
            >
              <option value="">{form.patient ? f.noPlan : f.choosePatient}</option>
              {visiblePlans.map((plan) => (
                <option key={plan.name} value={plan.name}>
                  {f.planOption(label(t.enums.treatmentType, plan.treatment_type), plan.tooth_number || "", money(plan.remaining_amount, currencyOf(plan, currency)))}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={f.date} required>
            <TextInput type="date" name="payment_date" value={form.payment_date} onChange={handleChange} required />
          </Field>
          {currencies.length > 1 && (
            <Field label={t.money.currency}>
              <CurrencySelect
                value={form.currency}
                onChange={(code) => {
                  setAmountError("");
                  setForm({ ...form, currency: code === currency ? "" : code });
                }}
              />
            </Field>
          )}
          <Field
            label={f.amount(t.dates.currencySymbols[payCurrency] ?? payCurrency)}
            required
            error={amountError}
            hint={
              (maxInPay !== undefined && maxInPay > 0) || needsRate ? (
                <span className="flex flex-col gap-1">
                  {needsRate && (
                    <span data-testid="payment-rate">
                      {rate
                        ? t.money.rateOnDay(formatDate(form.payment_date), rateText(rate))
                        : t.money.noRate(secondCurrency || payCurrency)}
                      {inPlan !== null && ` ${t.money.countsAs(money(inPlan, planCurrency))}`}
                    </span>
                  )}
                  {maxInPay !== undefined && maxInPay > 0 && (
                    <span className="flex flex-wrap items-center gap-2">
                      {f.upTo(money(maxInPay, payCurrency))}
                      {Number(form.amount) !== maxInPay && (
                        <button
                          type="button"
                          onClick={() => {
                            setAmountError("");
                            setForm({ ...form, amount: String(maxInPay) });
                          }}
                          className="rounded-lg border border-primary-200 bg-primary-50 px-2 py-0.5 pointer-coarse:min-h-11 pointer-coarse:px-3 text-xs font-medium text-primary-700 hover:bg-primary-100"
                        >
                          {f.payFull}
                        </button>
                      )}
                    </span>
                  )}
                </span>
              ) : undefined
            }
          >
            <NumberInput
              name="amount"
              decimals={currencyDecimals(payCurrency) > 0}
              value={form.amount}
              onChange={handleChange}
              required
              aria-invalid={amountError ? true : undefined}
            />
          </Field>
          <Field label={f.method} required>
            <SelectInput name="payment_method" value={form.payment_method} onChange={handleChange} required>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {label(t.enums.paymentMethod, method)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={f.notes} className="sm:col-span-2">
            <TextArea name="notes" value={form.notes} onChange={handleChange} />
          </Field>
        </div>
      </Card>

      {error && <Alert tone="red">{error}</Alert>}

      <FormActions>
        <Button type="submit" icon={Save} loading={saving}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel}>
            {t.common.cancel}
          </Button>
        ) : (
          <LinkButton href={cancelHref} variant="secondary">
            {t.common.cancel}
          </LinkButton>
        )}
      </FormActions>
    </form>
  );
}
