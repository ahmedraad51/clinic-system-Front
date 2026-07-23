"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getList } from "@/lib/frappe";
import {
  Users,
  Calendar,
  Stethoscope,
  CreditCard,
  UserCog,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    patients: 0,
    appointments: 0,
    doctors: 0,
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      const [patients, appointments, doctors] = await Promise.all([
        getList("Patient", ["name"]),
        getList("Appointment", ["name"]),
        getList("Doctor", ["name"]),
      ]);
      setStats({
        patients: patients.length,
        appointments: appointments.length,
        doctors: doctors.length,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Patients" value={stats.patients} icon={Users} />
        <StatCard title="Total Appointments" value={stats.appointments} icon={Calendar} />
        <StatCard title="Total Doctors" value={stats.doctors} icon={UserCog} />
      </div>

      {/* Quick Links */}
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Quick Access
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickLink title="Patients" icon={Users} href="/patients" />
        <QuickLink title="Appointments" icon={Calendar} href="/appointments" />
        <QuickLink title="Treatments" icon={Stethoscope} href="/treatments" />
        <QuickLink title="Payments" icon={CreditCard} href="/payments" />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all">
      <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
        <Icon size={22} />
      </div>
      <div className="text-3xl font-bold text-gray-800">{value}</div>
      <div className="text-sm font-medium text-gray-500 mt-1">{title}</div>
    </div>
  );
}

function QuickLink({
  title,
  icon: Icon,
  href,
}: {
  title: string;
  icon: React.ElementType;
  href: string;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col items-center gap-3 shadow-sm hover:shadow-md hover:bg-blue-50/40 transition-all group"
    >
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-all">
        <Icon size={18} />
      </div>
      <span className="text-sm font-medium text-gray-700">{title}</span>
    </button>
  );
}