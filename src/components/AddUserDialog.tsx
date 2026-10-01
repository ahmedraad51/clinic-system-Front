"use client";

import { useState, type FormEvent } from "react";
import { Alert, Button, Field, SelectInput, TextInput, Toggle } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { label } from "@/i18n";
import { createDoc, errorMessage } from "@/lib/frappe";
import { CLINIC_ROLES, PERMISSION_KEYS, ROLE_PRESETS, type ClinicRole, type User } from "@/lib/types";

/** The shortest password Frappe accepts. */
const MIN_PASSWORD = 8;

/**
 * Add a staff user: name, email, password and clinic role, optionally with the role's usual permissions (a Clinic
 * Permission). Used on the Users page (which then opens the new user) and in the setup wizard (which lists them).
 */
export default function AddUserDialog({ onClose, onAdded }: { onClose: () => void; onAdded: (user: User) => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState({ first_name: "", email: "", password: "", role: "Clinic Receptionist" as ClinicRole });
  const [applyPreset, setApplyPreset] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    let created: User;
    try {
      created = await createDoc<User>("User", {
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        new_password: form.password,
        send_welcome_email: 0,
        roles: [{ role: form.role }],
      });
    } catch (err) {
      setError(errorMessage(err, t.users.createFailed));
      setSaving(false);
      return;
    }

    if (applyPreset) {
      const preset = ROLE_PRESETS[form.role];
      const flags = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, preset.includes(key) ? 1 : 0]));
      try {
        await createDoc("Clinic Permission", { user: created.name, ...flags });
      } catch (err) {
        toast.error(errorMessage(err, t.users.permissionsNotSaved));
      }
    }
    toast.success(t.users.added(form.first_name));
    onAdded(created);
  };

  return (
    <Modal open title={t.users.addUser} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t.users.fullName} required>
          <TextInput value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
        </Field>
        <Field label={t.users.email} required hint={t.users.emailHint}>
          <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required dir="ltr" />
        </Field>
        <Field label={t.users.password} required hint={t.users.passwordHint(MIN_PASSWORD)}>
          <TextInput
            type="password"
            minLength={MIN_PASSWORD}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </Field>
        <Field label={t.users.role} required>
          <SelectInput value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as ClinicRole })}>
            {CLINIC_ROLES.map((role) => (
              <option key={role} value={role}>
                {label(t.enums.role, role)}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Toggle
          checked={applyPreset}
          onChange={setApplyPreset}
          label={t.users.applyPreset}
          description={t.users.applyPresetHint}
        />
        {error && <Alert tone="red">{error}</Alert>}
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={saving} className="flex-1">
            {t.users.addUser}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">
            {t.users.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
