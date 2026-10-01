"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CircleAlert, Hourglass, Inbox, Pause, Play, Plus, Wallet } from "lucide-react";
import { RequirePlatformOwner } from "@/components/Guard";
import { NewClinicDialog, PaymentDialog, type NewClinicPrefill } from "@/components/platform/PlatformDialogs";
import {
  Badge, Button, Card, ClearFiltersButton, Fraction, LoadError, PageContainer, PageHeader, PageLoading, SearchInput, SelectInput,
  StatCard, Table, TableMessage, Tabs, Td, Th, Toolbar, type Tone,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useToast } from "@/context/ToastContext";
import { messages, num } from "@/i18n";
import { PLANS } from "@/config/sales";
import { sumByCurrency } from "@/lib/currency";
import { clinicAddress } from "@/lib/deployment";
import { cx, formatDate, formatDateTime, formatMoney, todayISO } from "@/lib/format";
import { callMethod, errorMessage } from "@/lib/frappe";
import { useDebounced } from "@/lib/hooks";
import {
  accountState, PLATFORM_METHODS, type ChangeRequest, type ClinicAccount, type PlatformPayment, type TrialRequestDoc,
} from "@/lib/platform";
import type { SubscriptionState } from "@/lib/subscription";

export default function PlatformPage() {
  return (
    <RequirePlatformOwner>
      <PlatformView />
    </RequirePlatformOwner>
  );
}

type TabKey = "clinics" | "payments" | "requests";
type StatusFilter = "" | "trial" | "active" | "ending" | "ended" | "suspended";

interface PlatformData {
  clinics: ClinicAccount[];
  payments: PlatformPayment[];
  trials: TrialRequestDoc[];
  changes: ChangeRequest[];
}

/** The status a clinic is filtered and shown by. A trial stays a trial to its last day ("ending" is for paid plans). */
function statusKey(state: SubscriptionState, clinic: ClinicAccount): Exclude<StatusFilter, ""> {
  if (state.suspended) return "suspended";
  if (state.phase === "grace" || state.phase === "locked") return "ended";
  if (state.phase === "ending" && clinic.status === "trial") return "trial";
  return state.phase;
}

const STATUS_TONES: Record<Exclude<StatusFilter, "">, Tone> = { trial: "blue", active: "green", ending: "yellow", ended: "red", suspended: "gray" };

/**
 * The platform owner's area: every clinic with its plan, status, use and renewal day; a new clinic; a payment made by
 * hand; suspending and reactivating a clinic; and the requests from the website and from clinics.
 */
function PlatformView() {
  const { t } = useI18n();
  const p = t.platform;
  const toast = useToast();
  const { refresh: refreshMyPlan } = useSubscription();
  const [data, setData] = useState<PlatformData | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [tab, setTab] = useState<TabKey>("clinics");
  const [newClinic, setNewClinic] = useState<NewClinicPrefill | null>(null);
  const [paying, setPaying] = useState<{ clinic?: string } | null>(null);
  const [suspending, setSuspending] = useState<ClinicAccount | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [clinics, payments, trials, changes] = await Promise.all([
          callMethod<ClinicAccount[]>(PLATFORM_METHODS.clinics),
          callMethod<PlatformPayment[]>(PLATFORM_METHODS.payments),
          callMethod<TrialRequestDoc[]>(PLATFORM_METHODS.trialRequests),
          callMethod<ChangeRequest[]>(PLATFORM_METHODS.changeRequests),
        ]);
        if (!cancelled) {
          setData({ clinics, payments, trials, changes });
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, messages().platform.loadFailed));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [version]);

  const reload = () => {
    setVersion((v) => v + 1);
    // The clinic this app runs as is one of them: its own Plan page and notices follow at once.
    refreshMyPlan();
  };

  const setSuspended = async (clinic: ClinicAccount, suspended: boolean) => {
    setBusy(true);
    try {
      await callMethod(PLATFORM_METHODS.setSuspended, { clinic: clinic.name, suspended: suspended ? 1 : 0 });
      toast.success(suspended ? p.suspended(clinic.clinic_name) : p.reactivated(clinic.clinic_name));
      setSuspending(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, p.actionFailed));
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <PageHeader
      title={p.title}
      subtitle={p.subtitle}
      actions={
        data && (
          <>
            <Button icon={Plus} onClick={() => setNewClinic({})}>
              {p.newClinic}
            </Button>
            <Button icon={Wallet} variant="secondary" onClick={() => setPaying({})}>
              {p.recordPayment}
            </Button>
          </>
        )
      }
    />
  );

  if (!data) {
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

  const newRequests = data.trials.filter((r) => r.status === "New").length + data.changes.length;

  return (
    <PageContainer section="system">
      {header}
      <PlatformStats data={data} />

      <div className="mb-4">
        <Tabs
          tabs={[
            { key: "clinics", label: p.tabs.clinics, count: data.clinics.length },
            { key: "payments", label: p.tabs.payments, count: data.payments.length },
            { key: "requests", label: p.tabs.requests, count: newRequests },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "clinics" && (
        <ClinicsTab
          clinics={data.clinics}
          busy={busy}
          onPay={(clinic) => setPaying({ clinic: clinic.name })}
          onSuspend={setSuspending}
          onReactivate={(clinic) => setSuspended(clinic, false)}
        />
      )}
      {tab === "payments" && <PaymentsTab payments={data.payments} clinics={data.clinics} />}
      {tab === "requests" && (
        <RequestsTab
          trials={data.trials}
          changes={data.changes}
          onStart={(request) =>
            setNewClinic({
              clinic_name: request.clinic_name,
              address: request.address,
              plan: request.plan,
              manager_email: request.email,
              trial_request: request.name,
            })
          }
        />
      )}

      {newClinic && (
        <NewClinicDialog
          prefill={newClinic}
          onClose={() => setNewClinic(null)}
          onSaved={() => {
            setNewClinic(null);
            setTab("clinics");
            reload();
          }}
        />
      )}
      {paying && (
        <PaymentDialog
          clinics={data.clinics}
          clinic={paying.clinic}
          onClose={() => setPaying(null)}
          onSaved={() => {
            setPaying(null);
            reload();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(suspending)}
        title={p.suspendTitle}
        message={suspending ? p.suspendText(suspending.clinic_name) : ""}
        confirmLabel={p.suspend}
        busy={busy}
        onConfirm={() => suspending && setSuspended(suspending, true)}
        onCancel={() => setSuspending(null)}
      />
    </PageContainer>
  );
}

function PlatformStats({ data }: { data: PlatformData }) {
  const { t } = useI18n();
  const p = t.platform;
  const { moneyTotals } = useSettings();
  const counts = { trial: 0, active: 0, ending: 0, ended: 0, suspended: 0 };
  for (const clinic of data.clinics) counts[statusKey(accountState(clinic), clinic)] += 1;
  const month = todayISO().slice(0, 7);
  const thisMonth = data.payments.filter((payment) => payment.paid_on.startsWith(month));
  const received = thisMonth.length
    ? moneyTotals(sumByCurrency(thisMonth, (payment) => payment.amount, (payment) => payment.currency))
    : p.stats.nothing;
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard title={p.stats.paying} value={String(counts.active + counts.ending)} icon={Building2} tone="green" />
      <StatCard title={p.stats.trial} value={String(counts.trial)} icon={Hourglass} tone="blue" />
      <StatCard title={p.stats.attention} value={String(counts.ended + counts.suspended)} icon={CircleAlert} tone="red" />
      <StatCard title={p.stats.received} value={received} icon={Wallet} section="money" />
    </div>
  );
}

/**
 * "Doctors 6 / 10" (the numbers left to right in Arabic too), or with units "Files 2.2 GB of 20 GB" (`words`: a fraction
 * of Arabic units would read backwards). Red once at the limit.
 */
function UsageLine({ name, used, limit, full, words }: { name: string; used: string; limit: string; full: boolean; words?: string }) {
  return (
    <span className={cx("block text-xs whitespace-nowrap", full ? "text-red-700 font-medium" : "text-gray-600")}>
      {name} {words ?? <Fraction value={used} of={limit} />}
    </span>
  );
}

function ClinicsTab({
  clinics,
  busy,
  onPay,
  onSuspend,
  onReactivate,
}: {
  clinics: ClinicAccount[];
  busy: boolean;
  onPay: (clinic: ClinicAccount) => void;
  onSuspend: (clinic: ClinicAccount) => void;
  onReactivate: (clinic: ClinicAccount) => void;
}) {
  const { t } = useI18n();
  const p = t.platform;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const debounced = useDebounced(search).trim().toLowerCase();
  const today = todayISO();

  const rows = useMemo(
    () =>
      clinics
        .map((clinic) => ({ clinic, state: accountState(clinic) }))
        .filter(({ clinic, state }) => {
          if (status && statusKey(state, clinic) !== status) return false;
          if (!debounced) return true;
          return [clinic.clinic_name, clinic.address, clinic.manager_email, clinic.name].some((v) => v.toLowerCase().includes(debounced));
        })
        // The ones that need the owner first: the soonest end first, suspended last.
        .sort((a, b) => (a.state.suspended ? 1 : 0) - (b.state.suspended ? 1 : 0) || (a.state.endsOn ?? "9999").localeCompare(b.state.endsOn ?? "9999")),
    [clinics, status, debounced],
  );

  const clearFilters = () => {
    setSearch("");
    setStatus("");
  };

  return (
    <>
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder={p.search} />
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="sm:w-48" aria-label={p.statusFilter}>
          <option value="">{p.allStatuses}</option>
          {(Object.keys(p.filters) as Array<keyof typeof p.filters>).map((key) => (
            <option key={key} value={key}>
              {p.filters[key]}
            </option>
          ))}
        </SelectInput>
      </Toolbar>
      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>{p.columns.clinic}</Th>
              <Th>{p.columns.plan}</Th>
              <Th>{p.columns.status}</Th>
              <Th>{p.columns.usage}</Th>
              <Th>{p.columns.renewal}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <TableMessage icon={Building2} colSpan={6}>
                {debounced || status ? (
                  <>
                    {p.noMatch}
                    <ClearFiltersButton onClick={clearFilters} />
                  </>
                ) : (
                  p.empty
                )}
              </TableMessage>
            ) : (
              rows.map(({ clinic, state }) => {
                const key = statusKey(state, clinic);
                const limits = clinic.limits;
                const storageLimit = limits.storageGb * 1024;
                const days = state.endsOn ? Math.round((Date.parse(state.endsOn) - Date.parse(today)) / 86_400_000) : null;
                return (
                  <tr key={clinic.name} data-clinic={clinic.address}>
                    <Td>
                      {/* One block: on a phone the first cell is a row of its own. */}
                      <div className="min-w-0">
                        <span className="block font-medium text-gray-900 break-words">
                          <bdi>{clinic.clinic_name}</bdi>
                        </span>
                        <span className="block text-xs text-gray-600 text-start" dir="ltr">
                          {clinicAddress(clinic.address)}
                        </span>
                        <span className="block text-xs text-gray-500 break-all text-start" dir="ltr">
                          {clinic.manager_email}
                        </span>
                      </div>
                    </Td>
                    <Td label={p.columns.plan}>
                      {t.site.plans[clinic.plan].name}
                      <span className="block text-xs text-gray-500">{t.plan.price(formatMoney(PLANS[clinic.plan].price, PLANS[clinic.plan].currency), PLANS[clinic.plan].period)}</span>
                    </Td>
                    <Td label={p.columns.status}>
                      <Badge tone={STATUS_TONES[key]}>{state.phase === "locked" && !state.suspended ? t.plan.statuses.locked : p.filters[key]}</Badge>
                    </Td>
                    <Td label={p.columns.usage}>
                      <UsageLine
                        name={p.usage.doctors}
                        used={num(clinic.usage.doctors)}
                        limit={limits.doctors === null ? "∞" : num(limits.doctors)}
                        full={limits.doctors !== null && clinic.usage.doctors >= limits.doctors}
                      />
                      <UsageLine
                        name={p.usage.users}
                        used={num(clinic.usage.users)}
                        limit={limits.users === null ? "∞" : num(limits.users)}
                        full={limits.users !== null && clinic.usage.users >= limits.users}
                      />
                      <UsageLine
                        name={p.usage.storage}
                        used={clinic.usage.storage_mb >= 1024 ? t.plan.gb(clinic.usage.storage_mb / 1024) : t.plan.mb(clinic.usage.storage_mb)}
                        limit={t.plan.gb(limits.storageGb)}
                        words={t.plan.of(
                          clinic.usage.storage_mb >= 1024 ? t.plan.gb(clinic.usage.storage_mb / 1024) : t.plan.mb(clinic.usage.storage_mb),
                          t.plan.gb(limits.storageGb),
                        )}
                        full={clinic.usage.storage_mb >= storageLimit}
                      />
                    </Td>
                    <Td label={p.columns.renewal}>
                      {state.endsOn && days !== null ? (
                        <>
                          <span className="whitespace-nowrap">
                            {clinic.status === "trial" ? p.trialUntil(formatDate(state.endsOn)) : p.paidUntil(formatDate(state.endsOn))}
                          </span>
                          <span className={cx("block text-xs", days < 0 ? "text-red-700" : days <= 14 ? "text-yellow-800" : "text-gray-500")}>
                            {state.phase === "locked" && state.lockOn
                              ? p.viewOnlySince(formatDate(state.lockOn))
                              : state.phase === "grace" && state.lockOn
                                ? p.viewOnlyFrom(formatDate(state.lockOn))
                                : days >= 0
                                  ? p.inDays(days)
                                  : p.daysAgo(-days)}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-500">{p.noDate}</span>
                      )}
                    </Td>
                    <Td className="text-end">
                      <div className="flex flex-wrap justify-end gap-2" role="group" aria-label={p.actionsFor(clinic.clinic_name)}>
                        <Button size="sm" variant="secondary" icon={Wallet} onClick={() => onPay(clinic)}>
                          {p.recordPayment}
                        </Button>
                        {state.suspended ? (
                          <Button size="sm" variant="success" icon={Play} onClick={() => onReactivate(clinic)} disabled={busy}>
                            {p.reactivate}
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" icon={Pause} onClick={() => onSuspend(clinic)} disabled={busy}>
                            {p.suspend}
                          </Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </Card>
    </>
  );
}

function PaymentsTab({ payments, clinics }: { payments: PlatformPayment[]; clinics: ClinicAccount[] }) {
  const { t } = useI18n();
  const p = t.platform;
  const { money } = useSettings();
  const periodOf = (clinic: string) => {
    const account = clinics.find((c) => c.name === clinic);
    return account ? PLANS[account.plan].period : "month";
  };
  return (
    <Card flush>
      <Table>
        <thead>
          <tr>
            <Th>{p.columns.date}</Th>
            <Th>{p.columns.clinic}</Th>
            <Th>{p.columns.amount}</Th>
            <Th>{p.columns.method}</Th>
            <Th>{p.columns.covers}</Th>
            <Th>{p.columns.reference}</Th>
            <Th>{p.columns.paidUntil}</Th>
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 ? (
            <TableMessage icon={Wallet} colSpan={7}>
              {p.noPayments}
            </TableMessage>
          ) : (
            payments.map((payment) => (
              <tr key={payment.name}>
                <Td>{formatDate(payment.paid_on)}</Td>
                <Td label={p.columns.clinic}>
                  <bdi className="break-words">{payment.clinic_name}</bdi>
                </Td>
                <Td label={p.columns.amount}>
                  <span className="font-medium text-gray-900">{money(payment.amount, payment.currency)}</span>
                </Td>
                <Td label={p.columns.method}>{p.channels[payment.method] ?? payment.method}</Td>
                <Td label={p.columns.covers}>{p.covers(payment.periods, periodOf(payment.clinic))}</Td>
                <Td label={p.columns.reference}>
                  <span dir="ltr">{payment.reference || t.common.dash}</span>
                </Td>
                <Td label={p.columns.paidUntil}>{formatDate(payment.paid_until)}</Td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </Card>
  );
}

const REQUEST_TONES: Record<TrialRequestDoc["status"], Tone> = { New: "blue", Contacted: "yellow", Started: "green", Declined: "gray" };

function RequestsTab({
  trials,
  changes,
  onStart,
}: {
  trials: TrialRequestDoc[];
  changes: ChangeRequest[];
  onStart: (request: TrialRequestDoc) => void;
}) {
  const { t } = useI18n();
  const p = t.platform;
  const planName = (key: keyof typeof t.site.plans) => t.site.plans[key]?.name ?? key;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
      <Card title={p.trialRequests} icon={Inbox}>
        <p className="text-xs text-gray-500 mb-3">{p.trialRequestsText}</p>
        {trials.length === 0 ? (
          <p className="text-sm text-gray-500">{p.noTrialRequests}</p>
        ) : (
          <ul className="divide-y divide-gray-200 -mb-3">
            {trials.map((request) => (
              <li key={request.name} className="py-3 flex flex-wrap items-start gap-3" data-request={request.name}>
                <div className="flex-1 min-w-[14rem] text-sm text-gray-800 space-y-0.5">
                  <p className="font-medium text-gray-900 break-words">
                    <bdi>{request.clinic_name}</bdi> <Badge tone={REQUEST_TONES[request.status]}>{p.requestStatuses[request.status] ?? request.status}</Badge>
                  </p>
                  <p className="break-words">
                    <bdi>{request.contact_name}</bdi>
                    {request.city && (
                      <>
                        {t.common.dot}
                        <bdi>{request.city}</bdi>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-600">
                    <a href={`tel:${request.phone.replace(/\s/g, "")}`} className="text-primary-600 hover:underline" dir="ltr">
                      {request.phone}
                    </a>
                    {request.email && (
                      <>
                        {t.common.dot}
                        <span dir="ltr" className="break-all">
                          {request.email}
                        </span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-600">
                    {p.wantsPlan(planName(request.plan))}
                    {request.address && (
                      <>
                        {t.common.dot}
                        {p.wantsAddress}{" "}
                        <span dir="ltr">{clinicAddress(request.address)}</span>
                      </>
                    )}
                  </p>
                  {request.message && <p className="text-gray-700 break-words">{request.message}</p>}
                  <p className="text-xs text-gray-500">{formatDateTime(request.creation)}</p>
                </div>
                {(request.status === "New" || request.status === "Contacted") && (
                  <Button size="sm" icon={Plus} onClick={() => onStart(request)}>
                    {p.startClinic}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={p.changeRequests} icon={Inbox}>
        <p className="text-xs text-gray-500 mb-3">{p.changeRequestsText}</p>
        {changes.length === 0 ? (
          <p className="text-sm text-gray-500">{p.noChangeRequests}</p>
        ) : (
          <ul className="divide-y divide-gray-200 -mb-3">
            {changes.map((request) => (
              <li key={request.name} className="py-3 text-sm text-gray-800 space-y-0.5" data-request={request.name}>
                <p className="font-medium text-gray-900 break-words">
                  <bdi>{request.clinic_name}</bdi>
                </p>
                <p>{p.fromTo(planName(request.from_plan), planName(request.plan))}</p>
                {request.note && <p className="text-gray-700 break-words">{request.note}</p>}
                <p className="text-xs text-gray-500">{formatDate(request.requested_on)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
