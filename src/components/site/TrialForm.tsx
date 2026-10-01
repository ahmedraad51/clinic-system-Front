"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Alert, Button, Field, PhoneInput, SelectInput, SuggestInput, TextArea, TextInput } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { PLAN_KEYS, type PlanKey } from "@/config/sales";
import { clinicAddress, isValidClinicAddress } from "@/lib/deployment";
import { callMethod, errorMessage } from "@/lib/frappe";
import { governorateSuggestions } from "@/lib/iraq";
import { toLatinDigits } from "@/lib/phone";
import { PLATFORM_METHODS, type TrialRequest } from "@/lib/platform";

type FormState = Omit<TrialRequest, "language">;
type Problems = Partial<Record<keyof FormState, string>>;

/** At least 10 digits: a mobile number with or without the country code. */
const looksLikeMobile = (phone: string) => toLatinDigits(phone).replace(/\D/g, "").length >= 10;

/** "Ask for a free trial": sent to the platform (PLATFORM_METHODS.requestTrial), which answers on WhatsApp. */
export default function TrialForm({ plan, onPlanChange }: { plan: PlanKey; onPlanChange: (plan: PlanKey) => void }) {
  const { t, lang } = useI18n();
  const s = t.site;
  const [form, setForm] = useState<Omit<FormState, "plan">>({
    clinic_name: "",
    contact_name: "",
    phone: "",
    city: "",
    email: "",
    address: "",
    message: "",
  });
  const [problems, setProblems] = useState<Problems>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const set = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setProblems((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const address = form.address.trim().toLowerCase();
    const found: Problems = {};
    if (!form.clinic_name.trim()) found.clinic_name = s.required;
    if (!form.contact_name.trim()) found.contact_name = s.required;
    if (!form.phone.trim()) found.phone = s.required;
    else if (!looksLikeMobile(form.phone)) found.phone = s.phoneInvalid;
    if (address && !isValidClinicAddress(address)) found.address = s.addressInvalid;
    setProblems(found);
    if (Object.keys(found).length > 0) return;
    setSending(true);
    setError("");
    try {
      const request: TrialRequest = {
        clinic_name: form.clinic_name.trim(),
        contact_name: form.contact_name.trim(),
        phone: toLatinDigits(form.phone.trim()),
        city: form.city.trim(),
        email: form.email.trim(),
        plan,
        address,
        message: form.message.trim(),
        language: lang,
      };
      await callMethod(PLATFORM_METHODS.requestTrial, request);
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, s.sendFailed));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div role="status" className="flex items-start gap-3">
        <CheckCircle2 size={28} className="shrink-0 text-green-700" aria-hidden="true" />
        <div>
          <p className="text-lg font-semibold text-gray-900">{s.sentTitle}</p>
          <p className="text-sm text-gray-700 mt-1">{s.sentText}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={s.clinicName} required error={problems.clinic_name}>
          <TextInput name="clinic_name" value={form.clinic_name} onChange={(e) => set("clinic_name", e.target.value)} aria-invalid={Boolean(problems.clinic_name)} />
        </Field>
        <Field label={s.contactName} required error={problems.contact_name}>
          <TextInput name="contact_name" value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} autoComplete="name" aria-invalid={Boolean(problems.contact_name)} />
        </Field>
        <Field label={s.phone} required error={problems.phone}>
          <PhoneInput name="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" aria-invalid={Boolean(problems.phone)} />
        </Field>
        <Field label={s.city}>
          <SuggestInput name="city" value={form.city} onChange={(e) => set("city", e.target.value)} suggestions={governorateSuggestions()} />
        </Field>
        <Field label={s.email}>
          <TextInput name="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" dir="ltr" />
        </Field>
        <Field label={s.plan}>
          <SelectInput name="plan" value={plan} onChange={(e) => onPlanChange(e.target.value as PlanKey)}>
            {PLAN_KEYS.map((key) => (
              <option key={key} value={key}>
                {s.plans[key].name}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <Field label={s.address} hint={s.addressHint(clinicAddress("alnoor"))} error={problems.address}>
        <TextInput
          name="address"
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          dir="ltr"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={Boolean(problems.address)}
        />
      </Field>
      <Field label={s.message}>
        <TextArea name="message" rows={3} value={form.message} onChange={(e) => set("message", e.target.value)} dir="auto" />
      </Field>
      {error && <Alert tone="red">{error}</Alert>}
      <Button type="submit" icon={Send} loading={sending}>
        {s.send}
      </Button>
    </form>
  );
}
