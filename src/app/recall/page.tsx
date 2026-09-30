"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, CalendarPlus, MessageCircle, Phone } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Card, LinkButton, PageContainer, PageHeader, SelectInput, Table, TableError, TableLoading, TableMessage, Td, Th,
} from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { messages } from "@/i18n";
import { errorMessage, getList } from "@/lib/frappe";
import { formatDate, todayISO } from "@/lib/format";
import { patientHref } from "@/lib/links";
import {
  DEFAULT_RECALL_MONTHS, RECALL_APPOINTMENT_FIELDS, RECALL_PATIENT_FIELDS, RECALL_PERIODS, dueForRecall,
} from "@/lib/recall";
import { whatsappLink } from "@/lib/whatsapp";
import type { Appointment, Patient } from "@/lib/types";

export default function RecallPage() {
  return (
    <RequirePermission permission={["view_patients", "view_appointments"]}>
      <Recall />
    </RequirePermission>
  );
}

/**
 * Patients due for a check-up: the date the dentist chose has come, or (without one) their last kept visit is
 * older than the chosen period; and nothing is booked.
 * One tap to call, send a WhatsApp reminder, or book. Worked out in the browser from all appointments;
 * see docs/backend-todo.md for a faster server version later.
 */
function Recall() {
  const { t } = useI18n();
  const { can } = useSession();
  const { clinicName, countryCode } = useSettings();
  const [months, setMonths] = useState<number>(DEFAULT_RECALL_MONTHS);
  const [data, setData] = useState<{ patients: Patient[]; appointments: Appointment[] } | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [patients, appointments] = await Promise.all([
          getList<Patient>("Patient", [...RECALL_PATIENT_FIELDS, "full_name", "phone_number", "age"], {
            orderBy: "full_name asc",
            limit: 0,
          }),
          getList<Appointment>("Appointment", RECALL_APPOINTMENT_FIELDS, { limit: 0 }),
        ]);
        if (!cancelled) {
          setData({ patients, appointments });
          setError("");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(errorMessage(err, messages().recall.loadFailed));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [version]);

  const today = todayISO();
  const due = data ? dueForRecall(data.patients, data.appointments, today, months) : [];

  const whatsapp = (p: Patient) =>
    whatsappLink(p.phone_number, t.recall.whatsappText(p.full_name, clinicName), countryCode);

  return (
    <PageContainer section="patients">
      <PageHeader icon={BellRing} section="patients"
        title={t.recall.title}
        subtitle={t.recall.subtitle}
        actions={
          <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
            {t.recall.notSeenFor}
            <SelectInput value={String(months)} onChange={(e) => setMonths(Number(e.target.value))} className="w-auto">
              {RECALL_PERIODS.map((m) => (
                <option key={m} value={m}>
                  {t.common.months(m)}
                </option>
              ))}
            </SelectInput>
          </label>
        }
      />

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>{t.common.patient}</Th>
              <Th>{t.recall.checkUpDue}</Th>
              <Th>{t.recall.lastVisit}</Th>
              <Th>{t.common.phone}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {error ? (
              // Never "Nobody is due" when the list could not load.
              <TableError
                colSpan={5}
                message={error}
                onRetry={() => {
                  setError("");
                  setVersion((v) => v + 1);
                }}
              />
            ) : !data ? (
              <TableLoading colSpan={5} />
            ) : due.length === 0 ? (
              <TableMessage icon={BellRing} colSpan={5}>
                {t.recall.nobodyDue(months)}
              </TableMessage>
            ) : (
              due.map(({ patient, lastVisit, dueDate, byDentist }) => {
                const wa = whatsapp(patient);
                return (
                  <tr key={patient.name}>
                    <Td>
                      <Link href={patientHref(patient.name)} className="font-medium text-gray-800 hover:text-primary-600">
                        {patient.full_name}
                      </Link>
                      {patient.age ? <span className="block text-xs text-gray-500">{t.common.years(Number(patient.age))}</span> : null}
                    </Td>
                    <Td label={t.recall.checkUpDue} className="whitespace-nowrap">
                      {dueDate ? formatDate(dueDate) : <span className="text-gray-500">{t.recall.now}</span>}
                      <span className="block text-xs text-gray-500">
                        {byDentist
                          ? Number(patient.recall_interval_months) > 0
                            ? t.recall.dentistEvery(Number(patient.recall_interval_months))
                            : t.recall.dentist
                          : lastVisit
                            ? t.recall.afterLastVisit(months)
                            : t.recall.neverSeen}
                      </span>
                    </Td>
                    <Td label={t.recall.lastVisit} className="whitespace-nowrap">
                      {lastVisit ? formatDate(lastVisit) : <span className="text-gray-500">{t.recall.noVisitYet}</span>}
                    </Td>
                    <Td label={t.common.phone} className="whitespace-nowrap">
                      {patient.phone_number ? (
                        <a href={`tel:${patient.phone_number.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 pointer-coarse:min-h-11 text-gray-700 hover:text-primary-600">
                          <Phone size={14} />
                          <span dir="ltr">{patient.phone_number}</span>
                        </a>
                      ) : (
                        t.common.dash
                      )}
                    </Td>
                    <Td className="text-end">
                      <div className="flex flex-wrap justify-end gap-2">
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 min-h-9 pointer-coarse:min-h-11 px-3 rounded-xl bg-green-50 border border-green-200 text-xs font-medium text-green-800 hover:bg-green-100"
                          >
                            <MessageCircle size={14} />
                            {t.recall.whatsapp}
                          </a>
                        )}
                        {can("add_appointments") && (
                          <LinkButton
                            href={`/appointments/new?patient=${encodeURIComponent(patient.name)}`}
                            size="sm"
                            variant="secondary"
                            icon={CalendarPlus}
                          >
                            {t.recall.book}
                          </LinkButton>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
        {data && due.length > 0 && (
          <p className="px-5 py-3 text-xs text-gray-500">{t.recall.countDue(due.length)}</p>
        )}
      </Card>
    </PageContainer>
  );
}
