"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  BellRing, Calendar, CalendarCheck, CalendarClock, CalendarDays, ClipboardList, CreditCard, HeartPulse, History, IdCard,
  MessageCircle, Pencil, Phone, Pill, Plus, Printer, Stethoscope, Trash2, Wallet, type LucideIcon,
} from "lucide-react";
import RequirePermission from "@/components/Guard";
import DentalChart from "@/components/DentalChart";
import MedicalAlerts from "@/components/MedicalAlerts";
import PatientFiles from "@/components/PatientFiles";
import RecallDialog from "@/components/RecallDialog";
import RecordHistory from "@/components/RecordHistory";
import {
  Button, Card, ClickableRow, DetailList, DetailRow, EmptyState, LinkButton, LoadError, NotFoundCard,
  PageContainer, PageHeader, PageLoading, RecordLoading, StatusBadge, Table, Tabs, Td, Th,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { deleteDoc, errorMessage, getList, updateDoc, type FilterRow } from "@/lib/frappe";
import { addMonths, cx, display, formatDate, formatMonth, formatTime, todayISO } from "@/lib/format";
import { useDocument } from "@/lib/hooks";
import { DEFAULT_RECALL_MONTHS } from "@/lib/recall";
import { whatsappNumber } from "@/lib/whatsapp";
import { appointmentHref, patientHref, paymentHref, prescriptionHref, routeId, treatmentHref } from "@/lib/links";
import type { Appointment, DentalChartData, Patient, Payment, Prescription, TreatmentPlan, TreatmentSession } from "@/lib/types";

type TabKey = "overview" | "appointments" | "treatments" | "prescriptions" | "payments" | "chart" | "files" | "history";

interface Related {
  id: string;
  appointments: Appointment[];
  plans: TreatmentPlan[];
  sessions: TreatmentSession[];
  prescriptions: Prescription[];
  payments: Payment[];
}

export default function PatientDetailPage() {
  return (
    <RequirePermission permission="view_patients">
      <PatientDetail />
    </RequirePermission>
  );
}

const isBooked = (a: Appointment) => a.status === "Scheduled" || a.status === "Confirmed";

function PatientDetail() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { can } = useSession();
  const { money, countryCode } = useSettings();
  const id = routeId(params.id);
  const { doc: patient, loading, notFound, error, reload } = useDocument<Patient>("Patient", id);
  const [tab, setTab] = useState<TabKey>("overview");
  const [related, setRelated] = useState<Related | null>(null);
  // The appointments, plans, sessions and payments could not load: say so in each tab, with Try Again.
  const [relatedError, setRelatedError] = useState("");
  const [relatedVersion, setRelatedVersion] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingRecall, setEditingRecall] = useState(false);

  const showAppointments = can("view_appointments");
  const showTreatments = can("view_treatments");
  const showPayments = can("view_payments");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const byPatient: FilterRow[] = [["patient", "=", id]];
      try {
        const [appointments, plans, sessions, prescriptions, payments] = await Promise.all([
          showAppointments
            ? getList<Appointment>(
                "Appointment",
                ["name", "doctor_name", "appointment_date", "appointment_time", "status", "reason_for_visit"],
                { filters: byPatient, orderBy: "appointment_date desc, appointment_time desc", limit: 200 },
              )
            : Promise.resolve([]),
          showTreatments
            ? getList<TreatmentPlan>(
                "Treatment Plan",
                ["name", "treatment_type", "tooth_number", "doctor_name", "status", "total_cost", "remaining_amount"],
                { filters: byPatient, orderBy: "name desc", limit: 200 },
              )
            : Promise.resolve([]),
          showTreatments
            ? getList<TreatmentSession>(
                "Treatment Session",
                ["name", "treatment_plan", "doctor_name", "session_date", "session_time", "status", "notes"],
                { filters: byPatient, orderBy: "session_date desc", limit: 200 },
              )
            : Promise.resolve([]),
          showTreatments
            ? getList<Prescription>("Prescription", ["name", "prescription_date", "doctor_name", "summary"], {
                filters: byPatient,
                orderBy: "prescription_date desc, name desc",
                limit: 200,
              })
            : Promise.resolve([]),
          showPayments
            ? getList<Payment>(
                "Payment",
                ["name", "payment_date", "amount", "payment_method", "treatment_type"],
                { filters: byPatient, orderBy: "payment_date desc", limit: 200 },
              )
            : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setRelated({ id, appointments, plans, sessions, prescriptions, payments });
          setRelatedError("");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setRelatedError(errorMessage(err, "Could not load this patient's visits and payments."));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, showAppointments, showTreatments, showPayments, relatedVersion]);

  if (loading) return <RecordLoading />;
  if (notFound || !patient) return <NotFoundCard error={error} what="Patient" backHref="/patients" backLabel="Back to Patients" />;

  const data = related && related.id === id ? related : null;
  const relatedWaiting = relatedError ? (
    <div className="p-5">
      <LoadError
        message={relatedError}
        onRetry={() => {
          setRelatedError("");
          setRelatedVersion((v) => v + 1);
        }}
      />
    </div>
  ) : (
    <PageLoading />
  );
  const today = todayISO();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDoc("Patient", id);
      toast.success(`${patient.full_name} was deleted.`);
      router.push("/patients");
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete the patient."));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const saveChart = async (chart: DentalChartData) => {
    try {
      await updateDoc("Patient", id, { dental_chart: JSON.stringify(chart) });
      toast.success("Dental chart saved.");
      reload();
    } catch (err) {
      toast.error(errorMessage(err, "Could not save the dental chart."));
      throw err;
    }
  };

  // Last visit: the latest completed appointment (or, failing that, the latest past one that was kept).
  const past = (data?.appointments ?? []).filter((a) => a.appointment_date <= today);
  const lastVisit =
    past.find((a) => a.status === "Completed") ?? past.find((a) => a.appointment_date < today && a.status !== "Cancelled" && a.status !== "No Show");
  // Next appointment: the soonest booked one from today on. The list is newest first.
  const nextVisit = [...(data?.appointments ?? [])].reverse().find((a) => a.appointment_date >= today && isBooked(a));

  const tabs: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: "overview", label: "Overview" },
    ...(showAppointments ? [{ key: "appointments" as const, label: "Appointments", count: data?.appointments.length }] : []),
    ...(showTreatments ? [{ key: "treatments" as const, label: "Treatment Plans", count: data?.plans.length }] : []),
    ...(showTreatments ? [{ key: "prescriptions" as const, label: "Prescriptions", count: data?.prescriptions.length }] : []),
    ...(showPayments ? [{ key: "payments" as const, label: "Payments", count: data?.payments.length }] : []),
    { key: "chart", label: "Dental Chart" },
    { key: "files", label: "X-rays & Photos" },
    { key: "history", label: "History" },
  ];

  const subtitle = [patient.age ? `${patient.age} years` : "", patient.gender, patient.name].filter(Boolean).join(" · ");
  const whatsapp = whatsappNumber(patient.phone_number, countryCode);
  const remaining = Number(patient.total_remaining) || 0;

  return (
    <PageContainer>
      <PageHeader
        title={patient.full_name}
        subtitle={subtitle}
        back={{ href: "/patients", label: "Patients" }}
        actions={
          <>
            {can("add_appointments") && (
              <LinkButton href={`/appointments/new?patient=${encodeURIComponent(id)}`} icon={CalendarDays}>
                New Appointment
              </LinkButton>
            )}
            {can("add_treatments") && (
              <LinkButton href={`/treatments/new?patient=${encodeURIComponent(id)}`} variant="secondary" icon={Plus}>
                New Treatment
              </LinkButton>
            )}
            {can("edit_patients") && (
              <LinkButton href={`${patientHref(id)}/edit`} variant="secondary" icon={Pencil}>
                Edit
              </LinkButton>
            )}
            {can("delete_patients") && (
              <Button
                variant="ghost"
                icon={Trash2}
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete patient"
                title="Delete patient"
                className="text-red-600 hover:bg-red-50 px-3"
              />
            )}
          </>
        }
      />

      <MedicalAlerts patient={patient} />

      {/* Contact and the facts a dentist wants before the patient sits down. */}
      <Card>
        <div className="flex flex-wrap gap-2">
          {patient.phone_number && (
            <a
              href={`tel:${patient.phone_number.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-100"
            >
              <Phone size={16} className="text-primary-600" />
              {patient.phone_number}
            </a>
          )}
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-green-50 border border-green-200 text-sm font-medium text-green-800 hover:bg-green-100"
            >
              <MessageCircle size={16} />
              WhatsApp
            </a>
          )}
          {patient.secondary_phone && (
            <a
              href={`tel:${patient.secondary_phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Phone size={16} className="text-gray-500" />
              {patient.secondary_phone}
            </a>
          )}
        </div>

        <dl className="grid grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-4 mt-5 pt-5 border-t border-gray-100">
          {showAppointments && (
            <Fact icon={History} label="Last visit">
              {lastVisit ? (
                <Link href={appointmentHref(lastVisit.name)} className="hover:text-primary-600">
                  {formatDate(lastVisit.appointment_date)}
                  <span className="block text-xs font-normal text-gray-500">{lastVisit.reason_for_visit || lastVisit.doctor_name}</span>
                </Link>
              ) : data ? (
                <span className="text-gray-500">None yet</span>
              ) : (
                "…"
              )}
            </Fact>
          )}
          {showAppointments && (
            <Fact icon={CalendarClock} label="Next appointment">
              {nextVisit ? (
                <Link href={appointmentHref(nextVisit.name)} className="hover:text-primary-600">
                  {nextVisit.appointment_date === today ? "Today" : formatDate(nextVisit.appointment_date)},{" "}
                  {formatTime(nextVisit.appointment_time)}
                  <span className="block text-xs font-normal text-gray-500">{nextVisit.doctor_name}</span>
                </Link>
              ) : data ? (
                <span className="text-gray-500">Not booked</span>
              ) : (
                "…"
              )}
            </Fact>
          )}
          <Fact icon={BellRing} label="Next check-up">
            {Number(patient.no_recall) === 1 ? (
              <span className="text-gray-500">No recall</span>
            ) : patient.next_recall_date ? (
              <>
                <span className={patient.next_recall_date <= today ? "text-red-600" : undefined}>
                  {formatDate(patient.next_recall_date)}
                  {patient.next_recall_date <= today && " (due)"}
                </span>
                {Number(patient.recall_interval_months) > 0 && (
                  <span className="block text-xs font-normal text-gray-500">Every {patient.recall_interval_months} months</span>
                )}
              </>
            ) : (
              <>
                <span className="text-gray-500">Usual rule</span>
                {lastVisit && (
                  <span className="block text-xs font-normal text-gray-500">
                    About {formatDate(addMonths(lastVisit.appointment_date, DEFAULT_RECALL_MONTHS))}
                  </span>
                )}
              </>
            )}
            {can("edit_patients") && (
              <button
                type="button"
                onClick={() => setEditingRecall(true)}
                className="block text-xs font-medium text-primary-700 hover:underline pointer-coarse:min-h-11"
              >
                Change
                <span className="sr-only"> the next check-up</span>
              </button>
            )}
          </Fact>
          {showPayments && (
            <Fact icon={Wallet} label="Balance to pay">
              <span className={remaining > 0 ? "text-red-600" : "text-gray-500"}>{money(remaining)}</span>
              {remaining > 0 && can("add_payments") && (
                <Link
                  href={`/payments/new?patient=${encodeURIComponent(id)}`}
                  className="block text-xs font-medium text-primary-700 hover:underline"
                >
                  Add payment
                </Link>
              )}
            </Fact>
          )}
          {showPayments && (
            <Fact icon={CreditCard} label="Paid so far">
              {money(patient.total_paid)}
            </Fact>
          )}
        </dl>
      </Card>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <Card title="Timeline" icon={History} className="lg:col-span-2">
            {!data ? relatedWaiting : <Timeline data={data} today={today} money={money} />}
          </Card>
          <div className="space-y-6">
            <Card title="Contact and Basic Information" icon={IdCard}>
              <DetailList>
                <DetailRow label="Patient ID">{patient.name}</DetailRow>
                <DetailRow label="Gender">{patient.gender}</DetailRow>
                <DetailRow label="Date of Birth">{patient.date_of_birth ? formatDate(patient.date_of_birth) : ""}</DetailRow>
                <DetailRow label="Age">{patient.age ? `${patient.age} years` : ""}</DetailRow>
                <DetailRow label="Phone">{patient.phone_number}</DetailRow>
                <DetailRow label="Secondary Phone">{patient.secondary_phone}</DetailRow>
                <DetailRow label="Email">{patient.email}</DetailRow>
                <DetailRow label="Address">{patient.address}</DetailRow>
              </DetailList>
            </Card>
            <Card title="Medical Information" icon={HeartPulse}>
              <DetailList>
                <DetailRow label="Allergies">{patient.allergies}</DetailRow>
                <DetailRow label="Current Medications">{patient.current_medications}</DetailRow>
                <DetailRow label="Chronic Diseases">{patient.chronic_diseases}</DetailRow>
                <DetailRow label="Medical History">{patient.medical_history}</DetailRow>
                <DetailRow label="Notes">{patient.notes}</DetailRow>
              </DetailList>
            </Card>
          </div>
        </div>
      )}

      {tab === "appointments" && (
        <Card flush>
          {!data ? (
            relatedWaiting
          ) : data.appointments.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No appointments yet"
              action={
                can("add_appointments") && (
                  <LinkButton href={`/appointments/new?patient=${encodeURIComponent(id)}`} icon={Plus}>
                    New Appointment
                  </LinkButton>
                )
              }
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Time</Th>
                  <Th>Doctor</Th>
                  <Th>Reason</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {data.appointments.map((a) => (
                  <ClickableRow key={a.name} href={appointmentHref(a.name)}>
                    <Td className="whitespace-nowrap">
                      <Link href={appointmentHref(a.name)} className="font-medium text-gray-800 hover:text-primary-600">
                        {formatDate(a.appointment_date)}
                      </Link>
                    </Td>
                    <Td label="Time" className="whitespace-nowrap">{formatTime(a.appointment_time)}</Td>
                    <Td label="Doctor">{display(a.doctor_name)}</Td>
                    <Td label="Reason">{display(a.reason_for_visit)}</Td>
                    <Td label="Status">
                      <StatusBadge kind="appointment" status={a.status} />
                    </Td>
                  </ClickableRow>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {tab === "treatments" && data?.plans.some((plan) => plan.status === "Planned" || plan.status === "In Progress") && (
        <div className="flex justify-end -mt-2">
          <LinkButton href={`${patientHref(id)}/estimate`} variant="secondary" size="sm" icon={Printer}>
            Print estimate
          </LinkButton>
        </div>
      )}

      {tab === "treatments" && (
        <Card flush>
          {!data ? (
            relatedWaiting
          ) : data.plans.length === 0 ? (
            <EmptyState
              icon={Stethoscope}
              title="No treatment plans yet"
              action={
                can("add_treatments") && (
                  <LinkButton href={`/treatments/new?patient=${encodeURIComponent(id)}`} icon={Plus}>
                    New Treatment
                  </LinkButton>
                )
              }
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Treatment</Th>
                  <Th>Tooth</Th>
                  <Th>Doctor</Th>
                  <Th>Status</Th>
                  <Th className="text-end">Cost</Th>
                  <Th className="text-end">Remaining</Th>
                </tr>
              </thead>
              <tbody>
                {data.plans.map((plan) => (
                  <ClickableRow key={plan.name} href={treatmentHref(plan.name)}>
                    <Td>
                      <Link href={treatmentHref(plan.name)} className="font-medium text-gray-800 hover:text-primary-600">
                        {plan.treatment_type}
                      </Link>
                    </Td>
                    <Td label="Tooth">{display(plan.tooth_number)}</Td>
                    <Td label="Doctor">{display(plan.doctor_name)}</Td>
                    <Td label="Status">
                      <StatusBadge kind="treatment" status={plan.status} />
                    </Td>
                    <Td label="Cost" className="text-end whitespace-nowrap">{money(plan.total_cost)}</Td>
                    <Td label="Remaining" className="text-end whitespace-nowrap">
                      <span className={Number(plan.remaining_amount) > 0 ? "font-medium text-red-600" : "text-gray-500"}>
                        {money(plan.remaining_amount)}
                      </span>
                    </Td>
                  </ClickableRow>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {tab === "prescriptions" && can("add_treatments") && (
        <div className="flex justify-end -mt-2">
          <LinkButton href={`/prescriptions/new?patient=${encodeURIComponent(id)}`} variant="secondary" size="sm" icon={Plus}>
            New Prescription
          </LinkButton>
        </div>
      )}

      {tab === "prescriptions" && (
        <Card flush>
          {!data ? (
            relatedWaiting
          ) : data.prescriptions.length === 0 ? (
            <EmptyState
              icon={Pill}
              title="No prescriptions yet"
              text="Write one from a visit, or here."
              action={
                can("add_treatments") && (
                  <LinkButton href={`/prescriptions/new?patient=${encodeURIComponent(id)}`} icon={Plus}>
                    New Prescription
                  </LinkButton>
                )
              }
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Medicines</Th>
                  <Th>Doctor</Th>
                </tr>
              </thead>
              <tbody>
                {data.prescriptions.map((rx) => (
                  <ClickableRow key={rx.name} href={prescriptionHref(rx.name)}>
                    <Td className="whitespace-nowrap">
                      <Link href={prescriptionHref(rx.name)} className="font-medium text-gray-800 hover:text-primary-600">
                        {formatDate(rx.prescription_date)}
                      </Link>
                    </Td>
                    <Td label="Medicines">{display(rx.summary)}</Td>
                    <Td label="Doctor">{display(rx.doctor_name)}</Td>
                  </ClickableRow>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {tab === "payments" && (
        <div className="flex justify-end -mt-2">
          <LinkButton href={`${patientHref(id)}/statement`} variant="secondary" size="sm" icon={Printer}>
            Print statement
          </LinkButton>
        </div>
      )}

      {tab === "payments" && (
        <Card flush>
          {!data ? (
            relatedWaiting
          ) : data.payments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No payments yet"
              action={
                can("add_payments") && (
                  <LinkButton href={`/payments/new?patient=${encodeURIComponent(id)}`} icon={Plus}>
                    Add Payment
                  </LinkButton>
                )
              }
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Treatment</Th>
                  <Th>Method</Th>
                  <Th className="text-end">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((pay) => (
                  <ClickableRow key={pay.name} href={paymentHref(pay.name)}>
                    <Td className="whitespace-nowrap">
                      <Link href={paymentHref(pay.name)} className="font-medium text-gray-800 hover:text-primary-600">
                        {formatDate(pay.payment_date)}
                      </Link>
                    </Td>
                    <Td label="Treatment">{display(pay.treatment_type)}</Td>
                    <Td label="Method">
                      <StatusBadge kind="method" status={pay.payment_method} />
                    </Td>
                    <Td label="Amount" className="text-end font-medium text-green-600 whitespace-nowrap">{money(pay.amount)}</Td>
                  </ClickableRow>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {tab === "chart" && (
        <DentalChart
          key={patient.name}
          initialChart={patient.dental_chart}
          onSave={saveChart}
          canEdit={can("edit_patients")}
          patientAge={patient.age}
          plans={data?.plans}
          printHref={`${patientHref(id)}/chart`}
          newTreatmentHref={
            can("add_treatments")
              ? (tooth) => `/treatments/new?patient=${encodeURIComponent(id)}&tooth=${tooth}`
              : undefined
          }
        />
      )}

      {tab === "files" && <PatientFiles patient={patient.name} canEdit={can("edit_patients")} />}

      {tab === "history" && <RecordHistory doctype="Patient" name={patient.name} changedAt={patient.modified} startOpen />}

      {editingRecall && (
        <RecallDialog
          patient={patient}
          from={lastVisit?.appointment_date ?? today}
          onClose={() => setEditingRecall(false)}
          onSaved={reload}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this patient?"
        message={
          <p>
            <strong>{patient.full_name}</strong> will be removed for good. A patient who already has appointments,
            treatment plans or payments cannot be deleted.
          </p>
        }
        confirmLabel="Delete Patient"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </PageContainer>
  );
}

function Fact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <span className="w-9 h-9 shrink-0 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-gray-500">{label}</dt>
        <dd className="text-sm font-semibold text-gray-800 mt-0.5">{children}</dd>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- timeline -- */

interface TimelineItem {
  key: string;
  date: string;
  time?: string;
  icon: LucideIcon;
  tone: string;
  title: string;
  detail?: string;
  href: string;
  badge?: ReactNode;
}

/** Visits, treatment sessions and payments in one list, newest first, with upcoming ones on top. */
function Timeline({ data, today, money }: { data: Related; today: string; money: (amount: number) => string }) {
  const plans = new Map(data.plans.map((plan) => [plan.name, plan]));
  const items: TimelineItem[] = [
    ...data.appointments.map((a): TimelineItem => ({
      key: a.name,
      date: a.appointment_date,
      time: a.appointment_time,
      icon: a.status === "Completed" ? CalendarCheck : Calendar,
      tone: "bg-blue-50 text-blue-600",
      title: a.reason_for_visit || "Appointment",
      detail: [formatTime(a.appointment_time), a.doctor_name].filter(Boolean).join(" · "),
      href: appointmentHref(a.name),
      badge: <StatusBadge kind="appointment" status={a.status} />,
    })),
    ...data.sessions.map((s): TimelineItem => {
      const plan = plans.get(s.treatment_plan);
      const what = plan ? `${plan.treatment_type}${plan.tooth_number ? ` · tooth ${plan.tooth_number}` : ""}` : "Treatment";
      return {
        key: s.name,
        date: s.session_date,
        time: s.session_time,
        icon: ClipboardList,
        tone: "bg-primary-50 text-primary-600",
        title: `${what} session`,
        detail: [s.notes, s.doctor_name].filter(Boolean).join(" · "),
        href: treatmentHref(s.treatment_plan),
        badge: <StatusBadge kind="session" status={s.status} />,
      };
    }),
    ...data.payments.map((p): TimelineItem => ({
      key: p.name,
      date: p.payment_date,
      icon: CreditCard,
      tone: "bg-green-50 text-green-600",
      title: `Paid ${money(Number(p.amount) || 0)}`,
      detail: [p.payment_method, p.treatment_type].filter(Boolean).join(" · "),
      href: paymentHref(p.name),
    })),
  ].sort((x, y) => (y.date + (y.time ?? "")).localeCompare(x.date + (x.time ?? "")));

  if (items.length === 0) {
    return <EmptyState icon={History} title="Nothing yet" text="Visits, treatment sessions and payments will show here." />;
  }

  // Group: upcoming first, then by month.
  const groups: Array<{ label: string; items: TimelineItem[] }> = [];
  items.forEach((item) => {
    const label = item.date > today ? "Upcoming" : item.date === today ? "Today" : formatMonth(item.date.slice(0, 7));
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  });
  // Upcoming is sorted newest first; show the soonest first instead.
  groups.forEach((group) => {
    if (group.label === "Upcoming") group.items.reverse();
  });

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.label}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{group.label}</h3>
          <ol className="relative border-s-2 border-gray-100 ms-4 space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key} className="relative ps-6">
                  <span
                    className={cx(
                      "absolute -start-[17px] top-2.5 w-8 h-8 rounded-full ring-4 ring-white flex items-center justify-center",
                      item.tone,
                    )}
                  >
                    <Icon size={15} />
                  </span>
                  <Link
                    href={item.href}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2.5 min-h-11 hover:bg-gray-50"
                  >
                    <span className="text-xs font-medium text-gray-500 w-20 shrink-0">{formatDate(item.date)}</span>
                    <span className="flex-1 min-w-[10rem]">
                      <span className="block text-sm font-medium text-gray-800">{item.title}</span>
                      {item.detail && <span className="block text-xs text-gray-500">{item.detail}</span>}
                    </span>
                    {item.badge}
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
