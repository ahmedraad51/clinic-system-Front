"use client";

import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useSession } from "./SessionContext";
import { useSettings } from "./SettingsContext";
import { updateDoc } from "@/lib/frappe";
import {
  CHOSEN_LANG_KEY, DEFAULT_LANG, LAST_LANG_KEY, dirOf, isLang, messagesFor, setLocale, type Lang, type Messages,
} from "@/i18n";

interface LanguageContextType {
  lang: Lang;
  dir: "rtl" | "ltr";
  /** The texts of the current language: t.patients.title, t.common.save … */
  t: Messages;
  /** Switches the language for this user (saved on their User record) and this computer. */
  setLang: (lang: Lang) => void;
  /** The clinic's Arabic digits setting (٠-٩ on Arabic screens). */
  arabicDigits: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const listeners = new Set<() => void>();

function readKey(key: string): Lang | null {
  try {
    const value = localStorage.getItem(key);
    return isLang(value) ? value : null;
  } catch {
    return null;
  }
}

const readChosen = () => readKey(CHOSEN_LANG_KEY);
const readShownLast = () => readKey(LAST_LANG_KEY);

function subscribeChosen(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

const serverChosen = () => null;

/**
 * The language of the app. In order: the language this user chose (their User record, or a switch made just now),
 * the language chosen on this computer, the clinic's default (Clinic Settings → default_language), Arabic. Until the
 * user's record and the clinic settings have arrived, the language shown last on this computer stands in, so a page
 * load does not flash the other language (and draw everything twice).
 *
 * Everything below is drawn again from scratch when the language changes (a key on the children), so every
 * text, date and number follows at once.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { profile, refresh, readOnly, loading: profileLoading } = useSession();
  const { settings, loaded: settingsLoaded } = useSettings();
  const chosenHere = useSyncExternalStore(subscribeChosen, readChosen, serverChosen);
  // A switch made in this visit wins until the saved User record catches up.
  const [picked, setPicked] = useState<{ user: string | null; lang: Lang } | null>(null);

  const clinicDefault = isLang(settings.default_language) ? settings.default_language : DEFAULT_LANG;
  const userChoice = isLang(profile?.language) ? profile.language : null;
  // Read once: the language this computer showed last time, until the real answer is known.
  const shownLast = useSyncExternalStore(subscribeChosen, readShownLast, serverChosen);
  const waiting = !settingsLoaded || (Boolean(user) && profileLoading);
  const lang: Lang =
    (picked && picked.user === user ? picked.lang : null) ??
    userChoice ??
    chosenHere ??
    (waiting ? shownLast ?? clinicDefault : clinicDefault);
  const arabicDigits = Number(settings.arabic_digits) === 1;
  // Plain functions (dates, money, errors) read the language from here, so it is set before anything draws.
  setLocale(lang, arabicDigits);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = dirOf(lang);
    try {
      localStorage.setItem(LAST_LANG_KEY, lang);
    } catch {
      // Storage is blocked: the next visit starts in the default language.
    }
  }, [lang]);

  const setLang = useCallback(
    (next: Lang) => {
      setPicked({ user, lang: next });
      try {
        localStorage.setItem(CHOSEN_LANG_KEY, next);
      } catch {
        // Storage is blocked: the choice still lasts for this visit and on the User record.
      }
      listeners.forEach((listener) => listener());
      // Frappe's User.language: the choice follows the user to other computers (not from a view-only copy).
      if (user && !readOnly) {
        updateDoc("User", user, { language: next })
          .then(refresh)
          .catch((err) => console.error("Could not save the language on the user", err));
      }
    },
    [user, refresh, readOnly],
  );

  const value = useMemo(
    () => ({ lang, dir: dirOf(lang), t: messagesFor(lang), setLang, arabicDigits }),
    [lang, setLang, arabicDigits],
  );

  return (
    <LanguageContext.Provider value={value}>
      <Fragment key={`${lang}-${arabicDigits ? "arab" : "latn"}`}>{children}</Fragment>
    </LanguageContext.Provider>
  );
}

export const useI18n = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
};
