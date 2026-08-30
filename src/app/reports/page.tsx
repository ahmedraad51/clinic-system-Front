"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getList } from "@/lib/frappe";
import { TrendingUp, Users, CreditCard, AlertCircle } from "lucide-react";

export default function ReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalPatients: 0,
    totalPayments: 0,
    outstanding: 0,
  });
  const [payments, setPayments] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [p, t, pay] = await Promise.all([
        getList("Patient", ["name"]),
        getList("Treatment Plan", ["name", "patient", "treatment_type", "total_cost", "paid_amount", "remaining_amount"]),
        getList("Payment", ["name", "amount", "payment_date", "payment_method", "patient"]),
      ]);

      const totalRevenue = pay.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const outstanding = t.reduce((sum: number, tr: any) => sum + (tr.remaining_amount || 0), 0);

      setStats({
        totalRevenue,
        totalPatients: p.length,
        totalPayments: pay.length,
        outstanding,
      });
      setPayments(pay.slice(0, 10));
      setTreatments(t);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Revenue by treatment type
  const revenueByType: Record<string, number> = {};
  treatments.forEach((t: any) => {
    if (!revenueByType[t.treatment_type]) revenueByType[t.treatment_type] = 0;
    revenueByType[t.treatment_type] += t.paid_amount || 0;
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Financial Reports</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} icon={TrendingUp} color="blue" />
        <StatCard title="Total Patients" value={stats.totalPatients} icon={Users} color="green" />
        <StatCard title="Total Payments" value={stats.totalPayments} icon={CreditCard} color="purple" />
        <StatCard title="Outstanding" value={`$${stats.outstanding.toFixed(2)}`} icon={AlertCircle} color="red" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue by Treatment */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Treatment</h2>
          <div className="space-y-3">
            {Object.entries(revenueByType).length === 0 ? (
              <p className="text-gray-400 text-sm">No data</p>
            ) : (
              Object.entries(revenueByType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, amount]) => {
                  const max = Math.max(...Object.values(revenueByType));
                  const pct = max > 0 ? (amount / max) * 100 : 0;
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 font-medium">{type}</span>
                        <span className="text-gray-800 font-semibold">${amount.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Payments</h2>
          <div className="space-y-3">
            {payments.length === 0 ? (
              <p className="text-gray-400 text-sm">No payments yet</p>
            ) : (
              payments.map((p: any) => (
                <div key={p.name} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.patient}</p>
                    <p className="text-xs text-gray-400">{p.payment_date} · {p.payment_method}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600">${p.amount}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Outstanding Balances */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Outstanding Balances</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-sm font-medium text-gray-500">Patient</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-500">Treatment</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-500">Total Cost</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-500">Paid</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-500">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {treatments.filter((t: any) => t.remaining_amount > 0).length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-4 text-gray-400 text-sm">No outstanding balances</td></tr>
                ) : (
                  treatments
                    .filter((t: any) => t.remaining_amount > 0)
                    .map((t: any) => (
                      <tr key={t.name} className="border-b border-gray-50">
                        <td className="py-3 text-sm text-gray-800">{t.patient || "—"}</td>
                        <td className="py-3 text-sm text-gray-600">{t.treatment_type}</td>
                        <td className="py-3 text-sm text-gray-600">${t.total_cost}</td>
                        <td className="py-3 text-sm text-green-600">${t.paid_amount}</td>
                        <td className="py-3 text-sm text-red-600 font-semibold">${t.remaining_amount}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{title}</div>
    </div>
  );
}