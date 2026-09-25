"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { getDoc } from "@/lib/frappe";
import { formatMoney } from "@/lib/format";
import { applyThemeColor } from "@/lib/theme";
import type { ClinicSettings } from "@/lib/types";

/** Used until the real settings arrive, and for any field the backend leaves empty. */
const DEFAULTS: ClinicSettings = {
  name: "Clinic Settings",
  clinic_name: "DentClinic",
  currency: "USD",
  enable_whatsapp: 1,
  enable_financial_reports: 1,
};

interface SettingsContextType {
  settings: ClinicSettings;
  clinicName: string;
  currency: string;
  /** Formats an amount in the clinic currency. */
  money: (amount: number | string | null | undefined) => string;
  /** Call after saving the settings page. */
  refresh: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULTS);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      try {
        const doc = await getDoc<ClinicSettings>("Clinic Settings", "Clinic Settings");
        if (cancelled) return;
        setSettings({ ...DEFAULTS, ...doc });
        applyThemeColor(doc.theme_color);
      } catch (err) {
        console.error("Could not load Clinic Settings", err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const currency = settings.currency || "USD";
  const clinicName = settings.clinic_name || "DentClinic";
  const money = useCallback((amount: number | string | null | undefined) => formatMoney(amount, currency), [currency]);

  const value = useMemo(
    () => ({ settings, clinicName, currency, money, refresh }),
    [settings, clinicName, currency, money, refresh],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};
