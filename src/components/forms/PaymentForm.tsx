"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Save } from "lucide-react";
import { Alert, Button, Card, Field, FormActions, LinkButton, SelectInput, TextArea, TextInput } from "@/components/ui";
import LinkSelect from "@/components/ui/LinkSelect";
import { errorMessage, getList } from "@/lib/frappe";
import { todayISO } from "@/lib/format";
import { useSettings } from "@/context/SettingsContext";
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
  const { money, currency } = useSettings();
  const [form, setForm] = useState<PaymentFormData>(initial);
  const [plansFor, setPlansFor] = useState<{ patient: string; plans: TreatmentPlan[] }>({ patient: "", plans: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
        if (!cancelled) setPlansFor({ patient, plans });
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [form.patient]);

  const plans = plansFor.patient === form.patient ? plansFor.plans : [];
  const selectedPlan = plans.find((plan) => plan.name === form.treatment_plan);
  // When editing, this payment is already inside the plan's paid amount, so it may be kept.
  const ownAmount = initial.treatment_plan && initial.treatment_plan === form.treatment_plan ? Number(initial.amount) || 0 : 0;
  const maxAmount = selectedPlan ? (Number(selectedPlan.remaining_amount) || 0) + ownAmount : undefined;
  const visiblePlans = plans.filter(
    (plan) => plan.name === form.treatment_plan || (plan.status !== "Cancelled" && Number(plan.remaining_amount) > 0),
  );

  const handleChange = (event: InputEvent) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!(amount > 0)) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (maxAmount !== undefined && amount > maxAmount) {
      setError(`This plan only has ${money(maxAmount)} left to pay.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit(form);
    } catch (err) {
      console.error(err);
      setError(errorMessage(err, "Could not save the payment. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Patient" required className="sm:col-span-2">
            <LinkSelect
              doctype="Patient"
              value={form.patient}
              onChange={(patient) => setForm({ ...form, patient, treatment_plan: "" })}
              detailField="phone_number"
              initialLabel={patientLabel}
              placeholder="Search by name or phone..."
              required
            />
          </Field>
          <Field
            label="Treatment Plan"
            className="sm:col-span-2"
            hint={form.patient && visiblePlans.length === 0 ? "This patient has no plans with a balance left." : undefined}
          >
            <SelectInput
              name="treatment_plan"
              value={form.treatment_plan}
              onChange={handleChange}
              disabled={!form.patient}
            >
              <option value="">{form.patient ? "No plan (general payment)" : "Choose a patient first"}</option>
              {visiblePlans.map((plan) => (
                <option key={plan.name} value={plan.name}>
                  {`${plan.treatment_type}${plan.tooth_number ? ` · tooth ${plan.tooth_number}` : ""} · ${money(plan.remaining_amount)} left`}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Date" required>
            <TextInput type="date" name="payment_date" value={form.payment_date} onChange={handleChange} required />
          </Field>
          <Field
            label={`Amount (${currency})`}
            required
            hint={maxAmount !== undefined ? `Up to ${money(maxAmount)} for this plan.` : undefined}
          >
            <TextInput
              type="number"
              name="amount"
              min={0}
              step="any"
              inputMode="decimal"
              value={form.amount}
              onChange={handleChange}
              required
            />
          </Field>
          <Field label="Payment Method" required>
            <SelectInput name="payment_method" value={form.payment_method} onChange={handleChange} required>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
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
          Cancel
        </LinkButton>
      </FormActions>
    </form>
  );
}
