"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRecordDialogs } from "@/components/RecordDialogs";
import { useDataVersion } from "@/lib/dataVersion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  BellRing, Calendar, CalendarCheck, CalendarClock, CalendarDays, ClipboardList, CreditCard, HeartPulse, History, IdCard,
  MessageCircle, Pencil, Phone, Pill, Plus, Printer, Stethoscope, Trash2, Wallet, type LucideIcon,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import RequirePermission from "@/components/Guard";
import DentalChart from "@/components/DentalChart";
import MedicalAlerts from "@/components/MedicalAlerts";
import XraySection from "@/components/xrays/XraySection";
import RecallDialog from "@/components/RecallDialog";
import RecordHistory from "@/components/RecordHistory";
import {
  Button, Card, ClickableRow, DetailLayout, DetailList, DetailRow, EmptyState, IconTile, LinkButton, LoadError, NotFoundCard, PageContainer, PageHeader, PageLoading, Parts, ProfileCard, RecordLoading, StatusBadge, Table, Tabs, Td, Th, type Hue,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { joinParts, label, messages } from "@/i18n";
import { deleteDoc, errorMessage, getList, updateDoc, type FilterRow } from "@/lib/frappe";
import { addMonths, display, formatDate, formatMonth, formatTime, todayISO } from "@/lib/format";
import { currencyOf, sumByCurrency } from "@/lib/currency";
import { useDocument, usePatientImages } from "@/lib/hooks";
import { medicalValue } from "@/lib/medical";
import { chartSketchToSave, type ChartSketch } from "@/lib/sketch";
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
  const { t } = useI18n();
  const openDialog = useRecordDialogs();
  const p = t.patients;
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { can } = useSession();
  const { money, moneyTotals, currency, countryCode } = useSettings();
  const id = routeId(params.id);
  const { doc: patient, loading, notFound, error, reload } = useDocument<Patient>("Patient", id);
  // X-rays and photos: shown in their own tab and on the dental chart's teeth.
  const xrays = usePatientImages(id);
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

  // A dialog saved something: load again.
  const saved = useDataVersion();
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
                ["name", "treatment_type", "tooth_number", "doctor_name", "status", "currency", "total_cost", "remaining_amount"],
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
                ["name", "payment_date", "amount", "currency", "payment_method", "treatment_type"],
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
        if (!cancelled) setRelatedError(errorMessage(err, messages().patients.relatedLoadFailed));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, showAppointments, showTreatments, showPayments, relatedVersion, saved]);

  if (loading) return <RecordLoading />;
  if (notFound || !patient) return <NotFoundCard error={error} what={p.what} backHref="/patients" backLabel={p.backToPatients} />;

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
      toast.success(p.deleted(patient.full_name));
      router.push("/patients");
    } catch (err) {
      toast.error(errorMessage(err, p.deleteFailed));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const saveSketch = async (sketch: ChartSketch) => {
    try {
      await updateDoc("Patient", id, { chart_sketch: chartSketchToSave(sketch) || null });
      toast.success(t.xrays.sketchSaved);
      // The chart reads the sketch when it opens: keep the page's copy up to date for the next time.
      reload();
    } catch (err) {
      toast.error(errorMessage(err, t.xrays.sketchFailed));
      throw err;
    }
  };

  const saveChart = async (chart: DentalChartData) => {
    try {
      await updateDoc("Patient", id, { dental_chart: JSON.stringify(chart) });
      toast.success(p.chartSaved);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, p.chartSaveFailed));
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
    { key: "overview", label: p.tabs.overview },
    ...(showAppointments ? [{ key: "appointments" as const, label: p.tabs.appointments, count: data?.appointments.length }] : []),
    ...(showTreatments ? [{ key: "treatments" as const, label: p.tabs.treatments, count: data?.plans.length }] : []),
    ...(showTreatments ? [{ key: "prescriptions" as const, label: p.tabs.prescriptions, count: data?.prescriptions.length }] : []),
    ...(showPayments ? [{ key: "payments" as const, label: p.tabs.payments, count: data?.payments.length }] : []),
    { key: "chart", label: p.tabs.chart },
    { key: "files", label: p.tabs.files, count: xrays.images?.length },
    { key: "history", label: p.tabs.history },
  ];

  const ageText = patient.age ? t.common.years(Number(patient.age)) : "";
  const subtitle = joinParts([ageText, label(t.enums.gender, patient.gender), patient.name], t.common.dot);
  const whatsapp = whatsappNumber(patient.phone_number, countryCode);
  const remaining = Number(patient.total_remaining) || 0;
  // With plans or payments in the second currency, each currency is shown on its own ("IQD 150,000 + $300");
  // otherwise the patient's totals (in the clinic's currency) are enough.
  const inCurrency = (row: { currency?: string }) => currencyOf(row, currency);
  const otherCurrency = (rows: { currency?: string }[]) => rows.some((row) => inCurrency(row) !== currency);
  const remainingText =
    data && otherCurrency(data.plans.filter((plan) => Number(plan.remaining_amount) > 0))
      ? moneyTotals(sumByCurrency(data.plans, (plan) => Number(plan.remaining_amount) || 0, inCurrency))
      : money(remaining);
  const paidText =
    data && otherCurrency(data.payments)
      ? moneyTotals(sumByCurrency(data.payments, (pay) => Number(pay.amount) || 0, inCurrency))
      : money(patient.total_paid);

  return (
    <PageContainer section="patients">
      <PageHeader back={{ href: "/patients", label: p.title }} />
      {/* Above both columns, so it is the first thing on a tablet or phone too. */}
      <MedicalAlerts patient={patient} />

      <DetailLayout
        aside={
          <ProfileCard
            titleLevel={1}
            avatar={<Avatar name={patient.full_name} size={96} />}
            title={patient.full_name}
            subtitle={subtitle}
            actions={
              <>
            {can("add_appointments") && (
              <Button icon={CalendarDays} data-testid="open-new-appointment" onClick={() => openDialog({ kind: "newAppointment", prefill: { patient: id }, patientName: patient.full_name })}>
                {p.newAppointment}
              </Button>
            )}
            {can("add_treatments") && (
              <Button variant="secondary" icon={Plus} data-testid="open-new-treatment" onClick={() => openDialog({ kind: "newTreatment", prefill: { patient: id }, patientName: patient.full_name })}>
                {p.newTreatment}
              </Button>
            )}
            {can("edit_patients") && (
              <LinkButton href={`${patientHref(id)}/edit`} variant="secondary" icon={Pencil}>
                {p.edit}
              </LinkButton>
            )}
            {can("delete_patients") && (
              <Button
                variant="ghost"
                icon={Trash2}
                onClick={() => setConfirmDelete(true)}
                aria-label={p.deletePatient}
                title={p.deletePatient}
                className="text-red-600 hover:bg-red-50 px-3"
              />
            )}
              </>
            }
            detailsTitle={p.contactCard}
            details={[
              { label: p.patientId, value: <span dir="ltr">{patient.name}</span> },
              { label: p.gender, value: label(t.enums.gender, patient.gender) },
              { label: p.dateOfBirth, value: patient.date_of_birth ? formatDate(patient.date_of_birth) : "" },
              { label: p.age, value: ageText },
              { label: p.phone, value: patient.phone_number ? <span dir="ltr">{patient.phone_number}</span> : "" },
              { label: p.secondaryPhone, value: patient.secondary_phone ? <span dir="ltr">{patient.secondary_phone}</span> : "" },
              { label: p.email, value: patient.email ? <span dir="ltr" className="break-all">{patient.email}</span> : "" },
              { label: p.address, value: patient.address },
            ]}
          >
            {/* Contact, and the facts a dentist wants before the patient sits down. */}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
          <LinkButton href={`${patientHref(id)}/card`} variant="secondary" icon={IdCard}>
            {t.qr.card.button}
          </LinkButton>
          <LinkButton href={`${patientHref(id)}/file`} variant="secondary" icon={Printer}>
            {t.patientFile.button}
          </LinkButton>
          {patient.phone_number && (
            <a
              href={`tel:${patient.phone_number.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-100"
            >
              <Phone size={16} className="text-primary-600" />
              <span dir="ltr">{patient.phone_number}</span>
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
              {p.whatsapp}
            </a>
          )}
          {patient.secondary_phone && (
            <a
              href={`tel:${patient.secondary_phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Phone size={16} className="text-gray-500" />
              <span dir="ltr">{patient.secondary_phone}</span>
            </a>
          )}
            </div>
        {/* Two columns only where the card is at least 24rem wide; a narrow card keeps one. */}
        <div className="@container mt-6 pt-6 border-t border-gray-200">
          <dl className="grid grid-cols-1 @sm:grid-cols-2 gap-x-4 gap-y-5 text-start">
            {showAppointments && (
              <Fact icon={History} hue="appointments" label={p.lastVisit}>
                {lastVisit ? (
                  <Link href={appointmentHref(lastVisit.name)} className="hover:text-primary-600">
                    {formatDate(lastVisit.appointment_date)}
                    <span className="block text-xs font-normal text-gray-500">{lastVisit.reason_for_visit || lastVisit.doctor_name}</span>
                  </Link>
                ) : data ? (
                  <span className="text-gray-500">{p.noneYet}</span>
                ) : (
                  "…"
                )}
              </Fact>
            )}
            {showAppointments && (
              <Fact icon={CalendarClock} hue="appointments" label={p.nextAppointment}>
                {nextVisit ? (
                  <Link href={appointmentHref(nextVisit.name)} className="hover:text-primary-600">
                    {t.dates.dateTime(
                      nextVisit.appointment_date === today ? p.today : formatDate(nextVisit.appointment_date),
                      formatTime(nextVisit.appointment_time),
                    )}
                    <span className="block text-xs font-normal text-gray-500">{nextVisit.doctor_name}</span>
                  </Link>
                ) : data ? (
                  <span className="text-gray-500">{p.notBooked}</span>
                ) : (
                  "…"
                )}
              </Fact>
            )}
            <Fact icon={BellRing} hue="patients" label={p.nextCheckUp}>
              {Number(patient.no_recall) === 1 ? (
                <span className="text-gray-500">{p.noRecall}</span>
              ) : patient.next_recall_date ? (
                <>
                  <span className={patient.next_recall_date <= today ? "text-red-600" : undefined}>
                    {formatDate(patient.next_recall_date)}
                    {patient.next_recall_date <= today && p.due}
                  </span>
                  {Number(patient.recall_interval_months) > 0 && (
                    <span className="block text-xs font-normal text-gray-500">
                      {t.recall.choiceEvery(Number(patient.recall_interval_months))}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-gray-500">{p.usualRule}</span>
                  {lastVisit && (
                    <span className="block text-xs font-normal text-gray-500">
                      {p.about(formatDate(addMonths(lastVisit.appointment_date, DEFAULT_RECALL_MONTHS)))}
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
                  {p.change}
                  <span className="sr-only">{p.changeCheckUp}</span>
                </button>
              )}
            </Fact>
            {showPayments && (
              <Fact icon={Wallet} hue={remaining > 0 ? "red" : "money"} label={p.balanceToPay}>
                <span className={remaining > 0 ? "text-red-600" : "text-gray-500"}>{remainingText}</span>
                {remaining > 0 && can("add_payments") && (
                  <button
                    type="button"
                    onClick={() => openDialog({ kind: "newPayment", prefill: { patient: id }, patientName: patient.full_name })}
                    className="block text-xs font-medium text-primary-700 hover:underline pointer-coarse:min-h-11"
                  >
                    {p.addPayment}
                  </button>
                )}
              </Fact>
            )}
            {showPayments && (
              <Fact icon={CreditCard} hue="money" label={p.paidSoFar}>
                {paidText}
              </Fact>
            )}
          </dl>
        </div>
          </ProfileCard>
        }
      >

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <Card title={p.timeline} icon={History} section="patients" className="lg:col-span-3">
            {!data ? relatedWaiting : <Timeline data={data} today={today} money={money} />}
          </Card>
          <div className="space-y-6 lg:col-span-2">
            <Card title={p.medicalCard} icon={HeartPulse} section="red">
              <DetailList>
                {/* "None" and the like in the screen's language ("لا يوجد"); empty shows a dash. */}
                <DetailRow label={p.allergies}>{medicalValue(patient.allergies)}</DetailRow>
                <DetailRow label={p.currentMedications}>{medicalValue(patient.current_medications)}</DetailRow>
                <DetailRow label={p.chronicDiseases}>{medicalValue(patient.chronic_diseases)}</DetailRow>
                <DetailRow label={p.medicalHistory}>{medicalValue(patient.medical_history)}</DetailRow>
                <DetailRow label={p.notes}>{medicalValue(patient.notes)}</DetailRow>
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
              title={p.noAppointments}
              action={
                can("add_appointments") && (
                  <Button icon={Plus} onClick={() => openDialog({ kind: "newAppointment", prefill: { patient: id }, patientName: patient.full_name })}>
                    {p.newAppointment}
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{p.date}</Th>
                  <Th>{p.time}</Th>
                  <Th>{p.doctor}</Th>
                  <Th>{p.reason}</Th>
                  <Th>{p.status}</Th>
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
                    <Td label={p.time} className="whitespace-nowrap">{formatTime(a.appointment_time)}</Td>
                    <Td label={p.doctor}>{display(a.doctor_name)}</Td>
                    <Td label={p.reason}>{display(a.reason_for_visit)}</Td>
                    <Td label={p.status}>
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
            {p.printEstimate}
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
              title={p.noPlans}
              action={
                can("add_treatments") && (
                  <Button icon={Plus} onClick={() => openDialog({ kind: "newTreatment", prefill: { patient: id }, patientName: patient.full_name })}>
                    {p.newTreatment}
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{p.treatment}</Th>
                  <Th>{p.tooth}</Th>
                  <Th>{p.doctor}</Th>
                  <Th>{p.status}</Th>
                  <Th className="text-end">{p.cost}</Th>
                  <Th className="text-end">{p.remaining}</Th>
                </tr>
              </thead>
              <tbody>
                {data.plans.map((plan) => (
                  <ClickableRow key={plan.name} href={treatmentHref(plan.name)}>
                    <Td>
                      <Link href={treatmentHref(plan.name)} className="font-medium text-gray-800 hover:text-primary-600">
                        {label(t.enums.treatmentType, plan.treatment_type)}
                      </Link>
                    </Td>
                    <Td label={p.tooth}>{display(plan.tooth_number)}</Td>
                    <Td label={p.doctor}>{display(plan.doctor_name)}</Td>
                    <Td label={p.status}>
                      <StatusBadge kind="treatment" status={plan.status} />
                    </Td>
                    <Td label={p.cost} className="text-end whitespace-nowrap">{money(plan.total_cost, plan.currency)}</Td>
                    <Td label={p.remaining} className="text-end whitespace-nowrap">
                      <span className={Number(plan.remaining_amount) > 0 ? "font-medium text-red-600" : "text-gray-500"}>
                        {money(plan.remaining_amount, plan.currency)}
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
            {p.newPrescription}
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
              title={p.noPrescriptions}
              text={p.noPrescriptionsText}
              action={
                can("add_treatments") && (
                  <LinkButton href={`/prescriptions/new?patient=${encodeURIComponent(id)}`} icon={Plus}>
                    {p.newPrescription}
                  </LinkButton>
                )
              }
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{p.date}</Th>
                  <Th>{p.medicines}</Th>
                  <Th>{p.doctor}</Th>
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
                    <Td label={p.medicines}>{display(rx.summary)}</Td>
                    <Td label={p.doctor}>{display(rx.doctor_name)}</Td>
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
            {p.printStatement}
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
              title={p.noPayments}
              action={
                can("add_payments") && (
                  <Button icon={Plus} onClick={() => openDialog({ kind: "newPayment", prefill: { patient: id }, patientName: patient.full_name })}>
                    {p.addPaymentButton}
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{p.date}</Th>
                  <Th>{p.treatment}</Th>
                  <Th>{p.method}</Th>
                  <Th className="text-end">{p.amount}</Th>
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
                    <Td label={p.treatment}>{display(label(t.enums.treatmentType, pay.treatment_type))}</Td>
                    <Td label={p.method}>
                      <StatusBadge kind="method" status={pay.payment_method} />
                    </Td>
                    <Td label={p.amount} className="text-end font-medium text-green-600 whitespace-nowrap">{money(pay.amount, pay.currency)}</Td>
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
          images={xrays.images ?? []}
          patientName={patient.full_name}
          onImagesChanged={xrays.reload}
          sketch={patient.chart_sketch}
          onSaveSketch={saveSketch}
          onNewTreatment={
            can("add_treatments")
              ? (tooth: number) =>
                  openDialog({ kind: "newTreatment", prefill: { patient: id, tooth: String(tooth) }, patientName: patient.full_name })
              : undefined
          }
        />
      )}

      {tab === "files" && (
        <XraySection
          patient={patient.name}
          patientName={patient.full_name}
          images={xrays.images}
          error={xrays.error}
          onReload={xrays.reload}
          canEdit={can("edit_patients")}
        />
      )}

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
        title={p.deleteTitle}
        message={
          <p>
            <strong>{patient.full_name}</strong>
            {p.deleteText}
          </p>
        }
        confirmLabel={p.deleteConfirm}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      </DetailLayout>
    </PageContainer>
  );
}

function Fact({ icon, hue, label, children }: { icon: LucideIcon; hue: Hue; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <IconTile icon={icon} hue={hue} />
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
  hue: Hue;
  title: string;
  /** Shown with Parts: each kept whole, with " · " between. */
  detail?: Array<string | undefined | null>;
  href: string;
  badge?: ReactNode;
}

/** Visits, treatment sessions and payments in one list, newest first, with upcoming ones on top. */
function Timeline({
  data,
  today,
  money,
}: {
  data: Related;
  today: string;
  money: (amount: number, currency?: string) => string;
}) {
  const { t } = useI18n();
  const tp = t.patients;
  const plans = new Map(data.plans.map((plan) => [plan.name, plan]));
  const items: TimelineItem[] = [
    ...data.appointments.map((a): TimelineItem => ({
      key: a.name,
      date: a.appointment_date,
      time: a.appointment_time,
      icon: a.status === "Completed" ? CalendarCheck : Calendar,
      hue: "appointments",
      title: a.reason_for_visit || tp.appointment,
      detail: [formatTime(a.appointment_time), a.doctor_name],
      href: appointmentHref(a.name),
      badge: <StatusBadge kind="appointment" status={a.status} />,
    })),
    ...data.sessions.map((s): TimelineItem => {
      const plan = plans.get(s.treatment_plan);
      const type = plan ? label(t.enums.treatmentType, plan.treatment_type) : "";
      const what = plan ? (plan.tooth_number ? tp.withTooth(type, plan.tooth_number) : type) : tp.treatmentWord;
      return {
        key: s.name,
        date: s.session_date,
        time: s.session_time,
        icon: ClipboardList,
        hue: "treatments",
        title: tp.session(what),
        detail: [s.notes, s.doctor_name],
        href: treatmentHref(s.treatment_plan),
        badge: <StatusBadge kind="session" status={s.status} />,
      };
    }),
    ...data.payments.map((p): TimelineItem => ({
      key: p.name,
      date: p.payment_date,
      icon: CreditCard,
      hue: "money",
      title: tp.paid(money(Number(p.amount) || 0, p.currency)),
      detail: [label(t.enums.paymentMethod, p.payment_method), label(t.enums.treatmentType, p.treatment_type)],
      href: paymentHref(p.name),
    })),
  ].sort((x, y) => (y.date + (y.time ?? "")).localeCompare(x.date + (x.time ?? "")));

  if (items.length === 0) {
    return <EmptyState icon={History} title={tp.nothingYet} text={tp.nothingYetText} />;
  }

  // Group: upcoming first, then by month. `key` is "upcoming", "today" or the month (YYYY-MM).
  const groups: Array<{ key: string; label: string; items: TimelineItem[] }> = [];
  items.forEach((item) => {
    const key = item.date > today ? "upcoming" : item.date === today ? "today" : item.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else {
      const heading = key === "upcoming" ? tp.upcoming : key === "today" ? tp.today : formatMonth(key);
      groups.push({ key, label: heading, items: [item] });
    }
  });
  // Upcoming is sorted newest first; show the soonest first instead.
  groups.forEach((group) => {
    if (group.key === "upcoming") group.items.reverse();
  });

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.key}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{group.label}</h3>
          <ol className="relative border-s-2 border-gray-100 ms-4 space-y-1">
            {group.items.map((item) => (
                <li key={item.key} className="relative ps-6">
                  <IconTile icon={item.icon} hue={item.hue} size="sm" className="absolute -start-[17px] top-2.5 rounded-full ring-4 ring-surface" />
                  <Link
                    href={item.href}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2.5 min-h-11 hover:bg-gray-50"
                  >
                    <span className="text-xs font-medium text-gray-500 w-20 shrink-0">{formatDate(item.date)}</span>
                    <span className="flex-1 min-w-[10rem]">
                      <span className="block text-sm font-medium text-gray-800">{item.title}</span>
                      {item.detail && <Parts parts={item.detail} className="block text-xs text-gray-500" />}
                    </span>
                    {item.badge}
                  </Link>
                </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
