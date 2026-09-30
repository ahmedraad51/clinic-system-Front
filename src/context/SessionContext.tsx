"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { getDoc, getList } from "@/lib/frappe";
import { CLINIC_ROLES, PERMISSION_KEYS, type ClinicPermission, type Doctor, type PermissionKey, type User } from "@/lib/types";

/**
 * Who is logged in and what they may do.
 *
 * - Administrator and anyone with the System Manager role can do everything.
 * - Everyone else gets the switches from their Clinic Permission doc (named after the user).
 * - No Clinic Permission doc means no access to any section.
 *
 * This only decides what the UI shows. The backend must still check permissions itself.
 */

type Perms = Record<PermissionKey, boolean>;

interface SessionState {
  forUser: string;
  profile: User;
  roles: string[];
  perms: Perms;
  doctor: MyDoctor | null;
}

/** The Doctor record of the person using the app, found by their email. */
export interface MyDoctor {
  name: string;
  full_name: string;
  /** For the avatar in the menu and the top bar. */
  gender?: string;
  photo?: string;
}

interface SessionContextType {
  profile: User | null;
  roles: string[];
  displayName: string;
  /** The role shown under the user's name, e.g. "Clinic Receptionist". */
  roleLabel: string;
  isSuperUser: boolean;
  /** Set when the user is one of the clinic's doctors: screens then open on their own patients. */
  doctor: MyDoctor | null;
  can: (permission: PermissionKey) => boolean;
  loading: boolean;
  /** Call after changing the current user's permissions. */
  refresh: () => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

const allPerms = (value: boolean): Perms =>
  Object.fromEntries(PERMISSION_KEYS.map((key) => [key, value])) as Perms;

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user, loginCount } = useAuth();
  const [state, setState] = useState<SessionState | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      let profile: User;
      try {
        profile = await getDoc<User>("User", user);
      } catch {
        profile = { name: user, email: user, full_name: user, roles: [] };
      }
      const roles = (profile.roles ?? []).map((row) => row.role);
      const superUser = user === "Administrator" || roles.includes("System Manager");

      let perms = allPerms(superUser);
      if (!superUser) {
        try {
          const doc = await getDoc<ClinicPermission>("Clinic Permission", user);
          perms = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, Number(doc[key]) === 1])) as Perms;
        } catch {
          // No Clinic Permission doc for this user: everything stays off.
        }
      }
      // A doctor's user account and Doctor record share the email address.
      let doctor: MyDoctor | null = null;
      if (profile.email) {
        try {
          const rows = await getList<Doctor>("Doctor", ["name", "full_name", "gender", "photo"], {
            filters: [["email", "=", profile.email], ["is_active", "=", 1]],
            limit: 1,
          });
          if (rows[0]) doctor = { name: rows[0].name, full_name: rows[0].full_name, gender: rows[0].gender, photo: rows[0].photo };
        } catch {
          // Not allowed to read doctors: the screens simply show everyone.
        }
      }
      if (!cancelled) setState({ forUser: user, profile, roles, perms, doctor });
    };
    load();
    return () => {
      cancelled = true;
    };
    // loginCount: logging in again (after the session ended) loads the roles and permissions again.
  }, [user, version, loginCount]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const value = useMemo<SessionContextType>(() => {
    const current = state && state.forUser === user ? state : null;
    const roles = current?.roles ?? [];
    const isSuperUser = user === "Administrator" || roles.includes("System Manager");
    const clinicRole = CLINIC_ROLES.find((role) => roles.includes(role));
    return {
      profile: current?.profile ?? null,
      roles,
      displayName: current?.profile.full_name || current?.profile.first_name || user || "",
      roleLabel: clinicRole ?? (isSuperUser ? "System Manager" : "Staff"),
      isSuperUser,
      doctor: current?.doctor ?? null,
      can: (permission) => Boolean(current?.perms[permission]),
      loading: Boolean(user) && !current,
      refresh,
    };
  }, [state, user, refresh]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
};
