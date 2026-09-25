"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Save } from "lucide-react";
import { Alert, Button, Card, Field, LinkButton, SelectInput, TextArea, TextInput } from "@/components/ui";
import { errorMessage } from "@/lib/frappe";
import { GENDERS, type Patient } from "@/lib/types";

/** The editable Patient fields. Keys are Frappe fieldnames. */
export interface PatientFormData {
  full_name: string;
  gender: string;
  date_of_birth: string;
  phone_number: string;
  secondary_phone: string;
  email: string;
  address: string;
  allergies: string;
  current_medications: string;
  chronic_diseases: string;
  medical_history: string;
  notes: string;
}

export const EMPTY_PATIENT: PatientFormData = {
  full_name: "",
  gender: "",
  date_of_birth: "",
  phone_number: "",
  secondary_phone: "",
  email: "",
  address: "",
  allergies: "",
  current_medications: "",
  chronic_diseases: "",
  medical_history: "",
  notes: "",
};

export function patientToForm(patient: Patient): PatientFormData {
  const form = { ...EMPTY_PATIENT };
  (Object.keys(form) as Array<keyof PatientFormData>).forEach((key) => {
    form[key] = String(patient[key] ?? "");
  });
  return form;
}

/** What gets posted. Empty dates go as null, which Frappe stores as "not set". */
export function patientPayload(form: PatientFormData) {
  return { ...form, date_of_birth: form.date_of_birth || null };
}

type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

export default function PatientForm({
  initial,
  submitLabel,
  cancelHref,
  onSubmit,
}: {
  initial: PatientFormData;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: PatientFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<PatientFormData>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event: InputEvent) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit(form);
    } catch (err) {
      console.error(err);
      setError(errorMessage(err, "Could not save the patient. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card title="Basic Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" required className="sm:col-span-2">
            <TextInput name="full_name" value={form.full_name} onChange={handleChange} required autoComplete="off" />
          </Field>
          <Field label="Gender">
            <SelectInput name="gender" value={form.gender} onChange={handleChange}>
              <option value="">Select</option>
              {GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Date of Birth" hint="Age is worked out from this.">
            <TextInput type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} />
          </Field>
          <Field label="Phone Number" required>
            <TextInput type="tel" name="phone_number" value={form.phone_number} onChange={handleChange} required />
          </Field>
          <Field label="Secondary Phone">
            <TextInput type="tel" name="secondary_phone" value={form.secondary_phone} onChange={handleChange} />
          </Field>
          <Field label="Email">
            <TextInput type="email" name="email" value={form.email} onChange={handleChange} />
          </Field>
          <Field label="Address">
            <TextInput name="address" value={form.address} onChange={handleChange} />
          </Field>
        </div>
      </Card>

      <Card title="Medical Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Allergies" hint="Shown as a warning on the patient page.">
            <TextArea name="allergies" value={form.allergies} onChange={handleChange} rows={2} />
          </Field>
          <Field label="Current Medications">
            <TextArea name="current_medications" value={form.current_medications} onChange={handleChange} rows={2} />
          </Field>
          <Field label="Chronic Diseases">
            <TextArea name="chronic_diseases" value={form.chronic_diseases} onChange={handleChange} rows={2} />
          </Field>
          <Field label="Medical History">
            <TextArea name="medical_history" value={form.medical_history} onChange={handleChange} rows={2} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <TextArea name="notes" value={form.notes} onChange={handleChange} />
          </Field>
        </div>
      </Card>

      {error && <Alert tone="red">{error}</Alert>}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" icon={Save} loading={saving}>
          {submitLabel}
        </Button>
        <LinkButton href={cancelHref} variant="secondary">
          Cancel
        </LinkButton>
      </div>
    </form>
  );
}
