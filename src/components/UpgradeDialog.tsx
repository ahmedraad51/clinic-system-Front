"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Alert, Button, Field, SelectInput, TextArea } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { PLAN_KEYS, type PlanKey } from "@/config/sales";
import { callMethod, errorMessage } from "@/lib/frappe";
import { SUBSCRIPTION_METHODS } from "@/lib/subscription";

/** Ask for another plan: the platform owner sees the request and contacts the clinic. */
export default function UpgradeDialog({ current, onClose, onSent }: { current: PlanKey; onClose: () => void; onSent: () => void }) {
  const { t } = useI18n();
  const p = t.plan;
  const toast = useToast();
  const [plan, setPlan] = useState<PlanKey>(PLAN_KEYS.find((key) => key !== current) ?? current);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const send = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      await callMethod(SUBSCRIPTION_METHODS.requestChange, { plan, note: note.trim() });
      toast.success(p.sent);
      onSent();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open title={p.upgradeTitle} onClose={onClose}>
      <form onSubmit={send} className="space-y-4">
        <p className="text-sm text-gray-700">{p.upgradeText}</p>
        <Field label={p.newPlan}>
          <SelectInput name="plan" value={plan} onChange={(e) => setPlan(e.target.value as PlanKey)}>
            {PLAN_KEYS.map((key) => (
              <option key={key} value={key}>
                {t.site.plans[key].name}
                {key === current ? ` (${p.yourPlan})` : ""}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label={p.note}>
          <TextArea name="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} dir="auto" />
        </Field>
        {error && <Alert tone="red">{error}</Alert>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" icon={Send} loading={sending}>
            {p.send}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            {t.common.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
