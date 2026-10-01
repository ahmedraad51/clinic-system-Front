"use client";

import { useEffect, useRef, useState } from "react";
import { Cloud, DatabaseBackup, RefreshCw, Save, Server, Usb } from "lucide-react";
import RequirePermission from "@/components/Guard";
import SettingsNav from "@/components/SettingsNav";
import {
  Alert, Badge, Button, Card, DetailList, DetailRow, LoadError, PageContainer, PageHeader, Table, TableLoading, TableMessage, Td, Th,
  type Tone,
} from "@/components/ui";
import { useConnectivity } from "@/context/ConnectivityContext";
import { useDeployment } from "@/context/DeploymentContext";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useToast } from "@/context/ToastContext";
import { messages } from "@/i18n";
import { formatDateTime } from "@/lib/format";
import { callMethod, errorMessage, saveBackup } from "@/lib/frappe";
import { useSiteOrigin } from "@/lib/hooks";
import { minutesSince } from "@/lib/waitingRoom";
import { SERVER_METHODS, type BackupOverview, type CloudCopyStatus, type ServerBackup } from "@/lib/server";

export default function ServerPage() {
  return (
    <RequirePermission permission="manage_users">
      <ServerView />
    </RequirePermission>
  );
}

/**
 * Settings → Server & Backup, for the manager: the connection to the server, the cloud copy of a clinic server, and
 * the backups (made every night; Back up now; Save to USB).
 */
function ServerView() {
  const { t } = useI18n();
  const { mode } = useDeployment();
  return (
    <PageContainer>
      <PageHeader title={t.settings.title} subtitle={t.backup.subtitle} />
      <SettingsNav />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start mb-6">
        <ServerCard />
        {mode !== "cloud" && <CloudCopyCard />}
      </div>
      <BackupsCard />
    </PageContainer>
  );
}

const REACH_TONES: Record<string, Tone> = { ok: "green", unreachable: "red", checking: "gray" };

function ServerCard() {
  const { t } = useI18n();
  const b = t.backup;
  const { mode } = useDeployment();
  const origin = useSiteOrigin();
  const { browserOnline, server, internet, status, check } = useConnectivity();
  return (
    <Card title={b.serverTitle} icon={Server} actions={<Button size="sm" variant="secondary" icon={RefreshCw} onClick={check}>{b.checkNow}</Button>}>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm font-medium text-gray-900">{b.kinds[mode]}</span>
        <span data-testid="server-reach">
          <Badge tone={REACH_TONES[server]}>{b.reach[server]}</Badge>
        </span>
      </div>
      {server === "unreachable" && (
        <div className="mb-4">
          <Alert tone="red">{browserOnline ? b.unreachableText : b.offlineText}</Alert>
        </div>
      )}
      <DetailList>
        <DetailRow label={b.address}>
          <span dir="ltr">{origin.replace(/^https?:\/\//, "")}</span>
        </DetailRow>
        {status && (
          <>
            <DetailRow label={b.serverTime}>{formatDateTime(status.server_time)}</DetailRow>
            <DetailRow label={b.version}>
              <span dir="ltr">{status.version}</span>
            </DetailRow>
          </>
        )}
        {mode === "clinic-server" && (
          <DetailRow label={b.internet}>
            <Badge tone={internet ? "green" : "yellow"}>{internet ? b.internetYes : b.internetNo}</Badge>
          </DetailRow>
        )}
      </DetailList>
    </Card>
  );
}

const COPY_TONES: Record<CloudCopyStatus["status"], Tone> = { ok: "green", syncing: "blue", failed: "red", never: "gray" };

function CloudCopyCard() {
  const { t } = useI18n();
  const b = t.backup;
  const { mode } = useDeployment();
  const { status } = useConnectivity();
  const copy = status?.cloud_copy ?? null;
  return (
    <Card title={b.copyTitle} icon={Cloud}>
      <p className="text-sm text-gray-700 mb-4">{mode === "cloud-copy" ? b.copyIsThis : b.copyText}</p>
      {!copy ? (
        <p className="text-sm text-gray-500">{b.copyNever}</p>
      ) : (
        <>
          <DetailList>
            <DetailRow label={t.backup.columns.status}>
              <span data-testid="copy-status">
                <Badge tone={COPY_TONES[copy.status]}>{b.copyStatus[copy.status]}</Badge>
              </span>
            </DetailRow>
            <DetailRow label={b.lastUpdate}>
              {copy.last_sync ? (
                <>
                  {formatDateTime(copy.last_sync)}
                  <span className="block text-xs text-gray-500">{b.ago(minutesSince(copy.last_sync, new Date()))}</span>
                </>
              ) : (
                t.common.dash
              )}
            </DetailRow>
            {copy.address && (
              <DetailRow label={b.copyAddress}>
                <a href={`https://${copy.address}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline break-all" dir="ltr">
                  {copy.address}
                </a>
              </DetailRow>
            )}
          </DetailList>
          {copy.status === "failed" && copy.error && (
            <div className="mt-4">
              <Alert tone="red">{copy.error}</Alert>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

const BACKUP_TONES: Record<ServerBackup["status"], Tone> = { running: "blue", done: "green", failed: "red" };

function BackupsCard() {
  const { t } = useI18n();
  const b = t.backup;
  const toast = useToast();
  const { mode } = useDeployment();
  const { readOnly } = useSession();
  const [overview, setOverview] = useState<BackupOverview | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  // The backups being made, to say when one is done.
  const running = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const load = async () => {
      try {
        const answer = await callMethod<BackupOverview>(SERVER_METHODS.backups);
        if (cancelled) return;
        setOverview(answer);
        setError("");
        for (const backup of answer.backups) {
          if (running.current.has(backup.name) && backup.status !== "running") {
            running.current.delete(backup.name);
            if (backup.status === "done") toast.success(messages().backup.backupDone);
          }
          if (backup.status === "running") running.current.add(backup.name);
        }
        // While one is being made, look again every 1.5 seconds.
        if (answer.backups.some((backup) => backup.status === "running")) timer = window.setTimeout(load, 1500);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, messages().backup.loadFailed));
      }
    };
    load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [version, toast]);

  const backUpNow = async () => {
    setStarting(true);
    try {
      await callMethod(SERVER_METHODS.backupNow);
      toast.info(b.backupStarted);
      setVersion((v) => v + 1);
    } catch (err) {
      toast.error(errorMessage(err, b.backupFailed));
    } finally {
      setStarting(false);
    }
  };

  const save = async (backup: ServerBackup) => {
    setSaving(backup.name);
    try {
      const result = await saveBackup(backup);
      if (result === "saved") toast.success(b.saved);
      else if (result === "downloaded") toast.info(b.downloaded);
    } catch (err) {
      toast.error(errorMessage(err, b.downloadFailed));
    } finally {
      setSaving(null);
    }
  };

  const latest = overview?.backups.find((backup) => backup.status === "done");
  const withCloud = mode !== "cloud";
  const columns = withCloud ? 6 : 5;

  return (
    <Card
      title={b.backupsTitle}
      icon={DatabaseBackup}
      flush
      actions={
        overview && (
          <div className="flex flex-wrap gap-2">
            {!readOnly && (
              <Button size="sm" variant="secondary" icon={Save} onClick={backUpNow} loading={starting} disabled={overview.backups.some((x) => x.status === "running")}>
                {b.backupNow}
              </Button>
            )}
            {latest && (
              <Button size="sm" icon={Usb} onClick={() => save(latest)} loading={saving === latest.name}>
                {b.saveToUsb}
              </Button>
            )}
          </div>
        )
      }
    >
      {error && !overview ? (
        <div className="p-6">
          <LoadError
            message={error}
            onRetry={() => {
              setError("");
              setVersion((v) => v + 1);
            }}
          />
        </div>
      ) : (
        <>
          {overview && (
            <div className="px-6 pb-4 space-y-1 text-sm text-gray-700">
              <p>{mode === "cloud" ? b.scheduleCloud(overview.schedule_time, overview.keep_days) : b.schedule(overview.schedule_time, overview.keep_days)}</p>
              {overview.disk && <p>{b.disk(b.gb(overview.disk.free_gb), b.gb(overview.disk.total_gb))}</p>}
              <p className="text-xs text-gray-500">{b.usbHint}</p>
            </div>
          )}
          <Table>
            <thead>
              <tr>
                <Th>{b.columns.when}</Th>
                <Th>{b.columns.kind}</Th>
                <Th>{b.columns.size}</Th>
                <Th>{b.columns.status}</Th>
                {withCloud && <Th>{b.columns.cloud}</Th>}
                <Th />
              </tr>
            </thead>
            <tbody>
              {!overview ? (
                <TableLoading colSpan={columns} />
              ) : overview.backups.length === 0 ? (
                <TableMessage icon={DatabaseBackup} colSpan={columns}>
                  {b.noBackups}
                </TableMessage>
              ) : (
                overview.backups.map((backup) => (
                  <tr key={backup.name} data-backup={backup.name}>
                    <Td>
                      <span className="whitespace-nowrap">{formatDateTime(backup.created_at)}</span>
                    </Td>
                    <Td label={b.columns.kind}>
                      {b.kindsOf[backup.kind]}
                      {backup.by && <span className="block text-xs text-gray-500">{b.by(backup.by)}</span>}
                    </Td>
                    <Td label={b.columns.size}>{backup.size_mb === null ? t.common.dash : b.mb(backup.size_mb)}</Td>
                    <Td label={b.columns.status}>
                      <Badge tone={BACKUP_TONES[backup.status]}>{b.statuses[backup.status]}</Badge>
                      {backup.error && <span className="block mt-1 text-xs text-red-700 max-w-[22rem]">{backup.error}</span>}
                    </Td>
                    {withCloud && (
                      <Td label={b.columns.cloud}>
                        {backup.status === "done" ? (backup.in_cloud ? b.inCloud : b.notInCloud) : t.common.dash}
                      </Td>
                    )}
                    <Td className="text-end">
                      {backup.status === "done" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Usb}
                          onClick={() => save(backup)}
                          loading={saving === backup.name}
                          aria-label={b.saveFor(formatDateTime(backup.created_at))}
                        >
                          {b.saveThis}
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </>
      )}
    </Card>
  );
}
