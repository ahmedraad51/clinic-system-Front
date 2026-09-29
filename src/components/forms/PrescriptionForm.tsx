"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Alert, Button, Card, Field, FormActions, LinkButton, NumberInput, SelectInput, TextArea, TextInput } from "@/components/ui";
import MedicalAlerts from "@/components/MedicalAlerts";
import PrescriptionWarnings from "@/components/PrescriptionWarnings";
import UnsavedChangesGuard from "@/components/UnsavedChangesGuard";
import LinkSelect from "@/components/ui/LinkSelect";
import { errorMessage, getList } from "@/lib/frappe";
import { todayISO } from "@/lib/format";
import { useDoctors, usePatientMedical } from "@/lib/hooks";
import { FREQUENCIES, MEDICINE_FIELDS, medicineDefaults, medicineLabel, prescriptionWarnings } from "@/lib/prescriptions";
import { MEDICINE_GROUPS, type DentalMedicine, type Prescription, type PrescriptionMedicine } from "@/lib/types";

export interface PrescriptionRow {
  /** Keeps React and the labels stable while rows are added and removed. */
  key: number;
  medicine: string;
  dose: string;
  frequency: string;
  duration_days: string;
  instructions: string;
}

export interface PrescriptionFormData {
  patient: string;
  doctor: string;
  appointment: string;
  prescription_date: string;
  notes: string;
  medicines: PrescriptionRow[];
}

let nextKey = 1;
const emptyRow = (): PrescriptionRow => ({ key: nextKey++, medicine: "", dose: "", frequency: "", duration_days: "", instructions: "" });

export const emptyPrescription = (): PrescriptionFormData => ({
  patient: "",
  doctor: "",
  appointment: "",
  prescription_date: todayISO(),
  notes: "",
  medicines: [emptyRow()],
});

export function prescriptionToForm(doc: Prescription): PrescriptionFormData {
  return {
    patient: doc.patient ?? "",
    doctor: doc.doctor ?? "",
    appointment: doc.appointment ?? "",
    prescription_date: doc.prescription_date ?? "",
    notes: doc.notes ?? "",
    medicines: (doc.medicines ?? []).map((row) => ({
      key: nextKey++,
      medicine: row.medicine ?? "",
      dose: row.dose ?? "",
      frequency: row.frequency ?? "",
      duration_days: row.duration_days ? String(row.duration_days) : "",
      instructions: row.instructions ?? "",
    })),
  };
}

/** What is sent to the server. The medicine's name is copied onto each row, so the paper never changes with the list. */
export function prescriptionPayload(form: PrescriptionFormData, medicines: DentalMedicine[]) {
  const byName = new Map(medicines.map((medicine) => [medicine.name, medicine]));
  const rows: PrescriptionMedicine[] = form.medicines
    .filter((row) => row.medicine)
    .map((row) => {
      const medicine = byName.get(row.medicine);
      return {
        medicine: row.medicine,
        medicine_name: medicine ? medicineLabel(medicine) : row.medicine,
        dose: row.dose.trim(),
        frequency: row.frequency,
        duration_days: Number(row.duration_days) || 0,
        instructions: row.instructions.trim(),
      };
    });
  return {
    patient: form.patient,
    doctor: form.doctor || null,
    appointment: form.appointment || null,
    prescription_date: form.prescription_date,
    notes: form.notes.trim(),
    medicines: rows,
  };
}

/** True when the row's text is what its medicine's defaults would have filled in (or nothing was typed yet). */
function untouched(row: PrescriptionRow, previous: DentalMedicine | undefined): boolean {
  const blank = !row.dose && !row.frequency && !row.duration_days && !row.instructions;
  if (blank) return true;
  if (!previous) return false;
  const defaults = medicineDefaults(previous);
  return (
    row.dose === defaults.dose &&
    row.frequency === defaults.frequency &&
    row.duration_days === (defaults.duration_days ? String(defaults.duration_days) : "") &&
    row.instructions === defaults.instructions
  );
}

type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

export default function PrescriptionForm({
  initial,
  patientLabel,
  doctorLabel,
  submitLabel,
  cancelHref,
  onSubmit,
}: {
  initial: PrescriptionFormData;
  patientLabel?: string;
  doctorLabel?: string;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: PrescriptionFormData, medicines: DentalMedicine[]) => Promise<void>;
}) {
  const doctors = useDoctors();
  const [form, setForm] = useState<PrescriptionFormData>(initial);
  // The clinic's medicine list (inactive ones too, so an old prescription keeps its rows).
  const [medicines, setMedicines] = useState<DentalMedicine[] | null>(null);
  const [listError, setListError] = useState("");
  // The chosen patient's medical alerts and age, for the warnings.
  const medical = usePatientMedical(form.patient || undefined);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<DentalMedicine>("Dental Medicine", MEDICINE_FIELDS, {
          orderBy: "medicine_group asc, medicine_name asc",
          limit: 0,
        });
        if (!cancelled) setMedicines(rows);
      } catch (err) {
        console.error(err);
        if (!cancelled) setListError(errorMessage(err, "Could not load the medicine list."));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const byName = new Map((medicines ?? []).map((medicine) => [medicine.name, medicine]));
  const warnings = prescriptionWarnings(medical, form.medicines, byName);

  const handleChange = (event: InputEvent) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const updateRow = (key: number, changes: Partial<PrescriptionRow>) => {
    setForm({ ...form, medicines: form.medicines.map((row) => (row.key === key ? { ...row, ...changes } : row)) });
  };

  const chooseMedicine = (row: PrescriptionRow, name: string) => {
    const medicine = byName.get(name);
    // Fill in the usual dose unless the dentist already typed something else.
    if (medicine && untouched(row, byName.get(row.medicine))) {
      const defaults = medicineDefaults(medicine);
      updateRow(row.key, {
        medicine: name,
        dose: defaults.dose,
        frequency: defaults.frequency,
        duration_days: defaults.duration_days ? String(defaults.duration_days) : "",
        instructions: defaults.instructions,
      });
      return;
    }
    updateRow(row.key, { medicine: name });
  };

  const removeRow = (key: number) => {
    const rest = form.medicines.filter((row) => row.key !== key);
    setForm({ ...form, medicines: rest.length ? rest : [emptyRow()] });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const rows = form.medicines.filter((row) => row.medicine || row.dose || row.frequency || row.duration_days || row.instructions);
    if (rows.length === 0) {
      setError("Add at least one medicine.");
      return;
    }
    if (rows.some((row) => !row.medicine)) {
      setError("Choose a medicine for every row, or remove the empty rows.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit({ ...form, medicines: rows }, medicines ?? []);
      setDone(true);
    } catch (err) {
      console.error(err);
      setError(errorMessage(err, "Could not save the prescription. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const doctorMissing = form.doctor && !doctors.some((doctor) => doctor.name === form.doctor);
  const dirty = !done && JSON.stringify(form) !== JSON.stringify(initial);
  // Active medicines by group, plus the row's own medicine when it is no longer offered.
  const options = (current: string) =>
    MEDICINE_GROUPS.map((group) => ({
      group,
      items: (medicines ?? []).filter(
        (medicine) => (medicine.medicine_group || "Other") === group && (Number(medicine.is_active) === 1 || medicine.name === current),
      ),
    })).filter((entry) => entry.items.length > 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <UnsavedChangesGuard when={dirty} />
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
          {medical && (
            <div className="sm:col-span-2">
              <MedicalAlerts patient={medical} />
            </div>
          )}
          <Field label="Doctor" required>
            <SelectInput name="doctor" value={form.doctor} onChange={handleChange} required>
              <option value="">Select Doctor</option>
              {doctorMissing && <option value={form.doctor}>{doctorLabel || form.doctor}</option>}
              {doctors.map((doctor) => (
                <option key={doctor.name} value={doctor.name}>
                  {doctor.full_name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Date" required>
            <TextInput type="date" name="prescription_date" value={form.prescription_date} onChange={handleChange} required />
          </Field>
        </div>
      </Card>

      <Card
        title="Medicines"
        actions={
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => setForm({ ...form, medicines: [...form.medicines, emptyRow()] })}>
            Add medicine
          </Button>
        }
      >
        {listError && <Alert tone="red">{listError}</Alert>}
        <div className="space-y-4">
          {form.medicines.map((row, index) => (
            <fieldset key={row.key} className="rounded-xl border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-6 gap-3">
              <legend className="sr-only">Medicine {index + 1}</legend>
              <Field label="Medicine" className="sm:col-span-3">
                <SelectInput value={row.medicine} onChange={(event) => chooseMedicine(row, event.target.value)} disabled={medicines === null}>
                  <option value="">{medicines === null ? "Loading..." : "Choose a medicine"}</option>
                  {options(row.medicine).map((entry) => (
                    <optgroup key={entry.group} label={entry.group}>
                      {entry.items.map((medicine) => (
                        <option key={medicine.name} value={medicine.name}>
                          {[medicineLabel(medicine), medicine.dosage_form].filter(Boolean).join(" · ")}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Dose" className="sm:col-span-3">
                <TextInput value={row.dose} onChange={(event) => updateRow(row.key, { dose: event.target.value })} placeholder="500 mg, 1 tablet, 10 ml" />
              </Field>
              <Field label="How often" className="sm:col-span-2">
                <SelectInput value={row.frequency} onChange={(event) => updateRow(row.key, { frequency: event.target.value })}>
                  <option value="">Choose</option>
                  {FREQUENCIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Days">
                <NumberInput decimals={false} value={row.duration_days} onChange={(event) => updateRow(row.key, { duration_days: event.target.value })} />
              </Field>
              <Field label="Instructions" className="sm:col-span-2">
                <TextInput value={row.instructions} onChange={(event) => updateRow(row.key, { instructions: event.target.value })} placeholder="After food" />
              </Field>
              <div className="flex items-end sm:col-span-1">
                <Button
                  variant="ghost"
                  icon={Trash2}
                  onClick={() => removeRow(row.key)}
                  aria-label={`Remove row ${index + 1}`}
                  className="text-red-600 hover:bg-red-50 px-3"
                />
              </div>
            </fieldset>
          ))}
        </div>
        <div className="mt-4">
          <PrescriptionWarnings warnings={warnings} />
        </div>
      </Card>

      <Card>
        <Field label="Notes for the patient" hint="Printed under the medicines.">
          <TextArea name="notes" value={form.notes} onChange={handleChange} rows={2} />
        </Field>
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
