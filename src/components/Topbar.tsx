"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, ChevronDown, User, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSession } from "@/context/SessionContext";
import NotificationBell from "./NotificationBell";

export default function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { logout, authDisabled } = useAuth();
  const { can, displayName } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push("/login");
  };

  const iconButton =
    "w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition";

  return (
    <header className="h-16 bg-white/95 backdrop-blur border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 fixed top-0 end-0 start-0 lg:start-64 z-30 print:hidden">
      <button type="button" onClick={onOpenMenu} className={`${iconButton} lg:hidden`} aria-label="Open menu">
        <Menu size={18} />
      </button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-2 sm:gap-3">
        {can("view_appointments") && <NotificationBell />}

        {can("manage_users") && (
          <Link href="/settings" className={iconButton} aria-label="Settings">
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
            <span className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-sm">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[160px] truncate">{displayName}</span>
            <ChevronDown size={14} className="text-gray-400" />
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
                  Profile
                </Link>
                {can("manage_users") && (
                  <Link
                    href="/settings"
                    onClick={() => setOpen(false)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings size={15} />
                    Settings
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
                      Logout
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
