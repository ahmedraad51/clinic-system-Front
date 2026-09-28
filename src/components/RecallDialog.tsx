"use client";

import { useState, type FormEvent } from "react";
import { Alert, Button, Field, SelectInput, TextInput } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";
import { errorMessage, updateDoc } from "@/lib/frappe";
import { formatDate } from "@/lib/format";
import { RECALL_CHOICES, recallChoiceOf, recallDateFrom, recallUpdate } from "@/lib/recall";
import type { Patient } from "@/lib/types";

/**
 * The dentist chooses when the patient should come back for a check-up: every 3, 6, 9 or 12 months (with the
 * date, counted from the last visit and editable), no recall, or the usual rule.
 */
export default function RecallDialog({
  patient,
  from,
  onClose,
  onSaved,
}: {
  patient: Pick<Patient, "name" | "full_name" | "next_recall_date" | "recall_interval_months" | "no_recall">;
  /** The day an interval counts from: the last visit, or today. */
  from: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [choice, setChoice] = useState(() => recallChoiceOf(patient));
  const [date, setDate] = useState(() => patient.next_recall_date || recallDateFrom(from, recallChoiceOf(patient)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const needsDate = Number(choice) > 0;

  const choose = (value: string) => {
    setChoice(value);
    setDate(recallDateFrom(from, value));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (needsDate && !date) {
      setError("Choose the date of the next check-up.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateDoc("Patient", patient.name, recallUpdate(choice, date));
      toast.success(
        choice === "none" ? "No recall for this patient." : needsDate ? `Next check-up: ${formatDate(date)}.` : "Check-up set to the usual rule.",
      );
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Could not save the check-up."));
      setSaving(false);
    }
  };

  return (
    <Modal open title="Next check-up" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">When should {patient.full_name} come back for a check-up?</p>
        <Field label="Check-up">
          <SelectInput value={choice} onChange={(event) => choose(event.target.value)}>
            {RECALL_CHOICES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        {needsDate && (
          <Field
            label="Next check-up on"
            hint={`Counted from ${formatDate(from)}. After each completed visit it moves on by the same interval.`}
          >
            <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </Field>
        )}
        {choice === "none" && (
          <p className="text-sm text-gray-600">The patient will not appear on the Recall list.</p>
        )}
        {choice === "" && (
          <p className="text-sm text-gray-600">
            The patient appears on the Recall list when there has been no visit for the period chosen there (6 months
            on the dashboard).
          </p>
        )}
        {error && <Alert tone="red">{error}</Alert>}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" loading={saving}>
            Save
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
