"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, ReactNode } from "react";
import { login as frappeLogin, logout as frappeLogout, onSessionEnded, onSessionRestored } from "@/lib/frappe";

/**
 * TEMPORARY: the login page is switched off while the rest of the app is built.
 * To bring it back: set AUTH_DISABLED to false and rename src/app/_login -> src/app/login.
 */
const AUTH_DISABLED: boolean = true;
const DEV_USER = "Administrator";
const USER_KEY = "dental_user";
/** "1" when "Keep me logged in on this computer" was off: the login ends with the browser. */
const SESSION_ONLY_KEY = "dental_session_only";
/** A cookie without an expiry date, which the browser deletes when it closes. */
const OPEN_COOKIE = "dental_open";
/** Changed on every login, so other tabs hear about it (the storage event) and load again. */
const LOGIN_STAMP_KEY = "dental_login_at";

interface AuthContextType {
  /** The Frappe user ID (an email, or "Administrator"), or null when nobody is logged in. */
  user: string | null;
  /** True until the saved session has been read from the browser. Pages must not redirect before this is false. */
  isLoading: boolean;
  authDisabled: boolean;
  /**
   * True after the server ended the login (it expired). The user is kept, so the open page and anything typed on
   * it stay; MainLayout shows a "Log in again" dialog (SessionEndedNotice) that calls relogin().
   */
  sessionEnded: boolean;
  /** Goes up on every login, in this tab or another. SessionProvider and SettingsProvider load again when it changes. */
  loginCount: number;
  /**
   * Logs in. With `remember` off (a shared front-desk computer) the login ends when the browser closes; the next
   * time the app opens in that browser it also ends the old login on the server.
   */
  login: (usr: string, pwd: string, remember?: boolean) => Promise<void>;
  /** After the session ended: logs the same user in again with their password, keeping the page as it is. */
  relogin: (pwd: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Only while login is off: act as another user, to test what their permissions allow. */
  switchUser?: (usr: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/* The saved user ID lives in localStorage. Reading it through useSyncExternalStore means the server render and
   the first client render agree (both see null), and every tab stays in step. */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

const browserStillOpen = () => document.cookie.split("; ").includes(`${OPEN_COOKIE}=1`);
/** A "this browser session only" login from a browser that has since been closed. */
const closedSessionOnlyLogin = () =>
  localStorage.getItem(SESSION_ONLY_KEY) === "1" && localStorage.getItem(USER_KEY) !== null && !browserStillOpen();

const readSavedUser = () => (closedSessionOnlyLogin() ? null : localStorage.getItem(USER_KEY));
const noSavedUser = () => null;
const notify = () => listeners.forEach((listener) => listener());
const forgetUser = () => {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SESSION_ONLY_KEY);
  document.cookie = `${OPEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
};

const subscribeNothing = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const savedUser = useSyncExternalStore(subscribe, readSavedUser, noSavedUser);
  const hydrated = useSyncExternalStore(subscribeNothing, onClient, onServer);
  const [demoUser, setDemoUser] = useState(DEV_USER);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [loginCount, setLoginCount] = useState(0);

  const user = AUTH_DISABLED ? demoUser : savedUser;
  const isLoading = AUTH_DISABLED ? false : !hydrated;

  useEffect(() => {
    if (AUTH_DISABLED) return undefined;
    // The browser was closed after a "this browser only" login: end that login on the server too.
    if (closedSessionOnlyLogin()) {
      forgetUser();
      frappeLogout().catch(() => {
        // Already ended, or the server is not reachable; the app asks for a login either way.
      });
      notify();
    }
    // A login in another tab: this tab's session works again, so reload who we are.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LOGIN_STAMP_KEY) return;
      setSessionEnded(false);
      setLoginCount((count) => count + 1);
    };
    window.addEventListener("storage", onStorage);
    // When the server says the login has ended, keep the page and ask for the password again; when requests
    // work again (another tab logged in), stop asking.
    const stopEnded = onSessionEnded(() => setSessionEnded(true));
    const stopRestored = onSessionRestored(() => setSessionEnded(false));
    return () => {
      window.removeEventListener("storage", onStorage);
      stopEnded();
      stopRestored();
    };
  }, []);

  const login = async (usr: string, pwd: string, remember = true) => {
    const userId = await frappeLogin(usr, pwd);
    localStorage.setItem(USER_KEY, userId);
    if (remember) {
      localStorage.removeItem(SESSION_ONLY_KEY);
    } else {
      localStorage.setItem(SESSION_ONLY_KEY, "1");
      document.cookie = `${OPEN_COOKIE}=1; path=/; SameSite=Lax`;
    }
    localStorage.setItem(LOGIN_STAMP_KEY, String(Date.now()));
    setSessionEnded(false);
    setLoginCount((count) => count + 1);
    notify();
  };

  const relogin = async (pwd: string) => {
    if (!savedUser) throw new Error("Nobody is logged in.");
    await login(savedUser, pwd, localStorage.getItem(SESSION_ONLY_KEY) !== "1");
  };

  const logout = async () => {
    if (AUTH_DISABLED) return;
    try {
      await frappeLogout();
    } finally {
      forgetUser();
      notify();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        authDisabled: AUTH_DISABLED,
        sessionEnded,
        loginCount,
        login,
        relogin,
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
