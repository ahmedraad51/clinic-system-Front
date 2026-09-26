"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, UserPlus, UserSearch } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Alert, Button, Card, ClickableRow, Field, PageContainer, PageHeader, Pagination, SearchInput,
  SelectInput, StatusBadge, Table, TableMessage, Td, TextInput, Th, Toggle, Toolbar,
} from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";
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

function UsersList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const debounced = useDebounced(search);

  const list = usePagedList<User>("User", {
    fields: ["name", "full_name", "email", "enabled"],
    filters: [HIDDEN_USERS, ...(status ? [["enabled", "=", status === "active" ? 1 : 0] as FilterRow] : [])],
    orFilters: searchFilters(debounced, ["full_name", "email"]),
    orderBy: "full_name asc",
  });

  return (
    <PageContainer>
      <PageHeader
        title="Users"
        subtitle="Staff accounts and what each person is allowed to do."
        actions={
          <Button icon={UserPlus} onClick={() => setShowAdd(true)}>
            Add User
          </Button>
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email..." />
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40" aria-label="Status">
          <option value="">All users</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </SelectInput>
      </Toolbar>

      {list.error && <Alert tone="red">{list.error}</Alert>}

      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {list.initialLoading ? (
              <TableMessage colSpan={4}>Loading...</TableMessage>
            ) : list.rows.length === 0 ? (
              <TableMessage icon={UserSearch} colSpan={4}>No users found.</TableMessage>
            ) : (
              list.rows.map((u) => (
                <ClickableRow key={u.name} href={userHref(u.name)} dimmed={list.loading}>
                  <Td>
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 shrink-0 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-sm">
                        {(u.full_name || u.name).charAt(0).toUpperCase()}
                      </span>
                      <span className="font-medium text-gray-800">{u.full_name || u.name}</span>
                    </span>
                  </Td>
                  <Td label="Email">{u.email}</Td>
                  <Td label="Status">
                    <StatusBadge kind="user" status={u.enabled ? "Active" : "Disabled"} />
                  </Td>
                  <Td className="text-end">
                    <Link href={userHref(u.name)} className="inline-flex items-center gap-1 text-primary-600 hover:underline text-sm">
                      <Shield size={14} /> Permissions
                    </Link>
                  </Td>
                </ClickableRow>
              ))
            )}
          </tbody>
        </Table>
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onPage={list.setPage} />
      </Card>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} />}
    </PageContainer>
  );
}

function AddUserModal({ onClose }: { onClose: () => void }) {
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
      setError(errorMessage(err, "Could not create the user."));
      setSaving(false);
      return;
    }

    if (applyPreset) {
      const preset = ROLE_PRESETS[form.role];
      const flags = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, preset.includes(key) ? 1 : 0]));
      try {
        await createDoc("Clinic Permission", { user: created.name, ...flags });
      } catch (err) {
        toast.error(errorMessage(err, "The user was created, but their permissions could not be saved."));
      }
    }
    toast.success(`${form.first_name} was added.`);
    router.push(userHref(created.name));
  };

  return (
    <Modal open title="Add User" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full Name" required>
          <TextInput value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
        </Field>
        <Field label="Email" required hint="They log in with this email.">
          <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </Field>
        <Field label="Password" required hint="At least 8 characters.">
          <TextInput
            type="password"
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </Field>
        <Field label="Role" required>
          <SelectInput value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as ClinicRole })}>
            {CLINIC_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Toggle
          checked={applyPreset}
          onChange={setApplyPreset}
          label="Give the usual permissions for this role"
          description="You can change them on the next page."
        />
        {error && <Alert tone="red">{error}</Alert>}
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={saving} className="flex-1">
            Add User
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
