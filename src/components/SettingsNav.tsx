"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDeployment } from "@/context/DeploymentContext";
import { useI18n } from "@/context/LanguageContext";
import { cx } from "@/lib/format";

/** The pages under Settings, as pills above each of them. License is only for a clinic server (and its copy). */
export default function SettingsNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { mode } = useDeployment();
  const pages = [
    { href: "/settings", label: t.plan.nav.settings },
    { href: "/settings/plan", label: t.plan.nav.plan },
    { href: "/settings/server", label: t.backup.nav },
    ...(mode === "cloud" ? [] : [{ href: "/settings/license", label: t.license.nav }]),
  ];
  return (
    <nav aria-label={t.plan.navLabel} className="flex flex-wrap gap-1 mb-6 print:hidden">
      {pages.map((page) => {
        const active = pathname === page.href;
        return (
          <Link
            key={page.href}
            href={page.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "inline-flex items-center min-h-10 pointer-coarse:min-h-11 px-4 rounded-md text-sm font-medium transition",
              active ? "bg-brand text-white shadow-primary" : "text-gray-800 hover:bg-primary-50 hover:text-primary-600",
            )}
          >
            {page.label}
          </Link>
        );
      })}
    </nav>
  );
}
