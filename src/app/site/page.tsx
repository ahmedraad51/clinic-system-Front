"use client";

import ClinicFinder from "@/components/site/ClinicFinder";
import SiteHeader from "@/components/site/SiteHeader";
import { CARD_CLASS } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { cx } from "@/lib/format";

/**
 * The public website: what the cloud's main address shows (no clinic is named there). Anyone may open it, with no
 * login and no menu (PUBLIC_PATHS in MainLayout).
 */
export default function SitePage() {
  const { t } = useI18n();
  const s = t.site;
  return (
    <div className="min-h-screen app-bg">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16 space-y-12">
        <section className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 leading-tight">{s.title}</h1>
          <p className="mt-4 text-lg text-gray-700">{s.tagline}</p>
        </section>
        <section id="clinic" className={cx(CARD_CLASS, "p-6 sm:p-8 max-w-xl")} aria-labelledby="find-title">
          <h2 id="find-title" className="text-lg font-semibold text-gray-900">
            {s.findTitle}
          </h2>
          <p className="text-sm text-gray-600 mt-1 mb-4">{s.findText}</p>
          <ClinicFinder />
        </section>
      </main>
    </div>
  );
}
