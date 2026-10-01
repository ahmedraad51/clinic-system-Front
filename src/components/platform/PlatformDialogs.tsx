"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Alert, Button, DateInput, Field, NumberInput, SelectInput, TextInput } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { PLAN_KEYS, PLANS, TRIAL_DAYS, type PlanKey } from "@/config/sales";
import { clinicAddress, isValidClinicAddress } from "@/lib/deployment";
import { formatDate, formatMoney, todayISO } from "@/lib/format";
import { callMethod, errorMessage } from "@/lib/frappe";
import {
  PAYMENT_CHANNELS, PLATFORM_METHODS, paidUntilAfter, type ClinicAccount, type PlatformPayment,
} from "@/lib/platform";

/** What a new clinic starts from (a free-trial request fills it in). */
export interface NewClinicPrefill {
  clinic_name?: string;
  address?: string;
  plan?: PlanKey;
  manager_email?: string;
  /** The free-trial request it comes from: marked Started once the clinic is made. */
  trial_request?: string;
}

/**
 * A new clinic: its name, web address (<address>.CLOUD_DOMAIN), plan and manager. The platform's server makes its
 * Frappe site and the manager's login, and starts the free trial.
 */
export function NewClinicDialog({
  prefill,
  onClose,
  onSaved,
}: {
  prefill?: NewClinicPrefill;
  onClose: () => void;
  onSaved: (clinic: ClinicAccount) => void;
}) {
  const { t } = useI18n();
  const p = t.platform;
  const toast = useToast();
  const [form, setForm] = useState({
    clinic_name: prefill?.clinic_name ?? "",
    address: prefill?.address ?? "",
    plan: prefill?.plan ?? PLAN_KEYS[0],
    manager_email: prefill?.manager_email ?? "",
  });
  const [addressError, setAddressError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    // A web address is lower case; typing capitals is not an error.
    setForm({ ...form, [name]: name === "address" ? value.toLowerCase().replace(/\s/g, "") : value });
    if (name === "address") setAddressError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!isValidClinicAddress(form.address)) {
      setAddressError(p.errors.address);
      return;
    }
    setSaving(true);
    try {
      const clinic = await callMethod<ClinicAccount>(PLATFORM_METHODS.createClinic, {
        ...form,
        clinic_name: form.clinic_name.trim(),
        manager_email: form.manager_email.trim(),
        trial_request: prefill?.trial_request,
      });
      toast.success(p.created(clinic.clinic_name, clinicAddress(clinic.address), formatDate(clinic.trial_ends_on ?? "")));
      onSaved(clinic);
    } catch (err) {
      setError(errorMessage(err, p.createFailed));
      setSaving(false);
    }
  };

  return (
    <Modal open title={p.newTitle} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-700">{p.newText(TRIAL_DAYS)}</p>
        <Field label={p.clinicName} required>
          <TextInput name="clinic_name" value={form.clinic_name} onChange={handleChange} required autoComplete="off" />
        </Field>
        <Field label={p.address} required hint={p.addressHint} error={addressError}>
          {/* The address name, then the platform's domain: "alnoor" + ".dentclinic.example". */}
          <div className="flex items-center gap-2" dir="ltr">
            <TextInput
              name="address"
              value={form.address}
              onChange={handleChange}
              required
              autoComplete="off"
              spellCheck={false}
              aria-invalid={addressError ? true : undefined}
              className="min-w-0 flex-1"
            />
            <span className="shrink-0 text-sm text-gray-600">{clinicAddress("")}</span>
          </div>
        </Field>
        <Field label={p.plan} required>
          <SelectInput name="plan" value={form.plan} onChange={handleChange} required>
            {PLAN_KEYS.map((key) => (
              <option key={key} value={key}>
                {t.site.plans[key].name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label={p.managerEmail} required>
          <TextInput name="manager_email" type="email" value={form.manager_email} onChange={handleChange} required dir="ltr" autoComplete="off" />
        </Field>
        {error && <Alert tone="red">{error}</Alert>}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" loading={saving}>
            {p.create}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t.common.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * A payment a clinic made by hand (Zain Cash, FastPay, Qi Card, a bank transfer or cash): how much, how, when, for how
 * many months (years on a yearly plan), and the receipt number. It moves the clinic's paid-until day on.
 */
export function PaymentDialog({
  clinics,
  clinic: fixedClinic,
  onClose,
  onSaved,
}: {
  clinics: ClinicAccount[];
  /** The clinic it is for; without one, the dialog asks. */
  clinic?: string;
  onClose: () => void;
  onSaved: (payment: PlatformPayment) => void;
}) {
  const { t } = useI18n();
  const p = t.platform;
  const toast = useToast();
  const [form, setForm] = useState({
    clinic: fixedClinic ?? "",
    method: "",
    paid_on: todayISO(),
    periods: "1",
    amount: "",
    reference: "",
  });
  // The amount follows the plan's price until it is typed in.
  const [amountTyped, setAmountTyped] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const account = clinics.find((c) => c.name === form.clinic);
  const plan = account ? PLANS[account.plan] : null;
  const periods = Math.floor(Number(form.periods));
  const validPeriods = periods >= 1 && periods <= 36;
  const amount = amountTyped ? form.amount : plan && validPeriods ? String(plan.price * periods) : "";

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    if (name === "amount") setAmountTyped(true);
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!account || !plan) return;
    setSaving(true);
    setError("");
    try {
      const payment = await callMethod<PlatformPayment>(PLATFORM_METHODS.recordPayment, {
        clinic: account.name,
        amount: Number(amount),
        currency: plan.currency,
        method: form.method,
        paid_on: form.paid_on,
        periods,
        reference: form.reference.trim(),
      });
      toast.success(p.paymentSaved(account.clinic_name, formatDate(payment.paid_until)));
      onSaved(payment);
    } catch (err) {
      setError(errorMessage(err, p.paymentFailed));
      setSaving(false);
    }
  };

  return (
    <Modal open title={p.paymentTitle} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {fixedClinic && account ? (
          <div className="text-sm">
            <p className="font-medium text-gray-900 break-words">
              <bdi>{account.clinic_name}</bdi>
            </p>
            <p className="text-xs text-gray-600 text-start" dir="ltr">
              {clinicAddress(account.address)}
            </p>
          </div>
        ) : (
          <Field label={p.paymentClinic} required>
            <SelectInput name="clinic" value={form.clinic} onChange={handleChange} required>
              <option value="">{p.chooseClinic}</option>
              {clinics.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.clinic_name}
                </option>
              ))}
            </SelectInput>
          </Field>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={p.method} required>
            <SelectInput name="method" value={form.method} onChange={handleChange} required>
              <option value="">{p.chooseMethod}</option>
              {PAYMENT_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {p.channels[channel]}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={p.paidOn} required>
            <DateInput name="paid_on" value={form.paid_on} onChange={handleChange} required max={todayISO()} />
          </Field>
          <Field label={p.periods(plan?.period ?? "month")} required>
            <NumberInput name="periods" decimals={false} value={form.periods} onChange={handleChange} required />
          </Field>
          <Field label={p.amount} required hint={plan ? p.usualPrice(t.plan.price(formatMoney(plan.price, plan.currency), plan.period)) : undefined}>
            <NumberInput name="amount" decimals={false} value={amount} onChange={handleChange} required />
          </Field>
          <Field label={p.reference} hint={p.referenceHint} className="sm:col-span-2">
            <TextInput name="reference" value={form.reference} onChange={handleChange} dir="ltr" autoComplete="off" />
          </Field>
        </div>
        {account && validPeriods && form.paid_on && (
          <Alert tone={account.status === "suspended" ? "yellow" : "blue"}>
            <span data-testid="paid-until-preview">{p.willBePaidUntil(formatDate(paidUntilAfter(account, form.paid_on, periods)))}</span>
            {account.status === "suspended" && <span className="block mt-1">{p.wasSuspended}</span>}
          </Alert>
        )}
        {error && <Alert tone="red">{error}</Alert>}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" loading={saving} disabled={!account}>
            {p.save}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t.common.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
