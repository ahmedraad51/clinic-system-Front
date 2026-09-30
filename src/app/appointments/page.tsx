"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, CalendarRange, CalendarX, ChevronLeft, ChevronRight, List, Plus } from "lucide-react";
import { PatientLink } from "@/components/Avatar";
import RequirePermission from "@/components/Guard";
import AppointmentCalendar, { type CalendarView } from "@/components/AppointmentCalendar";
import {
  Button, Card, ClearFiltersButton, ClickableRow, LinkButton, PageContainer, PageHeader, PageLoading,
  Pagination, SearchInput, Segmented, SelectInput, StatusBadge, Table, TableError, TableLoading, TableMessage,
  Td, TextInput, Th, Toolbar,
} from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { label } from "@/i18n";
import type { FilterRow } from "@/lib/frappe";
import { addDays, display, formatDate, formatLongDate, formatTime, todayISO, weekStart } from "@/lib/format";
import { searchFilters, useDebounced, useDoctorList, usePagedList } from "@/lib/hooks";
import { appointmentHref } from "@/lib/links";
import { APPOINTMENT_STATUSES, type Appointment } from "@/lib/types";

type View = CalendarView | "list";

/** The views; their names come from t.appointments.views. */
const VIEWS = [
  { value: "day" as const, icon: CalendarDays },
  { value: "week" as const, icon: CalendarRange },
  { value: "list" as const, icon: List },
];

/** The date filter of the list; the names come from t.appointments.when. */
const WHEN_OPTIONS = ["all", "today", "tomorrow", "upcoming", "past"] as const;
type When = (typeof WHEN_OPTIONS)[number];

const isDate = (value: string | null): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));

function whenFilter(when: When): FilterRow[] {
  const today = todayISO();
  switch (when) {
    case "today":
      return [["appointment_date", "=", today]];
    case "tomorrow":
      return [["appointment_date", "=", addDays(today, 1)]];
    case "upcoming":
      return [["appointment_date", ">=", today]];
    case "past":
      return [["appointment_date", "<", today]];
    default:
      return [];
  }
}

export default function AppointmentsPage() {
  return (
    <RequirePermission permission="view_appointments">
      <Suspense fallback={<PageLoading />}>
        <Appointments />
      </Suspense>
    </RequirePermission>
  );
}

/**
 * The appointment book in three views. The view, the day and the doctor live in the address
 * (?view=day&day=2026-09-26&doctor=DOC-00001), so Back and a refresh keep them. The list view also
 * accepts ?date=today|tomorrow|upcoming|past and opens by itself when that is given.
 */
function Appointments() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { can, doctor: myDoctor } = useSession();
  const { settings, isOpenOn } = useSettings();
  const { doctors, loading: doctorsLoading } = useDoctorList();

  const requested = searchParams.get("view");
  const view: View =
    requested === "day" || requested === "week" || requested === "list"
      ? requested
      : searchParams.get("date")
        ? "list"
        : "day";
  const dayParam = searchParams.get("day");
  const day = isDate(dayParam) ? dayParam : todayISO();
  // A doctor's calendar opens on their own column; ?doctor=all shows everyone.
  const doctorParam = searchParams.get("doctor");
  const doctor = doctorParam === null ? (myDoctor?.name ?? "") : doctorParam === "all" ? "" : doctorParam;

  const update = (patch: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => (value ? params.set(key, value) : params.delete(key)));
    router.replace(`/appointments?${params.toString()}`, { scroll: false });
  };

  const step = view === "week" ? 7 : 1;
  const first = view === "week" ? weekStart(day) : day;
  const heading = view === "week" ? t.appointments.weekRange(formatDate(first), formatDate(addDays(first, 6))) : formatLongDate(day);
  const views = VIEWS.map((option) => ({ ...option, label: t.appointments.views[option.value] }));
  const newParams = new URLSearchParams(view === "list" ? {} : { date: day, ...(doctor ? { doctor } : {}) });
  const newHref = `/appointments/new${newParams.size ? `?${newParams.toString()}` : ""}`;

  return (
    <PageContainer section="appointments">
      <PageHeader icon={CalendarDays} section="appointments"
        title={t.appointments.title}
        subtitle={view === "list" ? t.appointments.listSubtitle : heading}
        actions={
          can("add_appointments") && (
            <LinkButton href={newHref} icon={Plus}>
              {t.appointments.newAppointment}
            </LinkButton>
          )
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label={t.appointments.view} options={views} value={view} onChange={(next) => update({ view: next })} />
        {view !== "list" && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              icon={ChevronLeft}
              onClick={() => update({ day: addDays(day, -step) })}
              aria-label={view === "week" ? t.appointments.previousWeek : t.appointments.previousDay}
              className="px-3 rtl:[&>svg]:rotate-180"
            />
            <Button variant="secondary" onClick={() => update({ day: "" })} disabled={day === todayISO()}>
              {t.common.today}
            </Button>
            <Button
              variant="secondary"
              icon={ChevronRight}
              onClick={() => update({ day: addDays(day, step) })}
              aria-label={view === "week" ? t.appointments.nextWeek : t.appointments.nextDay}
              className="px-3 rtl:[&>svg]:rotate-180"
            />
            <TextInput
              type="date"
              dir="ltr"
              value={day}
              onChange={(event) => {
                if (isDate(event.target.value)) update({ day: event.target.value });
              }}
              aria-label={t.appointments.goToDate}
              className="sm:w-auto flex-1 sm:flex-none min-w-0"
            />
            <SelectInput
              value={doctor}
              onChange={(event) => update({ doctor: event.target.value || (myDoctor ? "all" : "") })}
              aria-label={t.common.doctor}
              className="sm:w-auto sm:max-w-[15rem]"
            >
              <option value="">{t.appointments.allDoctors}</option>
              {doctors.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.full_name}
                </option>
              ))}
            </SelectInput>
          </div>
        )}
      </div>

      {view === "list" ? (
        <AppointmentsList />
      ) : (
        <AppointmentCalendar
          view={view}
          date={day}
          doctors={doctors}
          doctorsLoading={doctorsLoading}
          doctorFilter={doctor}
          openingTime={settings.opening_time}
          closingTime={settings.closing_time}
          canBook={can("add_appointments")}
          canMove={can("edit_appointments")}
          isOpenOn={isOpenOn}
        />
      )}
    </PageContainer>
  );
}

function AppointmentsList() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [when, setWhen] = useState<When>(() => {
    const fromUrl = searchParams.get("date");
    return WHEN_OPTIONS.some((option) => option === fromUrl) ? (fromUrl as When) : "all";
  });
  const debounced = useDebounced(search);

  const filters: FilterRow[] = [...whenFilter(when), ...(status ? [["status", "=", status] as FilterRow] : [])];
  const soonestFirst = when === "today" || when === "tomorrow" || when === "upcoming";
  const direction = soonestFirst ? "asc" : "desc";

  const list = usePagedList<Appointment>("Appointment", {
    fields: ["name", "patient", "patient_name", "doctor_name", "appointment_date", "appointment_time", "status", "reason_for_visit"],
    filters: filters.length ? filters : undefined,
    orFilters: searchFilters(debounced, ["patient_name", "doctor_name", "reason_for_visit", "name"]),
    orderBy: `appointment_date ${direction}, appointment_time ${direction}`,
  });
  const filtered = Boolean(debounced.trim() || status || when !== "all");
  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setWhen("all");
  };

  return (
    <>
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder={t.appointments.searchPlaceholder} />
        <SelectInput value={when} onChange={(e) => setWhen(e.target.value as When)} className="sm:w-40" aria-label={t.common.date}>
          {WHEN_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t.appointments.when[option]}
            </option>
          ))}
        </SelectInput>
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40" aria-label={t.common.status}>
          <option value="">{t.appointments.allStatuses}</option>
          {APPOINTMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {label(t.enums.appointmentStatus, s)}
            </option>
          ))}
        </SelectInput>
      </Toolbar>

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>{t.common.date}</Th>
              <Th>{t.common.time}</Th>
              <Th>{t.common.patient}</Th>
              <Th>{t.common.doctor}</Th>
              <Th>{t.appointments.reason}</Th>
              <Th>{t.common.status}</Th>
            </tr>
          </thead>
          <tbody>
            {list.error ? (
              <TableError colSpan={6} message={list.error} onRetry={list.reload} />
            ) : list.initialLoading ? (
              <TableLoading colSpan={6} />
            ) : list.rows.length === 0 ? (
              <TableMessage icon={CalendarX} colSpan={6}>
                {filtered ? (
                  <>
                    {t.appointments.noMatch}
                    <ClearFiltersButton onClick={clearFilters} />
                  </>
                ) : (
                  t.appointments.noneYet
                )}
              </TableMessage>
            ) : (
              list.rows.map((a) => (
                <ClickableRow key={a.name} href={appointmentHref(a.name)} dimmed={list.loading}>
                  <Td className="whitespace-nowrap">
                    <Link href={appointmentHref(a.name)} className="font-medium text-gray-800 hover:text-primary-600">
                      {formatDate(a.appointment_date)}
                    </Link>
                  </Td>
                  <Td label={t.common.time} className="whitespace-nowrap">{formatTime(a.appointment_time)}</Td>
                  <Td label={t.common.patient}>
                    <PatientLink id={a.patient} name={a.patient_name} />
                  </Td>
                  <Td label={t.common.doctor}>{display(a.doctor_name)}</Td>
                  <Td label={t.appointments.reason} className="max-w-[240px] truncate">{display(a.reason_for_visit)}</Td>
                  <Td label={t.common.status}>
                    <StatusBadge kind="appointment" status={a.status} />
                  </Td>
                </ClickableRow>
              ))
            )}
          </tbody>
        </Table>
        {!list.error && <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />}
      </Card>
    </>
  );
}
