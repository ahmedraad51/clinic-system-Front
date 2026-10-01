"use client";

import { useState } from "react";
import { BadgeCheck, Gauge, Layers, Send } from "lucide-react";
import RequirePermission from "@/components/Guard";
import UpgradeDialog from "@/components/UpgradeDialog";
import SettingsNav from "@/components/SettingsNav";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Alert, Badge, Button, Card, LoadError, PageContainer, PageHeader, PageLoading, ProgressBar, type Tone } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { CONTACT, PLAN_KEYS, PLANS } from "@/config/sales";
import { cx, formatDate, formatMoney } from "@/lib/format";
import type { SubscriptionPhase } from "@/lib/subscription";

export default function PlanPage() {
  return (
    <RequirePermission permission="manage_users">
      <PlanView />
    </RequirePermission>
  );
}

const PHASE_TONES: Record<SubscriptionPhase, Tone> = { trial: "blue", active: "green", ending: "yellow", grace: "red", locked: "red" };

/**
 * The clinic's plan: what it is and until when, how much of its limits is in use, the plans there are, and a request to
 * change plan (the platform answers it). The plan comes from the server (useSubscription).
 */
function PlanView() {
  const { t } = useI18n();
  const p = t.plan;
  const { readOnly } = useSession();
  const { clinicName } = useSettings();
  const { subscription: sub, state, loading, error, refresh } = useSubscription();
  const [asking, setAsking] = useState(false);

  const header = (
    <>
      <PageHeader title={t.settings.title} subtitle={p.subtitle} />
      <SettingsNav />
    </>
  );
  if (loading) {
    return (
      <PageContainer>
        {header}
        <PageLoading />
      </PageContainer>
    );
  }
  if (!sub || !state) {
    return (
      <PageContainer>
        {header}
        <LoadError message={error || p.loadFailed} onRetry={refresh} />
      </PageContainer>
    );
  }

  const planName = t.site.plans[sub.plan].name;
  const status = state.suspended ? p.statuses.suspended : p.statuses[state.phase];
  const pct = (used: number, limit: number | null) => (limit ? Math.min(100, (used / limit) * 100) : 0);
  const meters = [
    { key: "doctors" as const, used: sub.usage.doctors, limit: sub.limits.doctors, text: p.of(String(sub.usage.doctors), sub.limits.doctors === null ? p.unlimited : String(sub.limits.doctors)) },
    { key: "users" as const, used: sub.usage.users, limit: sub.limits.users, text: p.of(String(sub.usage.users), sub.limits.users === null ? p.unlimited : String(sub.limits.users)) },
    {
      key: "storage" as const,
      used: sub.usage.storage_mb,
      limit: sub.limits.storageGb * 1024,
      text: p.of(sub.usage.storage_mb < 1024 ? p.mb(sub.usage.storage_mb) : p.gb(sub.usage.storage_mb / 1024), p.gb(sub.limits.storageGb)),
    },
  ];

  return (
    <PageContainer>
      {header}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <Card title={p.current} icon={BadgeCheck}>
          <div className="space-y-3" data-testid="current-plan">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-semibold text-gray-900">{planName}</span>
              <Badge tone={state.suspended ? "red" : PHASE_TONES[state.phase]}>{status}</Badge>
            </div>
            <p className="text-sm text-gray-700">{p.price(formatMoney(sub.price, sub.currency), sub.period)}</p>
            <p className="text-sm text-gray-700">
              {state.suspended
                ? p.suspended
                : state.phase === "grace"
                  ? p.ended(formatDate(state.endsOn), formatDate(state.lockOn))
                  : state.phase === "locked"
                    ? p.locked(formatDate(state.endsOn))
                    : sub.status === "trial" && state.endsOn
                      ? p.trialEnds(formatDate(state.endsOn))
                      : state.endsOn
                        ? p.renews(formatDate(state.endsOn))
                        : ""}
            </p>
            {state.daysLeft !== null && state.daysLeft >= 0 && <p className="text-sm font-medium text-gray-900">{p.daysLeft(state.daysLeft)}</p>}
            {sub.pending_request && (
              <Alert tone="blue">{p.pending(t.site.plans[sub.pending_request.plan].name, formatDate(sub.pending_request.requested_on))}</Alert>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              {!readOnly || state.phase === "locked" ? (
                <Button icon={Send} onClick={() => setAsking(true)}>
                  {p.requestUpgrade}
                </Button>
              ) : null}
            </div>
          </div>
        </Card>

        <Card title={p.usageTitle} icon={Gauge} className="xl:col-span-2">
          <ul className="space-y-5" data-testid="plan-usage">
            {meters.map((meter) => {
              const value = pct(meter.used, meter.limit);
              return (
                <li key={meter.key} data-meter={meter.key}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5">
                    <span className="text-sm font-medium text-gray-900">{p.usage[meter.key]}</span>
                    <span className="text-sm text-gray-700 tabular-nums">{meter.text}</span>
                  </div>
                  <ProgressBar value={value} showLabel={false} label={`${p.usage[meter.key]}: ${meter.text}`} />
                  {value >= 100 ? (
                    <p className="text-xs text-red-700 mt-1">{p.atLimit}</p>
                  ) : value >= 80 ? (
                    <p className="text-xs text-yellow-800 mt-1">{p.nearLimit}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title={p.plansTitle} icon={Layers} className="xl:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLAN_KEYS.map((key) => {
              const plan = PLANS[key];
              const mine = key === sub.plan;
              return (
                <div key={key} className={cx("rounded-md border p-4", mine ? "border-primary-500 bg-primary-50" : "border-gray-200")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900">{t.site.plans[key].name}</span>
                    {mine && <Badge tone="primary">{p.yourPlan}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-gray-700">{p.price(formatMoney(plan.price, plan.currency), plan.period)}</p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li>{t.site.limits.doctors(plan.limits.doctors)}</li>
                    <li>{t.site.limits.users(plan.limits.users)}</li>
                    <li>{t.site.limits.storage(plan.limits.storageGb)}</li>
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-700">{p.contact}</span>
            <WhatsAppButton href={`https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(p.whatsappText(clinicName))}`}>{p.whatsapp}</WhatsAppButton>
          </div>
        </Card>
      </div>
      {asking && <UpgradeDialog current={sub.plan} onClose={() => setAsking(false)} onSent={refresh} />}
    </PageContainer>
  );
}
