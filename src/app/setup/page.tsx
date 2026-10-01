"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Plus, Upload, UserPlus } from "lucide-react";
import AddUserDialog from "@/components/AddUserDialog";
import Avatar from "@/components/Avatar";
import DoctorDialog from "@/components/DoctorDialog";
import RequirePermission from "@/components/Guard";
import { markSetupOffered } from "@/components/SetupCard";
import ToothLogo from "@/components/ToothLogo";
import {
  Alert, Button, Card, EmptyState, Field, LinkButton, NumberInput, PageContainer, PageHeader, PhoneInput, ProgressBar,
  SelectInput, SuggestInput, TextInput, TimeInput,
} from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { label } from "@/i18n";
import { cx, formatMoney } from "@/lib/format";
import { errorMessage, fileHref, getList, updateDoc, uploadFile } from "@/lib/frappe";
import { governorateSuggestions } from "@/lib/iraq";
import { CURRENCIES, TREATMENT_TYPES, WEEK_DAYS, type ClinicSettings, type Doctor, type User } from "@/lib/types";

/** The steps, in order. setup_step on Clinic Settings is how many are done (6: all). */
const STEPS = ["clinic", "money", "hours", "doctors", "prices", "staff"] as const;
type StepKey = (typeof STEPS)[number];
const SETTINGS = "Clinic Settings";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export default function SetupPage() {
  return (
    <RequirePermission permission="manage_users">
      <SetupWizard />
    </RequirePermission>
  );
}

/**
 * The first-run setup of a new clinic: the clinic, its currency, open days and hours, doctors, price list and staff.
 * Each step is saved when it is left with Save and Continue, so stopping half way loses nothing; setup_step keeps
 * where it stopped. Skip for Now leaves it for later (the dashboard offers to finish it); Finish marks it done.
 */
function SetupWizard() {
  const { t } = useI18n();
  const w = t.setup;
  const router = useRouter();
  const toast = useToast();
  const { readOnly } = useSession();
  const { settings, loaded, refresh } = useSettings();
  const [chosen, setChosen] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Seen in this visit: leaving it (Skip for Now) does not bring the manager straight back.
  useEffect(() => markSetupOffered(), []);

  const reached = Math.min(Math.max(Number(settings.setup_step) || 0, 0), STEPS.length);
  // Where it stopped, or the start again when it was finished before.
  const step = chosen ?? (settings.setup_status === "done" ? 0 : Math.min(reached, STEPS.length - 1));
  const finished = chosen === STEPS.length;

  /** Saves the step's values (if any) and moves on. */
  const advance = async (values?: Partial<ClinicSettings>) => {
    setSaving(true);
    setError("");
    try {
      const last = step === STEPS.length - 1;
      await updateDoc(SETTINGS, SETTINGS, {
        ...values,
        setup_step: Math.max(reached, step + 1),
        ...(last ? { setup_status: "done" } : {}),
      });
      refresh();
      setChosen(step + 1);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    try {
      if (settings.setup_status !== "done") await updateDoc(SETTINGS, SETTINGS, { setup_status: "skipped" });
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
    router.push("/dashboard");
  };

  if (readOnly) {
    return (
      <PageContainer narrow>
        <PageHeader title={w.title} />
        <Card>
          <EmptyState icon={CheckCircle2} title={t.access.viewOnly} text={t.access.readOnlyRefused} />
        </Card>
      </PageContainer>
    );
  }

  const key: StepKey = STEPS[Math.min(step, STEPS.length - 1)];
  const nav = (
    <StepNav
      step={step}
      reached={finished ? STEPS.length : reached}
      onGo={(index) => {
        setError("");
        setChosen(index);
      }}
    />
  );

  return (
    <PageContainer>
      <PageHeader
        title={w.title}
        subtitle={w.subtitle}
        actions={
          !finished && (
            <Button variant="secondary" onClick={skip}>
              {w.skip}
            </Button>
          )
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-6 items-start">
        {nav}
        {!loaded ? null : finished ? (
          <Card>
            <div className="flex flex-col items-center text-center py-8 px-4">
              <CheckCircle2 size={48} className="text-green-700" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">{w.doneTitle}</h2>
              <p className="mt-2 max-w-md text-sm text-gray-600">{w.doneText}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <LinkButton href="/dashboard">{w.goDashboard}</LinkButton>
                <LinkButton href="/settings" variant="secondary">
                  {w.openSettings}
                </LinkButton>
              </div>
            </div>
          </Card>
        ) : (
          <Card title={w.steps[key]}>
            {/* Keyed by the step: each one starts from what is saved now. */}
            <StepForm
              key={key}
              stepKey={key}
              settings={settings}
              footer={(collect) => (
                <StepFooter
                  collect={collect}
                  saving={saving}
                  error={error}
                  label={step === STEPS.length - 1 ? w.finish : key === "doctors" || key === "staff" ? w.next : w.saveNext}
                  onNext={advance}
                  onBack={step > 0 ? () => setChosen(step - 1) : undefined}
                />
              )}
            />
          </Card>
        )}
      </div>
    </PageContainer>
  );
}

/** The steps beside the form (above it on a phone): done ones ticked, any reached one can be opened again. */
function StepNav({ step, reached, onGo }: { step: number; reached: number; onGo: (index: number) => void }) {
  const { t } = useI18n();
  const w = t.setup;
  return (
    <nav aria-label={w.stepsLabel} className="lg:sticky lg:top-24">
      <p className="text-sm font-medium text-gray-700 mb-2" data-testid="setup-step">
        {w.stepOf(Math.min(step + 1, STEPS.length), STEPS.length)}
      </p>
      <ProgressBar value={(Math.min(reached, STEPS.length) / STEPS.length) * 100} showLabel={false} label={w.stepsLabel} />
      <ol className="mt-4 hidden lg:block space-y-1">
        {STEPS.map((key, index) => {
          const done = index < reached;
          const current = index === step;
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onGo(index)}
                disabled={index > reached}
                aria-current={current ? "step" : undefined}
                className={cx(
                  "w-full flex items-center gap-3 min-h-10 pointer-coarse:min-h-11 px-3 rounded-md text-sm text-start transition",
                  current ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-700 hover:bg-gray-100 disabled:text-gray-500 disabled:hover:bg-transparent",
                )}
              >
                <span
                  className={cx(
                    "w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold",
                    done ? "bg-solid-green text-white" : current ? "bg-brand text-white" : "bg-gray-100 text-gray-600",
                  )}
                >
                  {done ? <Check size={14} aria-hidden="true" /> : index + 1}
                </span>
                {w.steps[key]}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** What a step gives its footer: the values to save, a sentence when something must be fixed first, or nothing. */
type Collect = () => Partial<ClinicSettings> | string | undefined;
interface StepProps {
  settings: ClinicSettings;
  /** The step draws its footer last, with how to collect its values. */
  footer: (collect: Collect) => ReactNode;
}

function StepForm({ stepKey, settings, footer }: { stepKey: StepKey } & StepProps) {
  switch (stepKey) {
    case "clinic":
      return <ClinicStep settings={settings} footer={footer} />;
    case "money":
      return <MoneyStep settings={settings} footer={footer} />;
    case "hours":
      return <HoursStep settings={settings} footer={footer} />;
    case "doctors":
      return <DoctorsStep settings={settings} footer={footer} />;
    case "prices":
      return <PricesStep settings={settings} footer={footer} />;
    case "staff":
      return <StaffStep settings={settings} footer={footer} />;
  }
}

/** Save and Continue (or Next, or Finish) and Back, under every step. */
function StepFooter({
  collect,
  saving,
  error,
  label: buttonLabel,
  onNext,
  onBack,
}: {
  collect: Collect;
  saving: boolean;
  error: string;
  label: string;
  onNext: (values?: Partial<ClinicSettings>) => void;
  onBack?: () => void;
}) {
  const { t } = useI18n();
  const [problem, setProblem] = useState("");
  const next = () => {
    const result = collect();
    if (typeof result === "string") {
      setProblem(result);
      return;
    }
    setProblem("");
    onNext(result);
  };
  return (
    <div className="space-y-4 pt-5 mt-5 border-t border-gray-200">
      {(problem || error) && <Alert tone="red">{problem || error}</Alert>}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={next} loading={saving}>
          {buttonLabel}
        </Button>
        {onBack && (
          <Button variant="secondary" onClick={onBack} disabled={saving}>
            {t.setup.back}
          </Button>
        )}
      </div>
    </div>
  );
}

function ClinicStep({ settings, footer }: StepProps) {
  const { t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState({
    clinic_name: settings.clinic_name ?? "",
    phone: settings.phone ?? "",
    address: settings.address ?? "",
    logo: settings.logo ?? "",
  });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error(t.settings.notImage);
    if (file.size > MAX_LOGO_BYTES) return toast.error(t.settings.logoTooBig(MAX_LOGO_BYTES / (1024 * 1024)));
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setForm((prev) => ({ ...prev, logo: url }));
    } catch (err) {
      toast.error(errorMessage(err, t.settings.logoUploadFailed));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{t.setup.clinicText}</p>
      <div className="flex items-center gap-4">
        {form.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- the logo is an uploaded file of unknown size
          <img src={fileHref(form.logo)} alt="" className="w-16 h-16 rounded-md object-contain bg-gray-50" />
        ) : (
          <span className="w-16 h-16 rounded-md bg-brand text-white flex items-center justify-center">
            <ToothLogo size={32} />
          </span>
        )}
        <Button variant="secondary" size="sm" icon={Upload} loading={uploading} onClick={() => fileRef.current?.click()}>
          {t.settings.uploadLogo}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} aria-label={t.settings.logoFile} />
      </div>
      <Field label={t.settings.clinicName} required>
        <TextInput name="clinic_name" value={form.clinic_name} onChange={(e) => setForm({ ...form, clinic_name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t.settings.phone}>
          <PhoneInput name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label={t.settings.address}>
          <SuggestInput name="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} suggestions={governorateSuggestions()} />
        </Field>
      </div>
      {footer(() => (form.clinic_name.trim() ? { ...form, clinic_name: form.clinic_name.trim() } : t.settings.nameRequired))}
    </div>
  );
}

function MoneyStep({ settings, footer }: StepProps) {
  const { t } = useI18n();
  const [currency, setCurrency] = useState(settings.currency || "IQD");  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{t.setup.moneyText}</p>
      <Field label={t.settings.currency}>
        <SelectInput name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {t.money.names[code] ?? code}
            </option>
          ))}
        </SelectInput>
      </Field>
      {footer(() => ({ currency }))}
    </div>
  );
}

function HoursStep({ settings, footer }: StepProps) {
  const { t } = useI18n();
  const [days, setDays] = useState<string[]>(() => {
    const saved = (settings.working_days || "").split(",").map((d) => d.trim()).filter((d) => (WEEK_DAYS as readonly string[]).includes(d));
    return saved.length ? saved : WEEK_DAYS.filter((d) => d !== "Friday");
  });
  const [opening, setOpening] = useState(settings.opening_time?.slice(0, 5) || "09:00");
  const [closing, setClosing] = useState(settings.closing_time?.slice(0, 5) || "17:00");  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{t.setup.hoursText}</p>
      <div role="group" aria-label={t.settings.openOn} className="flex flex-wrap gap-2">
        {WEEK_DAYS.map((day, index) => {
          const on = days.includes(day);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={on}
              onClick={() => setDays(on ? days.filter((d) => d !== day) : [...days, day])}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t.settings.openingTime}>
          <TimeInput name="opening_time" value={opening} onChange={(e) => setOpening(e.target.value)} />
        </Field>
        <Field label={t.settings.closingTime}>
          <TimeInput name="closing_time" value={closing} onChange={(e) => setClosing(e.target.value)} />
        </Field>
      </div>
      {footer(() => {
        if (days.length === 0) return t.settings.noOpenDay;
        if (opening && closing && closing <= opening) return t.doctors.endAfterStart;
        return {
          working_days: WEEK_DAYS.filter((d) => days.includes(d)).join(","),
          opening_time: opening || undefined,
          closing_time: closing || undefined,
        };
      })}
    </div>
  );
}

function DoctorsStep({ footer }: StepProps) {
  const { t } = useI18n();
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getList<Doctor>("Doctor", ["name", "full_name", "specialization", "gender", "photo"], {
      filters: [["is_active", "=", 1]],
      orderBy: "full_name asc",
      limit: 0,
    })
      .then((rows) => !cancelled && setDoctors(rows))
      .catch(() => !cancelled && setDoctors([]));
    return () => {
      cancelled = true;
    };
  }, [version]);
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{t.setup.doctorsText}</p>
      <PeopleList
        loading={doctors === null}
        empty={t.setup.noDoctors}
        people={(doctors ?? []).map((d) => ({
          key: d.name,
          name: d.full_name,
          detail: label(t.enums.specialization, d.specialization),
          avatar: <Avatar name={d.full_name} gender={d.gender} photo={d.photo} role="doctor" size={36} />,
        }))}
      />
      <Button variant="secondary" icon={Plus} onClick={() => setAdding(true)}>
        {t.doctors.addDoctor}
      </Button>
      {adding && (
        <DoctorDialog
          doctor={null}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            setVersion((v) => v + 1);
          }}
        />
      )}
      {footer(() => undefined)}
    </div>
  );
}

function PricesStep({ settings, footer }: StepProps) {
  const { t } = useI18n();
  const currency = settings.currency || "IQD";
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries((settings.treatment_prices ?? []).map((row) => [row.treatment_type, String(row.price ?? "")])),
  );  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{t.setup.pricesText}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TREATMENT_TYPES.map((type) => (
          <Field key={type} label={label(t.enums.treatmentType, type)} hint={Number(prices[type]) > 0 ? formatMoney(Number(prices[type]), currency) : undefined}>
            <NumberInput
              name={`price_${type}`}
              value={prices[type] ?? ""}
              onChange={(e) => setPrices({ ...prices, [type]: e.target.value })}
              decimals={false}
            />
          </Field>
        ))}
      </div>
      {footer(() => ({
        // The listed types first, then any other type the price list already holds.
        treatment_prices: [...TREATMENT_TYPES, ...Object.keys(prices).filter((type) => !(TREATMENT_TYPES as readonly string[]).includes(type))]
          .filter((type) => Number(prices[type]) > 0)
          .map((type) => ({ treatment_type: type, price: Number(prices[type]) })),
      }))}
    </div>
  );
}

function StaffStep({ footer }: StepProps) {
  const { t } = useI18n();
  const [users, setUsers] = useState<User[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getList<User>("User", ["name", "full_name", "email", "gender", "user_image"], {
      filters: [["name", "not in", ["Administrator", "Guest"]]],
      orderBy: "full_name asc",
      limit: 0,
    })
      .then((rows) => !cancelled && setUsers(rows))
      .catch(() => !cancelled && setUsers([]));
    return () => {
      cancelled = true;
    };
  }, [version]);
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{t.setup.staffText}</p>
      <PeopleList
        loading={users === null}
        empty={t.setup.noStaff}
        people={(users ?? []).map((u) => ({
          key: u.name,
          name: u.full_name || u.name,
          detail: <span dir="ltr">{u.email || u.name}</span>,
          avatar: <Avatar name={u.full_name || u.name} gender={u.gender} photo={u.user_image} size={36} />,
        }))}
      />
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" icon={UserPlus} onClick={() => setAdding(true)}>
          {t.users.addUser}
        </Button>
        <Link href="/users" className="inline-flex items-center min-h-11 px-2 text-sm text-primary-700 hover:underline">
          {t.nav.users}
        </Link>
      </div>
      {adding && (
        <AddUserDialog
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            setVersion((v) => v + 1);
          }}
        />
      )}
      {footer(() => undefined)}
    </div>
  );
}

function PeopleList({
  loading,
  empty,
  people,
}: {
  loading: boolean;
  empty: string;
  people: Array<{ key: string; name: string; detail: ReactNode; avatar: ReactNode }>;
}) {
  const { t } = useI18n();
  if (loading) return <p className="text-sm text-gray-500">{t.ui.loading}</p>;
  if (people.length === 0) return <p className="text-sm text-gray-600">{empty}</p>;
  return (
    <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
      {people.map((person) => (
        <li key={person.key} className="flex items-center gap-3 px-4 py-2.5">
          {person.avatar}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 break-words">
              <bdi>{person.name}</bdi>
            </p>
            <p className="text-xs text-gray-600 break-words">{person.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
