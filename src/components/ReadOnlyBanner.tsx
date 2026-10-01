"use client";

import { Eye, Lock } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { useConnectivity } from "@/context/ConnectivityContext";
import { useDeployment } from "@/context/DeploymentContext";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { formatDateTime } from "@/lib/format";

/**
 * Across the top of every page while nothing can be changed (useSession().readOnly), saying why: the view-only cloud
 * copy (when it was last brought up to date, the server's cloud_copy.last_sync), a plan that has ended past its grace
 * days, or a clinic the platform suspended (the manager gets a link to the Plan page).
 */
export default function ReadOnlyBanner() {
  const { readOnly, can } = useSession();
  const { status } = useConnectivity();
  const { t } = useI18n();
  // A clinic server renews with a new licence key; the cloud through the Plan page.
  const renewHref = useDeployment().mode === "cloud" ? "/settings/plan" : "/settings/license";
  if (!readOnly) return null;
  const a = t.access;
  const copy = status?.cloud_copy;

  let title: string;
  let lines: string[];
  if (readOnly === "copy") {
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
  const Icon = readOnly === "copy" ? Eye : Lock;
  const tone = readOnly === "copy" ? "border-primary-200 bg-primary-50" : "border-red-200 bg-red-50";

  return (
    <div className="px-4 sm:px-6 pt-4 print:hidden">
      <div
        role="status"
        data-testid="read-only-banner"
        data-reason={readOnly}
        className={`mx-auto max-w-[87rem] content-wide:max-w-none flex flex-wrap items-start gap-3 rounded-md border px-4 py-3 ${tone}`}
      >
        <Icon size={20} className={`shrink-0 mt-0.5 ${readOnly === "copy" ? "text-primary-700" : "text-red-700"}`} aria-hidden="true" />
        <div className="flex-1 min-w-[12rem] text-sm text-gray-800">
          <p className="font-semibold text-gray-900">{title}</p>
          {lines.map((line, index) => (
            <p key={index} className={index > 0 ? "mt-1 text-red-700" : undefined}>
              {line}
            </p>
          ))}
        </div>
        {readOnly === "subscription" && can("manage_users") && (
          <LinkButton href={renewHref} size="sm">
            {t.plan.renew}
          </LinkButton>
        )}
      </div>
    </div>
  );
}
