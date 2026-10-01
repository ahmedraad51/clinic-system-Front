"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Copy, KeyRound, LifeBuoy, ShieldCheck, TimerOff } from "lucide-react";
import RequirePermission from "@/components/Guard";
import SettingsNav from "@/components/SettingsNav";
import WhatsAppButton from "@/components/WhatsAppButton";
import {
  Alert, Badge, Button, Card, DetailList, DetailRow, Field, LinkButton, LoadError, PageContainer, PageHeader, PageLoading, TextInput,
  type Tone,
} from "@/components/ui";
import { useDeployment } from "@/context/DeploymentContext";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useToast } from "@/context/ToastContext";
import { messages } from "@/i18n";
import { CONTACT } from "@/config/sales";
import { formatDate, todayISO } from "@/lib/format";
import { callMethod, errorMessage } from "@/lib/frappe";
import { cleanLicenseKey, LICENSE_KEY_PATTERN, LICENSE_METHODS, licenseState, type LicenseStatus } from "@/lib/license";

export default function LicensePage() {
  return (
    <RequirePermission permission="manage_users">
      <LicenseView />
    </RequirePermission>
  );
}

type Shown = "valid" | "ending" | "expired" | "invalid";
const STATUS_TONES: Record<Shown, Tone> = { valid: "green", ending: "yellow", expired: "red", invalid: "red" };

/**
 * Settings → License, on a clinic server (and its online copy): the licence key, its plan and last day, a warning in its
 * last 14 days, what happens when it ends, entering a new key (no internet needed), and how to renew.
 */
function LicenseView() {
  const { t } = useI18n();
  const l = t.license;
  const { mode } = useDeployment();
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (mode === "cloud") return;
    let cancelled = false;
    const load = async () => {
      try {
        const answer = await callMethod<LicenseStatus>(LICENSE_METHODS.status);
        if (!cancelled) {
          setLicense(answer);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, messages().license.loadFailed));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [mode, version]);

  const header = (
    <>
      <PageHeader title={t.settings.title} subtitle={l.subtitle} />
      <SettingsNav />
    </>
  );

  if (mode === "cloud") {
    return (
      <PageContainer>
        {header}
        <Card>
          <p className="text-sm text-gray-800 mb-4">{l.cloudOnly}</p>
          <LinkButton href="/settings/plan" variant="secondary">
            {t.plan.nav.plan}
          </LinkButton>
        </Card>
      </PageContainer>
    );
  }
  if (!license) {
    return (
      <PageContainer>
        {header}
        {error ? (
          <LoadError
            message={error}
            onRetry={() => {
              setError("");
              setVersion((v) => v + 1);
            }}
          />
        ) : (
          <PageLoading />
        )}
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {header}
      <LicenseNotice license={license} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <CurrentLicense license={license} />
          <AfterItEnds license={license} />
        </div>
        <div className="space-y-6">
          <NewKey onActivated={setLicense} />
          <Renew license={license} />
        </div>
      </div>
    </PageContainer>
  );
}

function shownStatus(license: LicenseStatus): Shown {
  if (license.status === "invalid") return "invalid";
  const state = licenseState(license);
  return state.ended ? "expired" : state.ending ? "ending" : "valid";
}

/** Above the cards: it ends soon, it has ended (and when the app becomes view-only), or it is not valid here. */
function LicenseNotice({ license }: { license: LicenseStatus }) {
  const { t } = useI18n();
  const l = t.license;
  const state = licenseState(license);
  const shown = shownStatus(license);
  if (shown === "valid") return null;
  let title = l.invalidTitle;
  let text = l.invalidText;
  if (shown === "ending") {
    title = l.endingTitle;
    text = l.endingText(formatDate(license.expires_on), l.daysLeft(state.daysLeft));
  } else if (shown === "expired") {
    title = l.endedTitle;
    text = todayISO() >= state.lockOn ? l.lockedText(formatDate(license.expires_on)) : l.endedText(formatDate(license.expires_on), formatDate(state.lockOn));
  }
  return (
    <div className="mb-6" data-testid="license-notice" data-state={shown}>
      <Alert tone={shown === "ending" ? "yellow" : "red"} title={title}>
        {text}
      </Alert>
    </div>
  );
}

function CurrentLicense({ license }: { license: LicenseStatus }) {
  const { t } = useI18n();
  const l = t.license;
  const toast = useToast();
  const state = licenseState(license);
  const shown = shownStatus(license);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(l.copied);
    } catch {
      // No clipboard (an older browser, or not allowed): the text can still be selected by hand.
    }
  };
  return (
    <Card title={l.current} icon={ShieldCheck}>
      <div className="mb-4" data-testid="license-status">
        <Badge tone={STATUS_TONES[shown]}>{l.statuses[shown]}</Badge>
      </div>
      <DetailList>
        <DetailRow label={l.key}>
          <span dir="ltr" className="font-mono text-gray-900 break-all">
            {license.key}
          </span>
        </DetailRow>
        <DetailRow label={l.plan}>{t.site.plans[license.plan]?.name ?? license.plan}</DetailRow>
        <DetailRow label={l.issuedTo}>
          <bdi>{license.clinic_name}</bdi>
        </DetailRow>
        <DetailRow label={l.issuedOn}>{formatDate(license.issued_on)}</DetailRow>
        <DetailRow label={l.expiresOn}>
          <span data-testid="license-expires">{formatDate(license.expires_on)}</span>
          {!state.ended && <span className="block text-xs text-gray-500">{l.daysLeft(state.daysLeft)}</span>}
        </DetailRow>
        <DetailRow label={l.serverId}>
          <span className="flex flex-wrap items-center gap-2">
            <span dir="ltr" className="font-mono text-gray-900">
              {license.server_id}
            </span>
            <Button size="sm" variant="ghost" icon={Copy} onClick={() => copy(license.server_id)}>
              {l.copyKey}
            </Button>
          </span>
          <span className="block text-xs text-gray-500">{l.serverIdHint}</span>
        </DetailRow>
      </DetailList>
    </Card>
  );
}

function AfterItEnds({ license }: { license: LicenseStatus }) {
  const { t } = useI18n();
  const l = t.license;
  return (
    <Card title={l.afterTitle} icon={TimerOff}>
      <ol className="list-decimal ps-5 space-y-2 text-sm text-gray-800">
        {l.after(license.grace_days).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
    </Card>
  );
}

/** A new key, typed or pasted: checked on this server, no internet needed. Allowed while the app is view-only for an
 * ended licence (that is how it comes back), not on the online copy. */
function NewKey({ onActivated }: { onActivated: (license: LicenseStatus) => void }) {
  const { t } = useI18n();
  const l = t.license;
  const toast = useToast();
  const { readOnly } = useSession();
  const { refresh } = useSubscription();
  const [key, setKey] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  if (readOnly === "copy") return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const cleaned = cleanLicenseKey(key);
    if (!LICENSE_KEY_PATTERN.test(cleaned)) {
      setFieldError(l.keyFormat);
      return;
    }
    setKey(cleaned);
    setSaving(true);
    try {
      const license = await callMethod<LicenseStatus>(LICENSE_METHODS.activate, { key: cleaned });
      toast.success(l.activated(formatDate(license.expires_on)));
      setKey("");
      onActivated(license);
      refresh();
    } catch (err) {
      setError(errorMessage(err, l.activateFailed));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={l.newKeyTitle} icon={KeyRound}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-700">{l.newKeyText}</p>
        <Field label={l.newKey} required hint={fieldError ? undefined : l.keyFormat} error={fieldError}>
          <TextInput
            name="license_key"
            value={key}
            onChange={(event) => {
              setKey(event.target.value.toUpperCase());
              setFieldError("");
            }}
            required
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            placeholder="DCL-XXXX-XXXX-XXXX-XXXX"
            aria-invalid={fieldError ? true : undefined}
            className="font-mono"
          />
        </Field>
        {error && <Alert tone="red">{error}</Alert>}
        <Button type="submit" loading={saving}>
          {l.activate}
        </Button>
      </form>
    </Card>
  );
}

function Renew({ license }: { license: LicenseStatus }) {
  const { t } = useI18n();
  const l = t.license;
  const { clinicName } = useSettings();
  return (
    <Card title={l.renewTitle} icon={LifeBuoy}>
      <p className="text-sm text-gray-700 mb-4">{l.renewText}</p>
      <WhatsAppButton href={`https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(l.whatsappText(clinicName, license.server_id))}`}>
        {l.whatsapp}
      </WhatsAppButton>
    </Card>
  );
}
