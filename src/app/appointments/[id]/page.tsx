"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { getDoc, updateDoc } from "@/lib/frappe";

interface Appointment {
  name: string;
  patient: string;
  doctor: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason_for_visit: string;
  notes: string;
  duration_minutes: number;
}

export default function AppointmentDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    loadAppointment();
  }, [user]);

  const loadAppointment = async () => {
    try {
      const data = await getDoc("Appointment", params.id as string);
      setAppointment(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!appointment) return;
    setUpdating(true);
    try {
      await updateDoc("Appointment", appointment.name, { status });
      setAppointment({ ...appointment, status });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const statusColor: any = {
    "Scheduled": "bg-blue-100 text-blue-700",
    "Confirmed": "bg-green-100 text-green-700",
    "Completed": "bg-gray-100 text-gray-700",
    "Cancelled": "bg-red-100 text-red-700",
    "No Show": "bg-yellow-100 text-yellow-700",
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;
  if (!appointment) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Appointment not found</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/appointments")} className="text-gray-500 hover:text-gray-700">← Back</button>
          <span className="text-lg font-bold text-gray-800 ml-2">📅 Appointment Details</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor[appointment.status]}`}>
          {appointment.status}
        </span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Details */}
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <Row label="Patient" value={appointment.patient} />
          <Row label="Doctor" value={appointment.doctor} />
          <Row label="Date" value={appointment.appointment_date} />
          <Row label="Time" value={appointment.appointment_time} />
          <Row label="Duration" value={`${appointment.duration_minutes} minutes`} />
          <Row label="Reason" value={appointment.reason_for_visit} />
          <Row label="Notes" value={appointment.notes} />
        </div>

        {/* Update Status */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Update Status</h2>
          <div className="flex flex-wrap gap-2">
            {["Scheduled", "Confirmed", "Completed", "Cancelled", "No Show"].map(s => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                disabled={updating || appointment.status === s}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition
                  ${appointment.status === s
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  } disabled:opacity-50`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div className="flex gap-4">
      <span className="text-sm text-gray-500 w-32 shrink-0">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}