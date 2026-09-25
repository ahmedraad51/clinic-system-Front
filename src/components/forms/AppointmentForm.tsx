"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Save } from "lucide-react";
import { Alert, Button, Card, Field, LinkButton, SelectInput, TextArea, TextInput } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/Modal";
import LinkSelect from "@/components/ui/LinkSelect";
import { errorMessage, getList } from "@/lib/frappe";
import { formatDate, formatTime, toMinutes } from "@/lib/format";
import { useDoctors } from "@/lib/hooks";
import { useSettings } from "@/context/SettingsContext";
import { APPOINTMENT_STATUSES, DURATIONS, type Appointment } from "@/lib/types";

export interface AppointmentFormData {
  patient: string;
  doctor: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: string;
  status: string;
  reason_for_visit: string;
  notes: string;
}

export const EMPTY_APPOINTMENT: AppointmentFormData = {
  patient: "",
  doctor: "",
  appointment_date: "",
  appointment_time: "",
  duration_minutes: "30",
  status: "Scheduled",
  reason_for_visit: "",
  notes: "",
};

export function appointmentToForm(appointment: Appointment): AppointmentFormData {
  return {
    patient: appointment.patient ?? "",
    doctor: appointment.doctor ?? "",
    appointment_date: appointment.appointment_date ?? "",
    // Frappe sends times as "10:00:00"; the time input wants "10:00".
    appointment_time: (appointment.appointment_time ?? "").slice(0, 5),
    duration_minutes: String(appointment.duration_minutes || 30),
    status: appointment.status ?? "Scheduled",
    reason_for_visit: appointment.reason_for_visit ?? "",
    notes: appointment.notes ?? "",
  };
}

export function appointmentPayload(form: AppointmentFormData) {
  return { ...form, duration_minutes: Number(form.duration_minutes) || 30 };
}

type InputEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

/** Another appointment for the same doctor that overlaps the chosen time, if any. */
async function findClash(form: AppointmentFormData, currentName?: string): Promise<Appointment | undefined> {
  const sameDay = await getList<Appointment>(
    "Appointment",
    ["name", "patient_name", "appointment_time", "duration_minutes"],
    {
      filters: [
        ["doctor", "=", form.doctor],
        ["appointment_date", "=", form.appointment_date],
        ["status", "not in", ["Cancelled", "No Show"]],
        ["name", "!=", currentName ?? ""],
      ],
      limit: 0,
    },
  );
  const start = toMinutes(form.appointment_time);
  const end = start + (Number(form.duration_minutes) || 30);
  return sameDay.find((other) => {
    const otherStart = toMinutes(other.appointment_time);
    const otherEnd = otherStart + (Number(other.duration_minutes) || 30);
    return otherStart < end && start < otherEnd;
  });
}

export default function AppointmentForm({
  initial,
  currentName,
  patientLabel,
  doctorLabel,
  showStatus = false,
  submitLabel,
  cancelHref,
  onSubmit,
}: {
  initial: AppointmentFormData;
  /** The appointment being edited, so it does not clash with itself. */
  currentName?: string;
  patientLabel?: string;
  doctorLabel?: string;
  showStatus?: boolean;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: AppointmentFormData) => Promise<void>;
}) {
  const { settings } = useSettings();
  const doctors = useDoctors();
  const [form, setForm] = useState<AppointmentFormData>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clash, setClash] = useState<Appointment | null>(null);

  const handleChange = (event: InputEvent) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await onSubmit(form);
    } catch (err) {
      console.error(err);
      setError(errorMessage(err, "Could not save the appointment. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Only look for clashes when the booking slot changed, and never for cancelled or missed visits.
    const slotChanged =
      // A new booking is always checked, even when the calendar filled in the slot.
      !currentName ||
      form.doctor !== initial.doctor ||
      form.appointment_date !== initial.appointment_date ||
      form.appointment_time !== initial.appointment_time ||
      form.duration_minutes !== initial.duration_minutes;
    if (!slotChanged || form.status === "Cancelled" || form.status === "No Show") {
      await save();
      return;
    }
    setSaving(true);
    setError("");
    try {
      const found = await findClash(form, currentName);
      if (found) {
        setClash(found);
        setSaving(false);
        return;
      }
    } catch (err) {
      // The check is only a warning; if it fails, still let the booking go through.
      console.error(err);
    }
    await save();
  };

  const doctorMissing = form.doctor && !doctors.some((doctor) => doctor.name === form.doctor);
  const hours =
    settings.opening_time && settings.closing_time
      ? `Clinic hours: ${formatTime(settings.opening_time)} to ${formatTime(settings.closing_time)}`
      : undefined;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Patient" required className="sm:col-span-2">
            <LinkSelect
              doctype="Patient"
              value={form.patient}
              onChange={(patient) => setForm({ ...form, patient })}
              detailField="phone_number"
              initialLabel={patientLabel}
              placeholder="Search by name or phone..."
              required
            />
          </Field>
          <Field label="Doctor" required className="sm:col-span-2">
            <SelectInput name="doctor" value={form.doctor} onChange={handleChange} required>
              <option value="">Select Doctor</option>
              {doctorMissing && <option value={form.doctor}>{doctorLabel || form.doctor}</option>}
              {doctors.map((doctor) => (
                <option key={doctor.name} value={doctor.name}>
                  {doctor.specialization ? `${doctor.full_name} · ${doctor.specialization}` : doctor.full_name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Date" required>
            <TextInput type="date" name="appointment_date" value={form.appointment_date} onChange={handleChange} required />
          </Field>
          <Field label="Time" required hint={hours}>
            <TextInput type="time" name="appointment_time" value={form.appointment_time} onChange={handleChange} required />
          </Field>
          <Field label="Duration">
            <SelectInput name="duration_minutes" value={form.duration_minutes} onChange={handleChange}>
              {DURATIONS.map((minutes) => (
                <option key={minutes} value={String(minutes)}>
                  {minutes} minutes
                </option>
              ))}
            </SelectInput>
          </Field>
          {showStatus && (
            <Field label="Status">
              <SelectInput name="status" value={form.status} onChange={handleChange}>
                {APPOINTMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </SelectInput>
            </Field>
          )}
          <Field label="Reason for Visit" className="sm:col-span-2">
            <TextInput name="reason_for_visit" value={form.reason_for_visit} onChange={handleChange} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <TextArea name="notes" value={form.notes} onChange={handleChange} />
          </Field>
        </div>
      </Card>

      {error && <Alert tone="red">{error}</Alert>}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" icon={Save} loading={saving}>
          {submitLabel}
        </Button>
        <LinkButton href={cancelHref} variant="secondary">
          Cancel
        </LinkButton>
      </div>

      <ConfirmDialog
        open={clash !== null}
        title="This doctor is already booked"
        danger={false}
        confirmLabel="Book anyway"
        busy={saving}
        message={
          clash && (
            <p>
              The doctor already has an appointment with <strong>{clash.patient_name || clash.name}</strong> on{" "}
              {formatDate(form.appointment_date)} at {formatTime(clash.appointment_time)} that overlaps this time.
            </p>
          )
        }
        onCancel={() => setClash(null)}
        onConfirm={async () => {
          await save();
          setClash(null);
        }}
      />
    </form>
  );
}
