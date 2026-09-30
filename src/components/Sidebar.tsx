"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ToothLogo from "@/components/ToothLogo";
import {
  LayoutDashboard,
  BellRing,
  BriefcaseMedical,
  Circle,
  CircleDot,
  ClipboardCheck,
  Users,
  Calendar,
  Stethoscope,
  CreditCard,
  Wallet,
  History,
  BarChart2,
  Minus,
  UserCog,
  Settings,
  MessageCircle,
  Pill,
  X,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { saveAppearance, useAppearance } from "@/lib/appearance";
import { cx } from "@/lib/format";
import { fileHref } from "@/lib/frappe";
import type { Messages } from "@/i18n";
import type { PermissionKey } from "@/lib/types";

/** A menu entry's text in the translation files (nav.*). */
type MenuKey = "dashboard" | "today" | "patients" | "recall" | "appointments" | "treatments" | "payments" | "expenses" | "reports" | "doctors" | "medicines" | "users" | "whatsapp" | "activity" | "settings";

interface MenuItem {
  key: MenuKey;
  icon: LucideIcon;
  path: string;
  /** Hidden unless the user has this permission. */
  permission?: PermissionKey;
}

const menuGroups: Array<{ group: keyof Messages["nav"]["groups"]; items: MenuItem[] }> = [
  {
    group: "clinic",
    items: [
      { key: "dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { key: "today", icon: ClipboardCheck, path: "/today", permission: "view_appointments" },
      { key: "patients", icon: Users, path: "/patients", permission: "view_patients" },
      { key: "recall", icon: BellRing, path: "/recall", permission: "view_appointments" },
      { key: "appointments", icon: Calendar, path: "/appointments", permission: "view_appointments" },
      { key: "treatments", icon: Stethoscope, path: "/treatments", permission: "view_treatments" },
    ],
  },
  {
    group: "finance",
    items: [
      { key: "payments", icon: CreditCard, path: "/payments", permission: "view_payments" },
      { key: "expenses", icon: Wallet, path: "/expenses", permission: "view_expenses" },
      { key: "reports", icon: BarChart2, path: "/reports", permission: "view_reports" },
    ],
  },
  {
    group: "system",
    items: [
      { key: "doctors", icon: BriefcaseMedical, path: "/doctors", permission: "manage_users" },
      { key: "medicines", icon: Pill, path: "/medicines", permission: "manage_users" },
      { key: "users", icon: UserCog, path: "/users", permission: "manage_users" },
      { key: "whatsapp", icon: MessageCircle, path: "/whatsapp", permission: "manage_users" },
      { key: "activity", icon: History, path: "/activity", permission: "manage_users" },
      { key: "settings", icon: Settings, path: "/settings", permission: "manage_users" },
    ],
  },
];

/**
 * The menu: 260 px on the surface colour with a soft shadow. On large screens it can collapse to 70 px of icons
 * (the pin in its header, or the Appearance panel); pointing at it (or tabbing into it) then opens it over the page.
 * Below the lg breakpoint it slides in from the start side. The Appearance panel can make it semi-dark.
 */
export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { can } = useSession();
  const { settings, clinicName } = useSettings();
  const { t } = useI18n();
  const appearance = useAppearance();
  const collapsed = appearance.collapsed;

  const reportsOn = settings.enable_financial_reports !== 0;
  const visible = (item: MenuItem) =>
    (!item.permission || can(item.permission)) && (item.path !== "/reports" || reportsOn);

  // Hidden while the menu is collapsed to icons, shown again while it is pointed at or a keyboard user is in it (not
  // after a mouse click: the clicked link keeps the focus, and the menu would stay open over the page).
  const hideWhenCollapsed =
    "lg:nav-collapsed:opacity-0 lg:nav-collapsed:group-hover/nav:opacity-100 lg:nav-collapsed:group-has-[:focus-visible]/nav:opacity-100 transition-opacity";

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} aria-hidden="true" />}
      {/* data-nav: the semi-dark menu (globals.css) follows a class on <html>, set before the first paint. */}
      <aside
        data-nav
        className={cx(
          "group/nav fixed inset-y-0 start-0 z-50 w-[16.25rem] flex flex-col print:hidden",
          "bg-surface text-gray-800 shadow-sm skin-bordered:shadow-none skin-bordered:border-e skin-bordered:border-gray-200",
          "transition-[width,translate,box-shadow] duration-200 ease-in-out",
          // Collapsed to icons on large screens; pointed at, it opens over the page with a deeper shadow.
          "lg:nav-collapsed:w-[4.375rem] lg:nav-collapsed:overflow-hidden",
          "lg:nav-collapsed:hover:w-[16.25rem] lg:nav-collapsed:hover:shadow-md lg:nav-collapsed:has-[:focus-visible]:w-[16.25rem]",
          // Off screen at the start side: the left in English, the right in Arabic.
          // (max-lg: so the right-to-left rule cannot win over the always-open menu on large screens)
          !open && "max-lg:-translate-x-full max-lg:rtl:translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="h-16 shrink-0 ps-[1.375rem] pe-3 flex items-center justify-between gap-2">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-3 min-w-0">
            {settings.logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- the logo is an uploaded file of unknown size
              <img src={fileHref(settings.logo)} alt="" className="w-7 h-7 shrink-0 rounded object-contain" />
            ) : (
              <span className="shrink-0 text-primary-600">
                <ToothLogo size={28} />
              </span>
            )}
            <span className={cx("font-semibold text-[1.375rem] leading-none truncate text-gray-900", hideWhenCollapsed)}>{clinicName}</span>
          </Link>
          <button
            type="button"
            onClick={() => saveAppearance({ collapsed: !collapsed })}
            className={cx(
              "max-lg:hidden w-8 h-8 shrink-0 flex items-center justify-center rounded-md text-gray-800 hover:bg-gray-100",
              hideWhenCollapsed,
              // Invisible while collapsed, so it must not catch a tap meant for the logo under it.
              "lg:nav-collapsed:pointer-events-none lg:nav-collapsed:group-hover/nav:pointer-events-auto lg:nav-collapsed:group-has-[:focus-visible]/nav:pointer-events-auto",
            )}
            aria-label={collapsed ? t.nav.expandMenu : t.nav.collapseMenu}
            aria-pressed={!collapsed}
          >
            {collapsed ? <Circle size={20} /> : <CircleDot size={20} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden w-11 h-11 -me-1 flex items-center justify-center rounded-md text-gray-800 hover:bg-gray-100"
            aria-label={t.nav.closeMenu}
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu */}
        <nav className="thin-scroll flex-1 overflow-y-auto overflow-x-hidden pb-4">
          {menuGroups.map((group, index) => {
            const items = group.items.filter(visible);
            if (items.length === 0) return null;
            return (
              <div key={group.group}>
                <p
                  className={cx(
                    "relative h-5 px-[1.375rem] mb-1.5 text-xs uppercase tracking-[0.025rem] text-gray-500 whitespace-nowrap",
                    index > 0 && "mt-4",
                  )}
                >
                  <span className={hideWhenCollapsed}>{t.nav.groups[group.group]}</span>
                  {/* While collapsed, a short line stands for the group's name. */}
                  <Minus
                    size={18}
                    aria-hidden="true"
                    className="absolute start-[1.625rem] top-0 hidden lg:nav-collapsed:block lg:nav-collapsed:group-hover/nav:hidden lg:nav-collapsed:group-has-[:focus-visible]/nav:hidden"
                  />
                </p>
                <ul>
                  {items.map((item) => {
                    const active = pathname === item.path || pathname.startsWith(item.path + "/");
                    const Icon = item.icon;
                    return (
                      <li key={item.path} className="mx-3 mb-1.5">
                        <Link
                          href={item.path}
                          onClick={onClose}
                          aria-current={active ? "page" : undefined}
                          className={cx(
                            "flex items-center gap-2 min-h-[2.375rem] pointer-coarse:min-h-11 px-3 rounded-md text-[0.9375rem] whitespace-nowrap transition-colors",
                            active ? "bg-brand text-white shadow-primary" : "text-gray-800 hover:bg-gray-100",
                          )}
                        >
                          <Icon size={22} aria-hidden="true" className="shrink-0" />
                          <span className={cx("truncate", hideWhenCollapsed)}>{t.nav[item.key]}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
