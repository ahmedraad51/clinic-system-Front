"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Pencil, Pill, Plus } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Alert, Badge, Button, Card, ClearFiltersButton, Field, NumberInput, PageContainer, PageHeader, Pagination,
  SearchInput, SelectInput, Table, TableError, TableLoading, TableMessage, Td, TextArea, TextInput, Th, Toggle, Toolbar,
} from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useSession } from "@/context/SessionContext";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { joinParts, label } from "@/i18n";
import { createDoc, errorMessage, updateDoc, type FilterRow } from "@/lib/frappe";
import { searchFilters, useDebounced, usePagedList } from "@/lib/hooks";
import { CHILD_AGE, FREQUENCIES, MEDICINE_FIELDS, medicineLabel } from "@/lib/prescriptions";
import { MEDICINE_FORMS, MEDICINE_GROUPS, type DentalMedicine } from "@/lib/types";

export default function MedicinesPage() {
  return (
    <RequirePermission permission="manage_users">
      <MedicinesList />
    </RequirePermission>
  );
}

/**
 * The clinic's medicine list: what the prescription form offers, with the usual dose of each medicine and the
 * flags the safety warnings use. A medicine that is no longer used is switched off, never deleted, so old
 * prescriptions keep their rows.
 */
function MedicinesList() {
  const { readOnly } = useSession();
  const { t } = useI18n();
  const m = t.medicines;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<DentalMedicine | "new" | null>(null);
  const debounced = useDebounced(search);
  const clearFilters = () => {
    setSearch("");
    setStatus("");
  };

  const list = usePagedList<DentalMedicine>("Dental Medicine", {
    fields: MEDICINE_FIELDS,
    filters: status ? [["is_active", "=", status === "active" ? 1 : 0] as FilterRow] : undefined,
    orFilters: searchFilters(debounced, ["medicine_name", "medicine_group", "strength"]),
    orderBy: "medicine_group asc, medicine_name asc",
  });

  return (
    <PageContainer section="treatments">
      <PageHeader icon={Pill} section="treatments"
        title={m.title}
        subtitle={m.subtitle}
        actions={
          !readOnly && (
            <Button icon={Plus} onClick={() => setEditing("new")}>
              {m.addMedicine}
            </Button>
          )
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder={m.searchPlaceholder} />
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-44" aria-label={m.statusFilter}>
          <option value="">{m.allMedicines}</option>
          <option value="active">{m.active}</option>
          <option value="inactive">{m.notActive}</option>
        </SelectInput>
      </Toolbar>

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>{m.columns.medicine}</Th>
              <Th>{m.columns.usualDose}</Th>
              <Th>{m.columns.warnings}</Th>
              <Th>{m.columns.status}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {list.error ? (
              <TableError colSpan={5} message={list.error} onRetry={list.reload} />
            ) : list.initialLoading ? (
              <TableLoading colSpan={5} />
            ) : list.rows.length === 0 ? (
              <TableMessage icon={Pill} colSpan={5}>
                {debounced || status ? (
                  <>
                    {m.noMatch}
                    <ClearFiltersButton onClick={clearFilters} />
                  </>
                ) : (
                  m.empty
                )}
              </TableMessage>
            ) : (
              list.rows.map((medicine) => {
                const flags = [
                  medicine.allergy_words ? m.flags.allergy(medicine.allergy_words) : "",
                  Number(medicine.is_nsaid) === 1 ? m.flags.nsaid : "",
                  Number(medicine.avoid_in_pregnancy) === 1 ? m.flags.avoidInPregnancy : "",
                  Number(medicine.max_daily_mg) > 0 ? m.flags.maxDaily(Number(medicine.max_daily_mg)) : "",
                ].filter(Boolean);
                // The form and the group, once when they are the same word ("Mouthwash").
                const kind = [
                  label(t.enums.medicineForm, medicine.dosage_form),
                  medicine.medicine_group && medicine.medicine_group !== medicine.dosage_form
                    ? label(t.enums.medicineGroup, medicine.medicine_group)
                    : "",
                ].filter(Boolean);
                return (
                  <tr key={medicine.name} className={list.loading ? "opacity-60" : undefined}>
                    <Td>
                      {readOnly ? (
                        <span className="font-medium text-gray-800">{medicineLabel(medicine)}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditing(medicine)}
                          className="font-medium text-gray-800 hover:text-primary-600 text-start"
                        >
                          {medicineLabel(medicine)}
                        </button>
                      )}
                      {kind.length > 0 && <span className="block text-xs text-gray-500">{joinParts(kind, t.common.dot)}</span>}
                    </Td>
                    <Td label={m.columns.usualDose}>
                      {joinParts([
                        medicine.default_dose,
                        label(t.enums.frequency, medicine.default_frequency),
                        medicine.default_duration_days ? t.prescriptions.days(Number(medicine.default_duration_days)) : "",
                      ], t.common.dot) || t.common.dash}
                    </Td>
                    <Td label={m.columns.warnings} className="max-w-[320px]">
                      {flags.length ? joinParts(flags, t.common.dot) : t.common.dash}
                    </Td>
                    <Td label={m.columns.status}>
                      <Badge tone={Number(medicine.is_active) === 1 ? "green" : "gray"}>
                        {Number(medicine.is_active) === 1 ? m.active : m.notActive}
                      </Badge>
                    </Td>
                    <Td className="text-end">
                      {!readOnly && (
                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(medicine)}>
                          {m.edit}
                        </Button>
                      )}
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
        {!list.error && <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />}
      </Card>

      {editing && (
        <MedicineDialog
          medicine={editing === "new" ? null : editing}
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

interface MedicineForm {
  medicine_name: string;
  strength: string;
  dosage_form: string;
  medicine_group: string;
  default_dose: string;
  default_frequency: string;
  default_duration_days: string;
  default_instructions: string;
  allergy_words: string;
  is_nsaid: boolean;
  avoid_in_pregnancy: boolean;
  max_daily_mg: string;
  child_note: string;
  is_active: boolean;
}

function toForm(medicine: DentalMedicine | null): MedicineForm {
  return {
    medicine_name: medicine?.medicine_name ?? "",
    strength: medicine?.strength ?? "",
    dosage_form: medicine?.dosage_form ?? "Tablet",
    medicine_group: medicine?.medicine_group ?? "Antibiotic",
    default_dose: medicine?.default_dose ?? "",
    default_frequency: medicine?.default_frequency ?? "",
    default_duration_days: medicine?.default_duration_days ? String(medicine.default_duration_days) : "",
    default_instructions: medicine?.default_instructions ?? "",
    allergy_words: medicine?.allergy_words ?? "",
    is_nsaid: Number(medicine?.is_nsaid) === 1,
    avoid_in_pregnancy: Number(medicine?.avoid_in_pregnancy) === 1,
    max_daily_mg: medicine?.max_daily_mg ? String(medicine.max_daily_mg) : "",
    child_note: medicine?.child_note ?? "",
    is_active: medicine ? Number(medicine.is_active) === 1 : true,
  };
}

function MedicineDialog({ medicine, onClose, onSaved }: { medicine: DentalMedicine | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const d = t.medicines.dialog;
  const toast = useToast();
  const [form, setForm] = useState<MedicineForm>(() => toForm(medicine));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      medicine_name: form.medicine_name.trim(),
      strength: form.strength.trim(),
      default_dose: form.default_dose.trim(),
      default_duration_days: Number(form.default_duration_days) || 0,
      default_instructions: form.default_instructions.trim(),
      allergy_words: form.allergy_words.trim(),
      is_nsaid: form.is_nsaid ? 1 : 0,
      avoid_in_pregnancy: form.avoid_in_pregnancy ? 1 : 0,
      max_daily_mg: Number(form.max_daily_mg) || 0,
      child_note: form.child_note.trim(),
      is_active: form.is_active ? 1 : 0,
    };
    try {
      if (medicine) {
        await updateDoc("Dental Medicine", medicine.name, payload);
        toast.success(d.saved(payload.medicine_name));
      } else {
        await createDoc("Dental Medicine", payload);
        toast.success(d.added(payload.medicine_name));
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err, d.saveFailed));
      setSaving(false);
    }
  };

  return (
    <Modal open title={medicine ? d.editTitle : d.addTitle} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={d.name} required hint={d.nameHint}>
            <TextInput name="medicine_name" value={form.medicine_name} onChange={handleChange} required autoComplete="off" />
          </Field>
          <Field label={d.strength} hint={d.strengthHint}>
            <TextInput name="strength" value={form.strength} onChange={handleChange} dir="ltr" />
          </Field>
          <Field label={d.form}>
            <SelectInput name="dosage_form" value={form.dosage_form} onChange={handleChange}>
              {MEDICINE_FORMS.map((option) => (
                <option key={option} value={option}>
                  {label(t.enums.medicineForm, option)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={d.group}>
            <SelectInput name="medicine_group" value={form.medicine_group} onChange={handleChange}>
              {MEDICINE_GROUPS.map((option) => (
                <option key={option} value={option}>
                  {label(t.enums.medicineGroup, option)}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <p className="text-sm font-semibold text-gray-800 pt-2">{d.usual}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label={d.dose}>
            <TextInput name="default_dose" value={form.default_dose} onChange={handleChange} placeholder={d.dosePlaceholder} />
          </Field>
          <Field label={d.howOften}>
            <SelectInput name="default_frequency" value={form.default_frequency} onChange={handleChange}>
              <option value="">{d.choose}</option>
              {FREQUENCIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {label(t.enums.frequency, option.value)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={d.days}>
            <NumberInput name="default_duration_days" decimals={false} value={form.default_duration_days} onChange={handleChange} />
          </Field>
          <Field label={d.instructions} className="sm:col-span-3">
            <TextInput name="default_instructions" value={form.default_instructions} onChange={handleChange} placeholder={d.instructionsPlaceholder} />
          </Field>
        </div>

        <p className="text-sm font-semibold text-gray-800 pt-2">{d.safety}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={d.allergyWords} className="sm:col-span-2" hint={d.allergyHint}>
            <TextInput name="allergy_words" value={form.allergy_words} onChange={handleChange} placeholder={d.allergyPlaceholder} />
          </Field>
          <Field label={d.maxDaily} hint={d.maxDailyHint}>
            <NumberInput name="max_daily_mg" decimals={false} value={form.max_daily_mg} onChange={handleChange} />
          </Field>
          <Field label={d.childNote} hint={d.childNoteHint(CHILD_AGE)}>
            <TextArea name="child_note" value={form.child_note} onChange={handleChange} rows={2} />
          </Field>
          <Toggle
            checked={form.is_nsaid}
            onChange={(is_nsaid) => setForm({ ...form, is_nsaid })}
            label={d.nsaid}
            description={d.nsaidHint}
          />
          <Toggle
            checked={form.avoid_in_pregnancy}
            onChange={(avoid_in_pregnancy) => setForm({ ...form, avoid_in_pregnancy })}
            label={d.avoidInPregnancy}
            description={d.avoidInPregnancyHint}
          />
        </div>

        <Toggle
          checked={form.is_active}
          onChange={(is_active) => setForm({ ...form, is_active })}
          label={d.active}
          description={d.activeHint}
        />

        {error && <Alert tone="red">{error}</Alert>}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" loading={saving}>
            {medicine ? d.save : d.add}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t.common.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
