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
  MessageCircle,
  Pill,
  X,
  type LucideIcon,
} from "lucide-react";
import { MyAvatar } from "@/components/Avatar";
import { hueClass, type Section } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { cx } from "@/lib/format";
import { fileHref } from "@/lib/frappe";
import type { PermissionKey } from "@/lib/types";

interface MenuItem {
  label: string;
  icon: LucideIcon;
  path: string;
  /** Hidden unless the user has this permission. */
  permission?: PermissionKey;
  /** The colour of its icon tile; the clinic colour when left out. */
  section?: Section;
}

const menuGroups: Array<{ group: string; items: MenuItem[] }> = [
  {
    group: "CLINIC",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { label: "Today", icon: ClipboardCheck, path: "/today", permission: "view_appointments", section: "appointments" },
      { label: "Patients", icon: Users, path: "/patients", permission: "view_patients", section: "patients" },
      { label: "Recall", icon: BellRing, path: "/recall", permission: "view_appointments", section: "patients" },
      { label: "Appointments", icon: Calendar, path: "/appointments", permission: "view_appointments", section: "appointments" },
      { label: "Treatments", icon: Stethoscope, path: "/treatments", permission: "view_treatments", section: "treatments" },
    ],
  },
  {
    group: "FINANCE",
    items: [
      { label: "Payments", icon: CreditCard, path: "/payments", permission: "view_payments", section: "money" },
      { label: "Reports", icon: BarChart2, path: "/reports", permission: "view_reports", section: "reports" },
    ],
  },
  {
    group: "SYSTEM",
    items: [
      { label: "Doctors", icon: BriefcaseMedical, path: "/doctors", permission: "manage_users", section: "system" },
      { label: "Medicines", icon: Pill, path: "/medicines", permission: "manage_users", section: "treatments" },
      { label: "Users", icon: UserCog, path: "/users", permission: "manage_users", section: "system" },
      { label: "WhatsApp", icon: MessageCircle, path: "/whatsapp", permission: "manage_users", section: "whatsapp" },
      { label: "Settings", icon: Settings, path: "/settings", permission: "manage_users", section: "system" },
    ],
  },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, authDisabled } = useAuth();
  const { can, displayName, roleLabel } = useSession();
  const { settings, clinicName } = useSettings();

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
          // A: white. B: a dark night-blue menu. C: warm cream.
          "bg-white border-e border-gray-100",
          "design-b:bg-linear-to-b design-b:from-slate-900 design-b:via-slate-900 design-b:to-indigo-950 design-b:border-e-0",
          "design-c:bg-[#fffaf4] design-c:border-orange-100",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-gray-100 design-b:border-white/10 design-c:border-orange-100">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-3 min-w-0">
            {settings.logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- the logo is an uploaded file of unknown size
              <img src={fileHref(settings.logo)} alt="" className="w-9 h-9 rounded-xl object-contain bg-gray-50" />
            ) : (
              <span
                className={cx(
                  "w-9 h-9 shrink-0 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-sm",
                  "design-b:bg-linear-to-br design-b:from-primary-500 design-b:to-(--sec-appointments) design-b:shadow-lg design-b:shadow-black/30",
                  "design-c:rounded-full",
                )}
              >
                <ToothLogo size={20} />
              </span>
            )}
            <span className="font-bold text-gray-800 text-lg truncate design-b:text-white">{clinicName}</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden w-11 h-11 -me-2 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 design-b:text-slate-300 design-b:hover:bg-white/10"
            aria-label="Close menu"
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
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2 design-b:text-slate-400">{group.group}</p>
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
                          "group relative flex items-center gap-3 min-h-11 px-2 py-1.5 rounded-xl text-sm font-medium transition-all design-c:rounded-full",
                          active
                            ? "bg-sec-soft text-sec-ink design-b:bg-white/10 design-b:text-white design-c:bg-sec design-c:text-white design-c:shadow-md"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 design-b:text-slate-300 design-b:hover:bg-white/5 design-b:hover:text-white design-c:text-gray-700 design-c:hover:bg-sec-soft",
                        )}
                      >
                        {active && <span aria-hidden="true" className="hidden design-b:block absolute -start-3 top-2 bottom-2 w-1 rounded-e bg-sec-light" />}
                        <span
                          aria-hidden="true"
                          className={cx(
                            "w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition",
                            active ? "bg-sec text-white shadow-sm" : "bg-sec-soft text-sec-ink",
                            "design-b:bg-linear-to-br design-b:from-sec design-b:to-sec-deep design-b:text-white",
                            !active && "design-b:opacity-80 design-b:group-hover:opacity-100",
                            "design-c:rounded-full",
                            active ? "design-c:bg-white/25 design-c:shadow-none" : "design-c:bg-sec design-c:text-white",
                          )}
                        >
                          <Icon size={17} />
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-gray-100 design-b:border-white/10 design-c:border-orange-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 design-b:bg-white/5 design-c:bg-white design-c:rounded-full design-c:border design-c:border-orange-100">
            <Link href="/profile" onClick={onClose} className="flex items-center gap-3 flex-1 min-w-0">
              <MyAvatar size={36} />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-800 truncate design-b:text-white">{displayName}</span>
                <span className="block text-xs text-gray-500 truncate design-b:text-slate-400">{roleLabel}</span>
              </span>
            </Link>
            {!authDisabled && (
              <button
                type="button"
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-500 transition design-b:text-slate-400"
                aria-label="Log out"
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
