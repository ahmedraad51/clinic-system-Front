"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { Save, Users } from "lucide-react";
import { Alert, Button, Card, Field, FormActions, LinkButton, SelectInput, TextArea, TextInput } from "@/components/ui";
import UnsavedChangesGuard from "@/components/UnsavedChangesGuard";
import { ConfirmDialog } from "@/components/ui/Modal";
import { errorMessage, getList, type FilterRow } from "@/lib/frappe";
import { useDebounced } from "@/lib/hooks";
import { patientHref } from "@/lib/links";
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

const digitsOf = (phone?: string) => (phone || "").replace(/\D/g, "");
/** Two phone numbers are the same when their last 8 digits match, so "+20 100 234 5678" = "0100 234 5678". */
const samePhone = (a?: string, b?: string) => {
  const x = digitsOf(a);
  const y = digitsOf(b);
  return x.length >= 7 && y.length >= 7 && x.slice(-8) === y.slice(-8);
};

/**
 * Patients who may already be this person: the same phone number (either phone field), or exactly the same
 * name. Looked up while typing, so the receptionist sees them before saving a second record.
 */
function usePossibleDuplicates(fullName: string, phone: string, currentName?: string) {
  const name = useDebounced(fullName.trim(), 400);
  const number = useDebounced(digitsOf(phone), 400);
  const key = JSON.stringify([name, number, currentName ?? ""]);
  const [result, setResult] = useState<{ key: string; byPhone: Patient[]; byName: Patient[] } | null>(null);

  useEffect(() => {
    const [n, d, own] = JSON.parse(key) as [string, string, string];
    if (n.length < 5 && d.length < 7) return;
    let cancelled = false;
    const load = async () => {
      const orFilters: FilterRow[] = [];
      if (d.length >= 7) {
        // Stored numbers may have spaces, so search on the last four digits and compare properly below.
        const tail = `%${d.slice(-4)}%`;
        orFilters.push(["phone_number", "like", tail], ["secondary_phone", "like", tail]);
      }
      if (n.length >= 5) orFilters.push(["full_name", "like", `%${n}%`]);
      try {
        const rows = await getList<Patient>("Patient", ["name", "full_name", "phone_number", "secondary_phone"], {
          orFilters,
          limit: 20,
        });
        const others = rows.filter((p) => p.name !== own);
        if (!cancelled) {
          setResult({
            key,
            byPhone: others.filter((p) => samePhone(p.phone_number, d) || samePhone(p.secondary_phone, d)),
            byName: others.filter((p) => n.length >= 5 && p.full_name.trim().toLowerCase() === n.toLowerCase()),
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const current = result?.key === key ? result : null;
  const byPhone = current?.byPhone ?? [];
  const byName = (current?.byName ?? []).filter((p) => !byPhone.some((q) => q.name === p.name));
  return { byPhone, byName };
}

export default function PatientForm({
  initial,
  currentName,
  submitLabel,
  cancelHref,
  onSubmit,
}: {
  initial: PatientFormData;
  /** The patient being edited, so it is not reported as its own duplicate. */
  currentName?: string;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: PatientFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<PatientFormData>(initial);
  const [saving, setSaving] = useState(false);
  // Set once saved, so the page can move on without the unsaved-changes question.
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [askDuplicate, setAskDuplicate] = useState(false);
  const duplicates = usePossibleDuplicates(form.full_name, form.phone_number, currentName);

  const handleChange = (event: InputEvent) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // The same phone number usually means the same person: ask before making a second record.
    const phoneChanged = !currentName || !samePhone(form.phone_number, initial.phone_number);
    if (phoneChanged && duplicates.byPhone.length > 0 && !askDuplicate) {
      setAskDuplicate(true);
      return;
    }
    await save();
  };

  const save = async () => {
    setAskDuplicate(false);
    setSaving(true);
    setError("");
    try {
      await onSubmit(form);
      setDone(true);
    } catch (err) {
      console.error(err);
      setError(errorMessage(err, "Could not save the patient. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const dirty = !done && JSON.stringify(form) !== JSON.stringify(initial);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <UnsavedChangesGuard when={dirty} />
      <Card title="Basic Information">
        {(duplicates.byPhone.length > 0 || duplicates.byName.length > 0) && (
          <div className="mb-4">
            <Alert tone="yellow" title="Already registered?">
              <ul className="mt-1 space-y-1">
                {[...duplicates.byPhone, ...duplicates.byName].map((p) => (
                  <li key={p.name} className="flex flex-wrap items-center gap-x-2">
                    <Users size={14} />
                    <Link href={patientHref(p.name)} className="font-medium underline">
                      {p.full_name}
                    </Link>
                    <span className="text-sm">
                      {p.phone_number} · {p.name}
                      {duplicates.byPhone.some((q) => q.name === p.name) ? " · same phone number" : " · same name"}
                    </span>
                  </li>
                ))}
              </ul>
            </Alert>
          </div>
        )}
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

      <FormActions>
        <Button type="submit" icon={Save} loading={saving}>
          {submitLabel}
        </Button>
        <LinkButton href={cancelHref} variant="secondary">
          Cancel
        </LinkButton>
      </FormActions>

      <ConfirmDialog
        open={askDuplicate}
        title="This phone number is already registered"
        danger={false}
        confirmLabel="Save anyway"
        busy={saving}
        message={
          <p>
            {duplicates.byPhone.map((p) => p.full_name).join(", ")} already {duplicates.byPhone.length === 1 ? "has" : "have"} this
            phone number. If it is the same person, open that record instead. Save a new record anyway?
          </p>
        }
        onCancel={() => setAskDuplicate(false)}
        onConfirm={save}
      />
    </form>
  );
}
