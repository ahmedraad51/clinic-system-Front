"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { Shield, Check } from "lucide-react";

const PERMISSIONS = [
  { group: "Patients", items: [
    { key: "view_patients", label: "View Patients" },
    { key: "add_patients", label: "Add Patients" },
    { key: "edit_patients", label: "Edit Patients" },
    { key: "delete_patients", label: "Delete Patients" },
  ]},
  { group: "Appointments", items: [
    { key: "view_appointments", label: "View Appointments" },
    { key: "add_appointments", label: "Add Appointments" },
    { key: "edit_appointments", label: "Edit Appointments" },
  ]},
  { group: "Treatments", items: [
    { key: "view_treatments", label: "View Treatments" },
    { key: "add_treatments", label: "Add Treatments" },
    { key: "edit_treatments", label: "Edit Treatments" },
  ]},
  { group: "Finance", items: [
    { key: "view_payments", label: "View Payments" },
    { key: "add_payments", label: "Add Payments" },
    { key: "view_reports", label: "View Reports" },
  ]},
  { group: "System", items: [
    { key: "manage_users", label: "Manage Users" },
  ]},
];

export default function UserDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [userData, setUserData] = useState<any>(null);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const userId = atob(decodeURIComponent(params.id as string));

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const csrf = localStorage.getItem("csrf_token") || "";

      // Load user info
      const userRes = await fetch(`/frappe/api/resource/User/${encodeURIComponent(userId)}`, {
        credentials: "include",
        headers: { "x-frappe-csrf-token": csrf },
      });
      const userData = await userRes.json();
      setUserData(userData.data);

      // Load permissions
      const permRes = await fetch(`/frappe/api/resource/Clinic Permission/${encodeURIComponent(userId)}`, {
        credentials: "include",
        headers: { "x-frappe-csrf-token": csrf },
      });

      if (permRes.ok) {
        const permData = await permRes.json();
        const p: Record<string, boolean> = {};
        PERMISSIONS.forEach(g => g.items.forEach(item => {
          p[item.key] = permData.data[item.key] === 1;
        }));
        setPerms(p);
      } else {
        const p: Record<string, boolean> = {};
        PERMISSIONS.forEach(g => g.items.forEach(item => { p[item.key] = false; }));
        setPerms(p);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePerm = (key: string) => {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const savePerms = async () => {
    setSaving(true);
    const csrf = localStorage.getItem("csrf_token") || "";
    const body: any = { user: userId };
    PERMISSIONS.forEach(g => g.items.forEach(item => {
      body[item.key] = perms[item.key] ? 1 : 0;
    }));

    try {
      // Try update first, then create
      const updateRes = await fetch(`/frappe/api/resource/Clinic Permission/${encodeURIComponent(userId)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-frappe-csrf-token": csrf },
        body: JSON.stringify(body),
      });

      if (!updateRes.ok) {
        await fetch("/frappe/api/resource/Clinic Permission", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", "x-frappe-csrf-token": csrf },
          body: JSON.stringify(body),
        });
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => router.push("/users")} className="text-gray-500 hover:text-gray-700">← Back</button>
        <h1 className="text-2xl font-bold text-gray-800 ml-2">Manage Permissions</h1>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* User Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
              {userData?.first_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-lg">{userData?.full_name}</p>
              <p className="text-gray-500 text-sm">{userData?.email}</p>
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield size={18} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">Permissions</h2>
          </div>

          <div className="space-y-6">
            {PERMISSIONS.map(group => (
              <div key={group.group}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{group.group}</p>
                <div className="flex flex-wrap gap-2">
                  {group.items.map(item => (
                    <button
                      key={item.key}
                      onClick={() => togglePerm(item.key)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                        ${perms[item.key]
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                        }`}
                    >
                      {perms[item.key] && <Check size={12} />}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={savePerms}
            disabled={saving}
            className="w-full mt-6 bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : success ? "Saved ✓" : "Save Permissions"}
          </button>
        </div>
      </div>
    </div>
  );
}