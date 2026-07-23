"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Settings, Bell, ChevronDown, User, LogOut } from "lucide-react";

export default function Topbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 fixed top-0 right-0 left-64 z-40">
      {/* Left */}
      <div />

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition">
          <Bell size={18} />
        </button>

        {/* Settings */}
        <button
          onClick={() => router.push("/settings")}
          className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
        >
          <Settings size={18} />
        </button>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
              {user?.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700">{user}</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-12 bg-white rounded-xl shadow-lg border border-gray-100 w-44 py-2 z-50">
              <button
                onClick={() => { setOpen(false); router.push("/profile"); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User size={15} />
                Profile
              </button>
              <button
                onClick={() => { setOpen(false); router.push("/settings"); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Settings size={15} />
                Settings
              </button>
              <hr className="my-1 border-gray-100" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}