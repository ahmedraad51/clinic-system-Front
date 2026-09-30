"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Pencil, Pill, Printer, Trash2 } from "lucide-react";
import RequirePermission from "@/components/Guard";
import PrescriptionWarnings from "@/components/PrescriptionWarnings";
import { RxFooter, RxHeader, RxSignature } from "@/components/RxPaper";
import { Button, Card, LinkButton, NotFoundCard, PageContainer, PageHeader, RecordLoading } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useToast } from "@/context/ToastContext";
import { label } from "@/i18n";
import { deleteDoc, errorMessage, getList } from "@/lib/frappe";
import { display, formatDate, formatTime } from "@/lib/format";
import { useDocument } from "@/lib/hooks";
import { appointmentHref, patientHref, prescriptionHref, routeId } from "@/lib/links";
import { MEDICINE_FIELDS, PRESCRIPTION_PATIENT_FIELDS, prescriptionWarnings, type PatientForPrescription } from "@/lib/prescriptions";
import { RX_PAPER_FIELDS, rxPageCss, rxPaperOf } from "@/lib/rxPaper";
import type { Appointment, DentalMedicine, Doctor, Patient, Prescription } from "@/lib/types";

export default function PrescriptionDetailPage() {
  return (
    <RequirePermission permission="view_treatments">
      <PrescriptionDetail />
    </RequirePermission>
  );
}

interface Checked {
  key: string;
  patient: PatientForPrescription | null;
  medicines: DentalMedicine[];
}

/**
 * A prescription, printable on the clinic letterhead: the patient, the doctor, each medicine with its dose, how
 * often and for how long, the instructions and the doctor's signature line. On screen it also shows the safety
 * warnings for this patient (never printed).
 */
function PrescriptionDetail() {
  const { t } = useI18n();
  const p = t.prescriptions;
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { can } = useSession();
  const id = routeId(params.id);
  const { doc, loading, notFound, error } = useDocument<Prescription>("Prescription", id);
  const [checked, setChecked] = useState<Checked | null>(null);
  const [visit, setVisit] = useState<Appointment | null>(null);
  // The doctor's paper: size, own heading or pre-printed paper, signature.
  const [paperOf, setPaperOf] = useState<{ doctor: string; row: Doctor | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const patientId = doc?.patient ?? "";
  const medicineIds = (doc?.medicines ?? []).map((row) => row.medicine).filter(Boolean).join("|");

  // The patient's alerts and the medicines' flags, for the warnings.
  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    const key = `${patientId}|${medicineIds}`;
    const load = async () => {
      try {
        const [patients, medicines] = await Promise.all([
          getList<Patient>("Patient", PRESCRIPTION_PATIENT_FIELDS, { filters: [["name", "=", patientId]], limit: 1 }),
          medicineIds
            ? getList<DentalMedicine>("Dental Medicine", MEDICINE_FIELDS, { filters: [["name", "in", medicineIds.split("|")]], limit: 0 })
            : Promise.resolve([]),
        ]);
        if (!cancelled) setChecked({ key, patient: patients[0] ?? null, medicines });
      } catch (err) {
        // The paper still prints; only the warnings are missing.
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [patientId, medicineIds]);

  const doctorId = doc?.doctor ?? "";
  useEffect(() => {
    if (!doctorId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<Doctor>("Doctor", ["name", "full_name", "specialization", ...RX_PAPER_FIELDS], {
          filters: [["name", "=", doctorId]],
          limit: 1,
        });
        if (!cancelled) setPaperOf({ doctor: doctorId, row: rows[0] ?? null });
      } catch (err) {
        // The clinic's plain paper, then.
        console.error(err);
        if (!cancelled) setPaperOf({ doctor: doctorId, row: null });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  // The visit's date and time, so the page does not show its ID.
  const appointmentId = doc?.appointment ?? "";
  useEffect(() => {
    if (!appointmentId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<Appointment>("Appointment", ["name", "appointment_date", "appointment_time"], {
          filters: [["name", "=", appointmentId]],
          limit: 1,
        });
        if (!cancelled) setVisit(rows[0] ?? null);
      } catch (err) {
        // The link still works; it shows the ID instead.
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  if (loading) return <RecordLoading />;
  if (notFound || !doc) {
    return <NotFoundCard error={error} what={label(t.enums.doctype, "Prescription")} backHref="/patients" backLabel={p.backToPatients} />;
  }

  const canWrite = can("add_treatments");
  const ready = checked?.key === `${patientId}|${medicineIds}` ? checked : null;
  const warnings = ready ? prescriptionWarnings(ready.patient, doc.medicines ?? [], new Map(ready.medicines.map((m) => [m.name, m]))) : [];
  const age = Number(ready?.patient?.age) || 0;
  const paperDoctor = paperOf?.doctor === doc.doctor ? paperOf : null;
  const paper = rxPaperOf(paperDoctor?.row);
  const doctorName = doc.doctor_name || paperDoctor?.row?.full_name || doc.doctor;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDoc("Prescription", id);
      toast.success(p.deleted);
      router.push(patientHref(doc.patient));
    } catch (err) {
      toast.error(errorMessage(err, p.deleteFailed));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <PageContainer section="treatments" narrow>
      <PageHeader
        title={p.title}
        subtitle={
          <>
            {doc.patient_name || doc.patient}
            {t.common.dot}
            <span dir="ltr">{id}</span>
          </>
        }
        back={{ href: patientHref(doc.patient), label: doc.patient_name || p.backPatient }}
        actions={
          <>
            <Button variant="secondary" icon={Printer} onClick={() => window.print()} disabled={!paperDoctor}>
              {t.common.print}
            </Button>
            {canWrite && (
              <LinkButton href={`${prescriptionHref(id)}/edit`} icon={Pencil}>
                {t.common.edit}
              </LinkButton>
            )}
            {canWrite && (
              <Button
                variant="ghost"
                icon={Trash2}
                onClick={() => setConfirmDelete(true)}
                aria-label={p.deleteLabel}
                title={p.deleteLabel}
                className="text-red-600 hover:bg-red-50 px-3"
              />
            )}
          </>
        }
      />

      {ready && <PrescriptionWarnings warnings={warnings} quiet />}
      {/* The doctor's page size and, on pre-printed paper, room for its header and footer. */}
      <style>{rxPageCss(paper)}</style>
      {paperDoctor && (
        <p data-testid="rx-prints-on" className="text-xs text-gray-500 print:hidden">
          {t.rxPaper.printsOn(doctorName, paper.size)}
        </p>
      )}

      <Card className="print:shadow-none print:border-0">
        <RxHeader
          paper={paper}
          doctorName={doctorName}
          specialization={label(t.enums.specialization, paperDoctor?.row?.specialization)}
          reference={<span dir="ltr">{id}</span>}
          date={formatDate(doc.prescription_date)}
        />

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 py-5">
          <div>
            <dt className="text-xs text-gray-500">{t.common.patient}</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">
              <Link href={patientHref(doc.patient)} className="hover:text-primary-600">
                {doc.patient_name || doc.patient}
              </Link>
              <span className="block text-xs font-normal text-gray-500">
                {age > 0 && (
                  <>
                    {t.common.years(age)}
                    {t.common.dot}
                  </>
                )}
                <span dir="ltr">{doc.patient}</span>
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">{t.common.doctor}</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">{display(doc.doctor_name || doc.doctor)}</dd>
          </div>
          {doc.appointment && (
            <div className="col-span-2 print:hidden">
              <dt className="text-xs text-gray-500">{p.visit}</dt>
              <dd className="text-sm font-medium text-gray-800 mt-0.5">
                <Link href={appointmentHref(doc.appointment)} className="text-primary-600 hover:underline">
                  {visit?.name === doc.appointment
                    ? p.visitWhen(formatDate(visit.appointment_date), formatTime(visit.appointment_time))
                    : doc.appointment}
                </Link>
              </dd>
            </div>
          )}
        </dl>

        <div className="border-t border-gray-100 pt-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Pill size={16} className="text-primary-600 print:hidden" aria-hidden="true" />
            {p.rx}
          </p>
          <ol className="mt-3 space-y-3">
            {(doc.medicines ?? []).map((row, index) => (
              <li key={`${row.medicine}-${index}`} className="flex gap-3">
                <span className="w-6 shrink-0 text-sm font-semibold text-gray-500">{p.itemNumber(index + 1)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{row.medicine_name || row.medicine}</p>
                  <p className="text-sm text-gray-700">
                    {[row.dose, label(t.enums.frequency, row.frequency), row.duration_days ? p.days(Number(row.duration_days)) : ""]
                      .filter(Boolean)
                      .join(t.common.dot)}
                  </p>
                  {row.instructions && <p className="text-sm text-gray-500">{row.instructions}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {doc.notes && (
          <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 whitespace-pre-line print:bg-white print:border print:border-gray-300">
            {doc.notes}
          </div>
        )}

        <RxSignature paper={paper} doctorName={doctorName} label={p.signature} />
        <RxFooter paper={paper} />
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        title={p.deleteTitle}
        message={<p>{p.deleteMessage(formatDate(doc.prescription_date))}</p>}
        confirmLabel={p.deleteConfirm}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </PageContainer>
  );
}
