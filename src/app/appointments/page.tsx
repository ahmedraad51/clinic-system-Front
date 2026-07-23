"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getList } from "@/lib/frappe";

interface Appointment {
  name: string;
  patient: string;
  doctor: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    try {
      const data = await getList("Appointment", [
        "name", "patient", "doctor", "appointment_date", "appointment_time", "status"
      ]);
      setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = appointments.filter(a => {
    const matchSearch = a.patient?.toLowerCase().includes(search.toLowerCase()) ||
      a.doctor?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? a.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const statusColor: any = {
    "Scheduled": "bg-blue-100 text-blue-700",
    "Confirmed": "bg-green-100 text-green-700",
    "Completed": "bg-gray-100 text-gray-700",
    "Cancelled": "bg-red-100 text-red-700",
    "No Show": "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/dashboard")} className="text-gray-500 hover:text-gray-700">← Back</button>
          <span className="text-lg font-bold text-gray-800 ml-2">📅 Appointments</span>
        </div>
        <button
          onClick={() => router.push("/appointments/new")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Add Appointment
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by patient or doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="No Show">No Show</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Patient</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Doctor</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Date</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Time</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">No appointments found</td></tr>
                ) : (
                  filtered.map((a) => (
                    <tr key={a.name} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-800">{a.patient}</td>
                      <td className="px-6 py-4 text-gray-600">{a.doctor}</td>
                      <td className="px-6 py-4 text-gray-600">{a.appointment_date}</td>
                      <td className="px-6 py-4 text-gray-600">{a.appointment_time}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[a.status]}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => router.push(`/appointments/${a.name}`)}
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