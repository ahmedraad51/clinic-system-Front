"use client";

import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import ClinicLetterhead from "@/components/ClinicLetterhead";
import DentalChart from "@/components/DentalChart";
import RequirePermission from "@/components/Guard";
import MedicalAlerts from "@/components/MedicalAlerts";
import { Button, Card, NotFoundCard, PageContainer, PageHeader, PageLoading } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { display, formatDate, todayISO } from "@/lib/format";
import { useDocument } from "@/lib/hooks";
import { patientHref, routeId } from "@/lib/links";
import type { Patient } from "@/lib/types";

export default function ChartPrintPage() {
  return (
    <RequirePermission permission="view_patients">
      <ChartPrint />
    </RequirePermission>
  );
}

/** The dental chart and its findings on the clinic letterhead, for the paper patient file or a referral. */
function ChartPrint() {
  const { t } = useI18n();
  const params = useParams();
  const id = routeId(params.id);
  const { doc: patient, loading, notFound, error } = useDocument<Patient>("Patient", id);

  if (loading) return <PageLoading />;
  if (notFound || !patient) {
    return <NotFoundCard error={error} what={t.chart.patientWhat} backHref="/patients" backLabel={t.chart.backToPatients} />;
  }

  return (
    <PageContainer>
      <PageHeader
        title={t.chart.title}
        subtitle={patient.full_name}
        back={{ href: patientHref(id), label: patient.full_name }}
        actions={
          <Button icon={Printer} onClick={() => window.print()}>
            {t.common.print}
          </Button>
        }
      />

      <Card className="print:shadow-none print:border-0">
        <ClinicLetterhead kind={t.chart.letterheadKind} reference={patient.name} date={formatDate(todayISO())} />
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 py-5">
          <div>
            <dt className="text-xs text-gray-500">{t.common.patient}</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">{patient.full_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">{t.common.age}</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">{patient.age ? t.common.years(Number(patient.age)) : t.common.dash}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">{t.common.phone}</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">
              <span dir="ltr">{display(patient.phone_number)}</span>
            </dd>
          </div>
        </dl>
        <div className="mb-5">
          <MedicalAlerts patient={patient} />
        </div>
        <DentalChart key={patient.name} initialChart={patient.dental_chart} canEdit={false} patientAge={patient.age} />
      </Card>
    </PageContainer>
  );
}
