import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useI18n } from "@/context/LanguageContext";
import { cx } from "@/lib/format";
import type { PrescriptionWarning } from "@/lib/prescriptions";

/**
 * The safety warnings of a prescription: red when a medicine may be unsafe for this patient, yellow when there
 * is something to check. They never stop the prescription from being saved. `quiet` hides the "no warnings"
 * line (the record page).
 */
export default function PrescriptionWarnings({ warnings, quiet = false }: { warnings: PrescriptionWarning[]; quiet?: boolean }) {
  const { t } = useI18n();
  if (warnings.length === 0) {
    if (quiet) return null;
    return (
      <p className="flex items-center gap-2 text-sm text-gray-500">
        <ShieldCheck size={16} className="shrink-0 text-green-600" aria-hidden="true" />
        {t.prescriptions.warnings.none}
      </p>
    );
  }
  const high = warnings.some((warning) => warning.severity === "high");
  return (
    <div
      role="alert"
      className={cx(
        "rounded-xl border px-4 py-3 print:hidden",
        high ? "bg-red-50 border-red-200 text-red-900" : "bg-yellow-50 border-yellow-200 text-yellow-900",
      )}
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <ShieldAlert size={18} className="shrink-0" aria-hidden="true" />
        {t.prescriptions.warnings.title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {warnings.map((warning, index) => (
          <li
            key={`${warning.kind}-${warning.medicine}-${index}`}
            className={cx(
              "rounded-lg border bg-surface px-3 py-1.5 text-sm text-gray-800",
              warning.severity === "high" ? "border-red-200" : "border-yellow-300",
            )}
          >
            {warning.text}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs">{t.prescriptions.warnings.footer}</p>
    </div>
  );
}
