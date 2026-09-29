"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Pencil, Pill, Printer, Trash2 } from "lucide-react";
import ClinicLetterhead from "@/components/ClinicLetterhead";
import RequirePermission from "@/components/Guard";
import PrescriptionWarnings from "@/components/PrescriptionWarnings";
import { Button, Card, LinkButton, NotFoundCard, PageContainer, PageHeader, RecordLoading } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useSession } from "@/context/SessionContext";
import { useToast } from "@/context/ToastContext";
import { deleteDoc, errorMessage, getList } from "@/lib/frappe";
import { display, formatDate } from "@/lib/format";
import { useDocument } from "@/lib/hooks";
import { appointmentHref, patientHref, prescriptionHref, routeId } from "@/lib/links";
import { MEDICINE_FIELDS, PRESCRIPTION_PATIENT_FIELDS, prescriptionWarnings, type PatientForPrescription } from "@/lib/prescriptions";
import type { DentalMedicine, Patient, Prescription } from "@/lib/types";

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
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { can } = useSession();
  const id = routeId(params.id);
  const { doc, loading, notFound, error } = useDocument<Prescription>("Prescription", id);
  const [checked, setChecked] = useState<Checked | null>(null);
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

  if (loading) return <RecordLoading />;
  if (notFound || !doc) return <NotFoundCard error={error} what="Prescription" backHref="/patients" backLabel="Back to Patients" />;

  const canWrite = can("add_treatments");
  const ready = checked?.key === `${patientId}|${medicineIds}` ? checked : null;
  const warnings = ready ? prescriptionWarnings(ready.patient, doc.medicines ?? [], new Map(ready.medicines.map((m) => [m.name, m]))) : [];
  const patientLine = [ready?.patient?.age ? `${ready.patient.age} years` : "", doc.patient].filter(Boolean).join(" · ");

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDoc("Prescription", id);
      toast.success("Prescription deleted.");
      router.push(patientHref(doc.patient));
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete the prescription."));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <PageContainer narrow>
      <PageHeader
        title="Prescription"
        subtitle={`${doc.patient_name || doc.patient} · ${id}`}
        back={{ href: patientHref(doc.patient), label: doc.patient_name || "Patient" }}
        actions={
          <>
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              Print
            </Button>
            {canWrite && (
              <LinkButton href={`${prescriptionHref(id)}/edit`} icon={Pencil}>
                Edit
              </LinkButton>
            )}
            {canWrite && (
              <Button
                variant="ghost"
                icon={Trash2}
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete prescription"
                title="Delete prescription"
                className="text-red-600 hover:bg-red-50 px-3"
              />
            )}
          </>
        }
      />

      {ready && <PrescriptionWarnings warnings={warnings} quiet />}

      <Card className="print:shadow-none print:border-0">
        <ClinicLetterhead kind="Prescription" reference={id} date={formatDate(doc.prescription_date)} />

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 py-5">
          <div>
            <dt className="text-xs text-gray-500">Patient</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">
              <Link href={patientHref(doc.patient)} className="hover:text-primary-600">
                {doc.patient_name || doc.patient}
              </Link>
              {patientLine && <span className="block text-xs font-normal text-gray-500">{patientLine}</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Doctor</dt>
            <dd className="text-sm font-medium text-gray-800 mt-0.5">{display(doc.doctor_name || doc.doctor)}</dd>
          </div>
          {doc.appointment && (
            <div className="col-span-2 print:hidden">
              <dt className="text-xs text-gray-500">Visit</dt>
              <dd className="text-sm font-medium text-gray-800 mt-0.5">
                <Link href={appointmentHref(doc.appointment)} className="text-primary-600 hover:underline">
                  {doc.appointment}
                </Link>
              </dd>
            </div>
          )}
        </dl>

        <div className="border-t border-gray-100 pt-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Pill size={16} className="text-primary-600 print:hidden" aria-hidden="true" />
            Rx
          </p>
          <ol className="mt-3 space-y-3">
            {(doc.medicines ?? []).map((row, index) => (
              <li key={`${row.medicine}-${index}`} className="flex gap-3">
                <span className="w-6 shrink-0 text-sm font-semibold text-gray-500">{index + 1}.</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{row.medicine_name || row.medicine}</p>
                  <p className="text-sm text-gray-700">
                    {[row.dose, row.frequency, row.duration_days ? `${row.duration_days} days` : ""].filter(Boolean).join(" · ")}
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

        <div className="mt-12 grid grid-cols-2 gap-10 text-xs text-gray-500">
          <div />
          <div className="border-t border-gray-300 pt-2">
            Doctor&apos;s signature
            {doc.doctor_name && <span className="block text-gray-700">{doc.doctor_name}</span>}
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this prescription?"
        message={<p>The prescription of {formatDate(doc.prescription_date)} will be removed for good.</p>}
        confirmLabel="Delete Prescription"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </PageContainer>
  );
}
