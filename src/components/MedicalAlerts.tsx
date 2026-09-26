import { HeartPulse } from "lucide-react";
import { cx, isBlankMedical } from "@/lib/format";
import { medicalFlags, type MedicalFields } from "@/lib/medical";

/**
 * The medical alerts band. Show it wherever treatment is decided: the patient page, the appointment and
 * the treatment plan. Red when something changes what may be done today (allergy, blood thinner, heart,
 * pregnancy); yellow when there is only something to keep in mind. Nothing is shown for a healthy patient.
 */
export default function MedicalAlerts({ patient, title = "Medical alerts" }: { patient: MedicalFields | null | undefined; title?: string }) {
  const flags = medicalFlags(patient);
  const conditions = [
    !isBlankMedical(patient?.chronic_diseases) ? patient?.chronic_diseases : "",
    !isBlankMedical(patient?.current_medications) ? `Takes ${patient?.current_medications}` : "",
  ].filter(Boolean);
  if (flags.length === 0 && conditions.length === 0) return null;

  const high = flags.some((flag) => flag.severity === "high");
  return (
    <div
      role="alert"
      className={cx(
        "rounded-xl border px-4 py-3",
        high ? "bg-red-50 border-red-200 text-red-900" : "bg-yellow-50 border-yellow-200 text-yellow-900",
      )}
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <HeartPulse size={18} className="shrink-0" />
        {title}
      </p>
      {flags.length > 0 && (
        <ul className="flex flex-wrap gap-2 mt-2">
          {flags.map((flag) => (
            <li
              key={flag.kind}
              className={cx(
                "rounded-lg border bg-white px-2.5 py-1 text-sm",
                flag.severity === "high" ? "border-red-200" : "border-yellow-300",
              )}
            >
              <span className="font-semibold">{flag.label}</span>
              <span className="text-gray-600">: {flag.detail}</span>
            </li>
          ))}
        </ul>
      )}
      {conditions.length > 0 && <p className="text-sm mt-2">{conditions.join(" · ")}</p>}
    </div>
  );
}
