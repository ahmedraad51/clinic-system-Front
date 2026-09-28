"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Alert, Button, Field, LinkButton, SelectInput, TextArea, Toggle } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useSession } from "@/context/SessionContext";
import { useToast } from "@/context/ToastContext";
import { createDoc, errorMessage, getList, updateDoc } from "@/lib/frappe";
import { formatDate } from "@/lib/format";
import { RECALL_CHOICES, RECALL_PATIENT_FIELDS, recallChoiceOf, recallDateFrom, recallUpdate } from "@/lib/recall";
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
  const label = (p: TreatmentPlan) => `${p.treatment_type}${p.tooth_number ? ` · tooth ${p.tooth_number}` : ""} (${p.status})`;
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
        done.push(finished ? `Visit saved and ${chosen.treatment_type} marked complete.` : "Visit notes saved to the treatment plan.");
      }
      if (recallChanged) {
        await updateDoc("Patient", appointment.patient, recallUpdate(recall, recallDate));
        done.push(
          recall === "none"
            ? "No recall for this patient."
            : recallDate
              ? `Next check-up: ${formatDate(recallDate)}.`
              : "Check-up set to the usual rule.",
        );
      }
      toast.success(done.join(" "));
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Could not save the visit."));
      setSaving(false);
    }
  };

  return (
    <Modal open title="What was done in this visit?" onClose={onClose}>
      {plans === null ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {plans.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {appointment.patient_name || appointment.patient} has no open treatment plan. Start one to keep track of
                the work and its cost.
              </p>
              <LinkButton href={`/treatments/new?patient=${encodeURIComponent(appointment.patient)}`} variant="secondary" icon={Plus}>
                New Treatment Plan
              </LinkButton>
            </div>
          ) : (
            <>
              <Field label="Treatment plan">
                <SelectInput value={plan} onChange={(event) => setPlan(event.target.value)}>
                  {plans.map((p) => (
                    <option key={p.name} value={p.name}>
                      {label(p)}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="What was done" hint="Saved as a completed session of this plan.">
                <TextArea autoFocus value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
              </Field>
              <Toggle
                checked={finished}
                onChange={setFinished}
                label="This treatment is now finished"
                description="Marks the plan Completed."
              />
            </>
          )}
          {recallBefore !== null && (
            <Field label="Next check-up" hint={recallDate ? `On ${formatDate(recallDate)}, counted from this visit.` : undefined}>
              <SelectInput value={recall} onChange={(event) => setRecall(event.target.value)}>
                {RECALL_CHOICES.map((option) => (
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
                Save Visit
              </Button>
            )}
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Skip
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
