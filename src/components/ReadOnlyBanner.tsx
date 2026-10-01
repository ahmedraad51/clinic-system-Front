"use client";

import { Eye, Lock, RefreshCw, ServerOff, WifiOff } from "lucide-react";
import { Button, LinkButton } from "@/components/ui";
import { useConnectivity } from "@/context/ConnectivityContext";
import { useDeployment } from "@/context/DeploymentContext";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { formatDateTime, formatTime, frappeDateTime, todayISO } from "@/lib/format";
import { lastServerAnswer } from "@/lib/frappe";

/**
 * Across the top of every page while nothing can be changed (useSession().readOnly), saying why: the view-only cloud
 * copy (when it was last brought up to date, the server's cloud_copy.last_sync), a plan that has ended past its grace
 * days, a clinic the platform suspended (the manager gets a link to the Plan page), or a lost connection (what was
 * loaded last shows; everything loads again by itself when the server answers).
 */
export default function ReadOnlyBanner() {
  const { readOnly, can } = useSession();
  const { status, browserOnline, check } = useConnectivity();
  const { t } = useI18n();
  // A clinic server renews with a new licence key; the cloud through the Plan page.
  const renewHref = useDeployment().mode === "cloud" ? "/settings/plan" : "/settings/license";
  if (!readOnly) return null;
  const a = t.access;
  const copy = status?.cloud_copy;

  let title: string;
  let lines: string[];
  if (readOnly === "offline") {
    const at = lastServerAnswer();
    const when = at === null ? "" : frappeDateTime(new Date(at));
    title = a.offlineTitle;
    lines = [
      `${browserOnline ? a.offlineNoServer : a.offlineNoNetwork} ${
        when ? a.offlineShown(when.startsWith(todayISO()) ? formatTime(when.slice(11, 16)) : formatDateTime(when)) : a.offlineNothing
      }`,
    ];
  } else if (readOnly === "copy") {
    title = a.copyTitle;
    lines = [`${copy?.last_sync ? a.copyUpdated(formatDateTime(copy.last_sync)) : a.copyUnknown} ${a.copyText}`];
    if (copy?.status === "failed" && copy.error) lines.push(a.copyFailed(copy.error));
  } else if (readOnly === "suspended") {
    title = t.plan.suspendedTitle;
    lines = [t.plan.suspendedText];
  } else if (renewHref === "/settings/license") {
    // A clinic server runs on its licence.
    title = t.license.lockedTitle;
    lines = [t.license.lockedBanner];
  } else {
    title = t.plan.lockedTitle;
    lines = [t.plan.lockedText];
  }
  const offline = readOnly === "offline";
  const Icon = readOnly === "copy" ? Eye : offline ? (browserOnline ? ServerOff : WifiOff) : Lock;
  const tone = readOnly === "copy" ? "border-primary-200 bg-primary-50" : offline ? "border-yellow-200 bg-yellow-50" : "border-red-200 bg-red-50";
  const iconTone = readOnly === "copy" ? "text-primary-700" : offline ? "text-yellow-800" : "text-red-700";

  return (
    <div className="px-4 sm:px-6 pt-4 print:hidden">
      <div
        role="status"
        data-testid="read-only-banner"
        data-reason={readOnly}
        className={`mx-auto max-w-[87rem] content-wide:max-w-none flex flex-wrap items-start gap-3 rounded-md border px-4 py-3 ${tone}`}
      >
        <Icon size={20} className={`shrink-0 mt-0.5 ${iconTone}`} aria-hidden="true" />
        <div className="flex-1 min-w-[12rem] text-sm text-gray-800">
          <p className="font-semibold text-gray-900">{title}</p>
          {lines.map((line, index) => (
            <p key={index} className={index > 0 ? "mt-1 text-red-700" : undefined}>
              {line}
            </p>
          ))}
        </div>
        {offline && (
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={check}>
            {a.tryAgain}
          </Button>
        )}
        {readOnly === "subscription" && can("manage_users") && (
          <LinkButton href={renewHref} size="sm">
            {t.plan.renew}
          </LinkButton>
        )}
      </div>
    </div>
  );
}
