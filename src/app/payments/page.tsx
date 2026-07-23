"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getList } from "@/lib/frappe";

interface Payment {
  name: string;
  patient: string;
  treatment_plan: string;
  payment_date: string;
  amount: number;
  payment_method: string;
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    loadPayments();
  }, [user]);

  const loadPayments = async () => {
    try {
      const data = await getList("Payment", [
        "name", "patient", "treatment_plan",
        "payment_date", "amount", "payment_method"
      ]);
      setPayments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = payments.filter(p =>
    p.patient?.toLowerCase().includes(search.toLowerCase())
  );

  const methodColor: any = {
    "Cash": "bg-green-100 text-green-700",
    "Card": "bg-blue-100 text-blue-700",
    "Bank Transfer": "bg-purple-100 text-purple-700",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/dashboard")} className="text-gray-500 hover:text-gray-700">← Back</button>
          <span className="text-lg font-bold text-gray-800 ml-2">💰 Payments</span>
        </div>
        <button
          onClick={() => router.push("/payments/new")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Add Payment
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <input
          type="text"
          placeholder="Search by patient..."
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
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Treatment Plan</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Date</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Amount</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Method</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">No payments found</td></tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.name} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-800">{p.patient}</td>
                      <td className="px-6 py-4 text-gray-600">{p.treatment_plan}</td>
                      <td className="px-6 py-4 text-gray-600">{p.payment_date}</td>
                      <td className="px-6 py-4 font-medium text-green-600">${p.amount}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${methodColor[p.payment_method]}`}>
                          {p.payment_method}
                        </span>
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