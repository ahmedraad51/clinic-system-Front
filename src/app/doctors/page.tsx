"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { BriefcaseMedical, Pencil, Plus } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Alert, Badge, Button, Card, Field, PageContainer, PageHeader, Pagination, SearchInput, SelectInput, Table,
  TableMessage, Td, TextInput, Th, Toggle, Toolbar,
} from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";
import { createDoc, errorMessage, updateDoc, type FilterRow } from "@/lib/frappe";
import { display, formatTime } from "@/lib/format";
import { searchFilters, useDebounced, usePagedList } from "@/lib/hooks";
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
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  // null = closed, "new" = adding, a Doctor = editing that one.
  const [editing, setEditing] = useState<Doctor | "new" | null>(null);
  const debounced = useDebounced(search);

  const list = usePagedList<Doctor>("Doctor", {
    fields: ["name", "full_name", "specialization", "phone_number", "email", "start_time", "end_time", "is_active"],
    filters: status ? [["is_active", "=", status === "active" ? 1 : 0] as FilterRow] : undefined,
    orFilters: searchFilters(debounced, ["full_name", "specialization", "phone_number", "email"]),
    orderBy: "full_name asc",
  });

  return (
    <PageContainer>
      <PageHeader
        title="Doctors"
        subtitle="Who can be booked. Switch a doctor off instead of deleting them; their past records stay."
        actions={
          <Button icon={Plus} onClick={() => setEditing("new")}>
            Add Doctor
          </Button>
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, specialization or phone..." />
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-44" aria-label="Status">
          <option value="">All doctors</option>
          <option value="active">Active</option>
          <option value="inactive">Not active</option>
        </SelectInput>
      </Toolbar>

      {list.error && <Alert tone="red">{list.error}</Alert>}

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Specialization</Th>
              <Th>Phone</Th>
              <Th>Working hours</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {list.initialLoading ? (
              <TableMessage colSpan={6}>Loading...</TableMessage>
            ) : list.rows.length === 0 ? (
              <TableMessage icon={BriefcaseMedical} colSpan={6}>
                {debounced || status ? "No doctors match." : "No doctors yet. Add the first one."}
              </TableMessage>
            ) : (
              list.rows.map((doctor) => (
                <tr key={doctor.name} className={list.loading ? "opacity-60" : undefined}>
                  <Td>
                    <button
                      type="button"
                      onClick={() => setEditing(doctor)}
                      className="font-medium text-gray-800 hover:text-primary-600 text-start"
                    >
                      {doctor.full_name}
                    </button>
                    {doctor.email && <span className="block text-xs text-gray-500">{doctor.email}</span>}
                  </Td>
                  <Td label="Specialization">{display(doctor.specialization)}</Td>
                  <Td label="Phone" className="whitespace-nowrap">{display(doctor.phone_number)}</Td>
                  <Td label="Working hours" className="whitespace-nowrap">
                    {doctor.start_time && doctor.end_time
                      ? `${formatTime(doctor.start_time)} – ${formatTime(doctor.end_time)}`
                      : <span className="text-gray-400">Clinic hours</span>}
                  </Td>
                  <Td label="Status">
                    <Badge tone={Number(doctor.is_active) === 1 ? "green" : "gray"}>
                      {Number(doctor.is_active) === 1 ? "Active" : "Not active"}
                    </Badge>
                  </Td>
                  <Td className="text-end">
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(doctor)}>
                      Edit
                    </Button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />
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
}

function toForm(doctor: Doctor | null): DoctorForm {
  return {
    full_name: doctor?.full_name ?? "",
    specialization: doctor?.specialization ?? "General Dentist",
    phone_number: doctor?.phone_number ?? "",
    email: doctor?.email ?? "",
    start_time: (doctor?.start_time ?? "").slice(0, 5),
    end_time: (doctor?.end_time ?? "").slice(0, 5),
    is_active: doctor ? Number(doctor.is_active) === 1 : true,
  };
}

function DoctorDialog({ doctor, onClose, onSaved }: { doctor: Doctor | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<DoctorForm>(() => toForm(doctor));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if ((form.start_time && !form.end_time) || (!form.start_time && form.end_time)) {
      setError("Fill in both working hours, or leave both empty to use the clinic hours.");
      return;
    }
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      setError("The end of the working day must be after the start.");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      full_name: form.full_name.trim(),
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      is_active: form.is_active ? 1 : 0,
    };
    try {
      if (doctor) {
        await updateDoc("Doctor", doctor.name, payload);
        toast.success(`${payload.full_name} saved.`);
      } else {
        await createDoc("Doctor", payload);
        toast.success(`${payload.full_name} was added.`);
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Could not save the doctor."));
      setSaving(false);
    }
  };

  return (
    <Modal open title={doctor ? "Edit Doctor" : "Add Doctor"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full Name" required hint='Shown everywhere, for example "Dr. Sarah Mansour".'>
          <TextInput name="full_name" value={form.full_name} onChange={handleChange} required autoComplete="off" />
        </Field>
        <Field label="Specialization">
          <SelectInput name="specialization" value={form.specialization} onChange={handleChange}>
            {form.specialization && !(DOCTOR_SPECIALIZATIONS as readonly string[]).includes(form.specialization) && (
              <option value={form.specialization}>{form.specialization}</option>
            )}
            {DOCTOR_SPECIALIZATIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Phone">
            <TextInput type="tel" name="phone_number" value={form.phone_number} onChange={handleChange} />
          </Field>
          <Field label="Email">
            <TextInput type="email" name="email" value={form.email} onChange={handleChange} />
          </Field>
          <Field label="Starts work at" hint="Empty: the clinic hours.">
            <TextInput type="time" name="start_time" value={form.start_time} onChange={handleChange} />
          </Field>
          <Field label="Finishes at">
            <TextInput type="time" name="end_time" value={form.end_time} onChange={handleChange} />
          </Field>
        </div>
        <Toggle
          checked={form.is_active}
          onChange={(is_active) => setForm({ ...form, is_active })}
          label="Active"
          description="Only active doctors can be booked and show in the calendar."
        />

        {error && <Alert tone="red">{error}</Alert>}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" loading={saving}>
            {doctor ? "Save Doctor" : "Add Doctor"}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
