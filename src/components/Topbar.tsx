"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, ChevronDown, User, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";
import { useI18n } from "@/context/LanguageContext";
import { MyAvatar } from "./Avatar";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";

export default function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { logout, authDisabled } = useAuth();
  const { can, displayName } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push("/login");
  };

  const iconButton =
    "w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition";

  // No backdrop-blur on the bar: it would trap the fixed overlays of the search, bell and profile menus inside it.
  return (
    <header className="h-16 bg-white border-b border-gray-200/80 flex items-center justify-between px-4 sm:px-6 fixed top-0 end-0 start-0 lg:start-64 z-30 print:hidden">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onOpenMenu} className={`${iconButton} lg:hidden`} aria-label={t.nav.openMenu}>
          <Menu size={18} />
        </button>
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {can("view_appointments") && <NotificationBell />}

        {can("manage_users") && (
          <Link href="/settings" className={iconButton} aria-label={t.nav.settings}>
            <Settings size={18} />
          </Link>
        )}

        {/* Profile */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="flex items-center gap-2 min-h-11 px-2 sm:px-3 py-1.5 rounded-xl hover:bg-gray-50 transition"
          >
            <MyAvatar size={32} />
            {/* The picture is hidden from screen readers; on phones the name below is hidden too. */}
            <span className="sr-only sm:hidden">{displayName}</span>
            <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[160px] truncate">{displayName}</span>
            <ChevronDown size={14} className="text-gray-500" />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
              <div className="absolute end-0 top-12 bg-white rounded-xl shadow-lg border border-gray-100 w-48 py-2 z-50">
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <User size={15} />
                  {t.nav.profile}
                </Link>
                {can("manage_users") && (
                  <Link
                    href="/settings"
                    onClick={() => setOpen(false)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings size={15} />
                    {t.nav.settings}
                  </Link>
                )}
                {!authDisabled && (
                  <>
                    <hr className="my-1 border-gray-100" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                    >
                      <LogOut size={15} />
                      {t.nav.logout}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
