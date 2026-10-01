"use client";

import Link from "next/link";
import ToothLogo from "@/components/ToothLogo";
import { useI18n } from "@/context/LanguageContext";
import { LANG_NAMES, LANGS } from "@/i18n";
import { cx } from "@/lib/format";

/** The top of the public website: the name, and Arabic / English (kept on this computer: nobody is logged in). */
export default function SiteHeader({ children }: { children?: React.ReactNode }) {
  const { t, lang, setLang } = useI18n();
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-surface/95 print:hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-4">
        <Link href="/site" className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 shrink-0 bg-brand rounded-md flex items-center justify-center text-white">
            <ToothLogo size={22} />
          </span>
          <span className="text-xl font-semibold text-gray-900">{t.site.title}</span>
        </Link>
        <nav className="ms-auto flex items-center gap-1 sm:gap-3">{children}</nav>
        <div role="group" aria-label={t.site.language} className="flex gap-1">
          {LANGS.map((option) => (
            <button
              key={option}
              type="button"
              lang={option}
              aria-pressed={lang === option}
              onClick={() => setLang(option)}
              className={cx(
                "min-h-9 pointer-coarse:min-h-11 px-3 rounded-md text-sm font-medium transition",
                lang === option ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-100",
              )}
            >
              {LANG_NAMES[option]}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
