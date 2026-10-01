"use client";

import { Eye } from "lucide-react";
import { useConnectivity } from "@/context/ConnectivityContext";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { formatDateTime } from "@/lib/format";

/**
 * Across the top of every page while nothing can be changed: on the view-only cloud copy, when it was last brought up to
 * date (the server's cloud_copy.last_sync) and that changes are made at the clinic.
 */
export default function ReadOnlyBanner() {
  const { readOnly } = useSession();
  const { status } = useConnectivity();
  const { t } = useI18n();
  if (readOnly !== "copy") return null;
  const a = t.access;
  const copy = status?.cloud_copy;
  return (
    <div className="px-4 sm:px-6 pt-4 print:hidden">
      <div
        role="status"
        data-testid="read-only-banner"
        className="mx-auto max-w-[87rem] content-wide:max-w-none flex items-start gap-3 rounded-md border border-primary-200 bg-primary-50 px-4 py-3"
      >
        <Eye size={20} className="shrink-0 mt-0.5 text-primary-700" aria-hidden="true" />
        <div className="text-sm text-gray-800">
          <p className="font-semibold text-gray-900">{a.copyTitle}</p>
          <p>
            {copy?.last_sync ? a.copyUpdated(formatDateTime(copy.last_sync)) : a.copyUnknown} {a.copyText}
          </p>
          {copy?.status === "failed" && copy.error && <p className="mt-1 text-red-700">{a.copyFailed(copy.error)}</p>}
        </div>
      </div>
    </div>
  );
}
