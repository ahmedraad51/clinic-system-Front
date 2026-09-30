"use client";

import { useState, type FormEvent } from "react";
import { FileText } from "lucide-react";
import { Button, Field, ProgressBar, TextArea, TextInput } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { ImageTypeSelect } from "./ImageDetailsDialog";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { attachFile, createDoc, deleteDoc, errorMessage, updateDoc } from "@/lib/frappe";
import { todayISO } from "@/lib/format";
import { guessImageType, parseTeeth } from "@/lib/xrays";
import type { DentalImage, ImageType } from "@/lib/types";

/** Makes the Dental Image record, attaches the file to it (private), then points the record at the file. */
async function addImage(
  patient: string,
  file: File,
  details: Pick<DentalImage, "image_type" | "taken_on" | "teeth" | "description">,
  onProgress: (fraction: number) => void,
): Promise<void> {
  const doc = await createDoc<DentalImage>("Dental Image", { patient, file_name: file.name, ...details });
  try {
    const attached = await attachFile(file, "Dental Image", doc.name, { onProgress });
    await updateDoc("Dental Image", doc.name, { image: attached.file_url });
  } catch (err) {
    // No record without its picture.
    await deleteDoc("Dental Image", doc.name).catch(() => undefined);
    throw err;
  }
}

/**
 * Before files are added: each file's type (guessed from its name, a camera photo is an intraoral photo), and the
 * date taken, teeth and description they share. Then they are sent one after another, with the progress.
 */
export default function AddImagesDialog({
  patient,
  files,
  fromCamera = false,
  onClose,
  onAdded,
}: {
  patient: string;
  files: File[];
  fromCamera?: boolean;
  onClose: () => void;
  /** Called with how many were added, also after a failure part way. */
  onAdded: (count: number) => void;
}) {
  const { t } = useI18n();
  const x = t.xrays;
  const tf = t.files;
  const toast = useToast();
  const [types, setTypes] = useState<ImageType[]>(() => files.map((file) => guessImageType(file, fromCamera)));
  const [takenOn, setTakenOn] = useState(todayISO());
  const [teeth, setTeeth] = useState("");
  const [teethError, setTeethError] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState<{ name: string; index: number; percent: number } | null>(null);
  const [previews] = useState(() => files.map((file) => (file.type.startsWith("image/") ? URL.createObjectURL(file) : "")));
  // The previews are let go when the dialog is done with.
  const release = () => previews.forEach((url) => url && URL.revokeObjectURL(url));
  const close = () => {
    release();
    onClose();
  };
  const done = (count: number) => {
    release();
    onAdded(count);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseTeeth(teeth);
    if (parsed.bad.length) {
      setTeethError(x.teethInvalid(parsed.bad.join(t.files.separator)));
      return;
    }
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0) || 1;
    let sentBytes = 0;
    let added = 0;
    try {
      for (const [index, file] of files.entries()) {
        const before = sentBytes;
        const show = (fraction: number) =>
          setProgress({ name: file.name, index: index + 1, percent: ((before + fraction * file.size) / totalBytes) * 100 });
        show(0);
        await addImage(
          patient,
          file,
          { image_type: types[index], taken_on: takenOn, teeth: parsed.teeth.join(","), description: description.trim() },
          show,
        );
        sentBytes += file.size;
        added += 1;
      }
      toast.success(x.added(files.length));
      done(added);
    } catch (err) {
      const reason = errorMessage(err, x.addFailed);
      toast.error(files.length === 1 ? reason : tf.partlyAdded(added, files.length, files[added].name, reason));
      setProgress(null);
      if (added > 0) done(added);
      else close();
    }
  };

  const busy = progress !== null;

  return (
    <Modal open title={x.addTitle(files.length)} onClose={busy ? () => undefined : close} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {files.map((file, index) => (
            <li key={file.name + index} className="flex items-center gap-3 rounded-xl border border-gray-200/80 p-2">
              <span className="w-14 h-14 shrink-0 rounded-md bg-black overflow-hidden flex items-center justify-center text-white/80">
                {previews[index] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a local preview of the chosen file
                  <img src={previews[index]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <FileText size={24} aria-hidden="true" />
                )}
              </span>
              <span className="flex-1 min-w-0 text-sm text-gray-800 truncate" dir="auto">
                {file.name}
              </span>
              <span className="w-48 max-w-[45%]">
                <ImageTypeSelect
                  value={types[index]}
                  ariaLabel={x.fileType(file.name)}
                  onChange={(value) => setTypes(types.map((type, i) => (i === index ? value : type)))}
                />
              </span>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={x.takenOn} required>
            <TextInput type="date" dir="ltr" value={takenOn} onChange={(e) => setTakenOn(e.target.value)} required />
          </Field>
          <Field label={x.teeth} hint={x.teethHint} error={teethError}>
            <TextInput
              value={teeth}
              dir="ltr"
              inputMode="numeric"
              aria-invalid={Boolean(teethError)}
              onChange={(e) => {
                setTeeth(e.target.value);
                setTeethError("");
              }}
            />
          </Field>
        </div>
        <Field label={x.description} hint={x.descriptionHint}>
          <TextArea value={description} dir="auto" rows={2} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        {progress && (
          <ProgressBar
            value={progress.percent}
            label={files.length > 1 ? tf.uploadingOf(progress.index, files.length, progress.name) : tf.uploading(progress.name)}
          />
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit" loading={busy}>
            {x.saveImages(files.length)}
          </Button>
          <Button variant="secondary" onClick={close} disabled={busy}>
            {t.common.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
