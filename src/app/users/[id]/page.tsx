"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { LayoutGrid, Save, Shield, UserCog } from "lucide-react";
import Avatar from "@/components/Avatar";
import RequirePermission from "@/components/Guard";
import {
  Alert, Badge, Button, Card, DetailLayout, Fraction, Field, NotFoundCard, PageContainer, PageHeader, PageLoading, ProfileCard,
  SelectInput, Toggle,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useLimit } from "@/components/LimitDialog";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useToast } from "@/context/ToastContext";
import { createDoc, errorMessage, getDoc, updateDoc } from "@/lib/frappe";
import { label, LANG_NAMES, isLang, num } from "@/i18n";
import { useDocument } from "@/lib/hooks";
import { userIdFromRoute } from "@/lib/links";
import {
  CLINIC_ROLES, PERMISSION_ACTIONS, PERMISSION_KEYS, PERMISSION_MATRIX, ROLE_PRESETS,
  type ClinicPermission, type ClinicRole, type PermissionKey, type User,
} from "@/lib/types";

type Perms = Record<PermissionKey, boolean>;

const fill = (keys: readonly PermissionKey[]): Perms =>
  Object.fromEntries(PERMISSION_KEYS.map((key) => [key, keys.includes(key)])) as Perms;

/** A checkbox that can also show "some" (a row or column only partly on). */
function Check3({
  checked,
  some = false,
  onChange,
  label: name,
  disabled = false,
}: {
  checked: boolean;
  some?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some && !checked;
  }, [some, checked]);
  // The label around it is the 44 px touch area on touch screens; the box itself stays small.
  return (
    <label className="inline-flex items-center justify-center align-middle cursor-pointer pointer-coarse:min-w-11 pointer-coarse:min-h-11">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={name}
        onChange={(event) => onChange(event.target.checked)}
        className="w-[1.125rem] h-[1.125rem] pointer-coarse:w-6 pointer-coarse:h-6 cursor-pointer"
      />
    </label>
  );
}

export default function UserDetailPage() {
  return (
    <RequirePermission permission="manage_users">
      <UserDetail />
    </RequirePermission>
  );
}

function UserDetail() {
  const params = useParams();
  const { t } = useI18n();
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const session = useSession();
  const limit = useLimit();
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
  if (notFound || !userData) return <NotFoundCard error={error} what={t.enums.doctype.User} backHref="/users" backLabel={t.users.backToUsers} />;

  const current = permState && permState.userId === userId ? permState : null;
  const roles = (userData.roles ?? []).map((row) => row.role);
  const clinicRole = CLINIC_ROLES.find((role) => roles.includes(role)) ?? "";
  const isSuper = userId === "Administrator" || roles.includes("System Manager");
  const isSelf = userId === currentUser;
  const enabled = Number(userData.enabled) === 1;
  const onCount = current ? PERMISSION_KEYS.filter((key) => current.perms[key]).length : 0;

  const setPerms = (perms: Perms) => current && setPermState({ ...current, perms });

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
      toast.success(t.users.permissionsSaved);
      if (isSelf) session.refresh();
    } catch (err) {
      toast.error(errorMessage(err, t.users.savePermissionsFailed));
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
      toast.error(errorMessage(err, t.users.saveUserFailed));
    } finally {
      setSavingUser(false);
    }
  };

  const changeRole = (role: string) => {
    // Keep any non-clinic roles (like System Manager) and swap the clinic role.
    const others = roles.filter((r) => !CLINIC_ROLES.includes(r as ClinicRole));
    const next = role ? [...others, role] : others;
    saveUser({ roles: next.map((r) => ({ role: r })) }, role ? t.users.roleChanged(label(t.enums.role, role)) : t.users.roleRemoved);
  };

  const sectionsOpen = current
    ? PERMISSION_MATRIX.filter((row) => Object.values(row.cells).some((key) => key && current.perms[key])).length
    : 0;
  const a = t.users.table;
  const cellKeys = (keys: Array<PermissionKey | undefined>) => keys.filter((key): key is PermissionKey => Boolean(key));
  const setMany = (keys: PermissionKey[], on: boolean) =>
    current && setPerms({ ...current.perms, ...Object.fromEntries(keys.map((key) => [key, on])) });

  return (
    <PageContainer section="system">
      <PageHeader icon={UserCog} section="system" title={t.users.manageUser} back={{ href: "/users", label: t.users.title }} />

      <DetailLayout
        aside={
          <ProfileCard
            avatar={<Avatar name={userData.full_name || userData.name} photo={userData.user_image} size={96} />}
            title={userData.full_name || userData.name}
            subtitle={<span dir="ltr" className="break-all">{userData.email}</span>}
            badges={
              <>
                {roles.length === 0 ? (
                  <Badge>{t.users.noRoles}</Badge>
                ) : (
                  roles.map((role) => <Badge key={role} tone="primary">{label(t.enums.role, role)}</Badge>)
                )}
                <Badge tone={enabled ? "green" : "red"}>{enabled ? t.users.active : t.users.disabled}</Badge>
              </>
            }
            stats={[
              { icon: Shield, value: <Fraction value={num(onCount)} of={num(PERMISSION_KEYS.length)} />, label: t.users.permissionsOn },
              { icon: LayoutGrid, value: <Fraction value={num(sectionsOpen)} of={num(PERMISSION_MATRIX.length)} />, label: t.users.sectionsOpen, hue: "blue" },
            ]}
            detailsTitle={t.users.details}
            details={[
              { label: t.users.email, value: <span dir="ltr" className="break-all">{userData.email}</span> },
              { label: t.users.clinicRole, value: clinicRole ? label(t.enums.role, clinicRole) : t.users.noClinicRole },
              { label: t.users.statusLabel, value: enabled ? t.users.active : t.users.disabled },
              { label: t.users.language, value: isLang(userData.language) ? LANG_NAMES[userData.language] : t.users.languageDefault },
            ]}
          />
        }
      >
        {limit.dialog}
        <Card title={t.users.account} icon={UserCog}>
          {/* On a view-only copy the account and the permissions can be read, not changed. */}
          <fieldset disabled={Boolean(session.readOnly)} className="min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t.users.clinicRole}>
              <SelectInput value={clinicRole} onChange={(e) => changeRole(e.target.value)} disabled={savingUser}>
                <option value="">{t.users.noClinicRole}</option>
                {CLINIC_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {label(t.enums.role, role)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <div className="sm:pt-6">
              <Toggle
                checked={enabled}
                disabled={savingUser || isSelf}
                onChange={(value) => {
                  if (value && !limit.check("users")) return;
                  saveUser({ enabled: value ? 1 : 0 }, value ? t.users.userEnabled : t.users.userDisabled);
                }}
                label={enabled ? t.users.accountActive : t.users.accountDisabled}
                description={isSelf ? t.users.cannotDisableSelf : t.users.disabledCannotLogIn}
              />
            </div>
          </fieldset>
        </Card>

        <Card title={t.users.permissions} icon={Shield} flush>
          {!current ? (
            <PageLoading />
          ) : (
            <fieldset disabled={Boolean(session.readOnly)} className="min-w-0 space-y-5">
              <div className="px-5 sm:px-6 space-y-4">
                {isSuper && <Alert tone="blue">{t.users.superUserNote}</Alert>}
                {!current.exists && <Alert tone="yellow">{t.users.noPermissionsYet}</Alert>}
                {/* The role presets fill the table; nothing is saved until Save Permissions. */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600 me-1">{t.users.startFrom}</span>
                  {CLINIC_ROLES.map((role) => (
                    <Button key={role} size="sm" variant="secondary" onClick={() => setPerms(fill(ROLE_PRESETS[role]))}>
                      {t.users.presetName[role]}
                    </Button>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => setPerms(fill(PERMISSION_KEYS))}>
                    {t.users.selectAll}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPerms(fill([]))}>
                    {t.users.clearAll}
                  </Button>
                </div>
              </div>

              {/* One row per section, one column per action; an action a section does not have is an empty cell. */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-gray-200">
                      <th scope="col" className="px-4 ps-6 py-3.5 text-start text-xs font-semibold uppercase tracking-wide text-gray-800">
                        {a.section}
                      </th>
                      {PERMISSION_ACTIONS.map((action) => {
                        // Clinic setup (manage_users) is the right to change everyone's permissions: never
                        // switched on with a whole column, only in its own cell, its row or a preset.
                        const keys = cellKeys(PERMISSION_MATRIX.map((row) => row.cells[action])).filter((key) => key !== "manage_users");
                        const on = keys.filter((key) => current.perms[key]).length;
                        return (
                          <th key={action} scope="col" className="px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-800">
                            <span className="flex flex-col items-center gap-1.5">
                              {a.actions[action]}
                              <Check3
                                checked={on === keys.length}
                                some={on > 0}
                                onChange={(value) => setMany(keys, value)}
                                label={a.allInColumn(a.actions[action])}
                              />
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_MATRIX.map((row) => {
                      const keys = cellKeys(Object.values(row.cells));
                      const on = keys.filter((key) => current.perms[key]).length;
                      return (
                        <tr key={row.row} className="border-b border-gray-200 last:border-0">
                          <th scope="row" className="px-4 ps-6 py-3 text-start font-normal">
                            <span className="flex items-center gap-3">
                              <Check3
                                checked={on === keys.length}
                                some={on > 0}
                                onChange={(value) => setMany(keys, value)}
                                label={a.allInRow(a.rows[row.row])}
                              />
                              <span>
                                <span className="block font-medium text-gray-900">{a.rows[row.row]}</span>
                                {row.row === "setup" && <span className="block text-xs text-gray-500">{a.setupHint}</span>}
                              </span>
                            </span>
                          </th>
                          {PERMISSION_ACTIONS.map((action) => {
                            const key = row.cells[action];
                            return (
                              <td key={action} className="px-3 py-3 text-center">
                                {key ? (
                                  <Check3
                                    checked={current.perms[key]}
                                    onChange={(value) => setMany([key], value)}
                                    label={t.enums.permission[key]}
                                  />
                                ) : (
                                  <span role="img" className="text-gray-300" aria-label={a.notAvailable}>
                                    —
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 pb-5 sm:pb-6">
                <span className="text-sm text-gray-600">{t.users.switchedOn(onCount, PERMISSION_KEYS.length)}</span>
                {!session.readOnly && (
                  <Button icon={Save} onClick={savePerms} loading={saving}>
                    {t.users.savePermissions}
                  </Button>
                )}
              </div>
            </fieldset>
          )}
        </Card>
      </DetailLayout>
    </PageContainer>
  );
}
