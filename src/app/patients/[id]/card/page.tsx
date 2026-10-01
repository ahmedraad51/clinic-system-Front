"use client";

import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import RequirePermission from "@/components/Guard";
import QrCode from "@/components/QrCode";
import ToothLogo from "@/components/ToothLogo";
import { Button, NotFoundCard, PageContainer, PageHeader, PageLoading } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { fileHref } from "@/lib/frappe";
import { formatDate } from "@/lib/format";
import { useDocument, useSiteOrigin } from "@/lib/hooks";
import { patientHref, routeId } from "@/lib/links";
import { patientQrValue } from "@/lib/qr";
import type { Patient } from "@/lib/types";

export default function PatientCardPage() {
  return (
    <RequirePermission permission="view_patients">
      <PatientCard />
    </RequirePermission>
  );
}

/**
 * A printable patient card the size of a bank card (85.6 × 54 mm): the clinic, the patient's name and ID, and a QR
 * code that opens their file (the Scan button in the top bar, or a phone camera).
 */
function PatientCard() {
  const params = useParams();
  const id = routeId(params.id);
  const { t } = useI18n();
  const c = t.qr.card;
  const { settings, clinicName } = useSettings();
  const origin = useSiteOrigin();
  const { doc: patient, loading, notFound, error } = useDocument<Patient>("Patient", id);

  if (loading) return <PageLoading />;
  if (notFound || !patient) {
    return <NotFoundCard error={error} what={t.chart.patientWhat} backHref="/patients" backLabel={t.chart.backToPatients} />;
  }

  return (
    <PageContainer section="patients" narrow>
      <PageHeader
        title={c.title}
        subtitle={patient.full_name}
        back={{ href: patientHref(id), label: patient.full_name }}
        actions={
          <Button icon={Printer} onClick={() => window.print()}>
            {t.common.print}
          </Button>
        }
      />
      <p className="text-sm text-gray-600 print:hidden">{c.hint}</p>

      {/* The card itself, at its real size; the dashed border is the line to cut along. */}
      <div
        data-testid="patient-card"
        className="light-paper w-[85.6mm] h-[54mm] bg-white text-black border border-dashed border-gray-400 rounded-[3mm] p-[4mm] flex flex-col justify-between overflow-hidden"
      >
        <div className="flex items-center gap-[2mm]">
          {settings.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- the logo is an uploaded file of unknown size
            <img src={fileHref(settings.logo)} alt="" className="w-[8mm] h-[8mm] object-contain" />
          ) : (
            <span className="w-[8mm] h-[8mm] shrink-0 bg-brand rounded-[1.5mm] flex items-center justify-center text-white print:border print:border-gray-400">
              <ToothLogo size={18} />
            </span>
          )}
          <div className="min-w-0 leading-tight">
            <p className="text-[3.6mm] font-semibold truncate">{clinicName}</p>
            <p className="text-[2.6mm] text-gray-700">{c.kind}</p>
          </div>
        </div>
        <div className="flex items-end justify-between gap-[3mm]">
          <div className="min-w-0 space-y-[1mm] leading-tight">
            <p className="text-[4.2mm] font-semibold break-words">{patient.full_name}</p>
            <p className="text-[2.8mm]">
              <span className="text-gray-700">{c.patientId}: </span>
              <span dir="ltr" className="font-medium">{patient.name}</span>
            </p>
            {patient.date_of_birth && (
              <p className="text-[2.8mm]">
                <span className="text-gray-700">{c.born}: </span>
                {formatDate(patient.date_of_birth)}
              </p>
            )}
            {settings.phone && (
              <p className="text-[2.8mm]">
                <span className="text-gray-700">{c.phone}: </span>
                <span dir="ltr">{settings.phone}</span>
              </p>
            )}
            <p className="text-[2.4mm] text-gray-700">{c.scanNote}</p>
          </div>
          {origin && (
            <QrCode value={patientQrValue(patient.name, origin)} label={t.qr.codeLabel(patient.full_name)} className="w-[24mm] h-[24mm] shrink-0" />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
