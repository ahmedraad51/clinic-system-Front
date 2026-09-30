"use client";

import { useRef, useState, type ChangeEvent, type FormEvent, type RefObject } from "react";
import { ImagePlus, Pill, Trash2 } from "lucide-react";
import { RxFooter, RxHeader, RxSignature } from "@/components/RxPaper";
import { Alert, Button, Field, NumberInput, SelectInput, TextArea, Toggle } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { label } from "@/i18n";
import { bumpData } from "@/lib/dataVersion";
import { errorMessage, fileHref, updateDoc, uploadFile } from "@/lib/frappe";
import { formatDate, todayISO } from "@/lib/format";
import {
  RX_MARGIN_MAX, RX_MARGIN_MIN, RX_PAPER_SIZES, rxPaperOf, rxPaperPayload, type RxPaper, type RxPaperSize,
} from "@/lib/rxPaper";
import type { Doctor } from "@/lib/types";

/** A logo or signature is printed small: 2 MB is plenty. */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Edit a doctor's prescription paper, with a preview of the top and bottom of the page. */
export default function RxPaperDialog({ doctor, onClose, onSaved }: { doctor: Doctor; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const x = t.rxPaper;
  const toast = useToast();
  const [paper, setPaper] = useState<RxPaper>(() => rxPaperOf(doctor));
  // The mm boxes as typed, so they can be cleared while typing.
  const [top, setTop] = useState(String(paper.topMm));
  const [bottom, setBottom] = useState(String(paper.bottomMm));
  const [marginError, setMarginError] = useState("");
  const [uploading, setUploading] = useState<"logo" | "signature" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const logoRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLInputElement>(null);

  const upload = async (field: "logo" | "signature", event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError(x.notImage);
    if (file.size > MAX_IMAGE_BYTES) return setError(x.tooBig(MAX_IMAGE_BYTES / (1024 * 1024)));
    setError("");
    setUploading(field);
    try {
      const url = await uploadFile(file);
      setPaper((prev) => ({ ...prev, [field]: url }));
    } catch (err) {
      setError(errorMessage(err, x.uploadFailed));
    } finally {
      setUploading(null);
    }
  };

  const mm = (text: string) => (text.trim() === "" ? NaN : Number(text));
  const inRange = (n: number) => Number.isInteger(n) && n >= RX_MARGIN_MIN && n <= RX_MARGIN_MAX;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (paper.preprinted && (!inRange(mm(top)) || !inRange(mm(bottom)))) {
      setMarginError(x.marginInvalid(RX_MARGIN_MIN, RX_MARGIN_MAX));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateDoc("Doctor", doctor.name, rxPaperPayload({ ...paper, topMm: mm(top) || 0, bottomMm: mm(bottom) || 0 }));
      toast.success(x.saved(doctor.full_name));
      bumpData();
      onSaved();
    } catch (err) {
      setError(errorMessage(err, x.saveFailed));
      setSaving(false);
    }
  };

  // What the preview shows: the paper as it is being set.
  const preview: RxPaper = { ...paper, topMm: inRange(mm(top)) ? mm(top) : paper.topMm, bottomMm: inRange(mm(bottom)) ? mm(bottom) : paper.bottomMm };

  const imageField = (field: "logo" | "signature", title: string, hint: string, input: RefObject<HTMLInputElement | null>) => (
    <Field label={title} hint={hint}>
      <div className="flex flex-wrap items-center gap-2">
        {paper[field] && (
          // eslint-disable-next-line @next/next/no-img-element -- an uploaded file of unknown size
          <img src={fileHref(paper[field])} alt="" className="h-11 max-w-28 rounded border border-gray-200 bg-white object-contain" />
        )}
        <input ref={input} type="file" accept="image/*" className="hidden" aria-label={title} onChange={(event) => upload(field, event)} />
        <Button size="sm" variant="secondary" icon={ImagePlus} loading={uploading === field} onClick={() => input.current?.click()}>
          {paper[field] ? x.change : x.upload}
        </Button>
        {paper[field] && (
          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setPaper({ ...paper, [field]: "" })}>
            {x.remove}
          </Button>
        )}
      </div>
    </Field>
  );

  return (
    <Modal open title={`${x.title}: ${doctor.full_name}`} size="xl" onClose={onClose} fullScreenOnPhone>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Field label={x.size}>
            <SelectInput value={paper.size} onChange={(event) => setPaper({ ...paper, size: event.target.value as RxPaperSize })}>
              {RX_PAPER_SIZES.map((size) => (
                <option key={size} value={size}>
                  {x.sizes[size]}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Toggle
            checked={paper.preprinted}
            onChange={(preprinted) => setPaper({ ...paper, preprinted })}
            label={x.preprinted}
            description={x.preprintedHint}
          />
          {paper.preprinted ? (
            <div className="grid grid-cols-2 gap-4">
              <Field label={x.topMm} hint={x.marginHint} error={marginError}>
                <NumberInput
                  decimals={false}
                  value={top}
                  onChange={(event) => {
                    setTop(event.target.value);
                    setMarginError("");
                  }}
                  aria-invalid={marginError ? true : undefined}
                />
              </Field>
              <Field label={x.bottomMm}>
                <NumberInput
                  decimals={false}
                  value={bottom}
                  onChange={(event) => {
                    setBottom(event.target.value);
                    setMarginError("");
                  }}
                />
              </Field>
            </div>
          ) : (
            <>
              <Field label={x.qualifications} hint={x.qualificationsHint}>
                <TextArea rows={3} value={paper.qualifications} onChange={(event) => setPaper({ ...paper, qualifications: event.target.value })} />
              </Field>
              <Field label={x.footer} hint={x.footerHint}>
                <TextArea rows={2} value={paper.footer} onChange={(event) => setPaper({ ...paper, footer: event.target.value })} />
              </Field>
              {imageField("logo", x.logo, x.logoHint, logoRef)}
            </>
          )}
          {imageField("signature", x.signature, x.signatureHint, signatureRef)}
          {error && <Alert tone="red">{error}</Alert>}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" loading={saving} disabled={uploading !== null}>
              {x.save}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              {t.common.cancel}
            </Button>
          </div>
        </div>

        {/* The top and bottom of the page, as it will print (sizes shrunk to fit). */}
        <section aria-label={x.preview} data-testid="rx-preview" className="rounded-md border border-gray-200 bg-surface p-5 sm:p-6 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-3">
            {x.preview}
            {t.common.dot}
            {preview.size}
          </p>
          <RxHeader
            paper={preview}
            doctorName={doctor.full_name}
            specialization={label(t.enums.specialization, doctor.specialization)}
            reference={<span dir="ltr">RX-2026-00001</span>}
            date={formatDate(todayISO())}
          />
          <div className="py-4 flex gap-3">
            <Pill size={16} className="text-primary-600 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-gray-800">{x.sampleMedicine}</p>
              <p className="text-gray-700">{x.sampleDose}</p>
            </div>
          </div>
          <RxSignature paper={preview} doctorName={doctor.full_name} label={t.prescriptions.signature} />
          <RxFooter paper={preview} />
        </section>
      </form>
    </Modal>
  );
}
