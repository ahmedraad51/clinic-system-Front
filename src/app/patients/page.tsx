"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getList, deleteDoc } from "@/lib/frappe";

interface Patient {
  name: string;
  full_name: string;
  phone_number: string;
  gender: string;
  age: number;
}

export default function PatientsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    loadPatients();
  }, [user]);

  const loadPatients = async () => {
    try {
      const data = await getList("Patient", ["name", "full_name", "phone_number", "gender", "age"]);
      setPatients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = patients.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone_number?.includes(search)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/dashboard")} className="text-gray-500 hover:text-gray-700">← Back</button>
          <span className="text-lg font-bold text-gray-800 ml-2">🦷 Patients</span>
        </div>
        <button
          onClick={() => router.push("/patients/new")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Add Patient
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Table */}
        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Name</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Phone</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Gender</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Age</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">No patients found</td></tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.name} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-800">{p.full_name}</td>
                      <td className="px-6 py-4 text-gray-600">{p.phone_number}</td>
                      <td className="px-6 py-4 text-gray-600">{p.gender}</td>
                      <td className="px-6 py-4 text-gray-600">{p.age}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => router.push(`/patients/${p.name}`)}
                          className="text-blue-600 hover:underline text-sm mr-3"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}