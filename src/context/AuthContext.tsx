"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { login as frappeLogin, logout as frappeLogout } from "@/lib/frappe";

interface AuthContextType {
  user: string | null;
  isLoading: boolean;
  login: (usr: string, pwd: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("dental_user");
    if (savedUser) setUser(savedUser);
    setIsLoading(false);
  }, []);

  const login = async (usr: string, pwd: string) => {
    const res = await frappeLogin(usr, pwd);
    setUser(usr);
    localStorage.setItem("dental_user", usr);
  };

  const logout = async () => {
    await frappeLogout();
    setUser(null);
    localStorage.removeItem("dental_user");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};