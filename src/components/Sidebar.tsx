"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ToothLogo from "@/components/ToothLogo";
import {
  LayoutDashboard,
  BellRing,
  BriefcaseMedical,
  ClipboardCheck,
  Users,
  Calendar,
  Stethoscope,
  CreditCard,
  BarChart2,
  LogOut,
  UserCog,
  Settings,
  Languages,
  MessageCircle,
  Pill,
  X,
  type LucideIcon,
} from "lucide-react";
import { MyAvatar } from "@/components/Avatar";
import { hueClass, type Section } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { cx } from "@/lib/format";
import { fileHref } from "@/lib/frappe";
import { label, LANG_NAMES, LANGS, type Messages } from "@/i18n";
import type { PermissionKey } from "@/lib/types";

/** A menu entry's text in the translation files (nav.*). */
type MenuKey = "dashboard" | "today" | "patients" | "recall" | "appointments" | "treatments" | "payments" | "reports" | "doctors" | "medicines" | "users" | "whatsapp" | "settings";

interface MenuItem {
  key: MenuKey;
  icon: LucideIcon;
  path: string;
  /** Hidden unless the user has this permission. */
  permission?: PermissionKey;
  /** The colour of its icon tile; the clinic colour when left out. */
  section?: Section;
}

const menuGroups: Array<{ group: keyof Messages["nav"]["groups"]; items: MenuItem[] }> = [
  {
    group: "clinic",
    items: [
      { key: "dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { key: "today", icon: ClipboardCheck, path: "/today", permission: "view_appointments", section: "appointments" },
      { key: "patients", icon: Users, path: "/patients", permission: "view_patients", section: "patients" },
      { key: "recall", icon: BellRing, path: "/recall", permission: "view_appointments", section: "patients" },
      { key: "appointments", icon: Calendar, path: "/appointments", permission: "view_appointments", section: "appointments" },
      { key: "treatments", icon: Stethoscope, path: "/treatments", permission: "view_treatments", section: "treatments" },
    ],
  },
  {
    group: "finance",
    items: [
      { key: "payments", icon: CreditCard, path: "/payments", permission: "view_payments", section: "money" },
      { key: "reports", icon: BarChart2, path: "/reports", permission: "view_reports", section: "reports" },
    ],
  },
  {
    group: "system",
    items: [
      { key: "doctors", icon: BriefcaseMedical, path: "/doctors", permission: "manage_users", section: "system" },
      { key: "medicines", icon: Pill, path: "/medicines", permission: "manage_users", section: "treatments" },
      { key: "users", icon: UserCog, path: "/users", permission: "manage_users", section: "system" },
      { key: "whatsapp", icon: MessageCircle, path: "/whatsapp", permission: "manage_users", section: "whatsapp" },
      { key: "settings", icon: Settings, path: "/settings", permission: "manage_users", section: "system" },
    ],
  },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, authDisabled } = useAuth();
  const { can, displayName, roleLabel } = useSession();
  const { settings, clinicName } = useSettings();
  const { t, lang, setLang } = useI18n();

  const reportsOn = settings.enable_financial_reports !== 0;
  const visible = (item: MenuItem) =>
    (!item.permission || can(item.permission)) && (item.path !== "/reports" || reportsOn);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        className={cx(
          "fixed inset-y-0 start-0 z-50 w-64 flex flex-col transition-transform print:hidden",
          // A dark night-blue menu.
          "bg-linear-to-b from-slate-900 via-slate-900 to-indigo-950",
          // Off screen at the start side: the left in English, the right in Arabic.
          // (max-lg: so the right-to-left rule cannot win over the always-open menu on large screens)
          !open && "max-lg:-translate-x-full max-lg:rtl:translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-3 min-w-0">
            {settings.logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- the logo is an uploaded file of unknown size
              <img src={fileHref(settings.logo)} alt="" className="w-9 h-9 rounded-xl object-contain bg-gray-50" />
            ) : (
              <span
                className={cx(
                  "w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-white",
                  "bg-linear-to-br from-primary-500 to-(--sec-appointments) shadow-lg shadow-black/30",
                )}
              >
                <ToothLogo size={20} />
              </span>
            )}
            <span className="font-bold text-lg truncate text-white">{clinicName}</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden w-11 h-11 -me-2 flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/10"
            aria-label={t.nav.closeMenu}
          >
            <X size={18} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {menuGroups.map((group) => {
            const items = group.items.filter(visible);
            if (items.length === 0) return null;
            return (
              <div key={group.group}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">{t.nav.groups[group.group]}</p>
                <div className="space-y-1">
                  {items.map((item) => {
                    const active = pathname === item.path || pathname.startsWith(item.path + "/");
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={cx(
                          hueClass(item.section ?? "primary"),
                          "group relative flex items-center gap-3 min-h-11 px-2 py-1.5 rounded-xl text-sm font-medium transition-all",
                          active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        {active && <span aria-hidden="true" className="absolute -start-3 top-2 bottom-2 w-1 rounded-e bg-sec-light" />}
                        <span
                          aria-hidden="true"
                          className={cx(
                            "w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition",
                            "bg-linear-to-br from-sec to-sec-deep text-white",
                            active ? "shadow-sm" : "opacity-80 group-hover:opacity-100",
                          )}
                        >
                          <Icon size={17} />
                        </span>
                        <span>{t.nav[item.key]}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Language: each user's choice is kept on their account. */}
        <div className="px-4 pt-3">
          <div role="group" aria-label={t.nav.language} className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
            <Languages size={16} className="shrink-0 mx-2 text-slate-400" aria-hidden="true" />
            {LANGS.map((option) => (
              <button
                key={option}
                type="button"
                lang={option}
                aria-pressed={lang === option}
                // The page is drawn again in the other language: a form with unsaved changes asks first.
                data-confirm-unsaved
                onClick={() => setLang(option)}
                className={cx(
                  "flex-1 min-h-9 pointer-coarse:min-h-11 rounded-lg text-sm font-medium transition",
                  lang === option ? "bg-white text-slate-900 shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white",
                )}
              >
                {LANG_NAMES[option]}
              </button>
            ))}
          </div>
        </div>

        {/* User */}
        <div className="px-4 py-4 mt-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5">
            <Link href="/profile" onClick={onClose} className="flex items-center gap-3 flex-1 min-w-0">
              <MyAvatar size={36} />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-white truncate">{displayName}</span>
                <span className="block text-xs text-slate-400 truncate">{label(t.enums.role, roleLabel)}</span>
              </span>
            </Link>
            {!authDisabled && (
              <button
                type="button"
                onClick={handleLogout}
                className="text-slate-400 hover:text-red-400 transition"
                aria-label={t.nav.logout}
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
