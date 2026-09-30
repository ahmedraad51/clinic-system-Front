"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ToothLogo from "@/components/ToothLogo";
import { Alert, Button, Field, PageLoading, TextInput, Toggle } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/LanguageContext";
import { LANG_NAMES, LANGS } from "@/i18n";
import { cx } from "@/lib/format";
import { errorMessage, sessionEndedMessage } from "@/lib/frappe";
import { safeNextPath } from "@/lib/links";

/**
 * Parked in a private folder (_login) while login is switched off, so /login is not a route.
 * To turn it on, see "Switching to the real back end" in AGENTS.md.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login, user, isLoading, sessionEnded } = useAuth();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  // The page to return to (MainLayout adds ?next=), checked so it cannot lead off the site.
  const next = safeNextPath(params.get("next"));
  const ended = sessionEnded || params.get("ended") === "1";
  const [usr, setUsr] = useState("");
  const [pwd, setPwd] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Someone who is already logged in goes straight on.
  useEffect(() => {
    if (!isLoading && user) router.replace(next);
  }, [isLoading, user, router, next]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(usr.trim(), pwd, remember);
      router.replace(next);
    } catch (err) {
      setError(errorMessage(err, t.login.failed));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-8 w-full max-w-md">
        {/* Nobody is known yet, so the choice is kept on this computer. */}
        <div role="group" aria-label={t.nav.language} className="flex justify-end gap-1 -mt-2 mb-2">
          {LANGS.map((option) => (
            <button
              key={option}
              type="button"
              lang={option}
              aria-pressed={lang === option}
              onClick={() => setLang(option)}
              className={cx(
                "min-h-9 pointer-coarse:min-h-11 px-3 rounded-lg text-sm font-medium transition",
                lang === option ? "bg-primary-50 text-primary-700" : "text-gray-500 hover:bg-gray-100",
              )}
            >
              {LANG_NAMES[option]}
            </button>
          ))}
        </div>
        <div className="text-center mb-8">
          <span className="mx-auto w-12 h-12 bg-brand rounded-2xl flex items-center justify-center text-white">
            <ToothLogo size={26} />
          </span>
          <h1 className="text-2xl font-semibold text-gray-800 mt-4">{t.common.appName}</h1>
          <p className="text-gray-500 text-sm mt-1">{t.login.subtitle}</p>
        </div>

        {ended && !error && (
          <div className="mb-4">
            <Alert tone="yellow">{sessionEndedMessage()}</Alert>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Field label={t.login.username}>
            <TextInput
              type="text"
              autoComplete="username"
              value={usr}
              onChange={(e) => setUsr(e.target.value)}
              placeholder={t.login.usernamePlaceholder}
              dir="ltr"
              required
            />
          </Field>
          <Field label={t.login.password}>
            <TextInput
              type="password"
              autoComplete="current-password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              required
            />
          </Field>
          <Toggle
            checked={remember}
            onChange={setRemember}
            label={t.login.remember}
            description={t.login.rememberHint}
          />

          {error && <Alert tone="red">{error}</Alert>}

          <Button type="submit" loading={loading} className="w-full">
            {loading ? t.login.loggingIn : t.login.logIn}
          </Button>
        </form>
      </div>
    </div>
  );
}
