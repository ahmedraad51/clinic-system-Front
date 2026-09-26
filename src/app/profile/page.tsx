"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, KeyRound, Users, X } from "lucide-react";
import RequirePermission from "@/components/Guard";
import {
  Alert, Badge, Button, Card, DetailList, DetailRow, Field, PageContainer, PageHeader, SelectInput, TextInput,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";
import { useToast } from "@/context/ToastContext";
import { changePassword, errorMessage, getList } from "@/lib/frappe";
import { cx } from "@/lib/format";
import { PERMISSION_GROUPS, type User } from "@/lib/types";

export default function ProfilePage() {
  return (
    <RequirePermission>
      <Profile />
    </RequirePermission>
  );
}

function Profile() {
  const { user, authDisabled } = useAuth();
  const { profile, roles, displayName, roleLabel, can, isSuperUser } = useSession();

  return (
    <PageContainer narrow>
      <PageHeader title="My Profile" />

      <Card>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 shrink-0 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xl">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-lg">{displayName}</p>
            <p className="text-sm text-gray-500">{roleLabel}</p>
          </div>
        </div>
        <div className="mt-5">
          <DetailList>
            <DetailRow label="Username">{user}</DetailRow>
            <DetailRow label="Email">{profile?.email}</DetailRow>
            <DetailRow label="Roles">
              {roles.length > 0 ? (
                <span className="flex flex-wrap gap-1.5">
                  {roles.map((role) => (
                    <Badge key={role} tone="primary">
                      {role}
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

      <Card title="What I Can Do">
        {isSuperUser && (
          <div className="mb-4">
            <Alert tone="blue">You are a System Manager, so every permission is on.</Alert>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.group}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{group.group}</p>
              <ul className="space-y-1.5">
                {group.items.map((item) => {
                  const on = can(item.key);
                  return (
                    <li key={item.key} className={cx("flex items-center gap-2 text-sm", on ? "text-gray-800" : "text-gray-500")}>
                      {on ? <Check size={15} className="text-green-600" /> : <X size={15} />}
                      {item.label}
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
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.next.length < 8) {
      setError("The new password must have at least 8 characters.");
      return;
    }
    if (form.next !== form.confirm) {
      setError("The two new passwords are not the same.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await changePassword(form.current, form.next);
      toast.success(demo ? "Password changed (dummy data, nothing was really changed)." : "Password changed.");
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setError(errorMessage(err, "Could not change the password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Change Password">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Current Password" required>
          <TextInput
            type="password"
            autoComplete="current-password"
            value={form.current}
            onChange={(e) => setForm({ ...form, current: e.target.value })}
            required
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="New Password" required hint="At least 8 characters.">
            <TextInput
              type="password"
              autoComplete="new-password"
              value={form.next}
              onChange={(e) => setForm({ ...form, next: e.target.value })}
              required
            />
          </Field>
          <Field label="Repeat New Password" required>
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
          Change Password
        </Button>
      </form>
    </Card>
  );
}

/** Only while login is off: act as another user to see what their permissions allow. */
function DemoUserCard() {
  const { user, switchUser } = useAuth();
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
          Try Another User
        </span>
      }
    >
      <p className="text-sm text-gray-500 mb-4">
        Login is switched off while the app is being built. Pick a user to see the app with their permissions. This goes
        away when login is turned on.
      </p>
      <Field label="View the app as">
        <SelectInput
          value={user ?? ""}
          onChange={(e) => {
            switchUser(e.target.value);
            toast.info("Now viewing the app as " + (users.find((u) => u.name === e.target.value)?.full_name || e.target.value));
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
