"use client";

import { useState } from "react";

type ToothStatus = "normal" | "treated" | "pending";

interface ToothState {
  tooth: number;
  status: ToothStatus;
}

const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const statusConfig = {
  normal:  { label: "Normal",           bg: "bg-white",       border: "border-gray-200", text: "text-gray-500" },
  treated: { label: "Has Treatment",    bg: "bg-blue-50",     border: "border-blue-400", text: "text-blue-600" },
  pending: { label: "Pending Treatment",bg: "bg-yellow-50",   border: "border-yellow-400", text: "text-yellow-600" },
};

export default function DentalChart() {
  const [teeth, setTeeth] = useState<Record<number, ToothStatus>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<"Medical" | "Cosmetic">("Medical");

  const setStatus = (tooth: number, status: ToothStatus) => {
    setTeeth(prev => ({ ...prev, [tooth]: status }));
    setSelected(null);
  };

  const handleSave = () => {
    const result: ToothState[] = Object.entries(teeth)
      .filter(([, status]) => status !== "normal")
      .map(([tooth, status]) => ({ tooth: Number(tooth), status }));
    console.log("Dental Chart Data:", result);
    alert(`Saved! Check console. ${result.length} teeth with conditions.`);
  };

  const ToothButton = ({ number }: { number: number }) => {
    const status = teeth[number] || "normal";
    const cfg = statusConfig[status];
    const isSelected = selected === number;

    return (
      <div className="relative flex flex-col items-center gap-1">
        <button
          onClick={() => setSelected(isSelected ? null : number)}
          className={`
            w-10 h-12 rounded-lg border-2 text-xs font-bold transition-all duration-150
            ${cfg.bg} ${cfg.border} ${cfg.text}
            ${isSelected ? "ring-2 ring-blue-500 ring-offset-1 scale-110" : "hover:scale-105 hover:shadow-md"}
          `}
        >
          {number}
        </button>

        {/* Popover */}
        {isSelected && (
          <div className="absolute top-14 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-2 w-44 space-y-1">
            {(["normal", "treated", "pending"] as ToothStatus[]).map(s => (
              <button
                key={s}
                onClick={() => setStatus(number, s)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition
                  ${status === s ? "bg-blue-600 text-white" : "hover:bg-gray-50 text-gray-700"}`}
              >
                {statusConfig[s].label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Dental Chart</h2>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["Medical", "Cosmetic"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition
                ${mode === m ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Upper Jaw */}
      <div className="mb-2">
        <p className="text-xs text-gray-400 text-center mb-2 font-medium">Upper Jaw</p>
        <div className="flex justify-center gap-1 flex-wrap">
          {upperTeeth.map(n => <ToothButton key={n} number={n} />)}
        </div>
      </div>

      {/* Divider */}
      <div className="my-4 border-t-2 border-dashed border-gray-100" />

      {/* Lower Jaw */}
      <div className="mb-6">
        <div className="flex justify-center gap-1 flex-wrap">
          {lowerTeeth.map(n => <ToothButton key={n} number={n} />)}
        </div>
        <p className="text-xs text-gray-400 text-center mt-2 font-medium">Lower Jaw</p>
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-center mb-6">
        {(["normal", "treated", "pending"] as ToothStatus[]).map(s => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded border-2 ${statusConfig[s].bg} ${statusConfig[s].border}`} />
            <span className="text-xs text-gray-500">{statusConfig[s].label}</span>
          </div>
        ))}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition"
      >
        Save Chart
      </button>
    </div>
  );
}