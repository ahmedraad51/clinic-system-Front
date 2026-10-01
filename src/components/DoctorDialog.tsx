"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, Trash2 } from "lucide-react";
import Avatar from "@/components/Avatar";
import { Alert, Button, Field, PhoneInput, ProgressBar, SelectInput, TextInput, TimeInput, Toggle } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useSubscription } from "@/context/SubscriptionContext";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { label } from "@/i18n";
import { createDoc, errorMessage, updateDoc, uploadFile } from "@/lib/frappe";
import { toLatinDigits } from "@/lib/phone";
import { DOCTOR_SPECIALIZATIONS, type Doctor } from "@/lib/types";

interface DoctorForm {
  full_name: string;
  specialization: string;
  phone_number: string;
  email: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  gender: string;
  photo: string;
}

/** A doctor's photo is shown small (a circle in lists and the calendar): 5 MB is plenty. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function toForm(doctor: Doctor | null): DoctorForm {
  return {
    full_name: doctor?.full_name ?? "",
    specialization: doctor?.specialization ?? "General Dentist",
    phone_number: doctor?.phone_number ?? "",
    email: doctor?.email ?? "",
    start_time: (doctor?.start_time ?? "").slice(0, 5),
    end_time: (doctor?.end_time ?? "").slice(0, 5),
    is_active: doctor ? Number(doctor.is_active) === 1 : true,
    gender: doctor?.gender ?? "",
    photo: doctor?.photo ?? "",
  };
}

/** Add a doctor (doctor null) or edit one: name, specialization, contact, working hours, photo and Active. */
export default function DoctorDialog({ doctor, onClose, onSaved }: { doctor: Doctor | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const { subscription, overLimit } = useSubscription();
  const [form, setForm] = useState<DoctorForm>(() => toForm(doctor));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  // Upload progress 0-100 while a photo is being sent, else null.
  const [photoProgress, setPhotoProgress] = useState<number | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t.doctors.photoNotImage);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError(t.doctors.photoTooBig(MAX_PHOTO_BYTES / (1024 * 1024)));
      return;
    }
    setError("");
    setPhotoProgress(0);
    try {
      const url = await uploadFile(file, { onProgress: (fraction) => setPhotoProgress(fraction * 100) });
      setForm((prev) => ({ ...prev, photo: url }));
    } catch (err) {
      setError(errorMessage(err, t.doctors.photoUploadFailed));
    } finally {
      setPhotoProgress(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if ((form.start_time && !form.end_time) || (!form.start_time && form.end_time)) {
      setError(t.doctors.bothHours);
      return;
    }
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      setError(t.doctors.endAfterStart);
      return;
    }
    // One more active doctor (a new one, or one switched back on) must fit in the plan.
    const becomesActive = form.is_active && (!doctor || Number(doctor.is_active) !== 1);
    if (becomesActive && subscription && overLimit("doctors")) {
      setError(t.plan.limitDoctors(subscription.limits.doctors ?? 0, t.site.plans[subscription.plan].name));
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      full_name: form.full_name.trim(),
      phone_number: toLatinDigits(form.phone_number),
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      is_active: form.is_active ? 1 : 0,
      gender: form.gender || null,
      photo: form.photo || null,
    };
    try {
      if (doctor) {
        await updateDoc("Doctor", doctor.name, payload);
        toast.success(t.doctors.saved(payload.full_name));
      } else {
        await createDoc("Doctor", payload);
        toast.success(t.doctors.added(payload.full_name));
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err, t.doctors.saveFailed));
      setSaving(false);
    }
  };

  return (
    <Modal open title={doctor ? t.doctors.editDoctor : t.doctors.addDoctor} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* The photo shows in lists, the calendar and the Today board; without one a drawing is used. */}
        <div className="flex items-center gap-4">
          <Avatar name={form.full_name || t.doctors.newDoctor} gender={form.gender} photo={form.photo} role="doctor" size={72} />
          <div className="flex flex-wrap items-center gap-2">
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} aria-label={t.doctors.photo} />
            <Button
              variant="secondary"
              size="sm"
              icon={Camera}
              loading={photoProgress !== null}
              onClick={() => photoRef.current?.click()}
            >
              {form.photo ? t.doctors.changePhoto : t.doctors.uploadPhoto}
            </Button>
            {form.photo && (
              <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setForm({ ...form, photo: "" })}>
                {t.doctors.removePhoto}
              </Button>
            )}
            {photoProgress !== null && (
              <div className="basis-full max-w-60">
                <ProgressBar value={photoProgress} label={t.doctors.uploadingPhoto} />
              </div>
            )}
          </div>
        </div>
        <Field label={t.doctors.fullName} required hint={t.doctors.fullNameHint}>
          <TextInput name="full_name" value={form.full_name} onChange={handleChange} required autoComplete="off" />
        </Field>
        <Field label={t.doctors.specialization}>
          <SelectInput name="specialization" value={form.specialization} onChange={handleChange}>
            {form.specialization && !(DOCTOR_SPECIALIZATIONS as readonly string[]).includes(form.specialization) && (
              <option value={form.specialization}>{form.specialization}</option>
            )}
            {DOCTOR_SPECIALIZATIONS.map((s) => (
              <option key={s} value={s}>
                {label(t.enums.specialization, s)}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t.doctors.gender} hint={t.doctors.genderHint}>
            <SelectInput name="gender" value={form.gender} onChange={handleChange}>
              <option value="">{t.doctors.notSet}</option>
              <option value="Female">{label(t.enums.gender, "Female")}</option>
              <option value="Male">{label(t.enums.gender, "Male")}</option>
            </SelectInput>
          </Field>
          <div className="max-sm:hidden" />
          <Field label={t.doctors.phone}>
            <PhoneInput name="phone_number" value={form.phone_number} onChange={handleChange} />
          </Field>
          <Field label={t.doctors.email}>
            <TextInput type="email" name="email" value={form.email} onChange={handleChange} dir="ltr" />
          </Field>
          <Field label={t.doctors.startsAt} hint={t.doctors.startsAtHint}>
            <TimeInput name="start_time" value={form.start_time} onChange={handleChange} dir="ltr" />
          </Field>
          <Field label={t.doctors.finishesAt}>
            <TimeInput name="end_time" value={form.end_time} onChange={handleChange} dir="ltr" />
          </Field>
        </div>
        <Toggle
          checked={form.is_active}
          onChange={(is_active) => setForm({ ...form, is_active })}
          label={t.doctors.active}
          description={t.doctors.activeHint}
        />

        {error && <Alert tone="red">{error}</Alert>}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" loading={saving} disabled={photoProgress !== null}>
            {doctor ? t.doctors.saveDoctor : t.doctors.addDoctor}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t.doctors.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
