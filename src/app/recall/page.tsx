"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, CalendarPlus, MessageCircle, Phone } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Alert, Card, LinkButton, PageContainer, PageHeader, SelectInput, Table, TableLoading, TableMessage, Td, Th,
} from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { errorMessage, getList } from "@/lib/frappe";
import { formatDate, todayISO } from "@/lib/format";
import { patientHref } from "@/lib/links";
import { whatsappLink } from "@/lib/whatsapp";
import type { Appointment, Patient } from "@/lib/types";

/** How long since the last visit before a patient is due, in months. */
const PERIODS = [3, 6, 9, 12] as const;

export default function RecallPage() {
  return (
    <RequirePermission permission={["view_patients", "view_appointments"]}>
      <Recall />
    </RequirePermission>
  );
}

interface Due {
  patient: Patient;
  /** The last kept visit, or "" when the patient has never been seen. */
  lastVisit: string;
}

/** The date that is `months` months before `iso`. */
function monthsBefore(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1 - months, d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Patients due for a check-up: their last kept visit is older than the chosen period and nothing is booked.
 * One tap to call, send a WhatsApp reminder, or book. Worked out in the browser from all appointments;
 * see docs/backend-todo.md for a faster server version later.
 */
function Recall() {
  const { can } = useSession();
  const { clinicName } = useSettings();
  const [months, setMonths] = useState<number>(6);
  const [data, setData] = useState<{ patients: Patient[]; appointments: Appointment[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [patients, appointments] = await Promise.all([
          getList<Patient>("Patient", ["name", "full_name", "phone_number", "age"], { orderBy: "full_name asc", limit: 0 }),
          getList<Appointment>("Appointment", ["patient", "appointment_date", "status"], { limit: 0 }),
        ]);
        if (!cancelled) setData({ patients, appointments });
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(errorMessage(err, "Could not load the recall list."));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const today = todayISO();
  const cutoff = monthsBefore(today, months);
  let due: Due[] = [];
  if (data) {
    const last = new Map<string, string>();
    const booked = new Set<string>();
    data.appointments.forEach((a) => {
      if (a.appointment_date >= today && (a.status === "Scheduled" || a.status === "Confirmed")) booked.add(a.patient);
      if (a.appointment_date <= today && a.status === "Completed" && a.appointment_date > (last.get(a.patient) ?? "")) {
        last.set(a.patient, a.appointment_date);
      }
    });
    due = data.patients
      .filter((p) => !booked.has(p.name) && (last.get(p.name) ?? "") < cutoff)
      .map((patient) => ({ patient, lastVisit: last.get(patient.name) ?? "" }))
      // Longest wait first; patients never seen at the end.
      .sort((x, y) => (x.lastVisit || "9999").localeCompare(y.lastVisit || "9999"));
  }

  const whatsapp = (p: Patient) =>
    whatsappLink(
      p.phone_number,
      `Hello ${p.full_name}, it is time for your dental check-up at ${clinicName}. Reply to this message and we will find a time that suits you.`,
    );

  return (
    <PageContainer>
      <PageHeader
        title="Recall"
        subtitle="Patients due for a check-up: no visit for a while and nothing booked."
        actions={
          <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
            Not seen for
            <SelectInput value={String(months)} onChange={(e) => setMonths(Number(e.target.value))} className="w-auto">
              {PERIODS.map((m) => (
                <option key={m} value={m}>
                  {m} months
                </option>
              ))}
            </SelectInput>
          </label>
        }
      />

      {error && <Alert tone="red">{error}</Alert>}

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>Patient</Th>
              <Th>Last visit</Th>
              <Th>Phone</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {!data && !error ? (
              <TableLoading colSpan={4} />
            ) : due.length === 0 ? (
              <TableMessage icon={BellRing} colSpan={4}>
                Nobody is due. Every patient was seen in the last {months} months or has a visit booked.
              </TableMessage>
            ) : (
              due.map(({ patient, lastVisit }) => {
                const wa = whatsapp(patient);
                return (
                  <tr key={patient.name}>
                    <Td>
                      <Link href={patientHref(patient.name)} className="font-medium text-gray-800 hover:text-primary-600">
                        {patient.full_name}
                      </Link>
                      {patient.age ? <span className="block text-xs text-gray-500">{patient.age} years</span> : null}
                    </Td>
                    <Td label="Last visit" className="whitespace-nowrap">
                      {lastVisit ? formatDate(lastVisit) : <span className="text-gray-500">No visit yet</span>}
                    </Td>
                    <Td label="Phone" className="whitespace-nowrap">
                      {patient.phone_number ? (
                        <a href={`tel:${patient.phone_number.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 text-gray-700 hover:text-primary-600">
                          <Phone size={14} />
                          {patient.phone_number}
                        </a>
                      ) : (
                        "—"
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
                            WhatsApp
                          </a>
                        )}
                        {can("add_appointments") && (
                          <LinkButton
                            href={`/appointments/new?patient=${encodeURIComponent(patient.name)}`}
                            size="sm"
                            variant="secondary"
                            icon={CalendarPlus}
                          >
                            Book
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
          <p className="px-5 py-3 text-xs text-gray-500">{due.length === 1 ? "1 patient due" : `${due.length} patients due`}</p>
        )}
      </Card>
    </PageContainer>
  );
}
