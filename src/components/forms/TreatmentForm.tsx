"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Save } from "lucide-react";
import { Alert, Button, Card, Field, LinkButton, SelectInput, TextArea, TextInput } from "@/components/ui";
import LinkSelect from "@/components/ui/LinkSelect";
import { errorMessage } from "@/lib/frappe";
import { useDoctors } from "@/lib/hooks";
import { useSettings } from "@/context/SettingsContext";
import { LOWER_TEETH, TREATMENT_STATUSES, TREATMENT_TYPES, UPPER_TEETH, type TreatmentPlan } from "@/lib/types";

export interface TreatmentFormData {
  patient: string;
  doctor: string;
  treatment_type: string;
  tooth_number: string;
  total_cost: string;
  status: string;
  diagnosis: string;
  treatment_notes: string;
}

export const EMPTY_TREATMENT: TreatmentFormData = {
  patient: "",
  doctor: "",
  treatment_type: "",
  tooth_number: "",
  total_cost: "",
  status: "Planned",
  diagnosis: "",
  treatment_notes: "",
};

export function treatmentToForm(plan: TreatmentPlan): TreatmentFormData {
  return {
    patient: plan.patient ?? "",
    doctor: plan.doctor ?? "",
    treatment_type: plan.treatment_type ?? "",
    tooth_number: plan.tooth_number ?? "",
    total_cost: String(plan.total_cost ?? ""),
    status: plan.status ?? "Planned",
    diagnosis: plan.diagnosis ?? "",
    treatment_notes: plan.treatment_notes ?? "",
  };
}

export function treatmentPayload(form: TreatmentFormData) {
  return { ...form, doctor: form.doctor || null, total_cost: Number(form.total_cost) || 0 };
}

/** Quadrants in FDI order, for the tooth dropdown. */
const QUADRANTS = [
  { label: "Upper right", teeth: UPPER_TEETH.slice(0, 8) },
  { label: "Upper left", teeth: UPPER_TEETH.slice(8) },
  { label: "Lower left", teeth: LOWER_TEETH.slice(8) },
  { label: "Lower right", teeth: LOWER_TEETH.slice(0, 8) },
];
const ALL_TEETH = new Set<string>([...UPPER_TEETH, ...LOWER_TEETH].map(String));

type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

export default function TreatmentForm({
  initial,
  patientLabel,
  doctorLabel,
  showStatus = false,
  submitLabel,
  cancelHref,
  onSubmit,
}: {
  initial: TreatmentFormData;
  patientLabel?: string;
  doctorLabel?: string;
  showStatus?: boolean;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: TreatmentFormData) => Promise<void>;
}) {
  const { currency } = useSettings();
  const doctors = useDoctors();
  const [form, setForm] = useState<TreatmentFormData>(initial);
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
      setError(errorMessage(err, "Could not save the treatment plan. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const doctorMissing = form.doctor && !doctors.some((doctor) => doctor.name === form.doctor);
  // Older plans may hold free text such as "36, 37"; keep it as an option so it is not lost.
  const customTooth = form.tooth_number && !ALL_TEETH.has(form.tooth_number);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Patient" required className="sm:col-span-2">
            <LinkSelect
              doctype="Patient"
              value={form.patient}
              onChange={(patient) => setForm({ ...form, patient })}
              detailField="phone_number"
              initialLabel={patientLabel}
              placeholder="Search by name or phone..."
              required
            />
          </Field>
          <Field label="Doctor">
            <SelectInput name="doctor" value={form.doctor} onChange={handleChange}>
              <option value="">Select Doctor</option>
              {doctorMissing && <option value={form.doctor}>{doctorLabel || form.doctor}</option>}
              {doctors.map((doctor) => (
                <option key={doctor.name} value={doctor.name}>
                  {doctor.full_name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Treatment Type" required>
            <SelectInput name="treatment_type" value={form.treatment_type} onChange={handleChange} required>
              <option value="">Select Type</option>
              {TREATMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Tooth" hint="FDI number. Leave empty for whole-mouth work such as cleaning.">
            <SelectInput name="tooth_number" value={form.tooth_number} onChange={handleChange}>
              <option value="">Not tooth-specific</option>
              {customTooth && <option value={form.tooth_number}>{form.tooth_number}</option>}
              {QUADRANTS.map((quadrant) => (
                <optgroup key={quadrant.label} label={quadrant.label}>
                  {quadrant.teeth.map((tooth) => (
                    <option key={tooth} value={String(tooth)}>
                      {tooth}
                    </option>
                  ))}
                </optgroup>
              ))}
            </SelectInput>
          </Field>
          <Field label={`Total Cost (${currency})`} required>
            <TextInput
              type="number"
              name="total_cost"
              min={0}
              step="any"
              inputMode="decimal"
              value={form.total_cost}
              onChange={handleChange}
              required
            />
          </Field>
          {showStatus && (
            <Field label="Status">
              <SelectInput name="status" value={form.status} onChange={handleChange}>
                {TREATMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </SelectInput>
            </Field>
          )}
          <Field label="Diagnosis" className="sm:col-span-2">
            <TextArea name="diagnosis" value={form.diagnosis} onChange={handleChange} rows={2} />
          </Field>
          <Field label="Treatment Notes" className="sm:col-span-2">
            <TextArea name="treatment_notes" value={form.treatment_notes} onChange={handleChange} />
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
