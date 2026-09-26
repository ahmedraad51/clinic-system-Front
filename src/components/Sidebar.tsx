"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ToothLogo from "@/components/ToothLogo";
import {
  LayoutDashboard,
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
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";
import { useSettings } from "@/context/SettingsContext";
import { cx } from "@/lib/format";
import type { PermissionKey } from "@/lib/types";

interface MenuItem {
  label: string;
  icon: LucideIcon;
  path: string;
  /** Hidden unless the user has this permission. */
  permission?: PermissionKey;
}

const menuGroups: Array<{ group: string; items: MenuItem[] }> = [
  {
    group: "CLINIC",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { label: "Today", icon: ClipboardCheck, path: "/today", permission: "view_appointments" },
      { label: "Patients", icon: Users, path: "/patients", permission: "view_patients" },
      { label: "Appointments", icon: Calendar, path: "/appointments", permission: "view_appointments" },
      { label: "Treatments", icon: Stethoscope, path: "/treatments", permission: "view_treatments" },
    ],
  },
  {
    group: "FINANCE",
    items: [
      { label: "Payments", icon: CreditCard, path: "/payments", permission: "view_payments" },
      { label: "Reports", icon: BarChart2, path: "/reports", permission: "view_reports" },
    ],
  },
  {
    group: "SYSTEM",
    items: [
      { label: "Users", icon: UserCog, path: "/users", permission: "manage_users" },
      { label: "WhatsApp", icon: MessageCircle, path: "/whatsapp", permission: "manage_users" },
      { label: "Settings", icon: Settings, path: "/settings", permission: "manage_users" },
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
          "fixed inset-y-0 start-0 z-50 w-64 bg-white border-e border-gray-100 flex flex-col transition-transform print:hidden",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-gray-100">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-3 min-w-0">
            {settings.logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- the logo is an uploaded file of unknown size
              <img src={settings.logo} alt="" className="w-9 h-9 rounded-xl object-contain bg-gray-50" />
            ) : (
              <span className="w-9 h-9 shrink-0 bg-primary-600 rounded-xl flex items-center justify-center text-white">
                <ToothLogo size={20} />
              </span>
            )}
            <span className="font-bold text-gray-800 text-lg truncate">{clinicName}</span>
          </Link>
          <button type="button" onClick={onClose} className="lg:hidden w-11 h-11 -me-2 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-4 py-4 space-y-5 overflow-y-auto">
          {menuGroups.map((group) => {
            const items = group.items.filter(visible);
            if (items.length === 0) return null;
            return (
              <div key={group.group}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">{group.group}</p>
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
                          "flex items-center gap-3 min-h-11 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                          active ? "bg-primary-50 text-primary-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800",
                        )}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                        {active && <span className="ms-auto w-1.5 h-1.5 rounded-full bg-primary-600" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50">
            <Link href="/profile" onClick={onClose} className="flex items-center gap-3 flex-1 min-w-0">
              <span className="w-8 h-8 shrink-0 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-sm">
                {displayName.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-800 truncate">{displayName}</span>
                <span className="block text-xs text-gray-400 truncate">{roleLabel}</span>
              </span>
            </Link>
            {!authDisabled && (
              <button type="button" onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition" aria-label="Log out">
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
