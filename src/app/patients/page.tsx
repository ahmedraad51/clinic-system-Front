"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HeartPulse, MessageCircle, UserPlus, UserSearch } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Alert, Card, ClickableRow, LinkButton, PageContainer, PageHeader, Pagination,
  SearchInput, SelectInput, Table, TableLoading, TableMessage, Td, Th, Toolbar,
} from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { getList, type FilterRow } from "@/lib/frappe";
import { searchFilters, useDebounced, usePagedList } from "@/lib/hooks";
import { cx, display, formatShortDate, formatTime, todayISO } from "@/lib/format";
import { appointmentHref, patientHref } from "@/lib/links";
import { MEDICAL_FIELDS, medicalFlags } from "@/lib/medical";
import { whatsappLink } from "@/lib/whatsapp";
import { GENDERS, type Appointment, type Patient } from "@/lib/types";

export default function PatientsPage() {
  return (
    <RequirePermission permission="view_patients">
      <PatientsList />
    </RequirePermission>
  );
}

function PatientsList() {
  const { can } = useSession();
  const { money, settings, clinicName } = useSettings();
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  // Collections: only patients with money left to pay, biggest balance first.
  const [owing, setOwing] = useState(false);
  const debounced = useDebounced(search);
  const showBalance = can("view_payments");
  const showNext = can("view_appointments");

  const list = usePagedList<Patient>("Patient", {
    fields: ["name", "full_name", "phone_number", "gender", "age", "email", "total_remaining", ...MEDICAL_FIELDS],
    filters:
      gender || owing
        ? [...(gender ? [["gender", "=", gender] as FilterRow] : []), ...(owing ? [["total_remaining", ">", 0] as FilterRow] : [])]
        : undefined,
    orFilters: searchFilters(debounced, ["full_name", "phone_number", "secondary_phone", "name"]),
    orderBy: owing ? "total_remaining desc" : "full_name asc",
  });
  const columns = 2 + (showNext ? 1 : 0) + (showBalance ? 1 : 0);

  // The next booked visit of each patient on this page.
  const pageKey = list.rows.map((p) => p.name).join("|");
  const [next, setNext] = useState<{ key: string; byPatient: Record<string, Appointment> }>({ key: "", byPatient: {} });
  useEffect(() => {
    if (!showNext || !pageKey) return;
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<Appointment>("Appointment", ["name", "patient", "appointment_date", "appointment_time"], {
          filters: [
            ["patient", "in", pageKey.split("|")],
            ["appointment_date", ">=", todayISO()],
            ["status", "in", ["Scheduled", "Confirmed"]],
          ],
          orderBy: "appointment_date asc, appointment_time asc",
          limit: 0,
        });
        const byPatient: Record<string, Appointment> = {};
        rows.forEach((a) => {
          if (!byPatient[a.patient]) byPatient[a.patient] = a;
        });
        if (!cancelled) setNext({ key: pageKey, byPatient });
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [pageKey, showNext]);
  const nextFor = (patient: string) => (next.key === pageKey ? next.byPatient[patient] : undefined);
  const filtered = Boolean(debounced.trim() || gender || owing);
  const reminder = (patient: Patient) =>
    whatsappLink(
      patient.phone_number,
      `Hello ${patient.full_name}, this is a friendly reminder from ${clinicName} that ${money(patient.total_remaining)} is still to be paid for your treatment. You can pay at your next visit or call us to arrange it. Thank you!`,
    );

  return (
    <PageContainer>
      <PageHeader
        title="Patients"
        subtitle="Search by name, phone number or patient ID."
        actions={
          can("add_patients") && (
            <LinkButton href="/patients/new" icon={UserPlus}>
              Add Patient
            </LinkButton>
          )
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search patients..." />
        {showBalance && (
          <SelectInput
            value={owing ? "owing" : ""}
            onChange={(e) => setOwing(e.target.value === "owing")}
            className="sm:w-44"
            aria-label="Balance"
          >
            <option value="">All balances</option>
            <option value="owing">Owes money</option>
          </SelectInput>
        )}
        <SelectInput value={gender} onChange={(e) => setGender(e.target.value)} className="sm:w-44" aria-label="Gender">
          <option value="">All genders</option>
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </SelectInput>
      </Toolbar>

      {list.error && <Alert tone="red">{list.error}</Alert>}

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Phone</Th>
              {showNext && <Th>Next visit</Th>}
              {showBalance && <Th className="text-end">Balance</Th>}
            </tr>
          </thead>
          <tbody>
            {list.initialLoading ? (
              <TableLoading colSpan={columns} />
            ) : list.rows.length === 0 ? (
              <TableMessage icon={UserSearch} colSpan={columns}>
                {filtered ? "No patients match your search." : "No patients yet."}
              </TableMessage>
            ) : (
              list.rows.map((patient) => (
                <ClickableRow key={patient.name} href={patientHref(patient.name)} dimmed={list.loading}>
                  <Td>
                    <Link href={patientHref(patient.name)} className="font-medium text-gray-800 hover:text-primary-600">
                      {patient.full_name}
                    </Link>
                    <span className="block text-xs text-gray-500">
                      {[patient.name, patient.age ? `${patient.age} years` : "", patient.gender].filter(Boolean).join(" · ")}
                    </span>
                    <MedicalChips patient={patient} />
                  </Td>
                  <Td label="Phone" className="whitespace-nowrap">{display(patient.phone_number)}</Td>
                  {showNext && (
                    <Td label="Next visit" className="whitespace-nowrap">
                      {nextFor(patient.name) ? (
                        <Link href={appointmentHref(nextFor(patient.name)!.name)} className="text-gray-700 hover:text-primary-600">
                          {formatShortDate(nextFor(patient.name)!.appointment_date)}, {formatTime(nextFor(patient.name)!.appointment_time)}
                        </Link>
                      ) : (
                        <span className="text-gray-500">Not booked</span>
                      )}
                    </Td>
                  )}
                  {showBalance && (
                    <Td label="Balance" className="text-end whitespace-nowrap">
                      {Number(patient.total_remaining) > 0 ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="font-medium text-red-600">{money(patient.total_remaining)}</span>
                          {owing && settings.enable_whatsapp !== 0 && reminder(patient) && (
                            <a
                              href={reminder(patient)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Send a WhatsApp reminder about the balance"
                              className="inline-flex items-center gap-1 min-h-9 pointer-coarse:min-h-11 px-2.5 rounded-lg bg-green-50 border border-green-200 text-xs font-medium text-green-800 hover:bg-green-100"
                            >
                              <MessageCircle size={13} />
                              Remind
                            </a>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-500">{money(0)}</span>
                      )}
                    </Td>
                  )}
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

/** Small markers under a patient's name for their medical alerts, full text on hover. */
function MedicalChips({ patient }: { patient: Patient }) {
  const flags = medicalFlags(patient);
  if (flags.length === 0) return null;
  const short: Record<string, string> = { heart: "Heart / BP" };
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {flags.map((flag) => (
        <span
          key={flag.kind}
          title={`${flag.label}: ${flag.detail}`}
          className={cx(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
            flag.severity === "high" ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-800",
          )}
        >
          <HeartPulse size={12} />
          {short[flag.kind] ?? flag.label}
        </span>
      ))}
    </span>
  );
}
