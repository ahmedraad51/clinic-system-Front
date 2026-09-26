"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ClipboardList, CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import RequirePermission from "@/components/Guard";
import DentalChart from "@/components/DentalChart";
import MedicalAlerts from "@/components/MedicalAlerts";
import {
  Alert, Button, Card, ClickableRow, DetailList, DetailRow, EmptyState, Field, LinkButton, NotFoundCard,
  PageContainer, PageHeader, PageLoading, SelectInput, StatusBadge, Table, Td, TextArea, TextInput, Th,
} from "@/components/ui";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { createDoc, deleteDoc, errorMessage, getList, updateDoc } from "@/lib/frappe";
import { cx, display, formatDate, formatTime, todayISO } from "@/lib/format";
import { useDoctors, useDocument, usePatientChart, usePatientMedical } from "@/lib/hooks";
import { patientHref, paymentHref, routeId } from "@/lib/links";
import {
  SESSION_STATUSES, TREATMENT_STATUSES,
  type Payment, type TreatmentPlan, type TreatmentSession, type TreatmentStatus,
} from "@/lib/types";

export default function TreatmentDetailPage() {
  return (
    <RequirePermission permission="view_treatments">
      <TreatmentDetail />
    </RequirePermission>
  );
}

interface Related {
  key: string;
  sessions: TreatmentSession[];
  payments: Payment[];
}

function TreatmentDetail() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { can } = useSession();
  const { money } = useSettings();
  const id = routeId(params.id);
  const { doc: plan, loading, notFound, error, reload } = useDocument<TreatmentPlan>("Treatment Plan", id);
  const medical = usePatientMedical(plan?.patient);
  const patientChart = usePatientChart(plan?.patient);
  const [related, setRelated] = useState<Related | null>(null);
  const [relatedVersion, setRelatedVersion] = useState(0);
  const [updating, setUpdating] = useState<TreatmentStatus | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sessionModal, setSessionModal] = useState<{ open: boolean; session: TreatmentSession | null }>({
    open: false,
    session: null,
  });

  const showPayments = can("view_payments");
  const relatedKey = `${id}|${relatedVersion}`;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [sessions, payments] = await Promise.all([
          getList<TreatmentSession>(
            "Treatment Session",
            ["name", "doctor", "doctor_name", "session_date", "session_time", "status", "notes"],
            { filters: [["treatment_plan", "=", id]], orderBy: "session_date asc, session_time asc", limit: 0 },
          ),
          showPayments
            ? getList<Payment>("Payment", ["name", "payment_date", "amount", "payment_method"], {
                filters: [["treatment_plan", "=", id]],
                orderBy: "payment_date desc",
                limit: 0,
              })
            : Promise.resolve([]),
        ]);
        if (!cancelled) setRelated({ key: `${id}|${relatedVersion}`, sessions, payments });
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, relatedVersion, showPayments]);

  if (loading) return <PageLoading />;
  if (notFound || !plan) {
    return <NotFoundCard error={error} what="Treatment plan" backHref="/treatments" backLabel="Back to Treatment Plans" />;
  }

  const canEdit = can("edit_treatments");
  const data = related && related.key.split("|")[0] === id ? related : null;
  const refreshing = related?.key !== relatedKey;
  const total = Number(plan.total_cost) || 0;
  const paid = Number(plan.paid_amount) || 0;
  const remaining = Number(plan.remaining_amount) || 0;
  const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  const changeStatus = async (status: TreatmentStatus) => {
    setUpdating(status);
    try {
      await updateDoc("Treatment Plan", id, { status });
      toast.success(`Marked as ${status}.`);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, "Could not change the status."));
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDoc("Treatment Plan", id);
      toast.success("Treatment plan deleted.");
      router.push("/treatments");
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete the treatment plan."));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const title = plan.tooth_number ? `${plan.treatment_type} · Tooth ${plan.tooth_number}` : plan.treatment_type;
  const paymentHrefForPlan = `/payments/new?treatment=${encodeURIComponent(id)}&patient=${encodeURIComponent(plan.patient)}`;

  return (
    <PageContainer>
      <PageHeader
        title={title}
        subtitle={`${plan.patient_name || plan.patient} · ${id}`}
        badge={<StatusBadge kind="treatment" status={plan.status} />}
        back={{ href: "/treatments", label: "Treatment Plans" }}
        actions={
          <>
            {can("add_payments") && remaining > 0 && (
              <LinkButton href={paymentHrefForPlan} variant="success" icon={CreditCard}>
                Add Payment
              </LinkButton>
            )}
            {canEdit && (
              <LinkButton href={`/treatments/${encodeURIComponent(id)}/edit`} icon={Pencil}>
                Edit
              </LinkButton>
            )}
            {canEdit && (
              <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)} className="text-red-600 hover:bg-red-50">
                Delete
              </Button>
            )}
          </>
        }
      />

      <MedicalAlerts patient={medical} />

      <Card>
        <div className="grid grid-cols-3 gap-4 text-center sm:text-start">
          <div>
            <p className="text-xs text-gray-500">Total Cost</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-1">{money(total)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Paid</p>
            <p data-testid="plan-paid" className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{money(paid)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Remaining</p>
            <p data-testid="plan-remaining" className={cx("text-xl sm:text-2xl font-bold mt-1", remaining > 0 ? "text-red-600" : "text-gray-500")}>
              {money(remaining)}
            </p>
          </div>
        </div>
        <div className="mt-5">
          <div className="w-full bg-gray-100 rounded-full h-2" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {plan.status === "Cancelled" ? "Cancelled plans have nothing left to pay." : `${percent}% paid`}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Details">
          <DetailList>
            <DetailRow label="Patient">
              <Link href={patientHref(plan.patient)} className="text-primary-600 hover:underline">
                {plan.patient_name || plan.patient}
              </Link>
            </DetailRow>
            <DetailRow label="Doctor">{plan.doctor_name || plan.doctor}</DetailRow>
            <DetailRow label="Treatment">{plan.treatment_type}</DetailRow>
            <DetailRow label="Tooth">{plan.tooth_number}</DetailRow>
            <DetailRow label="Diagnosis">{plan.diagnosis}</DetailRow>
            <DetailRow label="Notes">{plan.treatment_notes}</DetailRow>
          </DetailList>
        </Card>

        <div className="space-y-6">
          {canEdit && (
            <Card title="Update Status">
              <div className="flex flex-wrap gap-2">
                {TREATMENT_STATUSES.map((status) => {
                  const current = plan.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => changeStatus(status)}
                      disabled={updating !== null || current}
                      className={cx(
                        "min-h-11 px-4 py-2 rounded-xl text-sm font-medium transition disabled:cursor-not-allowed",
                        current ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50",
                      )}
                    >
                      {updating === status ? "Saving..." : status}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {showPayments && (
            <Card
              title="Payments"
              flush
              actions={
                can("add_payments") &&
                remaining > 0 && (
                  <LinkButton href={paymentHrefForPlan} size="sm" variant="secondary" icon={Plus}>
                    Add
                  </LinkButton>
                )
              }
            >
              {!data ? (
                <PageLoading />
              ) : data.payments.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-gray-500">No payments for this plan yet.</p>
              ) : (
                <Table>
                  <tbody>
                    {data.payments.map((pay) => (
                      <ClickableRow key={pay.name} href={paymentHref(pay.name)}>
                        <Td className="whitespace-nowrap">
                          <Link href={paymentHref(pay.name)} className="text-gray-800 hover:text-primary-600">
                            {formatDate(pay.payment_date)}
                          </Link>
                        </Td>
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
        </div>
      </div>

      {patientChart && (
        // The whole mouth, read only, opened at this plan's tooth. Marking is done on the patient page.
        <DentalChart
          key={`${patientChart.name}|${plan.tooth_number ?? ""}`}
          initialChart={patientChart.dental_chart}
          canEdit={false}
          patientAge={patientChart.age}
          initialTooth={/^\d{2}$/.test(plan.tooth_number ?? "") ? Number(plan.tooth_number) : undefined}
          plans={[plan]}
          printHref={`${patientHref(plan.patient)}/chart`}
        />
      )}

      <Card
        title="Sessions"
        flush
        actions={
          canEdit && (
            <Button size="sm" variant="secondary" icon={Plus} onClick={() => setSessionModal({ open: true, session: null })}>
              Add Session
            </Button>
          )
        }
      >
        {!data ? (
          <PageLoading />
        ) : data.sessions.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No sessions yet" text="Add a session for each visit where this treatment is worked on." />
        ) : (
          <div className={cx(refreshing && "opacity-60")}>
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Time</Th>
                  <Th>Doctor</Th>
                  <Th>Status</Th>
                  <Th>Notes</Th>
                  {canEdit && <Th />}
                </tr>
              </thead>
              <tbody>
                {data.sessions.map((session) => (
                  <tr key={session.name} className="hover:bg-gray-50">
                    <Td className="whitespace-nowrap font-medium text-gray-800">{formatDate(session.session_date)}</Td>
                    <Td label="Time" className="whitespace-nowrap">{formatTime(session.session_time)}</Td>
                    <Td label="Doctor">{display(session.doctor_name)}</Td>
                    <Td label="Status">
                      <StatusBadge kind="session" status={session.status} />
                    </Td>
                    <Td label="Notes" className="max-w-[320px]">{display(session.notes)}</Td>
                    {canEdit && (
                      <Td className="text-end">
                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setSessionModal({ open: true, session })}>
                          Edit
                        </Button>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {sessionModal.open && (
        <SessionModal
          plan={plan}
          session={sessionModal.session}
          onClose={() => setSessionModal({ open: false, session: null })}
          onSaved={() => {
            setSessionModal({ open: false, session: null });
            setRelatedVersion((v) => v + 1);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this treatment plan?"
        message={
          <p>
            This plan will be removed for good. A plan that already has payments or sessions cannot be deleted; set its
            status to Cancelled instead.
          </p>
        }
        confirmLabel="Delete Plan"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </PageContainer>
  );
}

interface SessionForm {
  session_date: string;
  session_time: string;
  doctor: string;
  status: string;
  notes: string;
}

/** Add or edit one Treatment Session of this plan. */
function SessionModal({
  plan,
  session,
  onClose,
  onSaved,
}: {
  plan: TreatmentPlan;
  session: TreatmentSession | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const doctors = useDoctors();
  const [form, setForm] = useState<SessionForm>({
    session_date: session?.session_date ?? todayISO(),
    session_time: (session?.session_time ?? "").slice(0, 5),
    doctor: session?.doctor ?? plan.doctor ?? "",
    status: session?.status ?? "Scheduled",
    notes: session?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      session_time: form.session_time || null,
      doctor: form.doctor || null,
      patient: plan.patient,
      treatment_plan: plan.name,
    };
    try {
      if (session) {
        await updateDoc("Treatment Session", session.name, payload);
        toast.success("Session saved.");
      } else {
        await createDoc("Treatment Session", payload);
        toast.success("Session added.");
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Could not save the session."));
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    // First click asks, second click deletes.
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteDoc("Treatment Session", session.name);
      toast.success("Session deleted.");
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Could not delete the session."));
      setDeleting(false);
    }
  };

  const doctorMissing = form.doctor && !doctors.some((doctor) => doctor.name === form.doctor);

  return (
    <Modal open title={session ? "Edit Session" : "Add Session"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" required>
            <TextInput type="date" name="session_date" value={form.session_date} onChange={handleChange} required />
          </Field>
          <Field label="Time">
            <TextInput type="time" name="session_time" value={form.session_time} onChange={handleChange} />
          </Field>
        </div>
        <Field label="Doctor">
          <SelectInput name="doctor" value={form.doctor} onChange={handleChange}>
            <option value="">Select Doctor</option>
            {doctorMissing && <option value={form.doctor}>{session?.doctor_name || plan.doctor_name || form.doctor}</option>}
            {doctors.map((doctor) => (
              <option key={doctor.name} value={doctor.name}>
                {doctor.full_name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Status">
          <SelectInput name="status" value={form.status} onChange={handleChange}>
            {SESSION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Notes" hint="What was done in this visit.">
          <TextArea name="notes" value={form.notes} onChange={handleChange} />
        </Field>

        {error && <Alert tone="red">{error}</Alert>}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button type="submit" loading={saving} disabled={deleting}>
            {session ? "Save Session" : "Add Session"}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving || deleting}>
            Cancel
          </Button>
          {session && (
            <Button
              variant="ghost"
              icon={Trash2}
              onClick={handleDelete}
              loading={deleting}
              disabled={saving}
              className="ms-auto text-red-600 hover:bg-red-50"
            >
              {confirmingDelete ? "Click again to delete" : "Delete"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
