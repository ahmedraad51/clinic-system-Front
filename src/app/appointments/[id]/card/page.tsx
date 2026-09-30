"use client";

import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import RequirePermission from "@/components/Guard";
import ToothLogo from "@/components/ToothLogo";
import { Button, NotFoundCard, PageContainer, PageHeader, PageLoading } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { formatLongDate, formatTime } from "@/lib/format";
import { fileHref } from "@/lib/frappe";
import { useDocument } from "@/lib/hooks";
import { appointmentHref, routeId } from "@/lib/links";
import type { Appointment } from "@/lib/types";

export default function AppointmentCardPage() {
  return (
    <RequirePermission permission="view_appointments">
      <AppointmentCard />
    </RequirePermission>
  );
}

/** A small card for the patient to take home: when, with whom, and how to reach the clinic. */
function AppointmentCard() {
  const params = useParams();
  const id = routeId(params.id);
  const { t, dir } = useI18n();
  const card = t.appointments.card;
  const { settings, clinicName } = useSettings();
  const { doc: appointment, loading, notFound, error } = useDocument<Appointment>("Appointment", id);

  if (loading) return <PageLoading />;
  if (notFound || !appointment) {
    return (
      <NotFoundCard error={error} what={t.enums.doctype.Appointment} backHref="/appointments" backLabel={t.appointments.backToList} />
    );
  }

  return (
    <PageContainer section="appointments" narrow>
      <PageHeader
        title={card.title}
        subtitle={card.subtitle}
        back={{ href: appointmentHref(id), label: t.appointments.appointment }}
        actions={
          <Button icon={Printer} onClick={() => window.print()}>
            {t.common.print}
          </Button>
        }
      />

      {/* About the size of a postcard, drawn with a dashed edge to cut along. */}
      <div dir={dir} className="mx-auto max-w-md rounded-2xl border-2 border-dashed border-gray-300 bg-surface p-6 space-y-5 text-start print:mt-0">
        <div className="flex items-center gap-3">
          {settings.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- the logo is an uploaded file of unknown size
            <img src={fileHref(settings.logo)} alt="" className="w-11 h-11 rounded-xl object-contain" />
          ) : (
            <span className="w-11 h-11 shrink-0 rounded-xl bg-brand text-white flex items-center justify-center">
              <ToothLogo size={22} />
            </span>
          )}
          <div>
            <p className="font-semibold text-gray-800">{clinicName}</p>
            <p className="text-xs text-gray-500">{card.yourNext}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-500">{card.for}</p>
          <p className="text-lg font-semibold text-gray-800">{appointment.patient_name || appointment.patient}</p>
        </div>

        <div className="rounded-xl bg-primary-50 px-4 py-3 print:bg-white print:border print:border-gray-300">
          <p className="text-xl font-semibold text-primary-900">{formatLongDate(appointment.appointment_date)}</p>
          <p className="text-lg font-semibold text-primary-800">{card.at(formatTime(appointment.appointment_time))}</p>
          {appointment.doctor_name && <p className="text-sm text-primary-800 mt-1">{card.with(appointment.doctor_name)}</p>}
        </div>

        {appointment.reason_for_visit && (
          <p className="text-sm text-gray-600">
            <span className="text-gray-500">{card.visit}</span>
            {appointment.reason_for_visit}
          </p>
        )}

        <div className="border-t border-gray-100 pt-4 text-sm text-gray-600 space-y-1">
          <p>{card.arriveEarly(10)}</p>
          {settings.phone && (
            <p>
              {card.toChange}{" "}
              <bdi dir="ltr">{settings.phone}</bdi>
              {card.end}
            </p>
          )}
          {settings.address && <p className="text-gray-500">{settings.address}</p>}
        </div>
      </div>
    </PageContainer>
  );
}
