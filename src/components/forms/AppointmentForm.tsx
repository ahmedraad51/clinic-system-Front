"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Save } from "lucide-react";
import { Alert, Button, Card, Field, FormActions, LinkButton, SelectInput, TextArea, TextInput } from "@/components/ui";
import MedicalAlerts from "@/components/MedicalAlerts";
import UnsavedChangesGuard from "@/components/UnsavedChangesGuard";
import { ConfirmDialog } from "@/components/ui/Modal";
import LinkSelect from "@/components/ui/LinkSelect";
import { errorMessage, getList } from "@/lib/frappe";
import { cx, formatDate, formatTime, fromMinutes, toMinutes, todayISO } from "@/lib/format";
import { useDoctors, usePatientMedical } from "@/lib/hooks";
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
  // A new booking with no doctor given starts with the doctor used last time on this computer.
  const [remembered] = useState(() => (!currentName && !initial.doctor ? readLastDoctor() : null));
  // What the form started with, to tell whether anything was changed.
  const [baseline] = useState<AppointmentFormData>(() =>
    remembered ? { ...initial, doctor: remembered.name } : initial,
  );
  const [form, setForm] = useState<AppointmentFormData>(baseline);
  // The chosen patient's medical alerts, shown while booking or planning treatment.
  const medical = usePatientMedical(form.patient || undefined);
  const [saving, setSaving] = useState(false);
  // Set once saved, so the page can move on without the unsaved-changes question.
  const [done, setDone] = useState(false);
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
      setDone(true);
      const doctor = doctors.find((d) => d.name === form.doctor);
      if (doctor) saveLastDoctor({ name: doctor.name, full_name: doctor.full_name });
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

  const dirty = !done && JSON.stringify(form) !== JSON.stringify(baseline);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <UnsavedChangesGuard when={dirty} />
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
          {medical && (
            <div className="sm:col-span-2">
              <MedicalAlerts patient={medical} />
            </div>
          )}
          <Field label="Doctor" required className="sm:col-span-2">
            <SelectInput name="doctor" value={form.doctor} onChange={handleChange} required>
              <option value="">Select Doctor</option>
              {doctorMissing && (
                <option value={form.doctor}>
                  {doctorLabel || (remembered?.name === form.doctor ? remembered.full_name : form.doctor)}
                </option>
              )}
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
          {form.doctor && form.appointment_date && (
            <DoctorDay
              doctor={form.doctor}
              doctorName={doctors.find((d) => d.name === form.doctor)?.full_name || doctorLabel || remembered?.full_name}
              date={form.appointment_date}
              time={form.appointment_time}
              duration={Number(form.duration_minutes) || 30}
              currentName={currentName}
              openingTime={settings.opening_time}
              closingTime={settings.closing_time}
              onPick={(appointment_time) => setForm({ ...form, appointment_time })}
            />
          )}
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

      <FormActions>
        <Button type="submit" icon={Save} loading={saving}>
          {submitLabel}
        </Button>
        <LinkButton href={cancelHref} variant="secondary">
          Cancel
        </LinkButton>
      </FormActions>

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

/* -------------------------------------------------- last doctor used -- */

const LAST_DOCTOR_KEY = "last_doctor";

interface RememberedDoctor {
  name: string;
  full_name: string;
}

function readLastDoctor(): RememberedDoctor | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = JSON.parse(localStorage.getItem(LAST_DOCTOR_KEY) || "null") as Partial<RememberedDoctor> | null;
    if (raw && typeof raw.name === "string" && raw.name) return { name: raw.name, full_name: String(raw.full_name || raw.name) };
  } catch {
    // Storage is off or holds something else; start without a doctor.
  }
  return null;
}

function saveLastDoctor(doctor: RememberedDoctor): void {
  try {
    localStorage.setItem(LAST_DOCTOR_KEY, JSON.stringify(doctor));
  } catch {
    // Not remembering is fine.
  }
}

/* -------------------------------------------------- the doctor's day -- */

const STEP = 15;

/**
 * The chosen doctor's bookings on the chosen date, and the free times that fit the chosen length,
 * so the receptionist can pick a time with one tap instead of guessing.
 */
function DoctorDay({
  doctor,
  doctorName,
  date,
  time,
  duration,
  currentName,
  openingTime,
  closingTime,
  onPick,
}: {
  doctor: string;
  doctorName?: string;
  date: string;
  time: string;
  duration: number;
  currentName?: string;
  openingTime?: string;
  closingTime?: string;
  onPick: (time: string) => void;
}) {
  const key = `${doctor}|${date}`;
  const [result, setResult] = useState<{ key: string; rows: Appointment[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const [forDoctor, forDate] = key.split("|");
    const load = async () => {
      try {
        const rows = await getList<Appointment>(
          "Appointment",
          ["name", "patient_name", "appointment_time", "duration_minutes", "status"],
          {
            filters: [
              ["doctor", "=", forDoctor],
              ["appointment_date", "=", forDate],
              ["status", "not in", ["Cancelled", "No Show"]],
            ],
            orderBy: "appointment_time asc",
            limit: 0,
          },
        );
        if (!cancelled) setResult({ key, rows });
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const loaded = result?.key === key;
  const booked = (loaded ? result.rows : []).filter((a) => a.name !== currentName);
  const span = (a: Appointment) => {
    const start = toMinutes(a.appointment_time);
    return { start, end: start + (Number(a.duration_minutes) || 30) };
  };
  const overlaps = (start: number, end: number) =>
    booked.find((a) => {
      const other = span(a);
      return other.start < end && start < other.end;
    });

  const today = todayISO();
  const open = toMinutes(openingTime) || 9 * 60;
  const close = toMinutes(closingTime) || 18 * 60;
  const now = new Date();
  const earliest = date === today ? Math.max(open, Math.ceil((now.getHours() * 60 + now.getMinutes()) / STEP) * STEP) : open;
  const free: number[] = [];
  if (date >= today) {
    for (let t = earliest; t + duration <= close && free.length < 8; t += STEP) {
      if (!overlaps(t, t + duration)) free.push(t);
    }
  }
  const chosen = time ? toMinutes(time) : null;
  const clash = chosen !== null ? overlaps(chosen, chosen + duration) : undefined;

  return (
    <div className="sm:col-span-2 rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3" aria-live="polite">
      <p className="text-sm font-semibold text-gray-700">
        {doctorName ? `${doctorName}, ` : ""}
        {formatDate(date)}
      </p>
      {!loaded ? (
        <p className="text-sm text-gray-500">Loading the doctor&apos;s day...</p>
      ) : (
        <>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Booked</p>
            {booked.length === 0 ? (
              <p className="text-sm text-gray-600">Nothing booked yet.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {booked.map((a) => {
                  const { start, end } = span(a);
                  return (
                    <li key={a.name} className="rounded-lg bg-white border border-gray-200 px-2.5 py-1 text-xs text-gray-700">
                      <span className="font-semibold">
                        {formatTime(fromMinutes(start))}–{formatTime(fromMinutes(end))}
                      </span>{" "}
                      {a.patient_name}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {date < today ? (
            <p className="text-sm text-amber-700">This date is in the past.</p>
          ) : (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Free for {duration} minutes — tap to choose</p>
              {free.length === 0 ? (
                <p className="text-sm text-gray-600">No free time of {duration} minutes left in clinic hours on this day.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {free.map((t, index) => {
                    const value = fromMinutes(t);
                    const selected = value === time;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onPick(value)}
                        aria-pressed={selected}
                        className={cx(
                          "min-h-9 pointer-coarse:min-h-11 px-3 rounded-lg border text-sm font-medium transition",
                          selected
                            ? "bg-primary-600 border-primary-600 text-white"
                            : "bg-white border-gray-200 text-gray-700 hover:border-primary-300",
                        )}
                      >
                        {index === 0 && !selected ? `Next free: ${formatTime(value)}` : formatTime(value)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {clash && (
            <p className="text-sm font-medium text-amber-700">
              {formatTime(time)} overlaps {clash.patient_name || "another appointment"} at {formatTime(clash.appointment_time)}.
            </p>
          )}
        </>
      )}
    </div>
  );
}
