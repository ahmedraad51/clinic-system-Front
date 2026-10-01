"use client";

import { useState } from "react";
import { CalendarDays, CreditCard, MessageCircle, Smile, Stethoscope, WifiOff, type LucideIcon } from "lucide-react";
import ClinicFinder from "@/components/site/ClinicFinder";
import SiteHeader from "@/components/site/SiteHeader";
import SitePlans from "@/components/site/SitePlans";
import TrialForm from "@/components/site/TrialForm";
import { CARD_CLASS, IconTile, type Hue } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { CONTACT, TRIAL_DAYS, type PlanKey } from "@/config/sales";
import { cx } from "@/lib/format";
import type { Messages } from "@/i18n";

type FeatureKey = keyof Messages["site"]["features"];
const FEATURES: Array<{ key: FeatureKey; icon: LucideIcon; hue: Hue }> = [
  { key: "patients", icon: Smile, hue: "primary" },
  { key: "appointments", icon: CalendarDays, hue: "appointments" },
  { key: "chart", icon: Stethoscope, hue: "treatments" },
  { key: "money", icon: CreditCard, hue: "money" },
  { key: "whatsapp", icon: MessageCircle, hue: "whatsapp" },
  { key: "offline", icon: WifiOff, hue: "system" },
];
const SCREENS = ["patient", "appointments", "dental-chart"] as const;

/** A screenshot of the app in the page's language (public/site/ar or en, 1200 × 750). */
function Screenshot({ name, alt, className }: { name: string; alt: string; className?: string }) {
  const { lang } = useI18n();
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a fixed picture from public/, already sized and compressed
    <img
      src={`/site/${lang}/${name}.webp`}
      alt={alt}
      width={1200}
      height={750}
      loading="lazy"
      className={cx("w-full h-auto rounded-md border border-gray-200 shadow-md bg-white", className)}
    />
  );
}

/**
 * The public website: what the cloud's main address shows (no clinic is named there). Anyone may open it, with no
 * login and no menu (PUBLIC_PATHS in MainLayout). Prices and contacts come from src/config/sales.ts.
 */
export default function SitePage() {
  const { t } = useI18n();
  const s = t.site;
  const [plan, setPlan] = useState<PlanKey>("cloud");
  const whatsapp = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(s.whatsappText)}`;

  const choose = (key: PlanKey) => {
    setPlan(key);
    document.getElementById("trial")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen app-bg">
      <SiteHeader>
        <div className="hidden md:flex items-center gap-1">
          {(["features", "plans", "trial"] as const).map((key) => (
            <a key={key} href={`#${key}`} className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
              {s.nav[key]}
            </a>
          ))}
        </div>
        {/* On a phone the header has room for the name and the language only: Go to Your Clinic is further down. */}
        <a href="#clinic" className="hidden sm:inline-block px-3 py-2 rounded-md text-sm font-medium text-primary-700 hover:bg-primary-50 whitespace-nowrap">
          {s.nav.yourClinic}
        </a>
      </SiteHeader>

      <main id="main" className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* What it is, and the two ways to start. */}
        <section className="py-10 sm:py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 leading-tight">{s.heroTitle}</h1>
            <p className="mt-4 text-lg text-gray-700">{s.heroText}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#trial"
                className="inline-flex items-center justify-center min-h-11 px-5 rounded-md bg-brand text-white font-medium shadow-primary hover:bg-brand-dark"
              >
                {s.startTrial}
              </a>
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-md border border-green-200 bg-green-50 text-green-800 font-medium hover:bg-green-100"
              >
                <MessageCircle size={18} aria-hidden="true" />
                {s.talkWhatsapp}
              </a>
            </div>
            <p className="mt-3 text-sm text-gray-600">{s.trialNote(TRIAL_DAYS)}</p>
          </div>
          <Screenshot name="dashboard" alt={s.heroImage} />
        </section>

        <section id="features" aria-labelledby="features-title" className="py-10 scroll-mt-20">
          <h2 id="features-title" className="text-2xl font-semibold text-gray-900">
            {s.featuresTitle}
          </h2>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ key, icon, hue }) => (
              <div key={key} className={cx(CARD_CLASS, "p-5 flex gap-4")}>
                <IconTile icon={icon} hue={hue} />
                <div>
                  <h3 className="font-semibold text-gray-900">{s.features[key].title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{s.features[key].text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="screens-title" className="py-10">
          <h2 id="screens-title" className="text-2xl font-semibold text-gray-900">
            {s.screensTitle}
          </h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {SCREENS.map((name) => (
              <figure key={name}>
                <Screenshot name={name} alt={s.screens[name]} />
                <figcaption className="mt-2 text-sm text-gray-600">{s.screens[name]}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section id="plans" aria-labelledby="plans-title" className="py-10 scroll-mt-20">
          <h2 id="plans-title" className="text-2xl font-semibold text-gray-900">
            {s.plansTitle}
          </h2>
          <p className="mt-2 text-gray-700">{s.plansText}</p>
          <div className="mt-8">
            <SitePlans onChoose={choose} />
          </div>
        </section>

        <section id="trial" aria-labelledby="trial-title" className="py-10 scroll-mt-20">
          <div className={cx(CARD_CLASS, "p-6 sm:p-8 max-w-3xl")}>
            <h2 id="trial-title" className="text-2xl font-semibold text-gray-900">
              {s.trialTitle}
            </h2>
            <p className="mt-2 mb-6 text-gray-700">{s.trialText}</p>
            <TrialForm plan={plan} onPlanChange={setPlan} />
          </div>
        </section>

        <section id="clinic" aria-labelledby="find-title" className="py-10 scroll-mt-20">
          <div className={cx(CARD_CLASS, "p-6 sm:p-8 max-w-xl")}>
            <h2 id="find-title" className="text-lg font-semibold text-gray-900">
              {s.findTitle}
            </h2>
            <p className="text-sm text-gray-600 mt-1 mb-4">{s.findText}</p>
            <ClinicFinder />
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 sm:px-6 py-8 text-sm text-gray-600 border-t border-gray-200">
        {s.footer(new Date().getFullYear())} · <span dir="ltr">{CONTACT.email}</span>
      </footer>

      {/* Always at hand: WhatsApp us. */}
      <a
        href={whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={s.talkWhatsapp}
        className="fixed bottom-5 end-5 z-40 w-14 h-14 rounded-full bg-solid-green text-white shadow-lg flex items-center justify-center hover:bg-solid-green-dark print:hidden"
      >
        <MessageCircle size={26} aria-hidden="true" />
      </a>
    </div>
  );
}
