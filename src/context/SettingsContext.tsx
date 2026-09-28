"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { getDoc } from "@/lib/frappe";
import { applyThemeColor } from "@/lib/theme";
import { WEEK_DAYS, type ClinicSettings } from "@/lib/types";
import { formatMoney, weekdayIndex } from "@/lib/format";
import { cleanCountryCode } from "@/lib/phone";

/** Used until the real settings arrive, and for any field the backend leaves empty. */
const DEFAULTS: ClinicSettings = {
  name: "Clinic Settings",
  clinic_name: "DentClinic",
  currency: "IQD",
  enable_whatsapp: 1,
  enable_financial_reports: 1,
};

interface SettingsContextType {
  settings: ClinicSettings;
  clinicName: string;
  currency: string;
  /** Country calling code as digits (Clinic Settings → phone_country_code, default "964"), for WhatsApp links. */
  countryCode: string;
  /** The price list: treatment type → usual price. Types without a price are missing. */
  prices: Record<string, number>;
  /** False on a day the clinic is closed (Clinic Settings → working_days). Every day is open when none are set. */
  isOpenOn: (iso: string) => boolean;
  /** Formats an amount in the clinic currency. */
  money: (amount: number | string | null | undefined) => string;
  /** Call after saving the settings page. */
  refresh: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, loginCount } = useAuth();
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
    // loginCount: logging in again (after the session ended) loads the settings again.
  }, [user, version, loginCount]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const currency = settings.currency || "IQD";
  const clinicName = settings.clinic_name || "DentClinic";
  const countryCode = cleanCountryCode(settings.phone_country_code);
  const prices = useMemo(() => {
    const list: Record<string, number> = {};
    (settings.treatment_prices ?? []).forEach((row) => {
      const price = Number(row.price);
      if (row.treatment_type && price > 0) list[row.treatment_type] = price;
    });
    return list;
  }, [settings.treatment_prices]);
  const isOpenOn = useCallback(
    (iso: string) => {
      const days = (settings.working_days || "")
        .split(",")
        .map((d) => d.trim())
        .filter((d) => (WEEK_DAYS as readonly string[]).includes(d));
      return days.length === 0 || days.includes(WEEK_DAYS[weekdayIndex(iso)]);
    },
    [settings.working_days],
  );
  const money = useCallback((amount: number | string | null | undefined) => formatMoney(amount, currency), [currency]);

  const value = useMemo(
    () => ({ settings, clinicName, currency, countryCode, prices, isOpenOn, money, refresh }),
    [settings, clinicName, currency, countryCode, prices, isOpenOn, money, refresh],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};
