"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Printer, ScanLine } from "lucide-react";
import ClinicLetterhead from "@/components/ClinicLetterhead";
import RequirePermission from "@/components/Guard";
import { SketchCanvas } from "@/components/xrays/Sketch";
import { Button, Card, NotFoundCard, PageContainer, PageHeader, PageLoading } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { label } from "@/i18n";
import { fileHref } from "@/lib/frappe";
import { formatDate } from "@/lib/format";
import { useDocument } from "@/lib/hooks";
import { patientHref, routeId } from "@/lib/links";
import { parseSketch } from "@/lib/sketch";
import { imageTeeth, isPdf, joinTeeth } from "@/lib/xrays";
import type { DentalImage } from "@/lib/types";

export default function XrayPrintPage() {
  return (
    <RequirePermission permission="view_patients">
      <XrayPrint />
    </RequirePermission>
  );
}

/** One X-ray or photo on the clinic letterhead, with the patient's name, the date taken and its drawing. */
function XrayPrint() {
  const { t } = useI18n();
  const x = t.xrays;
  const params = useParams();
  const id = routeId(params.id);
  const { doc: image, loading, notFound, error } = useDocument<DentalImage>("Dental Image", id);
  const [aspect, setAspect] = useState(0.75);

  if (loading) return <PageLoading />;
  if (notFound || !image) {
    return <NotFoundCard error={error} what={x.notFound} backHref="/patients" backLabel={t.nav.patients} />;
  }

  const teeth = imageTeeth(image);
  const sketch = parseSketch(image.annotations);
  const facts: Array<[string, string]> = [
    [x.patient, image.patient_name || image.patient],
    [x.takenOn, formatDate(image.taken_on)],
    [x.type, label(t.enums.imageType, image.image_type)],
    [x.teeth, teeth.length ? joinTeeth(teeth) : t.common.dash],
  ];

  return (
    <PageContainer section="patients">
      <PageHeader
        title={label(t.enums.imageType, image.image_type)}
        subtitle={image.patient_name}
        icon={ScanLine}
        section="patients"
        back={{ href: patientHref(image.patient), label: x.back }}
        actions={
          <Button icon={Printer} onClick={() => window.print()}>
            {t.common.print}
          </Button>
        }
      />

      <Card className="print:shadow-none print:border-0">
        <ClinicLetterhead kind={x.printDoc} reference={<span dir="ltr">{image.name}</span>} date={formatDate(image.taken_on)} />
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 py-5">
          {facts.map(([term, value]) => (
            <div key={term}>
              <dt className="text-xs text-gray-500">{term}</dt>
              <dd className="text-sm font-medium text-gray-800 mt-0.5">
                <bdi>{value}</bdi>
              </dd>
            </div>
          ))}
        </dl>
        {isPdf(image) ? (
          <p className="text-sm text-gray-600">{x.pdfNote}</p>
        ) : (
          // The image keeps its shape and fits one page; the drawing is printed on top of it.
          <div className="flex justify-center bg-black rounded-xl p-2 print:p-0 [print-color-adjust:exact]">
            <div className="relative" style={{ width: `min(100%, calc(70vh / ${aspect}))` }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- an uploaded X-ray of unknown size */}
              <img
                src={fileHref(image.image || "")}
                alt={x.printTitle}
                className="block w-full h-auto"
                onLoad={(event) => {
                  const img = event.currentTarget;
                  if (img.naturalWidth > 0) setAspect(img.naturalHeight / img.naturalWidth);
                }}
              />
              {sketch.shapes.length > 0 && <SketchCanvas sketch={sketch} aspect={aspect} />}
            </div>
          </div>
        )}
        {image.description && (
          <div className="mt-5">
            <p className="text-xs text-gray-500">{x.description}</p>
            <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-line" dir="auto">
              {image.description}
            </p>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
