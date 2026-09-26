"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import ToothLogo from "@/components/ToothLogo";
import { Save, Trash2, Upload } from "lucide-react";
import RequirePermission from "@/components/Guard";
import UnsavedChangesGuard from "@/components/UnsavedChangesGuard";
import {
  Alert,
  Button,
  Card,
  Field,
  FormActions,
  NumberInput,
  PageContainer,
  PageHeader,
  PageLoading,
  PhoneInput,
  SelectInput,
  TextInput,
  Toggle,
} from "@/components/ui";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { errorMessage, updateDoc, uploadFile, fileHref } from "@/lib/frappe";
import { currencyDecimals, cx } from "@/lib/format";
import { useDocument } from "@/lib/hooks";
import { DEFAULT_THEME_COLOR, normalizeHex, readableBrand, THEME_PRESETS } from "@/lib/theme";
import { CURRENCIES, TREATMENT_TYPES, WEEK_DAYS, type ClinicSettings } from "@/lib/types";
import { cleanCountryCode, DEFAULT_COUNTRY_CODE } from "@/lib/phone";

const SETTINGS = "Clinic Settings";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

interface SettingsForm {
  clinic_name: string;
  phone: string;
  email: string;
  address: string;
  tax_number: string;
  currency: string;
  phone_country_code: string;
  opening_time: string;
  closing_time: string;
  /** Open days, in WEEK_DAYS order. */
  working_days: string[];
  theme_color: string;
  logo: string;
  enable_whatsapp: boolean;
  enable_patient_portal: boolean;
  enable_financial_reports: boolean;
  /** Treatment type → price as typed; empty means no usual price. */
  prices: Record<string, string>;
}

function toForm(doc: ClinicSettings): SettingsForm {
  return {
    clinic_name: doc.clinic_name ?? "",
    phone: doc.phone ?? "",
    email: doc.email ?? "",
    address: doc.address ?? "",
    tax_number: doc.tax_number ?? "",
    currency: doc.currency || "USD",
    phone_country_code: doc.phone_country_code ?? "",
    opening_time: (doc.opening_time ?? "").slice(0, 5),
    closing_time: (doc.closing_time ?? "").slice(0, 5),
    // Nothing saved yet means open every day.
    working_days: (() => {
      const saved = (doc.working_days || "").split(",").map((d) => d.trim()).filter((d) => (WEEK_DAYS as readonly string[]).includes(d));
      return saved.length ? saved : [...WEEK_DAYS];
    })(),
    theme_color: normalizeHex(doc.theme_color) ?? DEFAULT_THEME_COLOR,
    logo: doc.logo ?? "",
    enable_whatsapp: Number(doc.enable_whatsapp) === 1,
    enable_patient_portal: Number(doc.enable_patient_portal) === 1,
    enable_financial_reports: Number(doc.enable_financial_reports) === 1,
    prices: Object.fromEntries((doc.treatment_prices ?? []).map((row) => [row.treatment_type, String(row.price ?? "")])),
  };
}

export default function SettingsPage() {
  return (
    <RequirePermission permission="manage_users">
      <SettingsView />
    </RequirePermission>
  );
}

function SettingsView() {
  const { doc, loading, error, reload } = useDocument<ClinicSettings>(SETTINGS, SETTINGS);

  if (loading) return <PageLoading />;
  return (
    <PageContainer narrow>
      <PageHeader title="Settings" subtitle="Clinic details, currency, working hours and features." />
      {doc ? (
        <SettingsFormView initial={doc} onSaved={reload} />
      ) : (
        <Alert tone="red" title="Could not load the settings">
          {error}
        </Alert>
      )}
    </PageContainer>
  );
}

function SettingsFormView({ initial, onSaved }: { initial: ClinicSettings; onSaved: () => void }) {
  const { refresh } = useSettings();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<SettingsForm>(() => toForm(initial));
  // The last saved values, to tell whether anything is still unsaved.
  const [baseline, setBaseline] = useState<SettingsForm>(form);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("The logo must be smaller than 2 MB.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setForm((prev) => ({ ...prev, logo: url }));
      toast.info("Logo uploaded. Press Save Settings to keep it.");
    } catch (err) {
      toast.error(errorMessage(err, "Could not upload the logo."));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateDoc(SETTINGS, SETTINGS, {
        clinic_name: form.clinic_name.trim(),
        phone: form.phone,
        email: form.email,
        address: form.address,
        tax_number: form.tax_number,
        currency: form.currency,
        // Digits only; empty means the default, 964.
        phone_country_code: cleanCountryCode(form.phone_country_code, ""),
        opening_time: form.opening_time || null,
        closing_time: form.closing_time || null,
        working_days: WEEK_DAYS.filter((d) => form.working_days.includes(d)).join(","),
        theme_color: form.theme_color,
        logo: form.logo,
        enable_whatsapp: form.enable_whatsapp ? 1 : 0,
        enable_patient_portal: form.enable_patient_portal ? 1 : 0,
        enable_financial_reports: form.enable_financial_reports ? 1 : 0,
        // Types from the list first, then any other type an older price list still holds.
        treatment_prices: [...TREATMENT_TYPES, ...Object.keys(form.prices).filter((t) => !(TREATMENT_TYPES as readonly string[]).includes(t))]
          .filter((type) => Number(form.prices[type]) > 0)
          .map((type) => ({ treatment_type: type, price: Number(form.prices[type]) })),
      });
      toast.success("Settings saved.");
      // Show the country code as it was saved ("00964" → "964").
      const saved = { ...form, phone_country_code: cleanCountryCode(form.phone_country_code, "") };
      setForm(saved);
      setBaseline(saved);
      refresh();
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Could not save the settings."));
    } finally {
      setSaving(false);
    }
  };

  // Keep an unusual saved currency in the list so it is not lost.
  const currencies: string[] = CURRENCIES.includes(form.currency as (typeof CURRENCIES)[number])
    ? [...CURRENCIES]
    : [form.currency, ...CURRENCIES];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <UnsavedChangesGuard when={JSON.stringify(form) !== JSON.stringify(baseline)} />
      <Card title="Clinic">
        <div className="flex items-center gap-4 mb-5">
          {form.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- the logo is an uploaded file of unknown size
            <img src={fileHref(form.logo)} alt="Clinic logo" className="w-16 h-16 rounded-2xl object-contain bg-gray-50 border border-gray-100" />
          ) : (
            <span className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center text-white">
              <ToothLogo size={30} />
            </span>
          )}
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
            <Button variant="secondary" size="sm" icon={Upload} loading={uploading} onClick={() => fileRef.current?.click()}>
              Upload Logo
            </Button>
            {form.logo && (
              <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setForm({ ...form, logo: "" })}>
                Remove
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Clinic Name" required className="sm:col-span-2">
            <TextInput name="clinic_name" value={form.clinic_name} onChange={handleChange} required />
          </Field>
          <Field label="Phone">
            <PhoneInput name="phone" value={form.phone} onChange={handleChange} />
          </Field>
          <Field label="Email">
            <TextInput type="email" name="email" value={form.email} onChange={handleChange} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <TextInput name="address" value={form.address} onChange={handleChange} />
          </Field>
          <Field label="Tax Number" hint="Printed on payment receipts.">
            <TextInput name="tax_number" value={form.tax_number} onChange={handleChange} />
          </Field>
          <Field label="Currency" hint="Used for every amount in the app.">
            <SelectInput name="currency" value={form.currency} onChange={handleChange}>
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Phone Country Code" hint={`Added to local numbers such as 0770 in WhatsApp links. Empty means ${DEFAULT_COUNTRY_CODE} (Iraq).`}>
            <TextInput
              name="phone_country_code"
              value={form.phone_country_code}
              onChange={handleChange}
              inputMode="numeric"
              maxLength={5}
              placeholder={DEFAULT_COUNTRY_CODE}
            />
          </Field>
        </div>
      </Card>

      <Card title="Working Hours">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Opening Time">
            <TextInput type="time" name="opening_time" value={form.opening_time} onChange={handleChange} />
          </Field>
          <Field label="Closing Time">
            <TextInput type="time" name="closing_time" value={form.closing_time} onChange={handleChange} />
          </Field>
        </div>
        <p className="text-xs text-gray-500 mt-3">Shown as a hint when booking an appointment.</p>
        <div className="mt-5">
          <p className="text-sm font-medium text-gray-700">Open on</p>
          <p className="text-xs text-gray-500 mb-2">Closed days are shaded in the calendar, and booking on them asks first.</p>
          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map((day) => {
              const on = form.working_days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setForm({
                      ...form,
                      working_days: on ? form.working_days.filter((d) => d !== day) : [...form.working_days, day],
                    })
                  }
                  className={cx(
                    "min-h-11 px-3.5 rounded-xl border text-sm font-medium transition",
                    on ? "bg-primary-600 border-primary-600 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-primary-300",
                  )}
                >
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card title="Price List">
        <p className="text-sm text-gray-500 mb-4">
          The usual price of each treatment. It is filled in when a treatment plan is created and can still be
          changed there. Leave a price empty to type it every time.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TREATMENT_TYPES.map((type) => (
            <Field key={type} label={`${type} (${form.currency})`}>
              <NumberInput
                decimals={currencyDecimals(form.currency) > 0}
                value={form.prices[type] ?? ""}
                onChange={(event) => setForm({ ...form, prices: { ...form.prices, [type]: event.target.value } })}
              />
            </Field>
          ))}
        </div>
      </Card>

      <Card title="Features">
        <div className="space-y-5">
          <Toggle
            checked={form.enable_whatsapp}
            onChange={(value) => setForm({ ...form, enable_whatsapp: value })}
            label="WhatsApp reminders"
            description="Send appointment reminders with the templates on the WhatsApp page."
          />
          <Toggle
            checked={form.enable_financial_reports}
            onChange={(value) => setForm({ ...form, enable_financial_reports: value })}
            label="Financial reports"
            description="Show the Reports page to users who have the View Reports permission."
          />
          <Toggle
            checked={form.enable_patient_portal}
            onChange={(value) => setForm({ ...form, enable_patient_portal: value })}
            label="Patient portal"
            description="Saved for the back end. The front end has no patient portal screens yet."
          />
          <ThemeColorPicker value={form.theme_color} onChange={(theme_color) => setForm({ ...form, theme_color })} />
        </div>
      </Card>

      {error && <Alert tone="red">{error}</Alert>}

      <FormActions>
        <Button type="submit" icon={Save} loading={saving} disabled={uploading}>
          Save Settings
        </Button>
      </FormActions>
    </form>
  );
}

/** The clinic colour: a few calm presets, or any colour. Shows a sample of how buttons will look. */
function ThemeColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const current = normalizeHex(value) ?? DEFAULT_THEME_COLOR;
  const used = readableBrand(current);
  return (
    <div className="pt-1">
      <p className="text-sm font-medium text-gray-800">Theme colour</p>
      <p className="text-xs text-gray-500 mt-0.5">Buttons, links and highlights use this colour.</p>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {THEME_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            aria-label={preset.label}
            aria-pressed={current === preset.value}
            title={preset.label}
            className={cx(
              "w-9 h-9 pointer-coarse:w-11 pointer-coarse:h-11 rounded-full border-2 transition",
              current === preset.value ? "border-gray-800 scale-110" : "border-white shadow-sm hover:scale-105",
            )}
            style={{ backgroundColor: preset.value }}
          />
        ))}
        <label className="flex items-center gap-2 ms-1 text-sm text-gray-600">
          <input
            type="color"
            value={current}
            onChange={(event) => onChange(event.target.value)}
            aria-label="Choose any colour"
            className="h-9 w-12 rounded-lg border border-gray-200 bg-white p-1 cursor-pointer"
          />
          Other
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <span className="px-4 py-2 rounded-xl text-sm font-medium text-white shadow-sm" style={{ backgroundColor: used }}>
          Sample button
        </span>
        {used !== current && (
          <span className="text-xs text-gray-500">Made a little darker so white text on it stays easy to read.</span>
        )}
      </div>
    </div>
  );
}
