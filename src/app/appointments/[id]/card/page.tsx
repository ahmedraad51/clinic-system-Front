"use client";

import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import RequirePermission from "@/components/Guard";
import ToothLogo from "@/components/ToothLogo";
import { Button, NotFoundCard, PageContainer, PageHeader, PageLoading } from "@/components/ui";
import { useSettings } from "@/context/SettingsContext";
import { formatLongDate, formatTime } from "@/lib/format";
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
  const { settings, clinicName } = useSettings();
  const { doc: appointment, loading, notFound, error } = useDocument<Appointment>("Appointment", id);

  if (loading) return <PageLoading />;
  if (notFound || !appointment) {
    return <NotFoundCard error={error} what="Appointment" backHref="/appointments" backLabel="Back to Appointments" />;
  }

  return (
    <PageContainer narrow>
      <PageHeader
        title="Appointment Card"
        subtitle="Print it and hand it to the patient."
        back={{ href: appointmentHref(id), label: "Appointment" }}
        actions={
          <Button icon={Printer} onClick={() => window.print()}>
            Print
          </Button>
        }
      />

      {/* About the size of a postcard, drawn with a dashed edge to cut along. */}
      <div className="mx-auto max-w-md rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 space-y-5 print:mt-0">
        <div className="flex items-center gap-3">
          {settings.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- the logo is an uploaded file of unknown size
            <img src={settings.logo} alt="" className="w-11 h-11 rounded-xl object-contain" />
          ) : (
            <span className="w-11 h-11 shrink-0 rounded-xl bg-primary-600 text-white flex items-center justify-center">
              <ToothLogo size={22} />
            </span>
          )}
          <div>
            <p className="font-bold text-gray-800">{clinicName}</p>
            <p className="text-xs text-gray-500">Your next appointment</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-500">For</p>
          <p className="text-lg font-semibold text-gray-800">{appointment.patient_name || appointment.patient}</p>
        </div>

        <div className="rounded-xl bg-primary-50 px-4 py-3 print:bg-white print:border print:border-gray-300">
          <p className="text-xl font-bold text-primary-900">{formatLongDate(appointment.appointment_date)}</p>
          <p className="text-lg font-semibold text-primary-800">at {formatTime(appointment.appointment_time)}</p>
          {appointment.doctor_name && <p className="text-sm text-primary-800 mt-1">with {appointment.doctor_name}</p>}
        </div>

        {appointment.reason_for_visit && (
          <p className="text-sm text-gray-600">
            <span className="text-gray-500">Visit: </span>
            {appointment.reason_for_visit}
          </p>
        )}

        <div className="border-t border-gray-100 pt-4 text-sm text-gray-600 space-y-1">
          <p>Please arrive 10 minutes early.</p>
          {settings.phone && <p>To change your appointment, call {settings.phone}.</p>}
          {settings.address && <p className="text-gray-500">{settings.address}</p>}
        </div>
      </div>
    </PageContainer>
  );
}
