"use client";

import { useState, type FormEvent } from "react";
import { FlaskConical, PackageCheck, Pencil } from "lucide-react";
import { Alert, Badge, Button, Card, DetailList, DetailRow, Field, TextInput } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";
import { errorMessage, updateDoc } from "@/lib/frappe";
import { formatDate, todayISO } from "@/lib/format";
import type { TreatmentPlan } from "@/lib/types";

export type LabState = "none" | "at_lab" | "late" | "received";

/** Where the lab work of a plan stands. */
export function labState(plan: Pick<TreatmentPlan, "lab_sent_date" | "lab_due_date" | "lab_received_date">, today = todayISO()): LabState {
  if (plan.lab_received_date) return "received";
  if (!plan.lab_sent_date) return "none";
  return plan.lab_due_date && plan.lab_due_date < today ? "late" : "at_lab";
}

export const LAB_BADGES: Record<LabState, { tone: "gray" | "blue" | "red" | "green"; label: string }> = {
  none: { tone: "gray", label: "Not sent" },
  at_lab: { tone: "blue", label: "At the lab" },
  late: { tone: "red", label: "Late from the lab" },
  received: { tone: "green", label: "Back from the lab" },
};

/**
 * The lab work of a treatment plan (crowns, bridges, implant crowns): which lab, when it was sent, when it is
 * due back, and when it came back. People who may edit treatments change it; "Received today" is one tap.
 */
export default function LabWorkCard({ plan, canEdit, onSaved }: { plan: TreatmentPlan; canEdit: boolean; onSaved: () => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const state = labState(plan);
  const badge = LAB_BADGES[state];

  const markReceived = async () => {
    setSaving(true);
    try {
      await updateDoc("Treatment Plan", plan.name, { lab_received_date: todayISO() });
      toast.success("Lab work marked as received.");
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err, "Could not save the lab work."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <FlaskConical size={18} className="text-primary-600" />
          Lab Work
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </span>
      }
      actions={
        canEdit && (
          <>
            {(state === "at_lab" || state === "late") && (
              <Button size="sm" variant="success" icon={PackageCheck} onClick={markReceived} loading={saving}>
                Received today
              </Button>
            )}
            <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
              {state === "none" ? "Send to lab" : "Edit"}
            </Button>
          </>
        )
      }
    >
      {state === "none" ? (
        <p className="text-sm text-gray-500">Nothing sent to a lab for this plan yet.</p>
      ) : (
        <DetailList>
          <DetailRow label="Lab">{plan.lab_name}</DetailRow>
          <DetailRow label="Sent">{plan.lab_sent_date ? formatDate(plan.lab_sent_date) : ""}</DetailRow>
          <DetailRow label="Due back">
            {plan.lab_due_date ? (
              <span className={state === "late" ? "font-semibold text-red-600" : undefined}>{formatDate(plan.lab_due_date)}</span>
            ) : (
              ""
            )}
          </DetailRow>
          <DetailRow label="Received">{plan.lab_received_date ? formatDate(plan.lab_received_date) : ""}</DetailRow>
        </DetailList>
      )}
      {editing && <LabDialog plan={plan} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onSaved(); }} />}
    </Card>
  );
}

function LabDialog({ plan, onClose, onSaved }: { plan: TreatmentPlan; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({
    lab_name: plan.lab_name ?? "",
    lab_sent_date: plan.lab_sent_date || todayISO(),
    lab_due_date: plan.lab_due_date ?? "",
    lab_received_date: plan.lab_received_date ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.lab_due_date && form.lab_sent_date && form.lab_due_date < form.lab_sent_date) {
      setError("The date due back cannot be before the date it was sent.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateDoc("Treatment Plan", plan.name, {
        lab_name: form.lab_name.trim(),
        lab_sent_date: form.lab_sent_date || null,
        lab_due_date: form.lab_due_date || null,
        lab_received_date: form.lab_received_date || null,
      });
      toast.success("Lab work saved.");
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Could not save the lab work."));
      setSaving(false);
    }
  };

  return (
    <Modal open title="Lab Work" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Lab">
          <TextInput value={form.lab_name} onChange={(e) => setForm({ ...form, lab_name: e.target.value })} placeholder="e.g. Nile Dental Lab" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Sent" required>
            <TextInput type="date" value={form.lab_sent_date} onChange={(e) => setForm({ ...form, lab_sent_date: e.target.value })} required />
          </Field>
          <Field label="Due back">
            <TextInput type="date" value={form.lab_due_date} onChange={(e) => setForm({ ...form, lab_due_date: e.target.value })} />
          </Field>
        </div>
        <Field label="Received" hint="Leave empty until the work comes back.">
          <TextInput type="date" value={form.lab_received_date} onChange={(e) => setForm({ ...form, lab_received_date: e.target.value })} />
        </Field>
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
