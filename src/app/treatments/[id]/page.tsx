"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { getDoc, updateDoc } from "@/lib/frappe";

interface Treatment {
  name: string;
  patient: string;
  doctor: string;
  treatment_type: string;
  tooth_number: string;
  status: string;
  diagnosis: string;
  treatment_notes: string;
  total_cost: number;
  paid_amount: number;
  remaining_amount: number;
}

export default function TreatmentDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    loadTreatment();
  }, [user]);

  const loadTreatment = async () => {
    try {
      const data = await getDoc("Treatment Plan", params.id as string);
      setTreatment(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!treatment) return;
    setUpdating(true);
    try {
      await updateDoc("Treatment Plan", treatment.name, { status });
      setTreatment({ ...treatment, status });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const statusColor: any = {
    "Planned": "bg-blue-100 text-blue-700",
    "In Progress": "bg-yellow-100 text-yellow-700",
    "Completed": "bg-green-100 text-green-700",
    "Cancelled": "bg-red-100 text-red-700",
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;
  if (!treatment) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Treatment not found</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/treatments")} className="text-gray-500 hover:text-gray-700">← Back</button>
          <span className="text-lg font-bold text-gray-800 ml-2">🦷 Treatment Details</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor[treatment.status]}`}>
          {treatment.status}
        </span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* Financial Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="text-xl font-bold text-gray-800">${treatment.total_cost}</div>
            <div className="text-xs text-gray-600 mt-1">Total Cost</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="text-xl font-bold text-gray-800">${treatment.paid_amount}</div>
            <div className="text-xs text-gray-600 mt-1">Paid</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="text-xl font-bold text-gray-800">${treatment.remaining_amount}</div>
            <div className="text-xs text-gray-600 mt-1">Remaining</div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <Row label="Patient" value={treatment.patient} />
          <Row label="Doctor" value={treatment.doctor} />
          <Row label="Treatment Type" value={treatment.treatment_type} />
          <Row label="Tooth Number" value={treatment.tooth_number} />
          <Row label="Diagnosis" value={treatment.diagnosis} />
          <Row label="Notes" value={treatment.treatment_notes} />
        </div>

        {/* Update Status */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Update Status</h2>
          <div className="flex flex-wrap gap-2">
            {["Planned", "In Progress", "Completed", "Cancelled"].map(s => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                disabled={updating || treatment.status === s}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition
                  ${treatment.status === s
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  } disabled:opacity-50`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Add Payment Button */}
        <button
          onClick={() => router.push(`/payments/new?treatment=${treatment.name}&patient=${treatment.patient}`)}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700"
        >
          + Add Payment
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div className="flex gap-4">
      <span className="text-sm text-gray-500 w-36 shrink-0">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}