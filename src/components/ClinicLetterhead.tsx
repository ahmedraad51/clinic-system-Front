"use client";

import type { ReactNode } from "react";
import ToothLogo from "@/components/ToothLogo";
import { useSettings } from "@/context/SettingsContext";
import { fileHref } from "@/lib/frappe";

/**
 * The top of every printout: the clinic logo, name, contact details and tax number on the start side, and
 * what the document is (receipt, estimate, …) with its reference and date on the end side.
 */
export default function ClinicLetterhead({ kind, reference, date }: { kind: string; reference?: ReactNode; date?: ReactNode }) {
  const { settings, clinicName } = useSettings();
  const contact = [settings.address, settings.phone, settings.email].filter(Boolean).join(" · ");
  return (
    <div className="flex items-start justify-between gap-4 pb-5 border-b border-gray-100">
      <div className="flex items-center gap-3 min-w-0">
        {settings.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- the logo is an uploaded file of unknown size
          <img src={fileHref(settings.logo)} alt="" className="w-12 h-12 rounded-xl object-contain" />
        ) : (
          <span className="w-12 h-12 shrink-0 bg-primary-600 rounded-xl flex items-center justify-center text-white print:border print:border-gray-300">
            <ToothLogo size={24} />
          </span>
        )}
        <div className="min-w-0">
          <p className="font-bold text-gray-800 text-lg">{clinicName}</p>
          {contact && <p className="text-xs text-gray-500">{contact}</p>}
          {settings.tax_number && <p className="text-xs text-gray-500">Tax number: {settings.tax_number}</p>}
        </div>
      </div>
      <div className="text-end shrink-0">
        <p className="text-xs uppercase tracking-wider text-gray-500">{kind}</p>
        {reference && <p className="text-sm font-semibold text-gray-800">{reference}</p>}
        {date && <p className="text-xs text-gray-500">{date}</p>}
      </div>
    </div>
  );
}
