"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Check, Save, Shield } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Alert, Badge, Button, Card, Field, NotFoundCard, PageContainer, PageHeader, PageLoading, SelectInput, Toggle,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";
import { useToast } from "@/context/ToastContext";
import { createDoc, errorMessage, getDoc, updateDoc } from "@/lib/frappe";
import { cx } from "@/lib/format";
import { useDocument } from "@/lib/hooks";
import { userIdFromRoute } from "@/lib/links";
import {
  CLINIC_ROLES, PERMISSION_GROUPS, PERMISSION_KEYS, ROLE_PRESETS,
  type ClinicPermission, type ClinicRole, type PermissionKey, type User,
} from "@/lib/types";

type Perms = Record<PermissionKey, boolean>;

const fill = (keys: readonly PermissionKey[]): Perms =>
  Object.fromEntries(PERMISSION_KEYS.map((key) => [key, keys.includes(key)])) as Perms;

export default function UserDetailPage() {
  return (
    <RequirePermission permission="manage_users">
      <UserDetail />
    </RequirePermission>
  );
}

function UserDetail() {
  const params = useParams();
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const session = useSession();
  const userId = userIdFromRoute(params.id);
  const { doc: userData, loading, notFound, error, reload } = useDocument<User>("User", userId);

  const [permState, setPermState] = useState<{ userId: string; perms: Perms; exists: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const doc = await getDoc<ClinicPermission>("Clinic Permission", userId);
        const perms = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, Number(doc[key]) === 1])) as Perms;
        if (!cancelled) setPermState({ userId, perms, exists: true });
      } catch {
        // No Clinic Permission doc yet: start with everything switched off.
        if (!cancelled) setPermState({ userId, perms: fill([]), exists: false });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) return <PageLoading />;
  if (notFound || !userData) return <NotFoundCard error={error} what="User" backHref="/users" backLabel="Back to Users" />;

  const current = permState && permState.userId === userId ? permState : null;
  const roles = (userData.roles ?? []).map((row) => row.role);
  const clinicRole = CLINIC_ROLES.find((role) => roles.includes(role)) ?? "";
  const isSuper = userId === "Administrator" || roles.includes("System Manager");
  const isSelf = userId === currentUser;
  const enabled = Number(userData.enabled) === 1;
  const onCount = current ? PERMISSION_KEYS.filter((key) => current.perms[key]).length : 0;

  const setPerms = (perms: Perms) => current && setPermState({ ...current, perms });
  const togglePerm = (key: PermissionKey) => current && setPerms({ ...current.perms, [key]: !current.perms[key] });

  const savePerms = async () => {
    if (!current) return;
    setSaving(true);
    const body: Record<string, string | number> = { user: userId };
    PERMISSION_KEYS.forEach((key) => {
      body[key] = current.perms[key] ? 1 : 0;
    });
    try {
      if (current.exists) {
        await updateDoc("Clinic Permission", userId, body);
      } else {
        await createDoc("Clinic Permission", body);
        setPermState({ ...current, exists: true });
      }
      toast.success("Permissions saved.");
      if (isSelf) session.refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Could not save the permissions."));
    } finally {
      setSaving(false);
    }
  };

  const saveUser = async (changes: Partial<User>, message: string) => {
    setSavingUser(true);
    try {
      await updateDoc("User", userId, changes);
      toast.success(message);
      reload();
      if (isSelf) session.refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Could not save the user."));
    } finally {
      setSavingUser(false);
    }
  };

  const changeRole = (role: string) => {
    // Keep any non-clinic roles (like System Manager) and swap the clinic role.
    const others = roles.filter((r) => !CLINIC_ROLES.includes(r as ClinicRole));
    const next = role ? [...others, role] : others;
    saveUser({ roles: next.map((r) => ({ role: r })) }, role ? `Role changed to ${role}.` : "Clinic role removed.");
  };

  return (
    <PageContainer narrow>
      <PageHeader title="Manage User" back={{ href: "/users", label: "Users" }} />

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
            {(userData.full_name || userData.name).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 text-lg">{userData.full_name || userData.name}</p>
            <p className="text-gray-500 text-sm break-all">{userData.email}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {roles.length === 0 ? <Badge>No roles</Badge> : roles.map((role) => <Badge key={role} tone="blue">{role}</Badge>)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-5 border-t border-gray-100">
          <Field label="Clinic Role">
            <SelectInput value={clinicRole} onChange={(e) => changeRole(e.target.value)} disabled={savingUser}>
              <option value="">No clinic role</option>
              {CLINIC_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="sm:pt-7">
            <Toggle
              checked={enabled}
              disabled={savingUser || isSelf}
              onChange={(value) => saveUser({ enabled: value ? 1 : 0 }, value ? "User enabled." : "User disabled.")}
              label={enabled ? "Account is active" : "Account is disabled"}
              description={isSelf ? "You cannot disable your own account." : "Disabled users cannot log in."}
            />
          </div>
        </div>
      </Card>

      <Card
        title={
          <span className="flex items-center gap-2">
            <Shield size={18} className="text-blue-600" />
            Permissions
          </span>
        }
      >
        {!current ? (
          <PageLoading />
        ) : (
          <div className="space-y-6">
            {isSuper && (
              <Alert tone="blue">
                This user is a System Manager, so they can always do everything. These switches only matter if that role is removed.
              </Alert>
            )}
            {!current.exists && (
              <Alert tone="yellow">This user has no permissions saved yet, so they cannot open any section.</Alert>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500 me-1">Start from:</span>
              {CLINIC_ROLES.map((role) => (
                <Button key={role} size="sm" variant="secondary" onClick={() => setPerms(fill(ROLE_PRESETS[role]))}>
                  {role.replace("Clinic ", "")}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setPerms(fill(PERMISSION_KEYS))}>
                Select all
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPerms(fill([]))}>
                Clear all
              </Button>
            </div>

            {PERMISSION_GROUPS.map((group) => (
              <div key={group.group}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{group.group}</p>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => {
                    const on = current.perms[item.key];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        role="switch"
                        aria-checked={on}
                        onClick={() => togglePerm(item.key)}
                        className={cx(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                          on ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300",
                        )}
                      >
                        {on && <Check size={12} />}
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <span className="text-sm text-gray-500">
                {onCount} of {PERMISSION_KEYS.length} switched on
              </span>
              <Button icon={Save} onClick={savePerms} loading={saving}>
                Save Permissions
              </Button>
            </div>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
