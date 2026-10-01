"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { UserRound, Check, KeyRound, LayoutGrid, Server, Shield, Users, X } from "lucide-react";
import RequirePermission from "@/components/Guard";
import { MyAvatar } from "@/components/Avatar";
import ScreenSizeCard from "@/components/ScreenSizeCard";
import { InstallAppCard } from "@/components/InstallApp";
import {
  Alert, Badge, Button, Card, DetailLayout, Fraction, Field, PageContainer, PageHeader, ProfileCard, SelectInput, TextInput, Toggle,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useDeployment } from "@/context/DeploymentContext";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useToast } from "@/context/ToastContext";
import { changePassword, errorMessage, getList, MOCK_DATA } from "@/lib/frappe";
import { BUILT_MODE, DEPLOYMENT_MODES, setDemoMode, type DeploymentMode } from "@/lib/deployment";
import { demoFlag, setDemoFlag, subscribeDemoFlags } from "@/lib/demo";
import { label, num } from "@/i18n";
import { PERMISSION_ACTIONS, PERMISSION_KEYS, PERMISSION_MATRIX, type User } from "@/lib/types";

/** The shortest new password Frappe accepts. */
const MIN_PASSWORD = 8;

export default function ProfilePage() {
  return (
    <RequirePermission>
      <Profile />
    </RequirePermission>
  );
}

function Profile() {
  const { t } = useI18n();
  const { user, authDisabled } = useAuth();
  const { profile, roles, displayName, roleLabel, can, isSuperUser, readOnly } = useSession();

  const a = t.users.table;
  const onCount = PERMISSION_KEYS.filter((key) => can(key)).length;
  const sectionsOpen = PERMISSION_MATRIX.filter((row) => Object.values(row.cells).some((key) => key && can(key))).length;

  return (
    <PageContainer>
      <PageHeader icon={UserRound} section="primary" title={t.profile.title} />

      <DetailLayout
        aside={
          <ProfileCard
            avatar={<MyAvatar size={96} />}
            title={displayName}
            subtitle={profile?.email ? <span dir="ltr" className="break-all">{profile.email}</span> : undefined}
            badges={roles.map((role) => (
              <Badge key={role} tone="primary">
                {label(t.enums.role, role)}
              </Badge>
            ))}
            stats={[
              { icon: Shield, value: <Fraction value={num(onCount)} of={num(PERMISSION_KEYS.length)} />, label: t.users.permissionsOn },
              { icon: LayoutGrid, value: <Fraction value={num(sectionsOpen)} of={num(PERMISSION_MATRIX.length)} />, label: t.users.sectionsOpen, hue: "blue" },
            ]}
            detailsTitle={t.users.details}
            details={[
              { label: t.profile.username, value: <span dir="ltr">{user}</span> },
              { label: t.profile.email, value: profile?.email ? <span dir="ltr" className="break-all">{profile.email}</span> : "" },
              { label: t.profile.roles, value: label(t.enums.role, roleLabel) },
            ]}
          />
        }
      >
        <Card title={t.profile.whatICanDo} icon={Shield} flush>
          {isSuperUser && (
            <div className="px-5 sm:px-6 pb-4">
              <Alert tone="blue">{t.profile.superUser}</Alert>
            </div>
          )}
          {/* The same table as on Manage User, to read only: a tick where the action is allowed. */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-200">
                  <th scope="col" className="px-4 ps-6 py-3.5 text-start text-xs font-semibold uppercase tracking-wide text-gray-800">
                    {a.section}
                  </th>
                  {PERMISSION_ACTIONS.map((action) => (
                    <th key={action} scope="col" className="px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-800">
                      {a.actions[action]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_MATRIX.map((row) => (
                  <tr key={row.row} className="border-b border-gray-200 last:border-0">
                    <th scope="row" className="px-4 ps-6 py-3 text-start font-medium text-gray-900">
                      {a.rows[row.row]}
                    </th>
                    {PERMISSION_ACTIONS.map((action) => {
                      const key = row.cells[action];
                      return (
                        <td key={action} className="px-3 py-3 text-center">
                          {!key ? (
                            <span role="img" className="text-gray-300" aria-label={a.notAvailable}>—</span>
                          ) : can(key) ? (
                            <span role="img" aria-label={a.allowed(t.enums.permission[key])}>
                              <Check size={18} aria-hidden="true" className="inline text-green-600" />
                            </span>
                          ) : (
                            <span role="img" aria-label={a.notAllowed(t.enums.permission[key])}>
                              <X size={18} aria-hidden="true" className="inline text-gray-400" />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <ScreenSizeCard />
        <InstallAppCard />
        {/* The online copy cannot change a password; anywhere else the server decides (offline, Save says why). */}
        {readOnly === "copy" ? (
          <Card title={t.profile.changePassword} icon={KeyRound}>
            <p className="text-sm text-gray-600">{t.access.passwordAtClinic}</p>
          </Card>
        ) : (
          <ChangePasswordCard demo={authDisabled} />
        )}
        {authDisabled && <DemoUserCard />}
        {MOCK_DATA && <DemoModeCard />}
      </DetailLayout>
    </PageContainer>
  );
}

function ChangePasswordCard({ demo }: { demo: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.next.length < MIN_PASSWORD) {
      setError(t.profile.tooShort(MIN_PASSWORD));
      return;
    }
    if (form.next !== form.confirm) {
      setError(t.profile.notSame);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await changePassword(form.current, form.next);
      toast.success(demo ? t.profile.changedDemo : t.profile.changed);
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setError(errorMessage(err, t.profile.changeFailed));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={t.profile.changePassword}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t.profile.currentPassword} required>
          <TextInput
            type="password"
            autoComplete="current-password"
            value={form.current}
            onChange={(e) => setForm({ ...form, current: e.target.value })}
            required
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t.profile.newPassword} required hint={t.profile.newPasswordHint(MIN_PASSWORD)}>
            <TextInput
              type="password"
              autoComplete="new-password"
              value={form.next}
              onChange={(e) => setForm({ ...form, next: e.target.value })}
              required
            />
          </Field>
          <Field label={t.profile.repeatPassword} required>
            <TextInput
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
            />
          </Field>
        </div>
        {error && <Alert tone="red">{error}</Alert>}
        <Button type="submit" icon={KeyRound} loading={saving}>
          {t.profile.changePassword}
        </Button>
      </form>
    </Card>
  );
}

/** Only with the dummy data: preview another way of installing (cloud, clinic server, cloud copy) on this computer. */
function DemoModeCard() {
  const { t } = useI18n();
  const d = t.deployment;
  const { mode } = useDeployment();
  const noInternet = useSyncExternalStore(subscribeDemoFlags, () => demoFlag("noInternet"), () => false);
  return (
    <Card title={d.previewTitle} icon={Server}>
      <p className="text-sm text-gray-500 mb-4">{d.previewText}</p>
      <Field label={d.previewLabel} hint={d.modeHints[mode]}>
        <SelectInput
          name="deployment_mode"
          value={mode}
          onChange={(e) => {
            setDemoMode(e.target.value as DeploymentMode);
            // The whole app starts again in the new mode (and with fresh dummy data).
            window.location.reload();
          }}
        >
          {DEPLOYMENT_MODES.map((option) => (
            <option key={option} value={option}>
              {option === BUILT_MODE ? d.builtIn(d.modes[option]) : d.modes[option]}
            </option>
          ))}
        </SelectInput>
      </Field>
      {/* A clinic server checks its internet; with the dummy data it can be switched off here. */}
      {mode === "clinic-server" && (
        <div className="mt-4">
          <Toggle
            checked={noInternet}
            onChange={(on) => setDemoFlag("noInternet", on)}
            label={d.pretendNoInternet}
            description={d.pretendNoInternetHint}
          />
        </div>
      )}
    </Card>
  );
}

/** Only while login is off: act as another user to see what their permissions allow. */
function DemoUserCard() {
  const { user, switchUser } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<User>("User", ["name", "full_name"], {
          filters: [
            ["name", "!=", "Guest"],
            ["enabled", "=", 1],
          ],
          orderBy: "full_name asc",
          limit: 0,
        });
        if (!cancelled) setUsers(rows);
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!switchUser) return null;

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Users size={18} className="text-primary-600" />
          {t.profile.tryAnotherUser}
        </span>
      }
    >
      <p className="text-sm text-gray-500 mb-4">{t.profile.tryAnotherUserText}</p>
      <Field label={t.profile.viewAs}>
        <SelectInput
          value={user ?? ""}
          onChange={(e) => {
            switchUser(e.target.value);
            toast.info(t.profile.nowViewingAs(users.find((u) => u.name === e.target.value)?.full_name || e.target.value));
          }}
        >
          {users.map((u) => (
            <option key={u.name} value={u.name}>
              {u.full_name || u.name}
            </option>
          ))}
        </SelectInput>
      </Field>
    </Card>
  );
}
