"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserCog, Shield, UserPlus, UserSearch } from "lucide-react";
import Avatar from "@/components/Avatar";
import RequirePermission from "@/components/Guard";
import {
  Alert, Button, Card, ClearFiltersButton, ClickableRow, Field, PageContainer, PageHeader, Pagination,
  SearchInput, SelectInput, StatusBadge, Table, TableError, TableLoading, TableMessage, Td, TextInput, Th,
  Toggle, Toolbar,
} from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { label } from "@/i18n";
import { createDoc, errorMessage, type FilterRow } from "@/lib/frappe";
import { searchFilters, useDebounced, usePagedList } from "@/lib/hooks";
import { userHref } from "@/lib/links";
import { CLINIC_ROLES, PERMISSION_KEYS, ROLE_PRESETS, type ClinicRole, type User } from "@/lib/types";

export default function UsersPage() {
  return (
    <RequirePermission permission="manage_users">
      <UsersList />
    </RequirePermission>
  );
}

const HIDDEN_USERS: FilterRow = ["name", "not in", ["Administrator", "Guest"]];

/** The shortest password Frappe accepts for a new user. */
const MIN_PASSWORD = 8;

function UsersList() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const debounced = useDebounced(search);
  const clearFilters = () => {
    setSearch("");
    setStatus("");
  };

  const list = usePagedList<User>("User", {
    fields: ["name", "full_name", "email", "enabled", "gender", "user_image"],
    filters: [HIDDEN_USERS, ...(status ? [["enabled", "=", status === "active" ? 1 : 0] as FilterRow] : [])],
    orFilters: searchFilters(debounced, ["full_name", "email"]),
    orderBy: "full_name asc",
  });

  return (
    <PageContainer section="system">
      <PageHeader icon={UserCog} section="system"
        title={t.users.title}
        subtitle={t.users.subtitle}
        actions={
          <Button icon={UserPlus} onClick={() => setShowAdd(true)}>
            {t.users.addUser}
          </Button>
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder={t.users.searchPlaceholder} />
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40" aria-label={t.users.statusFilter}>
          <option value="">{t.users.allUsers}</option>
          <option value="active">{t.users.active}</option>
          <option value="disabled">{t.users.disabled}</option>
        </SelectInput>
      </Toolbar>

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>{t.users.name}</Th>
              <Th>{t.users.email}</Th>
              <Th>{t.users.status}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {list.error ? (
              <TableError colSpan={4} message={list.error} onRetry={list.reload} />
            ) : list.initialLoading ? (
              <TableLoading colSpan={4} />
            ) : list.rows.length === 0 ? (
              <TableMessage icon={UserSearch} colSpan={4}>
                {debounced.trim() || status ? (
                  <>
                    {t.users.noneMatch}
                    <ClearFiltersButton onClick={clearFilters} />
                  </>
                ) : (
                  t.users.noneYet
                )}
              </TableMessage>
            ) : (
              list.rows.map((u) => (
                <ClickableRow key={u.name} href={userHref(u.name)} dimmed={list.loading}>
                  <Td>
                    <span className="flex items-center gap-3">
                      <Avatar name={u.full_name || u.name} gender={u.gender} photo={u.user_image} size={36} />
                      <Link href={userHref(u.name)} className="font-medium text-gray-800 hover:text-primary-600">
                        {u.full_name || u.name}
                      </Link>
                    </span>
                  </Td>
                  <Td label={t.users.email}>
                    <span dir="ltr">{u.email}</span>
                  </Td>
                  <Td label={t.users.status}>
                    <StatusBadge kind="user" status={u.enabled ? "Active" : "Disabled"} />
                  </Td>
                  <Td className="text-end">
                    <Link href={userHref(u.name)} className="inline-flex items-center gap-1 text-primary-600 hover:underline text-sm">
                      <Shield size={14} /> {t.users.permissionsLink}
                    </Link>
                  </Td>
                </ClickableRow>
              ))
            )}
          </tbody>
        </Table>
        {!list.error && <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />}
      </Card>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} />}
    </PageContainer>
  );
}

function AddUserModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
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
    router.push(userHref(created.name));
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
