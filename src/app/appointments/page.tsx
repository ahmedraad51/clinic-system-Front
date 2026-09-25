"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarX, Plus } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Alert, Card, ClickableRow, LinkButton, PageContainer, PageHeader, PageLoading, Pagination,
  SearchInput, SelectInput, StatusBadge, Table, TableMessage, Td, Th, Toolbar,
} from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import type { FilterRow } from "@/lib/frappe";
import { addDays, display, formatDate, formatTime, todayISO } from "@/lib/format";
import { searchFilters, useDebounced, usePagedList } from "@/lib/hooks";
import { appointmentHref, patientHref } from "@/lib/links";
import { APPOINTMENT_STATUSES, type Appointment } from "@/lib/types";

const WHEN_OPTIONS = [
  { value: "all", label: "All dates" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
] as const;
type When = (typeof WHEN_OPTIONS)[number]["value"];

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
        <AppointmentsList />
      </Suspense>
    </RequirePermission>
  );
}

function AppointmentsList() {
  const searchParams = useSearchParams();
  const { can } = useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [when, setWhen] = useState<When>(() => {
    const fromUrl = searchParams.get("date");
    return WHEN_OPTIONS.some((option) => option.value === fromUrl) ? (fromUrl as When) : "all";
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

  return (
    <PageContainer>
      <PageHeader
        title="Appointments"
        subtitle="The appointment book. Click a row to see or change an appointment."
        actions={
          can("add_appointments") && (
            <LinkButton href="/appointments/new" icon={Plus}>
              New Appointment
            </LinkButton>
          )
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by patient, doctor or reason..." />
        <SelectInput value={when} onChange={(e) => setWhen(e.target.value as When)} className="sm:w-40" aria-label="Date">
          {WHEN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectInput>
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40" aria-label="Status">
          <option value="">All statuses</option>
          {APPOINTMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectInput>
      </Toolbar>

      {list.error && <Alert tone="red">{list.error}</Alert>}

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Time</Th>
              <Th>Patient</Th>
              <Th>Doctor</Th>
              <Th>Reason</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {list.initialLoading ? (
              <TableMessage colSpan={6}>Loading...</TableMessage>
            ) : list.rows.length === 0 ? (
              <TableMessage icon={CalendarX} colSpan={6}>
                {filtered ? "No appointments match these filters." : "No appointments yet."}
              </TableMessage>
            ) : (
              list.rows.map((a) => (
                <ClickableRow key={a.name} href={appointmentHref(a.name)} dimmed={list.loading}>
                  <Td className="whitespace-nowrap">
                    <Link href={appointmentHref(a.name)} className="font-medium text-gray-800 hover:text-primary-600">
                      {formatDate(a.appointment_date)}
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap">{formatTime(a.appointment_time)}</Td>
                  <Td>
                    <Link href={patientHref(a.patient)} className="text-gray-700 hover:text-primary-600">
                      {a.patient_name || a.patient}
                    </Link>
                  </Td>
                  <Td>{display(a.doctor_name)}</Td>
                  <Td className="max-w-[240px] truncate">{display(a.reason_for_visit)}</Td>
                  <Td>
                    <StatusBadge kind="appointment" status={a.status} />
                  </Td>
                </ClickableRow>
              ))
            )}
          </tbody>
        </Table>
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />
      </Card>
    </PageContainer>
  );
}
