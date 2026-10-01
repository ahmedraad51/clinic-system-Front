"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Camera, Columns2, FileText, ImageIcon, PenLine, Upload } from "lucide-react";
import AddImagesDialog from "./AddImagesDialog";
import CompareView from "./CompareView";
import ImageViewer from "./ImageViewer";
import { Button, Card, EmptyState, LoadError, PageLoading, SelectInput, tooltip } from "@/components/ui";
import { useLimit } from "@/components/LimitDialog";
import { useI18n } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { label } from "@/i18n";
import { fileHref } from "@/lib/frappe";
import { cx, formatDate } from "@/lib/format";
import { parseSketch } from "@/lib/sketch";
import { ACCEPT_ATTRIBUTE, imageTeeth, imageTitle, isAccepted, isPdf, joinTeeth, MAX_IMAGE_MB } from "@/lib/xrays";
import { IMAGE_TYPES, type DentalImage } from "@/lib/types";

const MAX_BYTES = MAX_IMAGE_MB * 1024 * 1024;

/**
 * A patient's X-rays and photos: add many at once (drag them in, choose them, or take a photo with the tablet's
 * camera), find them by type or tooth, open them in the viewer, and compare two side by side. The patient page
 * loads the images (usePatientImages) and passes them in, so the dental chart shares them.
 */
export default function XraySection({
  patient,
  patientName,
  images,
  error,
  onReload,
  canEdit,
}: {
  patient: string;
  patientName: string;
  images: DentalImage[] | null;
  error: string;
  onReload: () => void;
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const x = t.xrays;
  const toast = useToast();
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [toothFilter, setToothFilter] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ files: File[]; fromCamera: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [comparing, setComparing] = useState<string[] | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const limit = useLimit();

  /** Checks the chosen files (kind and size), then asks for their details. */
  const take = (list: File[], fromCamera: boolean) => {
    if (list.length === 0) return;
    const wrong = list.filter((file) => !isAccepted(file));
    if (wrong.length) toast.error(x.wrongKind(wrong.map((file) => file.name).join(t.files.separator)));
    const tooBig = list.filter((file) => isAccepted(file) && file.size > MAX_BYTES);
    if (tooBig.length) toast.error(t.files.tooBig(tooBig.map((file) => file.name).join(t.files.separator), MAX_IMAGE_MB));
    const ok = list.filter((file) => isAccepted(file) && file.size <= MAX_BYTES);
    // They must fit in the plan's room for files.
    if (ok.length && !limit.check("storage", ok.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024))) return;
    if (ok.length) setAdding({ files: ok, fromCamera });
  };

  const onPick = (fromCamera: boolean) => (event: ChangeEvent<HTMLInputElement>) => {
    const list = [...(event.target.files ?? [])];
    event.target.value = "";
    take(list, fromCamera);
  };

  const dropProps = canEdit
    ? {
        onDragOver: (event: DragEvent) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDragging(true);
        },
        onDragLeave: (event: DragEvent) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        },
        onDrop: (event: DragEvent) => {
          event.preventDefault();
          setDragging(false);
          take([...event.dataTransfer.files], false);
        },
      }
    : {};

  const all = images ?? [];
  const shown = all.filter(
    (image) => (!typeFilter || image.image_type === typeFilter) && (!toothFilter || imageTeeth(image).includes(toothFilter)),
  );
  const typesPresent = IMAGE_TYPES.filter((type) => all.some((image) => image.image_type === type));
  const teethPresent = [...new Set(all.flatMap(imageTeeth))].sort((a, b) => Number(a) - Number(b));
  // Grouped by the day they were taken, newest first.
  const groups: Array<{ date: string; items: DentalImage[] }> = [];
  shown.forEach((image) => {
    const last = groups[groups.length - 1];
    if (last && last.date === image.taken_on) last.items.push(image);
    else groups.push({ date: image.taken_on, items: [image] });
  });
  const pairChosen = comparing && comparing.length === 2 ? (comparing.map((name) => all.find((image) => image.name === name)) as DentalImage[]) : null;

  const tileClick = (image: DentalImage) => {
    if (!comparing) {
      setOpen(image.name);
      return;
    }
    if (isPdf(image)) return;
    setComparing(comparing.includes(image.name) ? comparing.filter((name) => name !== image.name) : [...comparing, image.name].slice(-2));
  };

  return (
    <Card
      title={x.title}
      icon={ImageIcon}
      actions={
        <>
          {all.filter((image) => !isPdf(image)).length >= 2 &&
            (comparing ? (
              <>
                <Button size="sm" icon={Columns2} disabled={!pairChosen} onClick={() => setShowCompare(true)}>
                  {x.compareCount(comparing.length)}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setComparing(null)}>
                  {x.compareCancel}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" icon={Columns2} onClick={() => setComparing([])}>
                {x.compare}
              </Button>
            ))}
          {canEdit && (
            <>
              <input ref={uploadRef} type="file" accept={ACCEPT_ATTRIBUTE} multiple className="hidden" onChange={onPick(false)} />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick(true)} />
              <Button size="sm" variant="secondary" icon={Camera} onClick={() => cameraRef.current?.click()} disabled={Boolean(adding)}>
                {x.takePhoto}
              </Button>
              <Button size="sm" icon={Upload} onClick={() => uploadRef.current?.click()} disabled={Boolean(adding)}>
                {x.addFiles}
              </Button>
            </>
          )}
        </>
      }
    >
      <div {...dropProps} className="relative space-y-4">
        {canEdit && (
          <div
            className={cx(
              "rounded-2xl border-2 border-dashed px-4 py-4 text-center transition",
              dragging ? "border-primary-500 bg-primary-50" : "border-gray-200 bg-gray-50/60",
            )}
          >
            <p className="text-sm font-medium text-gray-700">{dragging ? x.dropNow : x.dropHere}</p>
            <p className="text-xs text-gray-500 mt-0.5">{x.dropOr}</p>
          </div>
        )}

        {comparing && <p className="text-sm text-primary-700">{x.compareHint}</p>}

        {error && !images ? (
          <LoadError message={error} onRetry={onReload} />
        ) : !images ? (
          <PageLoading />
        ) : all.length === 0 ? (
          <EmptyState icon={ImageIcon} title={x.empty} text={canEdit ? x.emptyText : undefined} />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3">
              <SelectInput value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label={x.typeFilter} className="sm:w-56">
                <option value="">{x.allTypes}</option>
                {typesPresent.map((type) => (
                  <option key={type} value={type}>
                    {label(t.enums.imageType, type)}
                  </option>
                ))}
              </SelectInput>
              {teethPresent.length > 0 && (
                <SelectInput value={toothFilter} onChange={(e) => setToothFilter(e.target.value)} aria-label={x.toothFilter} className="sm:w-40">
                  <option value="">{x.allTeeth}</option>
                  {teethPresent.map((tooth) => (
                    <option key={tooth} value={tooth}>
                      {x.tooth(tooth)}
                    </option>
                  ))}
                </SelectInput>
              )}
              <p className="text-sm text-gray-500 sm:ms-auto self-center">{x.count(shown.length)}</p>
            </div>

            {groups.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">{x.nothingMatches}</p>
            ) : (
              groups.map((group) => (
                <section key={group.date} aria-label={formatDate(group.date)}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{formatDate(group.date)}</h3>
                  <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {group.items.map((image) => {
                      const title = imageTitle(image);
                      const chosen = comparing?.includes(image.name) ?? false;
                      const drawn = parseSketch(image.annotations).shapes.length > 0;
                      return (
                        <li key={image.name}>
                          <button
                            type="button"
                            onClick={() => tileClick(image)}
                            aria-label={comparing ? x.chooseForCompare(title) : x.openImage(title)}
                            aria-pressed={comparing ? chosen : undefined}
                            disabled={Boolean(comparing) && isPdf(image)}
                            className={cx(
                              "group w-full text-start rounded-md border overflow-hidden bg-surface transition hover:shadow-md",
                              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-40",
                              chosen ? "border-primary-500 ring-2 ring-primary-500" : "border-gray-200/80",
                            )}
                          >
                            <span className="relative block aspect-[4/3] bg-gray-950">
                              {isPdf(image) ? (
                                <span className="w-full h-full flex flex-col items-center justify-center gap-1 text-white/80">
                                  <FileText size={34} aria-hidden="true" />
                                  <span className="text-xs font-semibold">{x.pdf}</span>
                                </span>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element -- an uploaded X-ray of unknown size
                                <img src={fileHref(image.image || "")} alt="" className="w-full h-full object-contain" />
                              )}
                              {drawn && (
                                <span className="absolute top-2 end-2 w-7 h-7 rounded-full bg-black/60 text-yellow-300 flex items-center justify-center" {...tooltip(x.hasDrawing)}>
                                  <PenLine size={14} aria-hidden="true" />
                                  <span className="sr-only">{x.hasDrawing}</span>
                                </span>
                              )}
                            </span>
                            <span className="block px-3 py-2">
                              {/* Two lines, not cut at one: "أشعة مجنّحة (Bitewing)" lost its start when cut in a narrow tile. */}
                              <span className="block text-sm font-semibold text-gray-800 line-clamp-2 break-words">{label(t.enums.imageType, image.image_type)}</span>
                              <span className="block text-xs text-gray-500 truncate">
                                {imageTeeth(image).length === 1
                                  ? x.tooth(imageTeeth(image)[0])
                                  : imageTeeth(image).length
                                    ? x.teethShort(joinTeeth(imageTeeth(image)))
                                    : <bdi>{image.file_name}</bdi>}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </>
        )}
      </div>

      {open && images && (
        <ImageViewer
          images={images}
          start={open}
          patientName={patientName}
          canEdit={canEdit}
          onClose={() => setOpen(null)}
          onChanged={onReload}
        />
      )}
      {showCompare && pairChosen && (
        <CompareView images={[pairChosen[0], pairChosen[1]]} onClose={() => setShowCompare(false)} />
      )}
      {limit.dialog}
      {adding && (
        <AddImagesDialog
          patient={patient}
          files={adding.files}
          fromCamera={adding.fromCamera}
          onClose={() => setAdding(null)}
          onAdded={() => {
            setAdding(null);
            onReload();
          }}
        />
      )}
    </Card>
  );
}
