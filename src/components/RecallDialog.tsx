"use client";

import { useState, type FormEvent } from "react";
import { Alert, Button, DateInput, Field, SelectInput } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { errorMessage, updateDoc } from "@/lib/frappe";
import { formatDate } from "@/lib/format";
import { recallChoiceOf, recallChoices, recallDateFrom, recallUpdate } from "@/lib/recall";
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
  const { t } = useI18n();
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
      setError(t.recall.chooseDate);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateDoc("Patient", patient.name, recallUpdate(choice, date));
      toast.success(
        choice === "none" ? t.recall.savedNone : needsDate ? t.recall.savedDate(formatDate(date)) : t.recall.savedUsual,
      );
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err, t.recall.saveFailed));
      setSaving(false);
    }
  };

  return (
    <Modal open title={t.recall.dialogTitle} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">{t.recall.dialogQuestion(patient.full_name)}</p>
        <Field label={t.recall.checkUp}>
          <SelectInput value={choice} onChange={(event) => choose(event.target.value)}>
            {recallChoices().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        {needsDate && (
          <Field label={t.recall.nextOn} hint={t.recall.countedFrom(formatDate(from))}>
            <DateInput value={date} onChange={(event) => setDate(event.target.value)} required />
          </Field>
        )}
        {choice === "none" && <p className="text-sm text-gray-600">{t.recall.noneHint}</p>}
        {choice === "" && <p className="text-sm text-gray-600">{t.recall.usualHint}</p>}
        {error && <Alert tone="red">{error}</Alert>}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" loading={saving}>
            {t.common.save}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t.common.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
