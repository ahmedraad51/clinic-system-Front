"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { BriefcaseMedical, Camera, Pencil, Plus, Trash2 } from "lucide-react";
import Avatar from "@/components/Avatar";
import RequirePermission from "@/components/Guard";
import {
  Alert, Badge, Button, Card, ClearFiltersButton, Field, PageContainer, PageHeader, Pagination, PhoneInput, ProgressBar,
  SearchInput, SelectInput, Table, TableError, TableLoading, TableMessage, Td, TextInput, Th, Toggle, Toolbar,
} from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { label } from "@/i18n";
import { createDoc, errorMessage, updateDoc, uploadFile, type FilterRow } from "@/lib/frappe";
import { display, formatTime } from "@/lib/format";
import { searchFilters, useDebounced, usePagedList } from "@/lib/hooks";
import { toLatinDigits } from "@/lib/phone";
import { DOCTOR_SPECIALIZATIONS, type Doctor } from "@/lib/types";

export default function DoctorsPage() {
  return (
    <RequirePermission permission="manage_users">
      <DoctorsList />
    </RequirePermission>
  );
}

/**
 * The clinic's doctors. They appear in the booking and treatment forms and as columns in the calendar
 * while Active is on. A doctor who leaves is switched off, never deleted, so old records keep their name.
 */
function DoctorsList() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  // null = closed, "new" = adding, a Doctor = editing that one.
  const [editing, setEditing] = useState<Doctor | "new" | null>(null);
  const debounced = useDebounced(search);
  const clearFilters = () => {
    setSearch("");
    setStatus("");
  };

  const list = usePagedList<Doctor>("Doctor", {
    fields: ["name", "full_name", "specialization", "phone_number", "email", "start_time", "end_time", "is_active", "gender", "photo"],
    filters: status ? [["is_active", "=", status === "active" ? 1 : 0] as FilterRow] : undefined,
    orFilters: searchFilters(debounced, ["full_name", "specialization", "phone_number", "email"]),
    orderBy: "full_name asc",
  });

  return (
    <PageContainer>
      <PageHeader
        title={t.doctors.title}
        subtitle={t.doctors.subtitle}
        actions={
          <Button icon={Plus} onClick={() => setEditing("new")}>
            {t.doctors.addDoctor}
          </Button>
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder={t.doctors.searchPlaceholder} />
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-44" aria-label={t.doctors.statusFilter}>
          <option value="">{t.doctors.allDoctors}</option>
          <option value="active">{t.doctors.active}</option>
          <option value="inactive">{t.doctors.notActive}</option>
        </SelectInput>
      </Toolbar>

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>{t.doctors.name}</Th>
              <Th>{t.doctors.specialization}</Th>
              <Th>{t.doctors.phone}</Th>
              <Th>{t.doctors.workingHours}</Th>
              <Th>{t.doctors.status}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {list.error ? (
              <TableError colSpan={6} message={list.error} onRetry={list.reload} />
            ) : list.initialLoading ? (
              <TableLoading colSpan={6} />
            ) : list.rows.length === 0 ? (
              <TableMessage icon={BriefcaseMedical} colSpan={6}>
                {debounced || status ? (
                  <>
                    {t.doctors.noneMatch}
                    <ClearFiltersButton onClick={clearFilters} />
                  </>
                ) : (
                  t.doctors.noneYet
                )}
              </TableMessage>
            ) : (
              list.rows.map((doctor) => (
                <tr key={doctor.name} className={list.loading ? "opacity-60" : undefined}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={doctor.full_name} gender={doctor.gender} photo={doctor.photo} role="doctor" size={40} />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setEditing(doctor)}
                          className="font-medium text-gray-800 hover:text-primary-600 text-start"
                        >
                          {doctor.full_name}
                        </button>
                        {doctor.email && <span className="block text-xs text-gray-500" dir="ltr">{doctor.email}</span>}
                      </div>
                    </div>
                  </Td>
                  <Td label={t.doctors.specialization}>{display(label(t.enums.specialization, doctor.specialization))}</Td>
                  <Td label={t.doctors.phone} className="whitespace-nowrap">
                    <span dir="ltr">{display(doctor.phone_number)}</span>
                  </Td>
                  <Td label={t.doctors.workingHours} className="whitespace-nowrap">
                    {doctor.start_time && doctor.end_time
                      ? t.doctors.hours(formatTime(doctor.start_time), formatTime(doctor.end_time))
                      : <span className="text-gray-500">{t.doctors.clinicHours}</span>}
                  </Td>
                  <Td label={t.doctors.status}>
                    <Badge tone={Number(doctor.is_active) === 1 ? "green" : "gray"}>
                      {Number(doctor.is_active) === 1 ? t.doctors.active : t.doctors.notActive}
                    </Badge>
                  </Td>
                  <Td className="text-end">
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(doctor)}>
                      {t.doctors.edit}
                    </Button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        {!list.error && <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />}
      </Card>

      {editing && (
        <DoctorDialog
          doctor={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
    </PageContainer>
  );
}

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

function DoctorDialog({ doctor, onClose, onSaved }: { doctor: Doctor | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
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
            <TextInput type="time" name="start_time" value={form.start_time} onChange={handleChange} dir="ltr" />
          </Field>
          <Field label={t.doctors.finishesAt}>
            <TextInput type="time" name="end_time" value={form.end_time} onChange={handleChange} dir="ltr" />
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
