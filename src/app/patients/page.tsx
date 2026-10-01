"use client";

import { Suspense, useEffect, useState } from "react";
import { useRecordDialogs } from "@/components/RecordDialogs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Users, HeartPulse, MessageCircle, UserPlus, UserSearch } from "lucide-react";
import Avatar from "@/components/Avatar";
import RequirePermission from "@/components/Guard";
import {
  Button, Card, ClearFiltersButton, ClickableRow, PageContainer, PageHeader, PageLoading, Pagination, SearchInput, SelectInput, Table, TableError, TableLoading, TableMessage, Td, Th, Toolbar,
} from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { joinParts, label } from "@/i18n";
import { getList, type FilterRow } from "@/lib/frappe";
import { searchFilters, useDebounced, useOpenBalances, usePagedList } from "@/lib/hooks";
import { cx, display, formatShortDate, formatTime, todayISO } from "@/lib/format";
import { appointmentHref, patientHref } from "@/lib/links";
import { MEDICAL_FIELDS, medicalFlags } from "@/lib/medical";
import { whatsappLink } from "@/lib/whatsapp";
import { GENDERS, type Appointment, type Patient } from "@/lib/types";

export default function PatientsPage() {
  return (
    <RequirePermission permission="view_patients">
      {/* useSearchParams() needs a Suspense boundary, or the production build fails. */}
      <Suspense fallback={<PageLoading />}>
        <PatientsList />
      </Suspense>
    </RequirePermission>
  );
}

function PatientsList() {
  const { t } = useI18n();
  const p = t.patients;
  const { can } = useSession();
  const { money, settings, clinicName, countryCode, secondCurrency, owedText } = useSettings();
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  // Collections: only patients with money left to pay, biggest balance first.
  // ?balance=owing (from the dashboard) opens on it.
  const searchParams = useSearchParams();
  const [owing, setOwing] = useState(() => searchParams.get("balance") === "owing");
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
  const openDialog = useRecordDialogs();
  const columns = 2 + (showNext ? 1 : 0) + (showBalance ? 1 : 0);
  // With two currencies, what is left on each plan, so a dollar balance shows in dollars.
  const balances = useOpenBalances(
    list.rows.filter((row) => Number(row.total_remaining) > 0).map((row) => row.name),
    showBalance && Boolean(secondCurrency),
  );
  const owed = (patient: Patient) => owedText(patient.total_remaining, balances[patient.name]);

  // The next booked visit of each patient on this page.
  const pageKey = list.rows.map((row) => row.name).join("|");
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
  const clearFilters = () => {
    setSearch("");
    setGender("");
    setOwing(false);
  };
  const reminder = (patient: Patient) =>
    whatsappLink(
      patient.phone_number,
      p.balanceReminder(patient.full_name, clinicName, owed(patient)),
      countryCode,
    );

  return (
    <PageContainer section="patients">
      <PageHeader icon={Users} section="patients"
        title={p.title}
        subtitle={p.subtitle}
        actions={
          can("add_patients") && (
            <Button icon={UserPlus} data-testid="open-new-patient" onClick={() => openDialog({ kind: "newPatient" })}>
              {p.addPatient}
            </Button>
          )
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder={p.searchPlaceholder} />
        {showBalance && (
          <SelectInput
            value={owing ? "owing" : ""}
            onChange={(e) => setOwing(e.target.value === "owing")}
            className="sm:w-44"
            aria-label={p.balanceFilter}
          >
            <option value="">{p.allBalances}</option>
            <option value="owing">{p.owesMoney}</option>
          </SelectInput>
        )}
        <SelectInput value={gender} onChange={(e) => setGender(e.target.value)} className="sm:w-44" aria-label={p.genderFilter}>
          <option value="">{p.allGenders}</option>
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {label(t.enums.gender, g)}
            </option>
          ))}
        </SelectInput>
      </Toolbar>

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>{p.name}</Th>
              <Th>{p.phone}</Th>
              {showNext && <Th>{p.nextVisit}</Th>}
              {showBalance && <Th className="text-end">{p.balance}</Th>}
            </tr>
          </thead>
          <tbody>
            {list.error ? (
              <TableError colSpan={columns} message={list.error} onRetry={list.reload} />
            ) : list.initialLoading ? (
              <TableLoading colSpan={columns} />
            ) : list.rows.length === 0 ? (
              <TableMessage icon={UserSearch} colSpan={columns}>
                {filtered ? (
                  <>
                    {p.noMatch}
                    <ClearFiltersButton onClick={clearFilters} />
                  </>
                ) : (
                  p.noPatients
                )}
              </TableMessage>
            ) : (
              list.rows.map((patient) => (
                <ClickableRow key={patient.name} href={patientHref(patient.name)} dimmed={list.loading}>
                  <Td>
                    <div className="flex items-start gap-3">
                      <Avatar name={patient.full_name} gender={patient.gender} age={patient.age} size={40} />
                      <div className="min-w-0">
                        <Link href={patientHref(patient.name)} className="font-medium text-gray-800 hover:text-primary-600">
                          {patient.full_name}
                        </Link>
                        <span className="block text-xs text-gray-500">
                          {joinParts([
                            patient.name,
                            patient.age ? t.common.years(Number(patient.age)) : "",
                            label(t.enums.gender, patient.gender),
                          ], t.common.dot)}
                        </span>
                        <MedicalChips patient={patient} />
                      </div>
                    </div>
                  </Td>
                  <Td label={p.phone} className="whitespace-nowrap">
                    <span dir="ltr">{display(patient.phone_number)}</span>
                  </Td>
                  {showNext && (
                    <Td label={p.nextVisit} className="whitespace-nowrap">
                      {nextFor(patient.name) ? (
                        <Link href={appointmentHref(nextFor(patient.name)!.name)} className="text-gray-700 hover:text-primary-600">
                          {t.dates.dateTime(
                            formatShortDate(nextFor(patient.name)!.appointment_date),
                            formatTime(nextFor(patient.name)!.appointment_time),
                          )}
                        </Link>
                      ) : (
                        <span className="text-gray-500">{p.notBooked}</span>
                      )}
                    </Td>
                  )}
                  {showBalance && (
                    <Td label={p.balance} className="text-end whitespace-nowrap">
                      {Number(patient.total_remaining) > 0 ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="font-medium text-red-600">{owed(patient)}</span>
                          {owing && settings.enable_whatsapp !== 0 && reminder(patient) && (
                            <a
                              href={reminder(patient)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={p.remindTitle}
                              className="inline-flex items-center gap-1 min-h-9 pointer-coarse:min-h-11 px-2.5 rounded-lg bg-green-50 border border-green-200 text-xs font-medium text-green-800 hover:bg-green-100"
                            >
                              <MessageCircle size={13} />
                              {p.remind}
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
        {!list.error && <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />}
      </Card>
    </PageContainer>
  );
}

/** Small markers under a patient's name for their medical alerts, full text on hover. */
function MedicalChips({ patient }: { patient: Patient }) {
  const { t } = useI18n();
  const flags = medicalFlags(patient);
  if (flags.length === 0) return null;
  const short: Record<string, string> = { heart: t.medical.heartShort };
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {flags.map((flag) => (
        <span
          key={flag.kind}
          title={`${flag.label}${t.medical.detailSeparator}${flag.detail}`}
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
