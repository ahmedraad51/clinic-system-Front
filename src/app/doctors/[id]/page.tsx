"use client";

import { useEffect, useState } from "react";
import { useRecordDialogs } from "@/components/RecordDialogs";
import { useDataVersion } from "@/lib/dataVersion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, CalendarRange, Pencil, Plus, Stethoscope, Sun } from "lucide-react";
import Avatar from "@/components/Avatar";
import DoctorDialog from "@/components/DoctorDialog";
import RequirePermission from "@/components/Guard";
import {
  Badge, Button, Card, DetailLayout, LoadError, NotFoundCard, PageContainer, PageHeader, PageLoading, ProfileCard, RecordLoading, StatusBadge,
} from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { label, messages, num } from "@/i18n";
import { errorMessage, getList } from "@/lib/frappe";
import { addDays, formatDate, formatTime, todayISO } from "@/lib/format";
import { useDocument } from "@/lib/hooks";
import { appointmentHref, routeId, treatmentHref } from "@/lib/links";
import type { Appointment, Doctor, TreatmentPlan } from "@/lib/types";

export default function DoctorPage() {
  return (
    <RequirePermission permission="manage_users">
      <DoctorView />
    </RequirePermission>
  );
}

/** How far ahead the doctor's upcoming appointments go. */
const AHEAD_DAYS = 30;

interface Related {
  id: string;
  appointments: Appointment[];
  plans: TreatmentPlan[];
}

/** One doctor: the profile card, today's patients, the next 30 days and the open treatment plans. */
function DoctorView() {
  const params = useParams();
  const id = routeId(params.id);
  const { t } = useI18n();
  const d = t.doctors;
  const { can } = useSession();
  const { doc: doctor, loading, notFound, error, reload } = useDocument<Doctor>("Doctor", id);
  const [editing, setEditing] = useState(false);
  const [related, setRelated] = useState<Related | null>(null);
  const [failed, setFailed] = useState("");
  const [version, setVersion] = useState(0);
  const openDialog = useRecordDialogs();
  const today = todayISO();
  // The page is for managers (manage_users); the patients' visits and plans only for those who may see them.
  const seeAppointments = can("view_appointments");
  const seeTreatments = can("view_treatments");

  // A dialog saved something: load again.
  const saved = useDataVersion();
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [appointments, plans] = await Promise.all([
          !seeAppointments
            ? Promise.resolve([])
            : getList<Appointment>(
            "Appointment",
            ["name", "patient", "patient_name", "appointment_date", "appointment_time", "status", "reason_for_visit"],
            {
              filters: [
                ["doctor", "=", id],
                ["appointment_date", ">=", today],
                ["appointment_date", "<=", addDays(today, AHEAD_DAYS)],
                ["status", "!=", "Cancelled"],
              ],
              orderBy: "appointment_date asc, appointment_time asc",
              limit: 200,
            },
          ),
          !seeTreatments
            ? Promise.resolve([])
            : getList<TreatmentPlan>("Treatment Plan", ["name", "patient", "patient_name", "treatment_type", "tooth_number", "status"], {
                filters: [
                  ["doctor", "=", id],
                  ["status", "in", ["Planned", "In Progress"]],
                ],
                orderBy: "name desc",
                limit: 100,
              }),
        ]);
        if (!cancelled) {
          setRelated({ id, appointments, plans });
          setFailed("");
        }
      } catch (err) {
        if (!cancelled) setFailed(errorMessage(err, messages().errors.generic));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, today, version, saved, seeAppointments, seeTreatments]);

  if (loading) return <RecordLoading />;
  if (notFound || !doctor) {
    return <NotFoundCard error={error} what={d.notFoundWhat} backHref="/doctors" backLabel={d.title} />;
  }

  const data = related?.id === id ? related : null;
  const todayList = data?.appointments.filter((a) => a.appointment_date === today) ?? [];
  const later = data?.appointments.filter((a) => a.appointment_date > today) ?? [];
  const active = Number(doctor.is_active) === 1;
  // After a failed load: the error with Try Again, and no spinners that never end.
  const loadFailed = !!failed && !data;
  const loadingValue = loadFailed ? "—" : "…";
  const stats = [
    ...(seeAppointments
      ? [
          { icon: Sun, value: data ? num(todayList.length) : loadingValue, label: d.statToday, hue: "blue" as const },
          { icon: CalendarRange, value: data ? num(later.length) : loadingValue, label: d.statUpcoming, hue: "blue" as const },
        ]
      : []),
    ...(seeTreatments
      ? [{ icon: Stethoscope, value: data ? num(data.plans.length) : loadingValue, label: d.statOpenPlans, hue: "treatments" as const }]
      : []),
  ];

  const list = (rows: Appointment[], empty: string, showDate: boolean) =>
    !data ? (
      <PageLoading />
    ) : rows.length === 0 ? (
      <p className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-gray-500">{empty}</p>
    ) : (
      <ul className="divide-y divide-gray-200 border-t border-gray-200">
        {rows.map((a) => (
          <li key={a.name}>
            <Link href={appointmentHref(a.name)} className="flex items-center gap-3 px-5 sm:px-6 py-3 hover:bg-gray-50">
              <span className="w-24 shrink-0">
                <span className="block text-sm font-medium text-gray-900 whitespace-nowrap">{formatTime(a.appointment_time)}</span>
                {showDate && <span className="block text-xs text-gray-500">{formatDate(a.appointment_date)}</span>}
              </span>
              <Avatar name={a.patient_name || a.patient} size={32} className="max-sm:hidden" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-gray-800 truncate">{a.patient_name || a.patient}</span>
                <span className="block text-xs text-gray-500 truncate">{a.reason_for_visit}</span>
              </span>
              <StatusBadge kind="appointment" status={a.status} />
            </Link>
          </li>
        ))}
      </ul>
    );

  return (
    <PageContainer section="appointments">
      <PageHeader back={{ href: "/doctors", label: d.title }} />

      <DetailLayout
        aside={
          <ProfileCard
            titleLevel={1}
            avatar={<Avatar name={doctor.full_name} photo={doctor.photo} size={96} />}
            title={doctor.full_name}
            subtitle={label(t.enums.specialization, doctor.specialization)}
            badges={<Badge tone={active ? "green" : "gray"}>{active ? d.active : d.notActive}</Badge>}
            stats={stats}
            detailsTitle={t.users.details}
            details={[
              { label: d.phone, value: doctor.phone_number ? <span dir="ltr">{doctor.phone_number}</span> : "" },
              { label: t.users.email, value: doctor.email ? <span dir="ltr" className="break-all">{doctor.email}</span> : "" },
              {
                label: d.workingHours,
                value:
                  doctor.start_time && doctor.end_time
                    ? d.hours(formatTime(doctor.start_time), formatTime(doctor.end_time))
                    : d.clinicHours,
              },
            ]}
            actions={
              <>
                <Button icon={Pencil} onClick={() => setEditing(true)}>
                  {d.edit}
                </Button>
                {can("add_appointments") && active && (
                  <Button variant="secondary" icon={Plus} onClick={() => openDialog({ kind: "newAppointment", prefill: { doctor: id } })}>
                    {d.newAppointment}
                  </Button>
                )}
              </>
            }
          />
        }
      >
        {failed && (
          <LoadError
            message={failed}
            onRetry={() => {
              setFailed("");
              setVersion((v) => v + 1);
            }}
          />
        )}
        {seeAppointments && !loadFailed && (
          <Card
            title={d.todayCard}
            icon={CalendarDays}
            flush
            actions={
              <Link
                href={`/appointments?view=day&doctor=${encodeURIComponent(id)}`}
                className="inline-flex items-center pointer-coarse:min-h-11 text-sm text-primary-600 hover:underline"
              >
                {d.inCalendar}
              </Link>
            }
          >
            {list(todayList, d.noToday, false)}
          </Card>
        )}
        {seeAppointments && !loadFailed && (
          <Card title={d.upcomingCard} icon={CalendarRange} flush>
            {list(later, d.noUpcoming, true)}
          </Card>
        )}
        {seeTreatments && !loadFailed && (
          <Card title={d.openPlansCard} icon={Stethoscope} flush>
            {!data ? (
              <PageLoading />
            ) : data.plans.length === 0 ? (
              <p className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-gray-500">{d.noOpenPlans}</p>
            ) : (
              <ul className="divide-y divide-gray-200 border-t border-gray-200">
                {data.plans.map((plan) => (
                  <li key={plan.name}>
                    <Link href={treatmentHref(plan.name)} className="flex items-center gap-3 px-5 sm:px-6 py-3 hover:bg-gray-50">
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-gray-800 truncate">
                          {label(t.enums.treatmentType, plan.treatment_type)}
                          {plan.tooth_number ? `${t.common.dot}${t.treatments.tooth} ${plan.tooth_number}` : ""}
                        </span>
                        <span className="block text-xs text-gray-500 truncate">{plan.patient_name || plan.patient}</span>
                      </span>
                      <StatusBadge kind="treatment" status={plan.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </DetailLayout>

      {editing && (
        <DoctorDialog
          doctor={doctor}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      )}
    </PageContainer>
  );
}

