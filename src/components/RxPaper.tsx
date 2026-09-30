"use client";

import type { ReactNode } from "react";
import ToothLogo from "@/components/ToothLogo";
import { useI18n } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { fileHref } from "@/lib/frappe";
import type { RxPaper } from "@/lib/rxPaper";

/**
 * The top of a prescription on the doctor's paper. Plain paper: the doctor's name and qualifications with a logo on
 * the start side, the clinic and its contact on the end side, and the prescription's number and date. Pre-printed
 * paper: nothing is printed there; on screen a dashed box shows the room left for the printed header.
 */
export function RxHeader({
  paper,
  doctorName,
  specialization,
  reference,
  date,
}: {
  paper: RxPaper;
  doctorName: string;
  specialization?: string;
  reference?: ReactNode;
  date?: ReactNode;
}) {
  const { t } = useI18n();
  const { settings, clinicName } = useSettings();
  const refBlock = (reference || date) && (
    <div className="text-end shrink-0">
      {reference && <p className="text-sm font-semibold text-gray-800">{reference}</p>}
      {date && <p className="text-xs text-gray-500">{date}</p>}
    </div>
  );
  if (paper.preprinted) {
    return (
      <>
        <div
          data-testid="rx-header-area"
          style={{ height: `${paper.topMm}mm` }}
          className="print:hidden -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-4 border-b-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-500"
        >
          {t.rxPaper.headerArea(paper.topMm)}
        </div>
        <div className="flex justify-end pb-3">{refBlock}</div>
      </>
    );
  }
  const logo = paper.logo || settings.logo;
  return (
    <div data-testid="rx-header" className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-gray-200">
      <div className="flex items-start gap-3 min-w-[14rem] flex-1">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- an uploaded file of unknown size
          <img src={fileHref(logo)} alt="" className="w-14 h-14 rounded-xl object-contain" />
        ) : (
          <span className="w-14 h-14 shrink-0 bg-brand rounded-xl flex items-center justify-center text-white print:border print:border-gray-300">
            <ToothLogo size={28} />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-lg font-semibold text-gray-900">{doctorName}</p>
          {specialization && <p className="text-sm text-gray-700">{specialization}</p>}
          {paper.qualifications && <p className="text-xs text-gray-600 whitespace-pre-line mt-0.5">{paper.qualifications}</p>}
        </div>
      </div>
      <div className="text-end shrink-0 space-y-0.5">
        <p className="text-sm font-semibold text-gray-800">{clinicName}</p>
        {settings.address && <p className="text-xs text-gray-500">{settings.address}</p>}
        {settings.phone && (
          <p className="text-xs text-gray-500">
            <span dir="ltr">{settings.phone}</span>
          </p>
        )}
        {refBlock && <div className="pt-2">{refBlock}</div>}
      </div>
    </div>
  );
}

/** The bottom of the page: the doctor's footer on plain paper, or (on screen only) the room left for a printed one. */
export function RxFooter({ paper }: { paper: RxPaper }) {
  const { t } = useI18n();
  if (paper.preprinted) {
    return (
      <div
        data-testid="rx-footer-area"
        style={{ height: `${paper.bottomMm}mm` }}
        className="print:hidden -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 mt-6 border-t-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-500"
      >
        {t.rxPaper.footerArea(paper.bottomMm)}
      </div>
    );
  }
  if (!paper.footer) return null;
  return (
    <p data-testid="rx-footer" className="mt-8 pt-3 border-t border-gray-200 text-center text-xs text-gray-600 whitespace-pre-line">
      {paper.footer}
    </p>
  );
}

/** The signature line, with the doctor's signature or stamp above it when there is one. */
export function RxSignature({ paper, doctorName, label }: { paper: RxPaper; doctorName?: string; label: string }) {
  return (
    <div className="mt-10 grid grid-cols-2 gap-10 text-xs text-gray-500">
      <div />
      <div>
        {paper.signature && (
          // eslint-disable-next-line @next/next/no-img-element -- an uploaded file of unknown size
          <img src={fileHref(paper.signature)} alt="" className="h-16 max-w-full object-contain mb-1" />
        )}
        <div className="border-t border-gray-300 pt-2">
          {label}
          {doctorName && <span className="block text-gray-700">{doctorName}</span>}
        </div>
      </div>
    </div>
  );
}
