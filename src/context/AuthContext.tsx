"use client";

import { createContext, useContext, useState, useSyncExternalStore, ReactNode } from "react";
import { login as frappeLogin, logout as frappeLogout } from "@/lib/frappe";

/**
 * TEMPORARY: the login page is switched off while the rest of the app is built.
 * To bring it back: set AUTH_DISABLED to false and rename src/app/_login -> src/app/login.
 */
const AUTH_DISABLED: boolean = true;
const DEV_USER = "Administrator";
const USER_KEY = "dental_user";

interface AuthContextType {
  /** The Frappe username (an email, or "Administrator"), or null when nobody is logged in. */
  user: string | null;
  /** True until the saved session has been read from the browser. Pages must not redirect before this is false. */
  isLoading: boolean;
  authDisabled: boolean;
  login: (usr: string, pwd: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Only while login is off: act as another user, to test what their permissions allow. */
  switchUser?: (usr: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/* The saved username lives in localStorage. Reading it through useSyncExternalStore means the
   server render and the first client render agree (both see null), and every tab stays in step. */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

const readSavedUser = () => localStorage.getItem(USER_KEY);
const noSavedUser = () => null;
const notify = () => listeners.forEach((listener) => listener());

const subscribeNothing = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const savedUser = useSyncExternalStore(subscribe, readSavedUser, noSavedUser);
  const hydrated = useSyncExternalStore(subscribeNothing, onClient, onServer);
  const [demoUser, setDemoUser] = useState(DEV_USER);

  const user = AUTH_DISABLED ? demoUser : savedUser;
  const isLoading = AUTH_DISABLED ? false : !hydrated;

  const login = async (usr: string, pwd: string) => {
    await frappeLogin(usr, pwd);
    localStorage.setItem(USER_KEY, usr);
    notify();
  };

  const logout = async () => {
    if (AUTH_DISABLED) return;
    try {
      await frappeLogout();
    } finally {
      localStorage.removeItem(USER_KEY);
      notify();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        authDisabled: AUTH_DISABLED,
        login,
        logout,
        switchUser: AUTH_DISABLED ? setDemoUser : undefined,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
