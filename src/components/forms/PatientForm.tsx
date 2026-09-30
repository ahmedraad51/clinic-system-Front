"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { Check, Save, Users } from "lucide-react";
import { Alert, Button, Card, Field, FormActions, LinkButton, NumberInput, focusField, PhoneInput, SelectInput, TextArea, TextInput } from "@/components/ui";
import UnsavedChangesGuard from "@/components/UnsavedChangesGuard";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { label, messages, messagesFor, type Messages } from "@/i18n";
import { errorMessage, getList, type FilterRow } from "@/lib/frappe";
import { cx } from "@/lib/format";
import { useDebounced } from "@/lib/hooks";
import { governorateSuggestions } from "@/lib/iraq";
import { isBlankMedicalText } from "@/lib/medical";
import { patientHref } from "@/lib/links";
import { phoneDigits, phoneSearchPattern, samePhone, toLatinDigits } from "@/lib/phone";
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
  /** Only used when the date of birth is not known. */
  age: string;
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
  age: "",
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
  const { age, ...rest } = form;
  // With a date of birth the server works the age out; without one, the typed age is saved.
  return {
    ...rest,
    // Arabic-keyboard digits are saved as 0-9, so search, WhatsApp and phone links work the same for everyone.
    phone_number: toLatinDigits(form.phone_number),
    secondary_phone: toLatinDigits(form.secondary_phone),
    date_of_birth: form.date_of_birth || null,
    ...(form.date_of_birth ? {} : { age: Number(age) || null }),
  };
}

type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

type MedicalField = "allergies" | "current_medications" | "chronic_diseases";

/**
 * The usual medical questions as tick boxes. Ticking writes the word into the existing text field, so the
 * back end needs no new fields and the medical alerts find it. A box is also shown ticked when the text
 * already says it in other words (e.g. "Warfarin 3mg", "وارفارين"); such a box can only be cleared in the text.
 * The word written is in the language of the screen (patientForm.checklist); `finds` knows English and Arabic.
 */
type ChecklistKey = keyof Messages["patientForm"]["checklist"];

const CHECKLIST: Array<{ key: ChecklistKey; field: MedicalField; finds: RegExp }> = [
  { key: "bloodThinners", field: "current_medications", finds: /blood thinner|warfarin|aspirin|clopidogrel|heparin|apixaban|rivaroxaban|dabigatran|anticoagula|مميّ?ع|مسيّ?ل|وارفارين|[أاإ]سبرين|كلوبيدو[قجغك]ريل|هيبارين|[أا]بيكسابان|ريفاروكسابان|دابيغاتران|تخثر/i },
  { key: "diabetes", field: "chronic_diseases", finds: /diabet|سكّ?ري|سكّ?ر/i },
  { key: "heart", field: "chronic_diseases", finds: /heart|cardiac|angina|arrhythmia|atrial fibrillation|pacemaker|قلب|ذبحة|رجفان|خفقان|منظم (?:ال)?ضربات/i },
  { key: "bloodPressure", field: "chronic_diseases", finds: /high blood pressure|hypertension|ضغط/i },
  { key: "pregnant", field: "chronic_diseases", finds: /pregnan|حامل|حبلى|(?:^|[^؀-ۿ])(?:ال|و|ب)?حمل/i },
  { key: "penicillin", field: "allergies", finds: /penicillin|amoxicillin|بن[يى]?سلين|[أا]موكس/i },
  { key: "latex", field: "allergies", finds: /latex|لاتكس/i },
  { key: "anaesthetic", field: "allergies", finds: /anaesthetic|anesthetic|lidocaine|articaine|مخدّ?ر|تخدير|بنج|ليدوكايين|[أا]رتيكايين/i },
];

/** The words a box may have written, in either language. */
function checklistTerms(key: ChecklistKey): string[] {
  return [messagesFor("en"), messagesFor("ar")].map((m) => m.patientForm.checklist[key].term.toLowerCase());
}

/** Splits a medical text at its commas (English or Arabic). */
function termParts(text: string): string[] {
  return text.split(/[,،]/).map((part) => part.trim());
}

/** Adds a term to a comma-separated medical text, replacing "None" and the like. */
function addTerm(text: string, term: string): string {
  return isBlankMedicalText(text) ? term : `${text.trim().replace(/[,،.\s]+$/, "")}${messages().patientForm.termSeparator}${term}`;
}

/** Removes a term that the checklist added (in either language), and tidies the commas. */
function removeTerm(text: string, terms: string[]): string {
  return termParts(text)
    .filter((part) => part && !terms.includes(part.toLowerCase()))
    .join(messages().patientForm.termSeparator);
}

/**
 * Patients who may already be this person: the same phone number (either phone field), or exactly the same
 * name. Looked up while typing, so the receptionist sees them before saving a second record.
 */
function usePossibleDuplicates(fullName: string, phone: string, currentName?: string) {
  const name = useDebounced(fullName.trim(), 400);
  const number = useDebounced(phoneDigits(phone), 400);
  const key = JSON.stringify([name, number, currentName ?? ""]);
  const [result, setResult] = useState<{ key: string; byPhone: Patient[]; byName: Patient[] } | null>(null);

  useEffect(() => {
    const [n, d, own] = JSON.parse(key) as [string, string, string];
    if (n.length < 5 && d.length < 7) return;
    let cancelled = false;
    const load = async () => {
      const orFilters: FilterRow[] = [];
      if (d.length >= 7) {
        // Stored numbers may have spaces, a leading 0 or a country code: search loosely, compare properly below.
        const pattern = phoneSearchPattern(d) ?? `%${d.slice(-4)}%`;
        orFilters.push(["phone_number", "like", pattern], ["secondary_phone", "like", pattern]);
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
  const { t } = useI18n();
  const f = t.patientForm;
  const [form, setForm] = useState<PatientFormData>(initial);
  const [saving, setSaving] = useState(false);
  // Set once saved, so the page can move on without the unsaved-changes question.
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [ageError, setAgeError] = useState("");
  const [askDuplicate, setAskDuplicate] = useState(false);
  // Patients who only told their age: show an Age box instead of the date of birth.
  const [ageOnly, setAgeOnly] = useState(() => !initial.date_of_birth && Boolean(initial.age));
  const duplicates = usePossibleDuplicates(form.full_name, form.phone_number, currentName);

  const handleChange = (event: InputEvent) => {
    if (event.target.name === "age") setAgeError("");
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (ageOnly && form.age !== "" && Number(form.age) > 120) {
      setAgeError(f.ageRange);
      focusField(event.currentTarget, "age");
      return;
    }
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
      setError(errorMessage(err, f.saveFailed));
    } finally {
      setSaving(false);
    }
  };

  const dirty = !done && JSON.stringify(form) !== JSON.stringify(initial);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <UnsavedChangesGuard when={dirty} />
      <Card title={f.basicInfo}>
        {(duplicates.byPhone.length > 0 || duplicates.byName.length > 0) && (
          <div className="mb-4">
            <Alert tone="yellow" title={f.alreadyRegistered}>
              <ul className="mt-1 space-y-1">
                {[...duplicates.byPhone, ...duplicates.byName].map((p) => (
                  <li key={p.name} className="flex flex-wrap items-center gap-x-2">
                    <Users size={14} />
                    <Link href={patientHref(p.name)} className="font-medium underline">
                      {p.full_name}
                    </Link>
                    <span className="text-sm">
                      <span dir="ltr">{p.phone_number}</span>
                      {t.common.dot}
                      {p.name}
                      {t.common.dot}
                      {duplicates.byPhone.some((q) => q.name === p.name) ? f.samePhone : f.sameName}
                    </span>
                  </li>
                ))}
              </ul>
            </Alert>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={f.fullName} required className="sm:col-span-2">
            <TextInput name="full_name" value={form.full_name} onChange={handleChange} required autoComplete="off" />
          </Field>
          <Field label={f.gender}>
            <SelectInput name="gender" value={form.gender} onChange={handleChange}>
              <option value="">{f.select}</option>
              {GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {label(t.enums.gender, gender)}
                </option>
              ))}
            </SelectInput>
          </Field>
          {/* The switch sits outside the label, so the field's name stays just "Age" or "Date of Birth". */}
          {ageOnly ? (
            <div>
              <Field label={f.age} error={ageError}>
                <NumberInput
                  name="age"
                  decimals={false}
                  maxLength={3}
                  value={form.age}
                  onChange={handleChange}
                  aria-invalid={ageError ? true : undefined}
                />
              </Field>
              <button
                type="button"
                onClick={() => {
                  setAgeOnly(false);
                  setAgeError("");
                  setForm({ ...form, age: "" });
                }}
                className="mt-1 pointer-coarse:min-h-11 text-xs text-primary-700 underline"
              >
                {f.dobInstead}
              </button>
            </div>
          ) : (
            <div>
              <Field label={f.dateOfBirth} hint={f.dobHint}>
                <TextInput type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} />
              </Field>
              <button
                type="button"
                onClick={() => {
                  setAgeOnly(true);
                  setForm({ ...form, date_of_birth: "" });
                }}
                className="mt-1 pointer-coarse:min-h-11 text-xs text-primary-700 underline"
              >
                {f.onlyAge}
              </button>
            </div>
          )}
          <Field label={f.phoneNumber} required>
            <PhoneInput name="phone_number" value={form.phone_number} onChange={handleChange} required />
          </Field>
          <Field label={f.secondaryPhone}>
            <PhoneInput name="secondary_phone" value={form.secondary_phone} onChange={handleChange} />
          </Field>
          <Field label={f.email}>
            <TextInput type="email" name="email" value={form.email} onChange={handleChange} dir="ltr" />
          </Field>
          <Field label={f.address}>
            <TextInput name="address" value={form.address} onChange={handleChange} list="iraq-governorates" autoComplete="off" />
            {/* Suggestions while typing: the governorates of Iraq, in the language of the screen. */}
            <datalist id="iraq-governorates">
              {governorateSuggestions().map((place) => (
                <option key={place.value} value={place.value}>
                  {place.hint}
                </option>
              ))}
            </datalist>
          </Field>
        </div>
      </Card>

      <Card title={f.medicalInfo}>
        <div className="mb-5">
          <p className="text-sm font-medium text-gray-700">{f.checklistTitle}</p>
          <p className="text-xs text-gray-500 mb-2">{f.checklistHint}</p>
          <div className="flex flex-wrap gap-2">
            {CHECKLIST.map((item) => {
              const text = form[item.field];
              const on = item.finds.test(text);
              const terms = checklistTerms(item.key);
              // Ticked because of other words in the text: can only be changed in the text itself.
              const fixed = on && !termParts(text).some((part) => terms.includes(part.toLowerCase()));
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={on}
                  disabled={fixed}
                  title={fixed ? f.checklistFixed : undefined}
                  onClick={() =>
                    setForm({
                      ...form,
                      [item.field]: on ? removeTerm(text, terms) : addTerm(text, f.checklist[item.key].term),
                    })
                  }
                  className={cx(
                    "inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-xl border text-sm font-medium transition disabled:cursor-default",
                    on ? "bg-red-50 border-red-200 text-red-800" : "bg-white border-gray-200 text-gray-700 hover:border-primary-300",
                  )}
                >
                  {on && <Check size={14} />}
                  {f.checklist[item.key].label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={f.allergies} hint={f.allergiesHint}>
            <TextArea name="allergies" value={form.allergies} onChange={handleChange} rows={2} />
          </Field>
          <Field label={f.currentMedications}>
            <TextArea name="current_medications" value={form.current_medications} onChange={handleChange} rows={2} />
          </Field>
          <Field label={f.chronicDiseases}>
            <TextArea name="chronic_diseases" value={form.chronic_diseases} onChange={handleChange} rows={2} />
          </Field>
          <Field label={f.medicalHistory}>
            <TextArea name="medical_history" value={form.medical_history} onChange={handleChange} rows={2} />
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
          {f.cancel}
        </LinkButton>
      </FormActions>

      <ConfirmDialog
        open={askDuplicate}
        title={f.duplicateTitle}
        danger={false}
        confirmLabel={f.saveAnyway}
        busy={saving}
        message={
          <p>
            {f.duplicateMessage(
              duplicates.byPhone.map((p) => p.full_name).join(f.termSeparator),
              duplicates.byPhone.length,
            )}
          </p>
        }
        onCancel={() => setAskDuplicate(false)}
        onConfirm={save}
      />
    </form>
  );
}
