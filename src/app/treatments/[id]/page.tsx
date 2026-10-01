"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRecordDialogs } from "@/components/RecordDialogs";
import { useDataVersion } from "@/lib/dataVersion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Stethoscope, CalendarCheck, CalendarPlus, ClipboardList, CreditCard, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import RequirePermission from "@/components/Guard";
import DentalChart from "@/components/DentalChart";
import RecordHistory from "@/components/RecordHistory";
import LabWorkCard from "@/components/LabWorkCard";
import MedicalAlerts from "@/components/MedicalAlerts";
import {
  Alert, Button, Card, DateInput, DetailLayout, EmptyState, Field, IconTile, LoadError, NotFoundCard, PageContainer, PageHeader, PageLoading, ProfileCard, ProgressBar, RecordLoading, SelectInput, StatusBadge, Table, Td, TextArea, Th, TimeInput,
} from "@/components/ui";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { createDoc, deleteDoc, errorMessage, getList, updateDoc } from "@/lib/frappe";
import { label, messages } from "@/i18n";
import { cx, display, formatDate, formatTime, todayISO } from "@/lib/format";
import { useDoctors, useDocument, usePatientChart, usePatientImages, usePatientMedical } from "@/lib/hooks";
import { patientHref, paymentHref, routeId } from "@/lib/links";
import {
  LAB_TREATMENT_TYPES, SESSION_STATUSES, TREATMENT_STATUSES,
  type Payment, type TreatmentPlan, type TreatmentSession, type TreatmentStatus,
} from "@/lib/types";
import { doctorMedia } from "@/components/Avatar";

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
  const { t } = useI18n();
  const openDialog = useRecordDialogs();
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { can } = useSession();
  const { money } = useSettings();
  const id = routeId(params.id);
  const { doc: plan, loading, notFound, error, reload } = useDocument<TreatmentPlan>("Treatment Plan", id);
  const medical = usePatientMedical(plan?.patient);
  const patientChart = usePatientChart(plan?.patient);
  const patientImages = usePatientImages(plan?.patient);
  const [related, setRelated] = useState<Related | null>(null);
  const [relatedVersion, setRelatedVersion] = useState(0);
  // The sessions and payments could not load: say so, with Try Again.
  const [relatedError, setRelatedError] = useState("");
  const [updating, setUpdating] = useState<TreatmentStatus | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sessionModal, setSessionModal] = useState<{ open: boolean; session: TreatmentSession | null }>({
    open: false,
    session: null,
  });

  const showPayments = can("view_payments");
  const relatedKey = `${id}|${relatedVersion}`;

  // A dialog saved something: load again.
  const saved = useDataVersion();
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
            ? getList<Payment>("Payment", ["name", "payment_date", "amount", "currency", "plan_amount", "payment_method"], {
                filters: [["treatment_plan", "=", id]],
                orderBy: "payment_date desc",
                limit: 0,
              })
            : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setRelated({ key: `${id}|${relatedVersion}`, sessions, payments });
          setRelatedError("");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setRelatedError(errorMessage(err, messages().treatments.loadRelatedFailed));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, relatedVersion, showPayments, saved]);

  if (loading) return <RecordLoading />;
  if (notFound || !plan) {
    return <NotFoundCard error={error} what={t.treatments.what} backHref="/treatments" backLabel={t.treatments.backToList} />;
  }

  const canEdit = can("edit_treatments");
  const data = related && related.key.split("|")[0] === id ? related : null;
  const refreshing = related?.key !== relatedKey;
  const relatedWaiting = relatedError ? (
    <div className="px-6 pb-6">
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
  const total = Number(plan.total_cost) || 0;
  const paid = Number(plan.paid_amount) || 0;
  const remaining = Number(plan.remaining_amount) || 0;
  const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  const changeStatus = async (status: TreatmentStatus) => {
    setUpdating(status);
    try {
      await updateDoc("Treatment Plan", id, { status });
      toast.success(messages().treatments.markedAs(label(messages().enums.treatmentStatus, status)));
      reload();
    } catch (err) {
      toast.error(errorMessage(err, messages().treatments.statusFailed));
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDoc("Treatment Plan", id);
      toast.success(messages().treatments.deleted);
      router.push("/treatments");
    } catch (err) {
      toast.error(errorMessage(err, messages().treatments.deleteFailed));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const typeLabel = label(t.enums.treatmentType, plan.treatment_type);
  const title = plan.tooth_number ? t.treatments.titleWithTooth(typeLabel, plan.tooth_number) : typeLabel;
  // The next visit for this plan: patient, the plan's doctor and what it is for.
  const bookVisit = () =>
    openDialog({
      kind: "newAppointment",
      prefill: {
        patient: plan.patient,
        doctor: plan.doctor || "",
        reason_for_visit: plan.tooth_number ? t.treatments.visitReason(typeLabel, plan.tooth_number) : typeLabel,
      },
      patientName: plan.patient_name,
    });
  const addPayment = () =>
    openDialog({ kind: "newPayment", prefill: { patient: plan.patient, treatment: id }, patientName: plan.patient_name });

  return (
    <PageContainer section="treatments">
      <PageHeader back={{ href: "/treatments", label: t.treatments.title }} />
      {/* Above both columns, so it is the first thing on a tablet or phone too. */}
      <MedicalAlerts patient={medical} />

      <DetailLayout
        aside={
          <ProfileCard
            titleLevel={1}
            avatar={<IconTile icon={Stethoscope} hue="treatments" size="lg" />}
            title={title}
            subtitle={<>{plan.patient_name || plan.patient}{t.common.dot}<span dir="ltr">{id}</span></>}
            badges={<StatusBadge kind="treatment" status={plan.status} />}
            detailsTitle={t.common.details}
            details={[
              {
                label: t.common.patient,
                value: (
                  <Link href={patientHref(plan.patient)} className="text-primary-600 hover:underline">
                    {plan.patient_name || plan.patient}
                  </Link>
                ),
              },
              { label: t.common.doctor, value: plan.doctor_name || plan.doctor },
              { label: t.treatments.treatment, value: typeLabel },
              { label: t.treatments.tooth, value: plan.tooth_number },
              { label: t.treatments.diagnosis, value: plan.diagnosis },
              { label: t.common.notes, value: plan.treatment_notes },
            ]}
            actions={
              <>
            {can("add_payments") && remaining > 0 && (
              <Button variant="success" icon={CreditCard} data-testid="open-new-payment" onClick={addPayment}>
                {t.treatments.addPayment}
              </Button>
            )}
            {canEdit && (
              <Button icon={Pencil} onClick={() => openDialog({ kind: "editTreatment", id })}>
                {t.common.edit}
              </Button>
            )}
            {canEdit && (
              <Button
                variant="ghost"
                icon={Trash2}
                onClick={() => setConfirmDelete(true)}
                aria-label={t.treatments.deletePlan}
                title={t.treatments.deletePlan}
                className="text-red-600 hover:bg-red-50 px-3"
              />
            )}
              </>
            }
          >
            <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 gap-2 text-start">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs text-gray-500">{t.treatments.totalCost}</p>
                <p className="text-lg font-semibold text-gray-800">{money(total, plan.currency)}</p>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs text-gray-500">{t.treatments.paid}</p>
                <p data-testid="plan-paid" className="text-lg font-semibold text-green-600">{money(paid, plan.currency)}</p>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs text-gray-500">{t.treatments.remaining}</p>
                <p data-testid="plan-remaining" className={cx("text-lg font-semibold", remaining > 0 ? "text-red-600" : "text-gray-500")}>
                  {money(remaining, plan.currency)}
                </p>
              </div>
            </div>
            <div className="mt-5">
              <ProgressBar value={percent} label={t.treatments.paid} showLabel={false} tone="green" />
              <p className="text-xs text-gray-500 mt-2">
                {plan.status === "Cancelled" ? t.treatments.cancelledNothingLeft : t.treatments.paidPercent(percent)}
              </p>
            </div>
              </ProfileCard>
        }
      >

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {canEdit && (
            <Card title={t.treatments.updateStatus} icon={ListChecks}>
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
                        current ? "bg-brand text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50",
                      )}
                    >
                      {updating === status ? t.common.saving : label(t.enums.treatmentStatus, status)}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {showPayments && (
            <Card
              title={t.treatments.payments}
              icon={CreditCard}
              flush
              actions={
                can("add_payments") &&
                remaining > 0 && (
                  <Button size="sm" variant="secondary" icon={Plus} onClick={addPayment}>
                    {t.common.add}
                  </Button>
                )
              }
            >
              {!data ? (
                relatedWaiting
              ) : data.payments.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-gray-500">{t.treatments.noPayments}</p>
              ) : (
                // A list, not a table: this box is narrow beside the details on a tablet.
                <ul className="divide-y divide-gray-100 border-t border-gray-100">
                  {data.payments.map((pay) => (
                    <li key={pay.name}>
                      <Link
                        href={paymentHref(pay.name)}
                        className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 min-h-11 hover:bg-gray-50"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm text-gray-800">{formatDate(pay.payment_date)}</span>
                          <StatusBadge kind="method" status={pay.payment_method} />
                        </span>
                        <span className="text-end whitespace-nowrap">
                          <span className="block font-medium text-green-600">{money(pay.amount, pay.currency)}</span>
                          {/* Paid in the other currency: what it took off this plan. */}
                          {(pay.currency || "") !== (plan.currency || "") && pay.plan_amount !== undefined && pay.plan_amount !== null && (
                            <span className="block text-xs text-gray-500">{t.money.countsAs(money(pay.plan_amount, plan.currency))}</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
      </div>

      {((LAB_TREATMENT_TYPES as readonly string[]).includes(plan.treatment_type) || plan.lab_sent_date) && (
        <LabWorkCard plan={plan} canEdit={canEdit} onSaved={reload} />
      )}

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
          images={patientImages.images ?? []}
          patientName={plan.patient_name}
          onImagesChanged={patientImages.reload}
          sketch={patientChart.chart_sketch}
        />
      )}

      <Card
        title={t.treatments.sessions}
        icon={CalendarCheck}
        flush
        actions={
          <>
            {can("add_appointments") && (plan.status === "Planned" || plan.status === "In Progress") && (
              <Button size="sm" variant="secondary" icon={CalendarPlus} onClick={bookVisit}>
                {t.treatments.bookVisit}
              </Button>
            )}
            {canEdit && (
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => setSessionModal({ open: true, session: null })}>
                {t.treatments.addSession}
              </Button>
            )}
          </>
        }
      >
        {!data ? (
          relatedWaiting
        ) : data.sessions.length === 0 ? (
          <EmptyState icon={ClipboardList} title={t.treatments.noSessionsTitle} text={t.treatments.noSessionsText} />
        ) : (
          <div className={cx(refreshing && "opacity-60")}>
            <Table>
              <thead>
                <tr>
                  <Th>{t.common.date}</Th>
                  <Th>{t.common.time}</Th>
                  <Th>{t.common.doctor}</Th>
                  <Th>{t.common.status}</Th>
                  <Th>{t.common.notes}</Th>
                  {canEdit && <Th />}
                </tr>
              </thead>
              <tbody>
                {data.sessions.map((session) => (
                  <tr key={session.name} className="hover:bg-gray-50">
                    <Td className="whitespace-nowrap font-medium text-gray-800">{formatDate(session.session_date)}</Td>
                    <Td label={t.common.time} className="whitespace-nowrap">{formatTime(session.session_time)}</Td>
                    <Td label={t.common.doctor}>{display(session.doctor_name)}</Td>
                    <Td label={t.common.status}>
                      <StatusBadge kind="session" status={session.status} />
                    </Td>
                    <Td label={t.common.notes} className="max-w-[320px]">{display(session.notes)}</Td>
                    {canEdit && (
                      <Td className="text-end">
                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setSessionModal({ open: true, session })}>
                          {t.common.edit}
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

      <RecordHistory doctype="Treatment Plan" name={plan.name} changedAt={plan.modified} currency={plan.currency} />

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
        title={t.treatments.deleteTitle}
        message={<p>{t.treatments.deleteMessage}</p>}
        confirmLabel={t.treatments.deleteConfirm}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      </DetailLayout>
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
  const { t } = useI18n();
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
        toast.success(messages().treatments.sessionSaved);
      } else {
        await createDoc("Treatment Session", payload);
        toast.success(messages().treatments.sessionAdded);
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err, messages().treatments.sessionSaveFailed));
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
      toast.success(messages().treatments.sessionDeleted);
      onSaved();
    } catch (err) {
      setError(errorMessage(err, messages().treatments.sessionDeleteFailed));
      setDeleting(false);
    }
  };

  const doctorMissing = form.doctor && !doctors.some((doctor) => doctor.name === form.doctor);

  return (
    <Modal open title={session ? t.treatments.editSession : t.treatments.addSession} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label={t.common.date} required>
            <DateInput name="session_date" value={form.session_date} onChange={handleChange} required />
          </Field>
          <Field label={t.common.time}>
            <TimeInput name="session_time" value={form.session_time} onChange={handleChange} dir="ltr" />
          </Field>
        </div>
        <Field label={t.common.doctor}>
          <SelectInput name="doctor" value={form.doctor} onChange={handleChange} media={doctorMedia(doctors)}>
            <option value="">{t.treatments.selectDoctor}</option>
            {doctorMissing && <option value={form.doctor}>{session?.doctor_name || plan.doctor_name || form.doctor}</option>}
            {doctors.map((doctor) => (
              <option key={doctor.name} value={doctor.name}>
                {doctor.full_name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label={t.common.status}>
          <SelectInput name="status" value={form.status} onChange={handleChange}>
            {SESSION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {label(t.enums.sessionStatus, status)}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label={t.common.notes} hint={t.treatments.sessionNotesHint}>
          <TextArea name="notes" value={form.notes} onChange={handleChange} />
        </Field>

        {error && <Alert tone="red">{error}</Alert>}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button type="submit" loading={saving} disabled={deleting}>
            {session ? t.treatments.saveSession : t.treatments.addSession}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving || deleting}>
            {t.common.cancel}
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
              {confirmingDelete ? t.treatments.clickAgainToDelete : t.common.delete}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
