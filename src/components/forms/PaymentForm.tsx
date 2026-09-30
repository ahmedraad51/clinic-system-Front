"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Save } from "lucide-react";
import { Alert, Button, Card, Field, FormActions, LinkButton, NumberInput, focusField, SelectInput, TextArea, TextInput } from "@/components/ui";
import UnsavedChangesGuard from "@/components/UnsavedChangesGuard";
import LinkSelect from "@/components/ui/LinkSelect";
import { errorMessage, getList } from "@/lib/frappe";
import { currencyDecimals, todayISO } from "@/lib/format";
import { useI18n } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { label } from "@/i18n";
import { PAYMENT_METHODS, type Payment, type TreatmentPlan } from "@/lib/types";

export interface PaymentFormData {
  patient: string;
  treatment_plan: string;
  payment_date: string;
  amount: string;
  payment_method: string;
  notes: string;
}

export const emptyPayment = (): PaymentFormData => ({
  patient: "",
  treatment_plan: "",
  payment_date: todayISO(),
  amount: "",
  payment_method: "Cash",
  notes: "",
});

export function paymentToForm(payment: Payment): PaymentFormData {
  return {
    patient: payment.patient ?? "",
    treatment_plan: payment.treatment_plan ?? "",
    payment_date: payment.payment_date ?? "",
    amount: String(payment.amount ?? ""),
    payment_method: payment.payment_method ?? "Cash",
    notes: payment.notes ?? "",
  };
}

export function paymentPayload(form: PaymentFormData) {
  return { ...form, treatment_plan: form.treatment_plan || null, amount: Number(form.amount) || 0 };
}

type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

export default function PaymentForm({
  initial,
  patientLabel,
  submitLabel,
  cancelHref,
  onSubmit,
}: {
  initial: PaymentFormData;
  patientLabel?: string;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: PaymentFormData) => Promise<void>;
}) {
  const { t } = useI18n();
  const f = t.paymentForm;
  const { money, currency } = useSettings();
  // Editing keeps what was saved; only a new payment gets its plan picked automatically.
  const isNew = initial.amount === "";
  const [form, setForm] = useState<PaymentFormData>(initial);
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
          ["name", "treatment_type", "tooth_number", "status", "total_cost", "remaining_amount"],
          { filters: [["patient", "=", patient]], orderBy: "name desc", limit: 0 },
        );
        if (cancelled) return;
        setPlansFor({ patient, plans });
        // A new payment for a patient with exactly one plan to pay off: choose that plan.
        const open = plans.filter((p) => p.status !== "Cancelled" && Number(p.remaining_amount) > 0);
        if (isNew && open.length === 1) {
          setForm((prev) => (prev.patient === patient && !prev.treatment_plan ? { ...prev, treatment_plan: open[0].name } : prev));
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
  // When editing, this payment is already inside the plan's paid amount, so it may be kept.
  const ownAmount = initial.treatment_plan && initial.treatment_plan === form.treatment_plan ? Number(initial.amount) || 0 : 0;
  const maxAmount = selectedPlan ? (Number(selectedPlan.remaining_amount) || 0) + ownAmount : undefined;
  const visiblePlans = plans.filter(
    (plan) => plan.name === form.treatment_plan || (plan.status !== "Cancelled" && Number(plan.remaining_amount) > 0),
  );

  const handleChange = (event: InputEvent) => {
    // Choosing another plan changes how much is allowed, so that clears the message too.
    if (event.target.name === "amount" || event.target.name === "treatment_plan") setAmountError("");
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(form.amount);
    const amountProblem = !(amount > 0)
      ? f.amountZero
      : maxAmount !== undefined && amount > maxAmount
        ? f.amountMax(money(maxAmount))
        : "";
    if (amountProblem) {
      setAmountError(amountProblem);
      focusField(event.currentTarget, "amount");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit(form);
      setDone(true);
    } catch (err) {
      console.error(err);
      setError(errorMessage(err, f.saveFailed));
    } finally {
      setSaving(false);
    }
  };

  const dirty = !done && JSON.stringify(form) !== JSON.stringify(initial);

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
                  {f.planOption(label(t.enums.treatmentType, plan.treatment_type), plan.tooth_number || "", money(plan.remaining_amount))}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={f.date} required>
            <TextInput type="date" name="payment_date" value={form.payment_date} onChange={handleChange} required />
          </Field>
          <Field
            label={f.amount(currency)}
            required
            error={amountError}
            hint={
              maxAmount !== undefined && maxAmount > 0 ? (
                <span className="flex flex-wrap items-center gap-2">
                  {f.upTo(money(maxAmount))}
                  {Number(form.amount) !== maxAmount && (
                    <button
                      type="button"
                      onClick={() => {
                        setAmountError("");
                        setForm({ ...form, amount: String(maxAmount) });
                      }}
                      className="rounded-lg border border-primary-200 bg-primary-50 px-2 py-0.5 pointer-coarse:min-h-11 pointer-coarse:px-3 text-xs font-medium text-primary-700 hover:bg-primary-100"
                    >
                      {f.payFull}
                    </button>
                  )}
                </span>
              ) : undefined
            }
          >
            <NumberInput
              name="amount"
              decimals={currencyDecimals(currency) > 0}
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
        <LinkButton href={cancelHref} variant="secondary">
          {t.common.cancel}
        </LinkButton>
      </FormActions>
    </form>
  );
}
