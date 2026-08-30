"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { login as frappeLogin, logout as frappeLogout } from "@/lib/frappe";

/**
 * TEMPORARY: the login page is switched off while the rest of the app is built.
 * To bring it back: set AUTH_DISABLED to false and rename src/app/_login -> src/app/login.
 */
const AUTH_DISABLED: boolean = true;
const DEV_USER = "Administrator";

interface AuthContextType {
  user: string | null;
  isLoading: boolean;
  authDisabled: boolean;
  login: (usr: string, pwd: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(AUTH_DISABLED ? DEV_USER : null);
  const [isLoading, setIsLoading] = useState(!AUTH_DISABLED);

  useEffect(() => {
    if (AUTH_DISABLED) return;
    const savedUser = localStorage.getItem("dental_user");
    if (savedUser) setUser(savedUser);
    setIsLoading(false);
  }, []);

  const login = async (usr: string, pwd: string) => {
    await frappeLogin(usr, pwd);
    setUser(usr);
    localStorage.setItem("dental_user", usr);
  };

  const logout = async () => {
    if (AUTH_DISABLED) return;
    await frappeLogout();
    setUser(null);
    localStorage.removeItem("dental_user");
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, authDisabled: AUTH_DISABLED, login, logout }}
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
