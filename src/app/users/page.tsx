"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getList } from "@/lib/frappe";
import { UserPlus, Shield } from "lucide-react";

interface User {
  name: string;
  full_name: string;
  email: string;
  enabled: number;
}

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: "", first_name: "", role: "Clinic Receptionist", password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try {
      const data = await getList("User", ["name", "full_name", "email", "enabled"], [["name", "not in", ["Administrator", "Guest"]]]);
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    loadUsers();
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const csrf = localStorage.getItem("csrf_token") || "";
      const res = await fetch("/api/frappe/api/method/frappe.client.insert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-frappe-csrf-token": csrf,
        },
        credentials: "include",
        body: JSON.stringify({
          doc: {
            doctype: "User",
            email: form.email,
            first_name: form.first_name,
            new_password: form.password,
            send_welcome_email: 0,
            roles: [{ role: form.role }],
          }
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setShowAdd(false);
      setForm({ email: "", first_name: "", role: "Clinic Receptionist", password: "" });
      loadUsers();
    } catch (err) {
      setError("Failed to create user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Users Management</h1>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700">
          <UserPlus size={16} /> Add User
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Email</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">No users found</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.name} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">{u.full_name || u.name}</td>
                  <td className="px-6 py-4 text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.enabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {u.enabled ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => router.push(`/users/${encodeURIComponent(btoa(u.name))}`)} className="flex items-center gap-1 text-blue-600 hover:underline text-sm">
                      <Shield size={14} /> Manage Roles
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New User</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Full Name *</label>
                <input type="text" required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Email *</label>
                <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Password *</label>
                <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Role *</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Clinic Manager">Clinic Manager</option>
                  <option value="Clinic Doctor">Clinic Doctor</option>
                  <option value="Clinic Receptionist">Clinic Receptionist</option>
                </select>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Saving..." : "Add User"}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-sm hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}