"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Alert, Button, Field, LinkButton, SelectInput, TextArea, Toggle } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";
import { createDoc, errorMessage, getList, updateDoc } from "@/lib/frappe";
import type { Appointment, TreatmentPlan } from "@/lib/types";

/**
 * Shown after an appointment is marked Completed: write down what was done as a completed Treatment
 * Session on one of the patient's open plans, so the dentist's notes are kept with the treatment.
 * Everything is optional; "Skip" just closes it.
 */
export default function FinishVisitDialog({
  appointment,
  onClose,
}: {
  appointment: Pick<Appointment, "name" | "patient" | "patient_name" | "doctor" | "appointment_date" | "appointment_time">;
  onClose: () => void;
}) {
  const toast = useToast();
  const [plans, setPlans] = useState<TreatmentPlan[] | null>(null);
  const [plan, setPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<TreatmentPlan>(
          "Treatment Plan",
          ["name", "treatment_type", "tooth_number", "status", "doctor"],
          {
            filters: [["patient", "=", appointment.patient], ["status", "in", ["Planned", "In Progress"]]],
            orderBy: "name asc",
            limit: 0,
          },
        );
        if (cancelled) return;
        setPlans(rows);
        // Most likely: the plan this doctor already has in progress.
        const guess =
          rows.find((p) => p.status === "In Progress" && p.doctor === appointment.doctor) ??
          rows.find((p) => p.status === "In Progress") ??
          rows[0];
        setPlan(guess?.name ?? "");
      } catch (err) {
        console.error(err);
        if (!cancelled) setPlans([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [appointment.patient, appointment.doctor]);

  const chosen = plans?.find((p) => p.name === plan);
  const label = (p: TreatmentPlan) => `${p.treatment_type}${p.tooth_number ? ` · tooth ${p.tooth_number}` : ""} (${p.status})`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chosen) return;
    setSaving(true);
    setError("");
    try {
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
      toast.success(finished ? `Visit saved and ${chosen.treatment_type} marked complete.` : "Visit notes saved to the treatment plan.");
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Could not save the visit notes."));
      setSaving(false);
    }
  };

  return (
    <Modal open title="What was done in this visit?" onClose={onClose}>
      {plans === null ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : plans.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {appointment.patient_name || appointment.patient} has no open treatment plan. Start one to keep track of the
            work and its cost.
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/treatments/new?patient=${encodeURIComponent(appointment.patient)}`} icon={Plus}>
              New Treatment Plan
            </LinkButton>
            <Button variant="secondary" onClick={onClose}>
              Skip
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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
          {error && <Alert tone="red">{error}</Alert>}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" loading={saving}>
              Save Visit
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Skip
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
