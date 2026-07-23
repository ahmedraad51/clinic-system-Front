"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { createDoc, getList } from "@/lib/frappe";

export default function NewAppointmentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [form, setForm] = useState({
    patient: "",
    doctor: "",
    appointment_date: "",
    appointment_time: "",
    status: "Scheduled",
    reason_for_visit: "",
    notes: "",
    duration_minutes: "30",
  });

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    const [p, d] = await Promise.all([
      getList("Patient", ["name", "full_name"]),
      getList("Doctor", ["name", "full_name"]),
    ]);
    setPatients(p);
    setDoctors(d);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await createDoc("Appointment", form);
      router.push(`/appointments/${res.name}`);
    } catch (err: any) {
      setError("Failed to create appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex items-center gap-2">
        <button onClick={() => router.push("/appointments")} className="text-gray-500 hover:text-gray-700">← Back</button>
        <span className="text-lg font-bold text-gray-800 ml-2">📅 New Appointment</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Patient *</label>
            <select name="patient" value={form.patient} onChange={handleChange} required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select Patient</option>
              {patients.map(p => <option key={p.name} value={p.name}>{p.full_name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Doctor *</label>
            <select name="doctor" value={form.doctor} onChange={handleChange} required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select Doctor</option>
              {doctors.map(d => <option key={d.name} value={d.name}>{d.full_name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Date *</label>
              <input type="date" name="appointment_date" value={form.appointment_date} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Time *</label>
              <input type="time" name="appointment_time" value={form.appointment_time} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Status</label>
            <select name="status" value={form.status} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="Scheduled">Scheduled</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No Show">No Show</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Reason for Visit</label>
            <input type="text" name="reason_for_visit" value={form.reason_for_visit} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-4 pt-2">
            <button type="submit" disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Saving..." : "Save Appointment"}
            </button>
            <button type="button" onClick={() => router.push("/appointments")}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}