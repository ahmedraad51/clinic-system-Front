"use client";

import { Fragment, type ReactNode } from "react";
import ToothLogo from "@/components/ToothLogo";
import { useI18n } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { fileHref } from "@/lib/frappe";

/**
 * The top of every printout: the clinic logo, name, contact details and tax number on the start side, and
 * what the document is (receipt, estimate, …) with its reference and date on the end side. `kind` comes
 * translated from the page. The phone number and e-mail keep their left-to-right order in Arabic.
 */
export default function ClinicLetterhead({ kind, reference, date }: { kind: string; reference?: ReactNode; date?: ReactNode }) {
  const { t } = useI18n();
  const { settings, clinicName } = useSettings();
  const contact = [
    { key: "address", value: settings.address, ltr: false },
    { key: "phone", value: settings.phone, ltr: true },
    { key: "email", value: settings.email, ltr: true },
  ].filter((part) => Boolean(part.value));
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-gray-100">
      <div className="flex items-center gap-3 min-w-[14rem] flex-1">
        {settings.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- the logo is an uploaded file of unknown size
          <img src={fileHref(settings.logo)} alt="" className="w-12 h-12 rounded-xl object-contain" />
        ) : (
          <span className="w-12 h-12 shrink-0 bg-brand rounded-xl flex items-center justify-center text-white print:border print:border-gray-300">
            <ToothLogo size={24} />
          </span>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 text-lg">{clinicName}</p>
          {contact.length > 0 && (
            <p className="text-xs text-gray-500">
              {contact.map((part, index) => (
                <Fragment key={part.key}>
                  {index > 0 && t.common.dot}
                  {part.ltr ? <span dir="ltr">{part.value}</span> : part.value}
                </Fragment>
              ))}
            </p>
          )}
          {settings.tax_number && (
            <p className="text-xs text-gray-500">
              {t.receipt.letterhead.taxNumber} <span dir="ltr">{settings.tax_number}</span>
            </p>
          )}
        </div>
      </div>
      <div className="text-start sm:text-end print:text-end shrink-0">
        <p className="text-xs uppercase tracking-wider text-gray-500">{kind}</p>
        {reference && <p className="text-sm font-semibold text-gray-800">{reference}</p>}
        {date && <p className="text-xs text-gray-500">{date}</p>}
      </div>
    </div>
  );
}
