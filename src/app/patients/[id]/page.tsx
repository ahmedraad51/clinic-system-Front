"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { getDoc } from "@/lib/frappe";
import DentalChart from "@/components/DentalChart";

interface Patient {
  name: string;
  full_name: string;
  phone_number: string;
  secondary_phone: string;
  gender: string;
  age: number;
  date_of_birth: string;
  email: string;
  address: string;
  medical_history: string;
  allergies: string;
  current_medications: string;
  chronic_diseases: string;
  notes: string;
  total_appointments: number;
  total_treatments: number;
  total_paid: number;
  total_remaining: number;
}

export default function PatientDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    loadPatient();
  }, [user]);

  const loadPatient = async () => {
    try {
      const data = await getDoc("Patient", params.id as string);
      setPatient(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;
  if (!patient) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Patient not found</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/patients")} className="text-gray-500 hover:text-gray-700">← Back</button>
          <span className="text-lg font-bold text-gray-800 ml-2">👤 {patient.full_name}</span>
        </div>
        <button
          onClick={() => router.push(`/patients/${params.id}/edit`)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          Edit
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Appointments" value={patient.total_appointments} color="blue" />
          <StatCard title="Treatments" value={patient.total_treatments} color="green" />
          <StatCard title="Total Paid" value={`$${patient.total_paid}`} color="purple" />
          <StatCard title="Remaining" value={`$${patient.total_remaining}`} color="red" />
        </div>

        <Section title="Basic Information">
          <Row label="Full Name" value={patient.full_name} />
          <Row label="Gender" value={patient.gender} />
          <Row label="Date of Birth" value={patient.date_of_birth} />
          <Row label="Age" value={patient.age} />
          <Row label="Phone" value={patient.phone_number} />
          <Row label="Secondary Phone" value={patient.secondary_phone} />
          <Row label="Email" value={patient.email} />
          <Row label="Address" value={patient.address} />
        </Section>

        <Section title="Medical Information">
          <Row label="Allergies" value={patient.allergies} />
          <Row label="Current Medications" value={patient.current_medications} />
          <Row label="Chronic Diseases" value={patient.chronic_diseases} />
          <Row label="Medical History" value={patient.medical_history} />
          <Row label="Notes" value={patient.notes} />
        </Section>

        <DentalChart />
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: any; color: string }) {
  const colors: any = {
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    purple: "bg-purple-50 border-purple-200",
    red: "bg-red-50 border-red-200",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="text-xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-600 mt-1">{title}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div className="flex gap-4">
      <span className="text-sm text-gray-500 w-40 shrink-0">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}