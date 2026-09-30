"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, KeyRound, Users, X } from "lucide-react";
import RequirePermission from "@/components/Guard";
import { MyAvatar } from "@/components/Avatar";
import ScreenSizeCard from "@/components/ScreenSizeCard";
import {
  Alert, Badge, Button, Card, DetailList, DetailRow, Field, PageContainer, PageHeader, SelectInput, TextInput,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useToast } from "@/context/ToastContext";
import { changePassword, errorMessage, getList } from "@/lib/frappe";
import { label } from "@/i18n";
import { cx } from "@/lib/format";
import { PERMISSION_GROUPS, type User } from "@/lib/types";

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
  const { profile, roles, displayName, roleLabel, can, isSuperUser } = useSession();

  return (
    <PageContainer narrow>
      <PageHeader title={t.profile.title} />

      <Card>
        <div className="flex items-center gap-4">
          <MyAvatar size={56} />
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-lg">{displayName}</p>
            <p className="text-sm text-gray-500">{label(t.enums.role, roleLabel)}</p>
          </div>
        </div>
        <div className="mt-5">
          <DetailList>
            <DetailRow label={t.profile.username}>
              <span dir="ltr">{user}</span>
            </DetailRow>
            <DetailRow label={t.profile.email}>
              {profile?.email && <span dir="ltr">{profile.email}</span>}
            </DetailRow>
            <DetailRow label={t.profile.roles}>
              {roles.length > 0 ? (
                <span className="flex flex-wrap gap-1.5">
                  {roles.map((role) => (
                    <Badge key={role} tone="primary">
                      {label(t.enums.role, role)}
                    </Badge>
                  ))}
                </span>
              ) : (
                ""
              )}
            </DetailRow>
          </DetailList>
        </div>
      </Card>

      <ScreenSizeCard />

      <Card title={t.profile.whatICanDo}>
        {isSuperUser && (
          <div className="mb-4">
            <Alert tone="blue">{t.profile.superUser}</Alert>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.group}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t.enums.permissionGroup[group.group]}</p>
              <ul className="space-y-1.5">
                {group.items.map((item) => {
                  const on = can(item);
                  return (
                    <li key={item} className={cx("flex items-center gap-2 text-sm", on ? "text-gray-800" : "text-gray-500")}>
                      {on ? <Check size={15} className="text-green-600" /> : <X size={15} />}
                      {t.enums.permission[item]}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <ChangePasswordCard demo={authDisabled} />
      {authDisabled && <DemoUserCard />}
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
