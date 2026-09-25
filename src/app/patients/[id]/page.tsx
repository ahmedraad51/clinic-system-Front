"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Calendar, CalendarDays, CreditCard, Pencil, Plus, Stethoscope, Trash2, Wallet } from "lucide-react";
import RequirePermission from "@/components/Guard";
import DentalChart from "@/components/DentalChart";
import {
  Alert, Button, Card, ClickableRow, DetailList, DetailRow, EmptyState, LinkButton, NotFoundCard,
  PageContainer, PageHeader, PageLoading, StatCard, StatusBadge, Table, Tabs, Td, Th,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { deleteDoc, errorMessage, getList, updateDoc, type FilterRow } from "@/lib/frappe";
import { display, formatDate, formatTime, isBlankMedical } from "@/lib/format";
import { useDocument } from "@/lib/hooks";
import { appointmentHref, patientHref, paymentHref, routeId, treatmentHref } from "@/lib/links";
import type { Appointment, DentalChartData, Patient, Payment, TreatmentPlan } from "@/lib/types";

type TabKey = "overview" | "appointments" | "treatments" | "payments" | "chart";

interface Related {
  id: string;
  appointments: Appointment[];
  plans: TreatmentPlan[];
  payments: Payment[];
}

export default function PatientDetailPage() {
  return (
    <RequirePermission permission="view_patients">
      <PatientDetail />
    </RequirePermission>
  );
}

function PatientDetail() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { can } = useSession();
  const { money } = useSettings();
  const id = routeId(params.id);
  const { doc: patient, loading, notFound, error, reload } = useDocument<Patient>("Patient", id);
  const [tab, setTab] = useState<TabKey>("overview");
  const [related, setRelated] = useState<Related | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const showAppointments = can("view_appointments");
  const showTreatments = can("view_treatments");
  const showPayments = can("view_payments");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const byPatient: FilterRow[] = [["patient", "=", id]];
      try {
        const [appointments, plans, payments] = await Promise.all([
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
          showPayments
            ? getList<Payment>(
                "Payment",
                ["name", "payment_date", "amount", "payment_method", "treatment_type"],
                { filters: byPatient, orderBy: "payment_date desc", limit: 200 },
              )
            : Promise.resolve([]),
        ]);
        if (!cancelled) setRelated({ id, appointments, plans, payments });
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, showAppointments, showTreatments, showPayments]);

  if (loading) return <PageLoading />;
  if (notFound || !patient) return <NotFoundCard error={error} what="Patient" backHref="/patients" backLabel="Back to Patients" />;

  const data = related && related.id === id ? related : null;

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

  const tabs: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: "overview", label: "Overview" },
    ...(showAppointments ? [{ key: "appointments" as const, label: "Appointments", count: data?.appointments.length }] : []),
    ...(showTreatments ? [{ key: "treatments" as const, label: "Treatment Plans", count: data?.plans.length }] : []),
    ...(showPayments ? [{ key: "payments" as const, label: "Payments", count: data?.payments.length }] : []),
    { key: "chart", label: "Dental Chart" },
  ];

  const subtitle = [
    patient.name,
    patient.age ? `${patient.age} years` : "",
    patient.gender,
    patient.phone_number,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageContainer>
      <PageHeader
        title={patient.full_name}
        subtitle={subtitle}
        back={{ href: "/patients", label: "Patients" }}
        actions={
          <>
            {can("add_appointments") && (
              <LinkButton
                href={`/appointments/new?patient=${encodeURIComponent(id)}`}
                variant="secondary"
                icon={CalendarDays}
              >
                New Appointment
              </LinkButton>
            )}
            {can("add_treatments") && (
              <LinkButton href={`/treatments/new?patient=${encodeURIComponent(id)}`} variant="secondary" icon={Plus}>
                New Treatment
              </LinkButton>
            )}
            {can("edit_patients") && (
              <LinkButton href={`${patientHref(id)}/edit`} icon={Pencil}>
                Edit
              </LinkButton>
            )}
            {can("delete_patients") && (
              <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)} className="text-red-600 hover:bg-red-50">
                Delete
              </Button>
            )}
          </>
        }
      />

      {!isBlankMedical(patient.allergies) && (
        <Alert tone="red" title="Allergies">
          {patient.allergies}
        </Alert>
      )}
      {(!isBlankMedical(patient.chronic_diseases) || !isBlankMedical(patient.current_medications)) && (
        <Alert tone="yellow" title="Medical conditions">
          {[
            !isBlankMedical(patient.chronic_diseases) ? patient.chronic_diseases : "",
            !isBlankMedical(patient.current_medications) ? `Takes ${patient.current_medications}` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </Alert>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Appointments" value={patient.total_appointments ?? 0} icon={Calendar} tone="blue" />
        <StatCard title="Treatments" value={patient.total_treatments ?? 0} icon={Stethoscope} tone="green" />
        {showPayments && <StatCard title="Total Paid" value={money(patient.total_paid)} icon={CreditCard} tone="purple" />}
        {showPayments && (
          <StatCard
            title="Remaining"
            value={money(patient.total_remaining)}
            icon={Wallet}
            tone={Number(patient.total_remaining) > 0 ? "red" : "gray"}
          />
        )}
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Contact and Basic Information">
            <DetailList>
              <DetailRow label="Full Name">{patient.full_name}</DetailRow>
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
          <Card title="Medical Information">
            <DetailList>
              <DetailRow label="Allergies">{patient.allergies}</DetailRow>
              <DetailRow label="Current Medications">{patient.current_medications}</DetailRow>
              <DetailRow label="Chronic Diseases">{patient.chronic_diseases}</DetailRow>
              <DetailRow label="Medical History">{patient.medical_history}</DetailRow>
              <DetailRow label="Notes">{patient.notes}</DetailRow>
            </DetailList>
          </Card>
        </div>
      )}

      {tab === "appointments" && (
        <Card flush>
          {!data ? (
            <PageLoading />
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
                      <Link href={appointmentHref(a.name)} className="font-medium text-gray-800 hover:text-blue-600">
                        {formatDate(a.appointment_date)}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap">{formatTime(a.appointment_time)}</Td>
                    <Td>{display(a.doctor_name)}</Td>
                    <Td>{display(a.reason_for_visit)}</Td>
                    <Td>
                      <StatusBadge kind="appointment" status={a.status} />
                    </Td>
                  </ClickableRow>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {tab === "treatments" && (
        <Card flush>
          {!data ? (
            <PageLoading />
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
                      <Link href={treatmentHref(plan.name)} className="font-medium text-gray-800 hover:text-blue-600">
                        {plan.treatment_type}
                      </Link>
                    </Td>
                    <Td>{display(plan.tooth_number)}</Td>
                    <Td>{display(plan.doctor_name)}</Td>
                    <Td>
                      <StatusBadge kind="treatment" status={plan.status} />
                    </Td>
                    <Td className="text-end whitespace-nowrap">{money(plan.total_cost)}</Td>
                    <Td className="text-end whitespace-nowrap">
                      <span className={Number(plan.remaining_amount) > 0 ? "font-medium text-red-600" : "text-gray-400"}>
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

      {tab === "payments" && (
        <Card flush>
          {!data ? (
            <PageLoading />
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
                      <Link href={paymentHref(pay.name)} className="font-medium text-gray-800 hover:text-blue-600">
                        {formatDate(pay.payment_date)}
                      </Link>
                    </Td>
                    <Td>{display(pay.treatment_type)}</Td>
                    <Td>
                      <StatusBadge kind="method" status={pay.payment_method} />
                    </Td>
                    <Td className="text-end font-medium text-green-600 whitespace-nowrap">{money(pay.amount)}</Td>
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
          initialTeeth={patient.dental_chart}
          onSave={saveChart}
          canEdit={can("edit_patients")}
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
