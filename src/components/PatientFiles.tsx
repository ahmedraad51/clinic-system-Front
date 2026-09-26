"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, ExternalLink, FileText, ImageIcon, Trash2, Upload } from "lucide-react";
import { Button, Card, EmptyState, PageLoading } from "@/components/ui";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";
import { attachFile, deleteDoc, errorMessage, fileHref, getList, type FileDoc } from "@/lib/frappe";
import { formatDateTime } from "@/lib/format";

/** Largest file accepted, to keep uploads quick on a clinic connection. */
const MAX_BYTES = 10 * 1024 * 1024;

const isImage = (file: FileDoc) => /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(file.file_name) || file.file_url.startsWith("data:image/");

/**
 * X-rays and photos attached to a patient (Frappe File records). Anyone who can see the patient can look
 * at them; people who may edit the patient can add and delete them. On a tablet or phone, "Take Photo"
 * opens the camera.
 */
export default function PatientFiles({ patient, canEdit }: { patient: string; canEdit: boolean }) {
  const toast = useToast();
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ patient: string; rows: FileDoc[] } | null>(null);
  const [version, setVersion] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState<FileDoc | null>(null);
  const [removing, setRemoving] = useState<FileDoc | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<FileDoc>("File", ["name", "file_name", "file_url", "creation"], {
          filters: [["attached_to_doctype", "=", "Patient"], ["attached_to_name", "=", patient]],
          orderBy: "creation desc",
          limit: 0,
        });
        if (!cancelled) setFiles({ patient, rows });
      } catch (err) {
        console.error(err);
        if (!cancelled) setFiles({ patient, rows: [] });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [patient, version]);

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = [...(event.target.files ?? [])];
    event.target.value = "";
    if (chosen.length === 0) return;
    const tooBig = chosen.filter((file) => file.size > MAX_BYTES);
    if (tooBig.length) toast.error(`${tooBig.map((f) => f.name).join(", ")}: larger than 10 MB, not added.`);
    const ok = chosen.filter((file) => file.size <= MAX_BYTES);
    if (ok.length === 0) return;
    setUploading(true);
    try {
      for (const file of ok) await attachFile(file, "Patient", patient);
      toast.success(ok.length === 1 ? "File added." : `${ok.length} files added.`);
      setVersion((v) => v + 1);
    } catch (err) {
      toast.error(errorMessage(err, "Could not add the file."));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!removing) return;
    setDeleting(true);
    try {
      await deleteDoc("File", removing.name);
      toast.success("File deleted.");
      setRemoving(null);
      setOpen(null);
      setVersion((v) => v + 1);
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete the file."));
    } finally {
      setDeleting(false);
    }
  };

  const rows = files?.patient === patient ? files.rows : null;

  return (
    <Card
      title="X-rays and Photos"
      actions={
        canEdit && (
          <>
            <input ref={uploadRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleFiles} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFiles} />
            <Button size="sm" variant="secondary" icon={Camera} onClick={() => cameraRef.current?.click()} disabled={uploading}>
              Take Photo
            </Button>
            <Button size="sm" icon={Upload} onClick={() => uploadRef.current?.click()} loading={uploading}>
              Add Files
            </Button>
          </>
        )
      }
    >
      {!rows ? (
        <PageLoading />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No X-rays or photos yet"
          text={canEdit ? "Add X-rays, intra-oral photos or PDF reports. On a tablet, Take Photo opens the camera." : undefined}
        />
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {rows.map((file) => (
            <li key={file.name}>
              <button
                type="button"
                onClick={() => setOpen(file)}
                className="group w-full text-start rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <span className="block aspect-[4/3] bg-gray-900/90">
                  {isImage(file) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- an uploaded patient file of unknown size
                    <img src={fileHref(file.file_url)} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-500">
                      <FileText size={36} />
                    </span>
                  )}
                </span>
                <span className="block px-3 py-2">
                  <span className="block text-sm font-medium text-gray-800 truncate">{file.file_name}</span>
                  <span className="block text-xs text-gray-500">{formatDateTime(file.creation)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <Modal open title={open.file_name} onClose={() => setOpen(null)} wide>
          <div className="space-y-4">
            {isImage(open) ? (
              // eslint-disable-next-line @next/next/no-img-element -- an uploaded patient file of unknown size
              <img src={fileHref(open.file_url)} alt={open.file_name} className="w-full max-h-[65vh] object-contain rounded-xl bg-gray-900" />
            ) : (
              <p className="text-sm text-gray-600">This file opens in a new tab.</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={fileHref(open.file_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ExternalLink size={16} />
                Open in a new tab
              </a>
              {canEdit && (
                <Button variant="ghost" icon={Trash2} onClick={() => setRemoving(open)} className="ms-auto text-red-600 hover:bg-red-50">
                  Delete
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={removing !== null}
        title="Delete this file?"
        message={
          <p>
            <strong>{removing?.file_name}</strong> will be removed from the patient for good.
          </p>
        }
        confirmLabel="Delete File"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setRemoving(null)}
      />
    </Card>
  );
}
