"use client";

import { useRouter, usePathname } from "next/navigation";
import { GiTooth } from "react-icons/gi";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  CreditCard,
  BarChart2,
  LogOut,
  UserCog,
  Smile,
} from "lucide-react";

const menuItems = [
  {
    group: "CLINIC",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { label: "Patients", icon: Users, path: "/patients" },
      { label: "Appointments", icon: Calendar, path: "/appointments" },
      { label: "Treatments", icon: Stethoscope, path: "/treatments" },
      { label: "Users", icon: UserCog, path: "/users" },
    ],
  },
  {
    group: "FINANCE",
    items: [
      { label: "Payments", icon: CreditCard, path: "/payments" },
      { label: "Reports", icon: BarChart2, path: "/reports" },
    ],
  },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, authDisabled } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <aside className="w-64 min-h-screen bg-gray-50 border-r border-gray-200 flex flex-col fixed left-0 top-0 shadow-sm">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
<div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white">
  <GiTooth size={20} />
</div>
        <span className="font-bold text-gray-800 text-lg">DentClinic</span>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        {menuItems.map((group) => (
          <div key={group.group}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
              {group.group}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                      ${active
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                      }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
            {user?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{user}</p>
            <p className="text-xs text-gray-400">Administrator</p>
          </div>
          {!authDisabled && (
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}