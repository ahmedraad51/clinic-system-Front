"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { createDoc, getList } from "@/lib/frappe";

export default function NewPaymentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [form, setForm] = useState({
    patient: searchParams.get("patient") || "",
    treatment_plan: searchParams.get("treatment") || "",
    payment_date: new Date().toISOString().split("T")[0],
    amount: "",
    payment_method: "Cash",
    notes: "",
  });

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    const [p, t] = await Promise.all([
      getList("Patient", ["name", "full_name"]),
      getList("Treatment Plan", ["name", "patient", "treatment_type", "remaining_amount"]),
    ]);
    setPatients(p);
    setTreatments(t);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await createDoc("Payment", form);
      router.push("/payments");
    } catch (err: any) {
      setError("Failed to create payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredTreatments = treatments.filter(t =>
    form.patient ? t.patient === form.patient : true
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex items-center gap-2">
        <button onClick={() => router.push("/payments")} className="text-gray-500 hover:text-gray-700">← Back</button>
        <span className="text-lg font-bold text-gray-800 ml-2">💰 New Payment</span>
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
            <label className="text-sm text-gray-600 mb-1 block">Treatment Plan</label>
            <select name="treatment_plan" value={form.treatment_plan} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select Treatment Plan</option>
              {filteredTreatments.map(t => (
                <option key={t.name} value={t.name}>
                  {t.treatment_type} — Remaining: ${t.remaining_amount}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Date *</label>
            <input type="date" name="payment_date" value={form.payment_date} onChange={handleChange} required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Amount *</label>
            <input type="number" name="amount" value={form.amount} onChange={handleChange} required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Payment Method *</label>
            <select name="payment_method" value={form.payment_method} onChange={handleChange} required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
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
              {loading ? "Saving..." : "Save Payment"}
            </button>
            <button type="button" onClick={() => router.push("/payments")}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}