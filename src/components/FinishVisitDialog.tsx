"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRecordDialogs } from "@/components/RecordDialogs";
import { Plus } from "lucide-react";
import { Alert, Button, Field, SelectInput, TextArea, Toggle } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { label } from "@/i18n";
import { useToast } from "@/context/ToastContext";
import { createDoc, errorMessage, getList, updateDoc } from "@/lib/frappe";
import { formatDate } from "@/lib/format";
import { RECALL_PATIENT_FIELDS, recallChoiceOf, recallChoices, recallDateFrom, recallUpdate } from "@/lib/recall";
import type { Appointment, Patient, TreatmentPlan } from "@/lib/types";

/**
 * Shown after an appointment is marked Completed: write down what was done as a completed Treatment
 * Session on one of the patient's open plans, so the dentist's notes are kept with the treatment, and choose
 * when the patient should come back for a check-up. Everything is optional; "Skip" just closes it.
 */
export default function FinishVisitDialog({
  appointment,
  onClose,
}: {
  appointment: Pick<Appointment, "name" | "patient" | "patient_name" | "doctor" | "appointment_date" | "appointment_time">;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const openDialog = useRecordDialogs();
  const toast = useToast();
  const { can } = useSession();
  const canRecall = can("edit_patients");
  const [plans, setPlans] = useState<TreatmentPlan[] | null>(null);
  const [plan, setPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [finished, setFinished] = useState(false);
  // The patient's recall when the dialog opened (null: not loaded or not allowed), and the dentist's choice.
  const [recallBefore, setRecallBefore] = useState<string | null>(null);
  const [recall, setRecall] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [rows, patients] = await Promise.all([
          getList<TreatmentPlan>("Treatment Plan", ["name", "treatment_type", "tooth_number", "status", "doctor"], {
            filters: [["patient", "=", appointment.patient], ["status", "in", ["Planned", "In Progress"]]],
            orderBy: "name asc",
            limit: 0,
          }),
          canRecall
            ? getList<Patient>("Patient", RECALL_PATIENT_FIELDS, { filters: [["name", "=", appointment.patient]], limit: 1 })
            : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setPlans(rows);
        // Most likely: the plan this doctor already has in progress.
        const guess =
          rows.find((p) => p.status === "In Progress" && p.doctor === appointment.doctor) ??
          rows.find((p) => p.status === "In Progress") ??
          rows[0];
        setPlan(guess?.name ?? "");
        if (patients[0]) {
          const current = recallChoiceOf(patients[0]);
          setRecallBefore(current);
          setRecall(current);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setPlans([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [appointment.patient, appointment.doctor, canRecall]);

  const chosen = plans?.find((p) => p.name === plan);
  const planLabel = (p: TreatmentPlan) =>
    t.finishVisit.planLabel(
      label(t.enums.treatmentType, p.treatment_type),
      p.tooth_number ? String(p.tooth_number) : "",
      label(t.enums.treatmentStatus, p.status),
    );
  // An interval counts from this visit.
  const recallDate = recallDateFrom(appointment.appointment_date, recall);
  const recallChanged = recallBefore !== null && recall !== recallBefore;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chosen && !recallChanged) return;
    setSaving(true);
    setError("");
    try {
      const done: string[] = [];
      if (chosen) {
        await createDoc("Treatment Session", {
          patient: appointment.patient,
          treatment_plan: chosen.name,
          doctor: appointment.doctor || null,
          session_date: appointment.appointment_date,
          session_time: (appointment.appointment_time || "").slice(0, 5) || null,
          status: "Completed",
          notes: notes.trim(),
        });
        // Starting work moves a plan to In Progress; the dentist says when it is finished.
        const status = finished ? "Completed" : chosen.status === "Planned" ? "In Progress" : null;
        if (status) await updateDoc("Treatment Plan", chosen.name, { status });
        done.push(
          finished
            ? t.finishVisit.sessionSaved(label(t.enums.treatmentType, chosen.treatment_type))
            : t.finishVisit.notesSaved,
        );
      }
      if (recallChanged) {
        await updateDoc("Patient", appointment.patient, recallUpdate(recall, recallDate));
        done.push(
          recall === "none"
            ? t.finishVisit.noRecall
            : recallDate
              ? t.finishVisit.recallSet(formatDate(recallDate))
              : t.finishVisit.usualRule,
        );
      }
      toast.success(done.join(" "));
      onClose();
    } catch (err) {
      setError(errorMessage(err, t.finishVisit.saveFailed));
      setSaving(false);
    }
  };

  return (
    <Modal open title={t.finishVisit.title} onClose={onClose}>
      {plans === null ? (
        <p className="text-sm text-gray-500">{t.common.loading}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {plans.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">{t.finishVisit.noPlan(appointment.patient_name || appointment.patient)}</p>
              {can("add_treatments") && (
                <Button
                  variant="secondary"
                  icon={Plus}
                  onClick={() => {
                    onClose();
                    openDialog({ kind: "newTreatment", prefill: { patient: appointment.patient }, patientName: appointment.patient_name });
                  }}
                >
                  {t.finishVisit.newPlan}
                </Button>
              )}
            </div>
          ) : (
            <>
              <Field label={t.finishVisit.plan}>
                <SelectInput value={plan} onChange={(event) => setPlan(event.target.value)}>
                  {plans.map((p) => (
                    <option key={p.name} value={p.name}>
                      {planLabel(p)}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label={t.finishVisit.whatWasDone} hint={t.finishVisit.whatHint}>
                <TextArea autoFocus value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
              </Field>
              <Toggle
                checked={finished}
                onChange={setFinished}
                label={t.finishVisit.finished}
                description={t.finishVisit.finishedHint}
              />
            </>
          )}
          {recallBefore !== null && (
            <Field label={t.finishVisit.nextCheckup} hint={recallDate ? t.finishVisit.recallHint(formatDate(recallDate)) : undefined}>
              <SelectInput value={recall} onChange={(event) => setRecall(event.target.value)}>
                {recallChoices().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
          )}
          {error && <Alert tone="red">{error}</Alert>}
          <div className="flex flex-wrap gap-2 pt-2">
            {(plans.length > 0 || recallChanged) && (
              <Button type="submit" loading={saving}>
                {t.finishVisit.saveVisit}
              </Button>
            )}
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              {t.finishVisit.skip}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
