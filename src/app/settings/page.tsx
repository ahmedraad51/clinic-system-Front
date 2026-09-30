"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import ToothLogo from "@/components/ToothLogo";
import { CalendarDays, Plus, Settings, Save, Sparkles, Tags, Trash2, Upload } from "lucide-react";
import RequirePermission from "@/components/Guard";
import UnsavedChangesGuard from "@/components/UnsavedChangesGuard";
import {
  Alert,
  Badge,
  Button,
  Card,
  DetailLayout, Fraction,
  Field,
  FormActions,
  NumberInput,
  PageContainer,
  PageHeader,
  PageLoading,
  PhoneInput,
  ProfileCard,
  ProgressBar,
  SelectInput,
  Tabs,
  TextInput,
  Toggle,
} from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { errorMessage, getCount, updateDoc, uploadFile, fileHref } from "@/lib/frappe";
import { isLang, label, LANGS, messages, num, type Lang } from "@/i18n";
import { currencyDecimals, cx, formatDate, formatTime, todayISO } from "@/lib/format";
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
  /** "" for one currency only. */
  second_currency: string;
  /** The second currency's rates as typed, in the order shown. */
  exchange_rates: { rate_date: string; rate: string }[];
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
  /** The language the app opens in; nothing saved counts as Arabic. */
  default_language: Lang;
  arabic_digits: boolean;
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
    currency: doc.currency || "IQD",
    second_currency: doc.second_currency && doc.second_currency !== (doc.currency || "IQD") ? doc.second_currency : "",
    exchange_rates: [...(doc.exchange_rates ?? [])]
      .sort((a, b) => String(a.rate_date).localeCompare(String(b.rate_date)))
      .map((row) => ({ rate_date: String(row.rate_date || "").slice(0, 10), rate: String(row.rate ?? "") })),
    phone_country_code: doc.phone_country_code ?? "",
    opening_time: (doc.opening_time ?? "").slice(0, 5),
    closing_time: (doc.closing_time ?? "").slice(0, 5),
    // Nothing saved yet means open every day.
    working_days: (() => {
      const saved = (doc.working_days || "").split(",").map((d) => d.trim()).filter((d) => (WEEK_DAYS as readonly string[]).includes(d));
      return saved.length ? saved : [...WEEK_DAYS];
    })(),
    // Empty: the default colour (indigo).
    theme_color: normalizeHex(doc.theme_color) ?? "",
    logo: doc.logo ?? "",
    enable_whatsapp: Number(doc.enable_whatsapp) === 1,
    enable_patient_portal: Number(doc.enable_patient_portal) === 1,
    enable_financial_reports: Number(doc.enable_financial_reports) === 1,
    default_language: isLang(doc.default_language) ? doc.default_language : "ar",
    arabic_digits: Number(doc.arabic_digits) === 1,
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
  const { t } = useI18n();
  const { doc, loading, error, reload } = useDocument<ClinicSettings>(SETTINGS, SETTINGS);

  if (loading) return <PageLoading />;
  return (
    <PageContainer section="system">
      <PageHeader icon={Settings} section="system" title={t.settings.title} subtitle={t.settings.subtitle} />
      {doc ? (
        <SettingsFormView initial={doc} onSaved={reload} />
      ) : (
        <Alert tone="red" title={t.settings.loadFailed}>
          {error}
        </Alert>
      )}
    </PageContainer>
  );
}

/** The sections of the settings, one tab each. */
const SETTINGS_TABS = ["clinic", "currencies", "language", "hours", "prices", "features"] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

function SettingsFormView({ initial, onSaved }: { initial: ClinicSettings; onSaved: () => void }) {
  const { t } = useI18n();
  const { refresh } = useSettings();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<SettingsForm>(() => toForm(initial));
  // The last saved values, to tell whether anything is still unsaved.
  const [baseline, setBaseline] = useState<SettingsForm>(form);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoProgress, setLogoProgress] = useState(0);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<SettingsTab>("clinic");

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t.settings.notImage);
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error(t.settings.logoTooBig(MAX_LOGO_BYTES / (1024 * 1024)));
      return;
    }
    setUploading(true);
    setLogoProgress(0);
    try {
      const url = await uploadFile(file, { onProgress: (fraction) => setLogoProgress(fraction * 100) });
      setForm((prev) => ({ ...prev, logo: url }));
      toast.info(t.settings.logoUploaded);
    } catch (err) {
      toast.error(errorMessage(err, t.settings.logoUploadFailed));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Rates: a date and an amount above zero each, one per date, and at least one for a second currency. Without a
    // second currency the saved rates stay as they were (old payments were counted with them).
    const rates = form.second_currency ? form.exchange_rates : baseline.exchange_rates;
    const dates = rates.map((row) => row.rate_date);
    if (!form.clinic_name.trim()) {
      setTab("clinic");
      setError(t.settings.nameRequired);
      return;
    }
    // Checked here, not by the browser: the box is on a tab that may not be shown.
    const email = form.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setTab("clinic");
      setError(t.settings.emailInvalid);
      return;
    }
    if (
      (form.second_currency && rates.length === 0) ||
      rates.some((row) => !row.rate_date || !(Number(row.rate) > 0)) ||
      new Set(dates).size !== dates.length
    ) {
      setTab("currencies");
      setError(t.settings.rateInvalid);
      return;
    }
    setSaving(true);
    setError("");
    try {
      // A currency that plans or payments are already in cannot change under them.
      const e = messages().errors.mock;
      const inUse = async (code: string) =>
        (await getCount("Treatment Plan", [["currency", "=", code]])) + (await getCount("Payment", [["currency", "=", code]])) > 0;
      if (form.currency !== baseline.currency && ((await getCount("Treatment Plan")) > 0 || (await getCount("Payment")) > 0)) {
        setTab("clinic");
        setError(e.mainInUse);
        return;
      }
      if (baseline.second_currency && form.second_currency !== baseline.second_currency && (await inUse(baseline.second_currency))) {
        setTab("currencies");
        setError(e.secondInUse(baseline.second_currency));
        return;
      }
      await updateDoc(SETTINGS, SETTINGS, {
        clinic_name: form.clinic_name.trim(),
        phone: form.phone,
        email,
        address: form.address,
        tax_number: form.tax_number,
        currency: form.currency,
        second_currency: form.second_currency,
        exchange_rates: [...rates]
          .sort((a, b) => a.rate_date.localeCompare(b.rate_date))
          .map((row) => ({ rate_date: row.rate_date, rate: Number(row.rate) })),
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
        default_language: form.default_language,
        arabic_digits: form.arabic_digits ? 1 : 0,
        // Types from the list first, then any other type an older price list still holds.
        treatment_prices: [...TREATMENT_TYPES, ...Object.keys(form.prices).filter((type) => !(TREATMENT_TYPES as readonly string[]).includes(type))]
          .filter((type) => Number(form.prices[type]) > 0)
          .map((type) => ({ treatment_type: type, price: Number(form.prices[type]) })),
      });
      toast.success(t.settings.saved);
      // Show the country code as it was saved ("00964" → "964").
      const saved = { ...form, phone_country_code: cleanCountryCode(form.phone_country_code, "") };
      setForm(saved);
      setBaseline(saved);
      // The whole app follows the new settings at once (currency, language, digits).
      refresh();
      onSaved();
    } catch (err) {
      setError(errorMessage(err, t.settings.saveFailed));
    } finally {
      setSaving(false);
    }
  };

  // Keep an unusual saved currency in the list so it is not lost.
  const currencies: string[] = CURRENCIES.includes(form.currency as (typeof CURRENCIES)[number])
    ? [...CURRENCIES]
    : [form.currency, ...CURRENCIES];

  const tabLabels: Record<SettingsTab, string> = {
    clinic: t.settings.clinic,
    currencies: t.settings.currencies,
    language: t.settings.language,
    hours: t.settings.workingHours,
    prices: t.settings.priceList,
    features: t.settings.features,
  };
  const openDays = form.working_days.length;
  const pricesSet = TREATMENT_TYPES.filter((type) => Number(form.prices[type]) > 0).length;

  return (
    <form onSubmit={handleSubmit}>
      <UnsavedChangesGuard when={JSON.stringify(form) !== JSON.stringify(baseline)} />
      <DetailLayout
        aside={
          <ProfileCard
            avatar={
              form.logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- the logo is an uploaded file of unknown size
                <img src={fileHref(form.logo)} alt="" className="w-24 h-24 rounded-md object-contain bg-gray-50" />
              ) : (
                <span className="w-24 h-24 rounded-md bg-primary-100 text-primary-600 flex items-center justify-center">
                  <ToothLogo size={48} />
                </span>
              )
            }
            title={form.clinic_name || "DentClinic"}
            subtitle={form.phone ? <span dir="ltr">{form.phone}</span> : undefined}
            badges={
              <>
                <Badge tone="primary">{form.currency}</Badge>
                {form.second_currency && <Badge tone="green">{form.second_currency}</Badge>}
              </>
            }
            stats={[
              { icon: CalendarDays, value: <Fraction value={num(openDays)} of={num(7)} />, label: t.settings.openDaysStat, hue: "blue" },
              { icon: Tags, value: <Fraction value={num(pricesSet)} of={num(TREATMENT_TYPES.length)} />, label: t.settings.pricesStat, hue: "green" },
            ]}
            detailsTitle={t.users.details}
            details={[
              { label: t.settings.email, value: form.email ? <span dir="ltr">{form.email}</span> : "" },
              { label: t.settings.address, value: form.address },
              { label: t.settings.taxNumber, value: form.tax_number ? <span dir="ltr">{form.tax_number}</span> : "" },
              {
                label: t.settings.workingHours,
                value: form.opening_time && form.closing_time ? t.doctors.hours(formatTime(form.opening_time), formatTime(form.closing_time)) : "",
              },
            ]}
          />
        }
      >
      <Tabs tabs={SETTINGS_TABS.map((key) => ({ key, label: tabLabels[key] }))} active={tab} onChange={setTab} />
      {tab === "clinic" && (
      <Card title={t.settings.clinic}>
        <div className="flex items-center gap-4 mb-5">
          {form.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- the logo is an uploaded file of unknown size
            <img src={fileHref(form.logo)} alt={t.settings.logoAlt} className="w-16 h-16 rounded-2xl object-contain bg-gray-50 border border-gray-100" />
          ) : (
            <span className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center text-white">
              <ToothLogo size={30} />
            </span>
          )}
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} aria-label={t.settings.logoFile} />
            <Button variant="secondary" size="sm" icon={Upload} loading={uploading} onClick={() => fileRef.current?.click()}>
              {t.settings.uploadLogo}
            </Button>
            {form.logo && (
              <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setForm({ ...form, logo: "" })}>
                {t.settings.remove}
              </Button>
            )}
            {uploading && (
              <div className="basis-full max-w-60">
                <ProgressBar value={logoProgress} label={t.settings.uploadingLogo} />
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t.settings.clinicName} required className="sm:col-span-2">
            <TextInput name="clinic_name" value={form.clinic_name} onChange={handleChange} required />
          </Field>
          <Field label={t.settings.phone}>
            <PhoneInput name="phone" value={form.phone} onChange={handleChange} />
          </Field>
          <Field label={t.settings.email}>
            <TextInput type="email" name="email" value={form.email} onChange={handleChange} dir="ltr" />
          </Field>
          <Field label={t.settings.address} className="sm:col-span-2">
            <TextInput name="address" value={form.address} onChange={handleChange} />
          </Field>
          <Field label={t.settings.taxNumber} hint={t.settings.taxNumberHint}>
            <TextInput name="tax_number" value={form.tax_number} onChange={handleChange} dir="ltr" />
          </Field>
          <Field label={t.settings.currency} hint={t.settings.currencyHint}>
            <SelectInput
              name="currency"
              value={form.currency}
              // The second currency cannot be the clinic's own.
              onChange={(event) =>
                setForm({
                  ...form,
                  currency: event.target.value,
                  second_currency: form.second_currency === event.target.value ? "" : form.second_currency,
                })
              }
            >
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={t.settings.countryCode} hint={t.settings.countryCodeHint(DEFAULT_COUNTRY_CODE)}>
            <TextInput
              name="phone_country_code"
              value={form.phone_country_code}
              onChange={handleChange}
              inputMode="numeric"
              dir="ltr"
              maxLength={5}
              placeholder={DEFAULT_COUNTRY_CODE}
            />
          </Field>
        </div>
      </Card>
      )}

      {tab === "currencies" && (
      <Card title={t.settings.currencies}>
        <div className="space-y-5">
          <Field label={t.settings.secondCurrency} hint={t.settings.secondHint}>
            <SelectInput
              name="second_currency"
              value={form.second_currency}
              onChange={(event) =>
                setForm({
                  ...form,
                  second_currency: event.target.value,
                  // The first time, start with a row for today's rate.
                  exchange_rates:
                    event.target.value && form.exchange_rates.length === 0 ? [{ rate_date: todayISO(), rate: "" }] : form.exchange_rates,
                })
              }
            >
              <option value="">{t.settings.secondNone}</option>
              {currencies
                .filter((code) => code !== form.currency)
                .map((code) => (
                  <option key={code} value={code}>
                    {t.money.names[code] ?? code}
                  </option>
                ))}
            </SelectInput>
          </Field>
          {form.second_currency && (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-gray-700">{t.settings.rates}</legend>
              <p className="text-xs text-gray-500">{t.settings.ratesHint(form.second_currency, form.currency)}</p>
              {form.exchange_rates.length === 0 && <p className="text-sm text-amber-700">{t.settings.noRates}</p>}
              {form.exchange_rates.map((row, index) => (
                <div key={index} className="flex flex-wrap items-end gap-3">
                  <Field label={t.settings.rateFrom} className="w-44">
                    <TextInput
                      type="date"
                      dir="ltr"
                      value={row.rate_date}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          exchange_rates: form.exchange_rates.map((other, i) => (i === index ? { ...other, rate_date: event.target.value } : other)),
                        })
                      }
                    />
                  </Field>
                  <Field label={t.settings.rateValue(form.second_currency, form.currency)} className="w-44">
                    <NumberInput
                      // A rate is not an amount: it keeps its decimals (1,462.5) whatever the currency.
                      value={row.rate}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          exchange_rates: form.exchange_rates.map((other, i) => (i === index ? { ...other, rate: event.target.value } : other)),
                        })
                      }
                    />
                  </Field>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    aria-label={t.settings.removeRate(row.rate_date ? formatDate(row.rate_date) : String(index + 1))}
                    onClick={() => setForm({ ...form, exchange_rates: form.exchange_rates.filter((_, i) => i !== index) })}
                    className="mb-1"
                  />
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={() => setForm({ ...form, exchange_rates: [...form.exchange_rates, { rate_date: todayISO(), rate: "" }] })}
              >
                {t.settings.addRate}
              </Button>
            </fieldset>
          )}
        </div>
      </Card>
      )}

      {tab === "language" && (
      <Card title={t.settings.language}>
        <div className="space-y-5">
          <Field label={t.settings.defaultLanguage} hint={t.settings.defaultLanguageHint}>
            <SelectInput
              name="default_language"
              value={form.default_language}
              onChange={(event) => setForm({ ...form, default_language: isLang(event.target.value) ? event.target.value : "ar" })}
            >
              {LANGS.map((lang) => (
                <option key={lang} value={lang}>
                  {label(t.enums.language, lang)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Toggle
            checked={form.arabic_digits}
            onChange={(value) => setForm({ ...form, arabic_digits: value })}
            label={t.settings.arabicDigits}
            description={t.settings.arabicDigitsHint}
          />
        </div>
      </Card>
      )}

      {tab === "hours" && (
      <Card title={t.settings.workingHours}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t.settings.openingTime}>
            <TextInput type="time" name="opening_time" value={form.opening_time} onChange={handleChange} dir="ltr" />
          </Field>
          <Field label={t.settings.closingTime}>
            <TextInput type="time" name="closing_time" value={form.closing_time} onChange={handleChange} dir="ltr" />
          </Field>
        </div>
        <p className="text-xs text-gray-500 mt-3">{t.settings.hoursHint}</p>
        <div className="mt-5">
          <p className="text-sm font-medium text-gray-700">{t.settings.openOn}</p>
          <p className="text-xs text-gray-500 mb-2">{t.settings.openOnHint}</p>
          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map((day, index) => {
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
                    on ? "bg-brand border-primary-600 text-white" : "bg-surface border-gray-200 text-gray-600 hover:border-primary-300",
                  )}
                >
                  {t.dates.daysShort[index]}
                </button>
              );
            })}
          </div>
        </div>
      </Card>
      )}

      {tab === "prices" && (
      <Card title={t.settings.priceList}>
        <p className="text-sm text-gray-500 mb-4">{t.settings.priceListHint}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TREATMENT_TYPES.map((type) => (
            <Field key={type} label={t.settings.priceLabel(label(t.enums.treatmentType, type), form.currency)}>
              <NumberInput
                decimals={currencyDecimals(form.currency) > 0}
                value={form.prices[type] ?? ""}
                onChange={(event) => setForm({ ...form, prices: { ...form.prices, [type]: event.target.value } })}
              />
            </Field>
          ))}
        </div>
      </Card>
      )}

      {tab === "features" && (
      <Card title={t.settings.features}>
        <div className="space-y-5">
          <Toggle
            checked={form.enable_whatsapp}
            onChange={(value) => setForm({ ...form, enable_whatsapp: value })}
            label={t.settings.whatsapp}
            description={t.settings.whatsappHint}
          />
          <Toggle
            checked={form.enable_financial_reports}
            onChange={(value) => setForm({ ...form, enable_financial_reports: value })}
            label={t.settings.reports}
            description={t.settings.reportsHint}
          />
          <Toggle
            checked={form.enable_patient_portal}
            onChange={(value) => setForm({ ...form, enable_patient_portal: value })}
            label={t.settings.portal}
            description={t.settings.portalHint}
          />
          <ThemeColorPicker value={form.theme_color} onChange={(theme_color) => setForm({ ...form, theme_color })} />
        </div>
      </Card>
      )}

      {error && <Alert tone="red">{error}</Alert>}

      <FormActions>
        <Button type="submit" icon={Save} loading={saving} disabled={uploading}>
          {t.settings.saveSettings}
        </Button>
      </FormActions>
      </DetailLayout>
    </form>
  );
}

/**
 * The clinic colour: the default indigo, a few calm presets, or any colour. Shows a sample of how buttons will look.
 */
function ThemeColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  const chosen = normalizeHex(value);
  const current = chosen ?? DEFAULT_THEME_COLOR;
  const used = readableBrand(current);
  return (
    <div className="pt-1">
      <p className="text-sm font-medium text-gray-800">{t.settings.themeColour}</p>
      <p className="text-xs text-gray-500 mt-0.5">{t.settings.themeHint}</p>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t.settings.defaultColour}
          aria-pressed={!chosen}
          title={t.settings.defaultColour}
          className={cx(
            "relative w-9 h-9 pointer-coarse:w-11 pointer-coarse:h-11 rounded-full border-2 transition",
            !chosen ? "border-gray-800 scale-110" : "border-white shadow-sm hover:scale-105",
          )}
          style={{ backgroundColor: DEFAULT_THEME_COLOR }}
        >
          <Sparkles size={14} className="absolute inset-0 m-auto text-white" aria-hidden="true" />
        </button>
        {THEME_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            aria-label={t.settings.themeNames[preset.key]}
            aria-pressed={chosen === preset.value}
            title={t.settings.themeNames[preset.key]}
            className={cx(
              "w-9 h-9 pointer-coarse:w-11 pointer-coarse:h-11 rounded-full border-2 transition",
              chosen === preset.value ? "border-gray-800 scale-110" : "border-white shadow-sm hover:scale-105",
            )}
            style={{ backgroundColor: preset.value }}
          />
        ))}
        <label className="flex items-center gap-2 ms-1 text-sm text-gray-600">
          <input
            type="color"
            value={current}
            onChange={(event) => onChange(event.target.value)}
            aria-label={t.settings.anyColour}
            className="h-9 w-12 pointer-coarse:h-11 pointer-coarse:w-14 rounded-lg border border-gray-200 bg-surface p-1 cursor-pointer"
          />
          {t.settings.other}
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <span className="px-4 py-2 rounded-xl text-sm font-medium text-white shadow-sm" style={{ backgroundColor: used }}>
          {t.settings.sampleButton}
        </span>
        {used !== current && (
          <span className="text-xs text-gray-500">{t.settings.darkened}</span>
        )}
      </div>
    </div>
  );
}
