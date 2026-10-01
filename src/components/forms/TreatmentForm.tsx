"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Save } from "lucide-react";
import { Alert, Button, Card, Field, FormActions, LinkButton, NumberInput, focusField, SelectInput, TextArea } from "@/components/ui";
import MedicalAlerts from "@/components/MedicalAlerts";
import UnsavedChangesGuard from "@/components/UnsavedChangesGuard";
import LinkSelect from "@/components/ui/LinkSelect";
import CurrencySelect from "@/components/CurrencySelect";
import { convertMoney } from "@/lib/currency";
import { errorMessage } from "@/lib/frappe";
import { currencyDecimals } from "@/lib/format";
import { useDoctors, usePatientMedical } from "@/lib/hooks";
import { useI18n } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { label, messages } from "@/i18n";
import {
  CHILD_LOWER_TEETH, CHILD_UPPER_TEETH, LOWER_TEETH, TREATMENT_STATUSES, TREATMENT_TYPES, UPPER_TEETH, type TreatmentPlan,
} from "@/lib/types";
import { doctorMedia } from "@/components/Avatar";

export interface TreatmentFormData {
  patient: string;
  doctor: string;
  treatment_type: string;
  tooth_number: string;
  /** "" is the clinic's own currency. */
  currency: string;
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
  currency: "",
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
    currency: plan.currency ?? "",
    total_cost: String(plan.total_cost ?? ""),
    status: plan.status ?? "Planned",
    diagnosis: plan.diagnosis ?? "",
    treatment_notes: plan.treatment_notes ?? "",
  };
}

export function treatmentPayload(form: TreatmentFormData) {
  return { ...form, doctor: form.doctor || null, total_cost: Number(form.total_cost) || 0 };
}

/** Quadrants in FDI order, for the tooth dropdown. `key` names the group in t.treatmentForm.quadrants. */
const QUADRANTS = [
  { key: "upperRight", teeth: UPPER_TEETH.slice(0, 8) },
  { key: "upperLeft", teeth: UPPER_TEETH.slice(8) },
  { key: "lowerLeft", teeth: LOWER_TEETH.slice(8) },
  { key: "lowerRight", teeth: LOWER_TEETH.slice(0, 8) },
  { key: "childUpperRight", teeth: CHILD_UPPER_TEETH.slice(0, 5) },
  { key: "childUpperLeft", teeth: CHILD_UPPER_TEETH.slice(5) },
  { key: "childLowerLeft", teeth: CHILD_LOWER_TEETH.slice(5) },
  { key: "childLowerRight", teeth: CHILD_LOWER_TEETH.slice(0, 5) },
] as const;
const ALL_TEETH = new Set<string>(QUADRANTS.flatMap((quadrant) => quadrant.teeth.map(String)));

type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

export default function TreatmentForm({
  initial,
  patientLabel,
  doctorLabel,
  showStatus = false,
  currencyLocked = false,
  submitLabel,
  cancelHref,
  onCancel,
  onDirtyChange,
  onSubmit,
}: {
  initial: TreatmentFormData;
  patientLabel?: string;
  doctorLabel?: string;
  showStatus?: boolean;
  /** The plan has payments: they were counted in its currency, so it cannot change. */
  currencyLocked?: boolean;
  submitLabel: string;
  cancelHref: string;
  /** In a dialog: Cancel closes it instead of following cancelHref. */
  onCancel?: () => void;
  /** In a dialog: told whether there are unsaved changes, so closing it can ask first. */
  onDirtyChange?: (dirty: boolean) => void;
  onSubmit: (data: TreatmentFormData) => Promise<void>;
}) {
  const { t } = useI18n();
  const { currency, currencies, rateOn, prices, money } = useSettings();
  const doctors = useDoctors();
  const [form, setForm] = useState<TreatmentFormData>(initial);
  // The chosen patient's medical alerts, shown while booking or planning treatment.
  const medical = usePatientMedical(form.patient || undefined);
  const [saving, setSaving] = useState(false);
  // Set once saved, so the page can move on without the unsaved-changes question.
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [costError, setCostError] = useState("");

  const planCurrency = (form.currency || currency).toUpperCase();
  const inClinicCurrency = planCurrency === currency;
  // The cost is still the price list's (or empty): a new type or currency may replace it.
  const costUntouched = form.total_cost === "" || (prices[form.treatment_type] !== undefined && inClinicCurrency && Number(form.total_cost) === prices[form.treatment_type]);

  const handleChange = (event: InputEvent) => {
    const { name, value } = event.target;
    if (name === "total_cost" || name === "treatment_type") setCostError("");
    if (name === "treatment_type") {
      // Fill in the usual price (the price list is in the clinic's currency), unless someone typed a different cost.
      const price = prices[value];
      setForm({ ...form, treatment_type: value, total_cost: costUntouched && price && inClinicCurrency ? String(price) : form.total_cost });
      return;
    }
    setForm({ ...form, [name]: value });
  };
  const changeCurrency = (code: string) => {
    const next = code === currency ? "" : code;
    const price = prices[form.treatment_type];
    setCostError("");
    // A price-list cost belongs to the clinic's currency: it goes when the plan moves to the other one.
    const cost = !costUntouched ? form.total_cost : next === "" && price ? String(price) : "";
    setForm({ ...form, currency: next, total_cost: cost });
  };
  const listPrice = prices[form.treatment_type];
  const listPriceConverted = listPrice && !inClinicCurrency ? convertMoney(listPrice, currency, planCurrency, rateOn(), currency) : null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cost = Number(form.total_cost);
    if (form.total_cost === "" || !Number.isFinite(cost) || cost < 0) {
      setCostError(messages().treatmentForm.costInvalid);
      focusField(event.currentTarget, "total_cost");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit(form);
      setDone(true);
    } catch (err) {
      console.error(err);
      setError(errorMessage(err, messages().treatmentForm.saveFailed));
    } finally {
      setSaving(false);
    }
  };

  const doctorMissing = form.doctor && !doctors.some((doctor) => doctor.name === form.doctor);
  // Older plans may hold free text such as "36, 37"; keep it as an option so it is not lost.
  const customTooth = form.tooth_number && !ALL_TEETH.has(form.tooth_number);

  const dirty = !done && JSON.stringify(form) !== JSON.stringify(initial);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <UnsavedChangesGuard when={dirty} />
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t.common.patient} required className="sm:col-span-2">
            <LinkSelect
              doctype="Patient"
              value={form.patient}
              onChange={(patient) => setForm({ ...form, patient })}
              detailField="phone_number"
              initialLabel={patientLabel}
              placeholder={t.treatmentForm.searchPatient}
              required
            />
          </Field>
          {medical && (
            <div className="sm:col-span-2">
              <MedicalAlerts patient={medical} />
            </div>
          )}
          <Field label={t.common.doctor}>
            <SelectInput name="doctor" value={form.doctor} onChange={handleChange} media={doctorMedia(doctors)}>
              <option value="">{t.treatmentForm.selectDoctor}</option>
              {doctorMissing && <option value={form.doctor}>{doctorLabel || form.doctor}</option>}
              {doctors.map((doctor) => (
                <option key={doctor.name} value={doctor.name}>
                  {doctor.full_name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={t.treatmentForm.treatmentType} required>
            <SelectInput name="treatment_type" value={form.treatment_type} onChange={handleChange} required>
              <option value="">{t.treatmentForm.selectType}</option>
              {TREATMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {label(t.enums.treatmentType, type)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={t.treatmentForm.tooth} hint={t.treatmentForm.toothHint}>
            <SelectInput name="tooth_number" value={form.tooth_number} onChange={handleChange}>
              <option value="">{t.treatmentForm.notToothSpecific}</option>
              {customTooth && <option value={form.tooth_number}>{form.tooth_number}</option>}
              {QUADRANTS.map((quadrant) => (
                <optgroup key={quadrant.key} label={t.treatmentForm.quadrants[quadrant.key]}>
                  {quadrant.teeth.map((tooth) => (
                    <option key={tooth} value={String(tooth)}>
                      {tooth}
                    </option>
                  ))}
                </optgroup>
              ))}
            </SelectInput>
          </Field>
          {currencies.length > 1 && (
            <Field label={t.money.currency} hint={currencyLocked ? t.money.currencyLocked : undefined}>
              <CurrencySelect value={form.currency} onChange={changeCurrency} disabled={currencyLocked} />
            </Field>
          )}
          <Field
            label={t.treatmentForm.totalCost(t.dates.currencySymbols[planCurrency] ?? planCurrency)}
            required
            error={costError}
            hint={
              !listPrice
                ? undefined
                : listPriceConverted
                  ? t.money.usualPriceConverted(label(t.enums.treatmentType, form.treatment_type), money(listPrice), money(listPriceConverted, planCurrency))
                  : t.treatmentForm.usualPrice(label(t.enums.treatmentType, form.treatment_type), money(listPrice))
            }
          >
            <NumberInput
              name="total_cost"
              decimals={currencyDecimals(planCurrency) > 0}
              value={form.total_cost}
              onChange={handleChange}
              required
              aria-invalid={costError ? true : undefined}
            />
          </Field>
          {showStatus && (
            <Field label={t.common.status}>
              <SelectInput name="status" value={form.status} onChange={handleChange}>
                {TREATMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {label(t.enums.treatmentStatus, status)}
                  </option>
                ))}
              </SelectInput>
            </Field>
          )}
          <Field label={t.treatmentForm.diagnosis} className="sm:col-span-2">
            <TextArea name="diagnosis" value={form.diagnosis} onChange={handleChange} rows={2} />
          </Field>
          <Field label={t.treatmentForm.treatmentNotes} className="sm:col-span-2">
            <TextArea name="treatment_notes" value={form.treatment_notes} onChange={handleChange} />
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
