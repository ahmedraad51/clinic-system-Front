"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { createDoc } from "@/lib/frappe";

export default function NewPatientPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    gender: "",
    date_of_birth: "",
    phone_number: "",
    secondary_phone: "",
    email: "",
    address: "",
    allergies: "",
    current_medications: "",
    chronic_diseases: "",
    medical_history: "",
    notes: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await createDoc("Patient", form);
      router.push(`/patients/${res.name}`);
    } catch (err: any) {
      setError("Failed to create patient. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex items-center gap-2">
        <button onClick={() => router.push("/patients")} className="text-gray-500 hover:text-gray-700">← Back</button>
        <span className="text-lg font-bold text-gray-800 ml-2">👤 New Patient</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Basic Info */}
          <Section title="Basic Information">
            <Field label="Full Name *" name="full_name" value={form.full_name} onChange={handleChange} required />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Gender</label>
                <select name="gender" value={form.gender} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <Field label="Date of Birth" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} type="date" />
            </div>
            <Field label="Phone Number *" name="phone_number" value={form.phone_number} onChange={handleChange} required />
            <Field label="Secondary Phone" name="secondary_phone" value={form.secondary_phone} onChange={handleChange} />
            <Field label="Email" name="email" value={form.email} onChange={handleChange} type="email" />
            <Field label="Address" name="address" value={form.address} onChange={handleChange} />
          </Section>

          {/* Medical Info */}
          <Section title="Medical Information">
            <TextArea label="Allergies" name="allergies" value={form.allergies} onChange={handleChange} />
            <TextArea label="Current Medications" name="current_medications" value={form.current_medications} onChange={handleChange} />
            <TextArea label="Chronic Diseases" name="chronic_diseases" value={form.chronic_diseases} onChange={handleChange} />
            <TextArea label="Medical History" name="medical_history" value={form.medical_history} onChange={handleChange} />
            <TextArea label="Notes" name="notes" value={form.notes} onChange={handleChange} />
          </Section>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-4">
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Saving..." : "Save Patient"}
            </button>
            <button type="button" onClick={() => router.push("/patients")} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", required = false }: any) {
  return (
    <div>
      <label className="text-sm text-gray-600 mb-1 block">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function TextArea({ label, name, value, onChange }: any) {
  return (
    <div>
      <label className="text-sm text-gray-600 mb-1 block">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}