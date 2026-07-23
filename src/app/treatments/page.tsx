"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getList } from "@/lib/frappe";

interface Treatment {
  name: string;
  patient: string;
  doctor: string;
  treatment_type: string;
  tooth_number: string;
  status: string;
  total_cost: number;
  remaining_amount: number;
}

export default function TreatmentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    loadTreatments();
  }, [user]);

  const loadTreatments = async () => {
    try {
      const data = await getList("Treatment Plan", [
        "name", "patient", "doctor", "treatment_type",
        "tooth_number", "status", "total_cost", "remaining_amount"
      ]);
      setTreatments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = treatments.filter(t =>
    t.patient?.toLowerCase().includes(search.toLowerCase()) ||
    t.treatment_type?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor: any = {
    "Planned": "bg-blue-100 text-blue-700",
    "In Progress": "bg-yellow-100 text-yellow-700",
    "Completed": "bg-green-100 text-green-700",
    "Cancelled": "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/dashboard")} className="text-gray-500 hover:text-gray-700">← Back</button>
          <span className="text-lg font-bold text-gray-800 ml-2">🦷 Treatments</span>
        </div>
        <button
          onClick={() => router.push("/treatments/new")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Add Treatment
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <input
          type="text"
          placeholder="Search by patient or treatment type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Patient</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Treatment</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Tooth</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Cost</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Remaining</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">No treatments found</td></tr>
                ) : (
                  filtered.map((t) => (
                    <tr key={t.name} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-800">{t.patient}</td>
                      <td className="px-6 py-4 text-gray-600">{t.treatment_type}</td>
                      <td className="px-6 py-4 text-gray-600">{t.tooth_number}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[t.status]}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">${t.total_cost}</td>
                      <td className="px-6 py-4 text-red-600 font-medium">${t.remaining_amount}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => router.push(`/treatments/${t.name}`)}
                          className="text-blue-600 hover:underline text-sm"
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