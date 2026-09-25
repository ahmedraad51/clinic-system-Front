"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { getDoc } from "@/lib/frappe";
import { CLINIC_ROLES, PERMISSION_KEYS, type ClinicPermission, type PermissionKey, type User } from "@/lib/types";

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
}

interface SessionContextType {
  profile: User | null;
  roles: string[];
  displayName: string;
  /** The role shown under the user's name, e.g. "Clinic Receptionist". */
  roleLabel: string;
  isSuperUser: boolean;
  can: (permission: PermissionKey) => boolean;
  loading: boolean;
  /** Call after changing the current user's permissions. */
  refresh: () => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

const allPerms = (value: boolean): Perms =>
  Object.fromEntries(PERMISSION_KEYS.map((key) => [key, value])) as Perms;

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
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
      if (!cancelled) setState({ forUser: user, profile, roles, perms });
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user, version]);

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
