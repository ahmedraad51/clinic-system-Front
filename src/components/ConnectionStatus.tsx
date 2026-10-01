"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CloudAlert, CloudCheck, RefreshCw, Server, ServerOff, Wifi, WifiOff, type LucideIcon } from "lucide-react";
import { tooltip } from "@/components/ui";
import { useConnectivity } from "@/context/ConnectivityContext";
import { useDeployment } from "@/context/DeploymentContext";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { cx } from "@/lib/format";
import { minutesSince } from "@/lib/waitingRoom";
import { TOP_DROPDOWN, TOP_ICON_BUTTON } from "./topbarStyles";

/** A cloud copy not updated for longer than this is shown as behind. */
export const COPY_STALE_MINUTES = 60;

type Health = "good" | "warn" | "bad" | "unknown";

const DOTS: Record<Health, string> = { good: "bg-solid-green", warn: "bg-[#c27c0e]", bad: "bg-solid-red", unknown: "bg-gray-400" };
const TEXT: Record<Health, string> = { good: "text-green-700", warn: "text-yellow-800", bad: "text-red-700", unknown: "text-gray-600" };

/**
 * The small status icon in the top bar: online, offline (no network here), the server cannot be reached, a clinic
 * server without internet, or (on the online copy) whether the copy is up to date. A click shows the details and, for
 * the manager, a link to Server & Backup.
 */
export default function ConnectionStatus() {
  const { t } = useI18n();
  const c = t.connection.status;
  const { mode } = useDeployment();
  const { can } = useSession();
  const { browserOnline, server, internet, status, check } = useConnectivity();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const copy = mode === "cloud" ? null : (status?.cloud_copy ?? null);
  const copyMinutes = copy?.last_sync ? minutesSince(copy.last_sync, new Date()) : null;
  const copyFresh = copy?.status === "ok" && copyMinutes !== null && copyMinutes <= COPY_STALE_MINUTES;
  const ago = copyMinutes === null ? "" : t.backup.ago(copyMinutes);

  // The one thing the icon says, the worst first.
  let icon: LucideIcon;
  let health: Health;
  let summary: string;
  if (!browserOnline) {
    [icon, health, summary] = [WifiOff, "bad", c.offline];
  } else if (server === "unreachable") {
    [icon, health, summary] = [ServerOff, "bad", c.unreachable];
  } else if (server === "checking") {
    [icon, health, summary] = [mode === "cloud" ? Wifi : Server, "unknown", c.checking];
  } else if (mode === "cloud-copy") {
    [icon, health, summary] = copyFresh ? [CloudCheck, "good", c.copyFresh(ago)] : [CloudAlert, "warn", copy?.last_sync ? c.copyBehind(ago) : c.copyNever];
  } else if (mode === "clinic-server") {
    [icon, health, summary] = internet ? [Server, "good", c.clinicServer] : [Server, "warn", c.noInternet];
  } else {
    [icon, health, summary] = [Wifi, "good", c.online];
  }
  const Icon = icon;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={summary}
        {...tooltip(summary)}
        data-testid="connection-status"
        data-health={health}
        className={TOP_ICON_BUTTON}
      >
        <Icon size={22} aria-hidden="true" />
        <span aria-hidden="true" className={cx("absolute top-1.5 end-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-surface", DOTS[health])} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className={cx(TOP_DROPDOWN, "w-72 px-4 py-3")} role="dialog" aria-label={c.title} data-testid="connection-panel">
            <p className={cx("text-sm font-semibold", TEXT[health])}>{summary}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-600">{t.backup.serverTitle}</dt>
                <dd className={cx("text-end", server === "ok" ? "text-gray-900" : TEXT[server === "unreachable" ? "bad" : "unknown"])}>
                  {browserOnline ? t.backup.reach[server] : c.offlineShort}
                </dd>
              </div>
              {mode === "clinic-server" && (
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-600">{t.backup.internet}</dt>
                  <dd className={cx("text-end", internet ? "text-gray-900" : TEXT.warn)}>{internet ? t.backup.internetYes : t.backup.internetNo}</dd>
                </div>
              )}
              {copy && (
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-600">{t.backup.copyTitle}</dt>
                  <dd className={cx("text-end", copyFresh ? "text-gray-900" : TEXT.warn)}>
                    {t.backup.copyStatus[copy.status]}
                    {ago && <span className="block text-xs text-gray-500">{ago}</span>}
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={check}
                className="inline-flex items-center gap-1.5 min-h-9 pointer-coarse:min-h-11 px-2 -ms-2 rounded-md text-sm text-primary-600 hover:bg-primary-50"
              >
                <RefreshCw size={16} aria-hidden="true" />
                {t.backup.checkNow}
              </button>
              {can("manage_users") && (
                <Link
                  href="/settings/server"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center min-h-9 pointer-coarse:min-h-11 text-sm text-primary-600 hover:underline"
                >
                  {t.backup.nav}
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
