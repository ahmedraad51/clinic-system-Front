"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { getDoc } from "@/lib/frappe";
import { applyThemeColor } from "@/lib/theme";
import { WEEK_DAYS, type ClinicSettings } from "@/lib/types";
import { formatMoney, todayISO, weekdayIndex } from "@/lib/format";
import { cleanRates, convertMoney, currencyOf, rateOn as rateOnDay, sumByCurrency, totalsOrder, type ExchangeRate, type MoneyTotals } from "@/lib/currency";
import { cleanCountryCode } from "@/lib/phone";
import { messages } from "@/i18n";

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
  /** True once the clinic's settings have arrived (or failed to); until then `settings` holds the defaults. */
  loaded: boolean;
  clinicName: string;
  /** The clinic's own currency (IQD): totals are kept in it. */
  currency: string;
  /** The second currency the clinic takes ("USD"), or "" when it takes only its own. */
  secondCurrency: string;
  /** The currencies a plan or payment can be in: the clinic's own first. */
  currencies: string[];
  /** The rates of the second currency, oldest first. */
  rates: ExchangeRate[];
  /** The rate on a day (default today): how many of the clinic's units one unit of the second currency is worth. */
  rateOn: (day?: string) => number | null;
  /** An amount in the clinic's own currency, at the rate of a day (default today); 0 when there is no rate. */
  toMain: (amount: number | string | null | undefined, code?: string | null, day?: string) => number;
  /** Country calling code as digits (Clinic Settings → phone_country_code, default "964"), for WhatsApp links. */
  countryCode: string;
  /** The price list: treatment type → usual price. Types without a price are missing. */
  prices: Record<string, number>;
  /** False on a day the clinic is closed (Clinic Settings → working_days). Every day is open when none are set. */
  isOpenOn: (iso: string) => boolean;
  /** Formats an amount in a currency (default the clinic's own). */
  money: (amount: number | string | null | undefined, currency?: string | null) => string;
  /** Totals in more than one currency, the clinic's own first: "IQD 150,000 + $300". Nothing at all is "IQD 0". */
  moneyTotals: (totals: MoneyTotals) => string;
  /** An exchange rate in words: "$1 = IQD 1,460" (a rate below 1 keeps its decimals). */
  rateText: (rate: number) => string;
  /**
   * What a patient owes: their total (Patient.total_remaining, in the clinic's currency), or, when some of it is on
   * plans in the other currency, each currency on its own ("IQD 150,000 + $300").
   */
  owedText: (total: number | string | null | undefined, plans?: { currency?: string; remaining_amount?: number }[]) => string;
  /** Call after saving the settings page. */
  refresh: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, loginCount } = useAuth();
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
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
        setLoaded(true);
      } catch (err) {
        console.error("Could not load Clinic Settings", err);
        if (!cancelled) setLoaded(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // loginCount: logging in again (after the session ended) loads the settings again.
  }, [user, version, loginCount]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const currency = (settings.currency || "IQD").toUpperCase();
  const secondCurrency = settings.second_currency && settings.second_currency.toUpperCase() !== currency ? settings.second_currency.toUpperCase() : "";
  const currencies = useMemo(() => (secondCurrency ? [currency, secondCurrency] : [currency]), [currency, secondCurrency]);
  const rates = useMemo(() => cleanRates(settings.exchange_rates), [settings.exchange_rates]);
  const rateOn = useCallback((day?: string) => rateOnDay(rates, day || todayISO()), [rates]);
  const toMain = useCallback(
    (amount: number | string | null | undefined, code?: string | null, day?: string) =>
      convertMoney(Number(amount) || 0, (code || currency).toUpperCase(), currency, rateOnDay(rates, day || todayISO()), currency) ?? 0,
    [currency, rates],
  );
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
  const money = useCallback(
    (amount: number | string | null | undefined, code?: string | null) => formatMoney(amount, code || currency),
    [currency],
  );
  const moneyTotals = useCallback(
    (totals: MoneyTotals) => {
      const codes = totalsOrder(totals, currency);
      return codes.length ? codes.map((code) => formatMoney(totals[code], code)).join(" + ") : formatMoney(0, currency);
    },
    [currency],
  );

  const rateText = useCallback(
    (rate: number) => {
      const decimals = rate >= 100 ? 2 : 6;
      return messages().money.rate(formatMoney(1, secondCurrency || currency), formatMoney(rate, currency, decimals));
    },
    [currency, secondCurrency],
  );

  const owedText = useCallback(
    (total: number | string | null | undefined, plans?: { currency?: string; remaining_amount?: number }[]) => {
      const open = (plans ?? []).filter((plan) => Number(plan.remaining_amount) > 0);
      return open.some((plan) => currencyOf(plan, currency) !== currency)
        ? moneyTotals(sumByCurrency(open, (plan) => Number(plan.remaining_amount) || 0, (plan) => currencyOf(plan, currency)))
        : formatMoney(total, currency);
    },
    [currency, moneyTotals],
  );

  const value = useMemo(
    () => ({
      settings, loaded, clinicName, currency, secondCurrency, currencies, rates, rateOn, toMain,
      countryCode, prices, isOpenOn, money, moneyTotals, rateText, owedText, refresh,
    }),
    [settings, loaded, clinicName, currency, secondCurrency, currencies, rates, rateOn, toMain, countryCode, prices, isOpenOn, money, moneyTotals, rateText, owedText, refresh],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};
