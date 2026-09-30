"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ScanQrCode } from "lucide-react";
import { Alert, Button, Field, TextInput } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";
import { patientHref } from "@/lib/links";
import { patientIdFromScan } from "@/lib/qr";
import { TOP_ICON_BUTTON } from "./topbarStyles";

/** The browser's own QR reader (Chrome, Edge, Android). Elsewhere jsQR reads the camera's frames. */
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
}
type BarcodeDetectorClass = new (options: { formats: string[] }) => BarcodeDetectorLike;

/** How often a camera frame is read. */
const EVERY_MS = 250;

/** The Scan button of the top bar: opens a patient's file from the QR code on their card or printed chart. */
export default function ScanPatientButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={t.qr.scanButton} title={t.qr.scanButton} className={TOP_ICON_BUTTON}>
        <ScanQrCode size={22} />
      </button>
      {/* On the page body: inside the top bar, the menu would cover it. */}
      {open && createPortal(<ScanPatientDialog onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function ScanPatientDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const q = t.qr;
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"starting" | "scanning" | "failed">("starting");
  const [notice, setNotice] = useState("");
  const [typed, setTyped] = useState("");
  const [typedError, setTypedError] = useState("");

  const openPatient = (id: string) => {
    onClose();
    router.push(patientHref(id));
  };
  // The latest one, for the camera loop that started with the first render.
  const openRef = useRef(openPatient);
  useEffect(() => {
    openRef.current = openPatient;
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        const video = videoRef.current;
        if (stopped || !video) return;
        video.srcObject = stream;
        await video.play();
        if (stopped) return;
        setStatus("scanning");
        const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector;
        const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;
        const jsQR = detector ? null : (await import("jsqr")).default;
        const canvas = document.createElement("canvas");
        const read = async (): Promise<string | null> => {
          if (video.readyState < 2) return null;
          if (detector) return (await detector.detect(video))[0]?.rawValue ?? null;
          const scale = Math.min(1, 640 / (video.videoWidth || 640));
          canvas.width = Math.round((video.videoWidth || 640) * scale);
          canvas.height = Math.round((video.videoHeight || 480) * scale);
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context || !jsQR) return null;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = context.getImageData(0, 0, canvas.width, canvas.height);
          return jsQR(image.data, image.width, image.height)?.data ?? null;
        };
        const tick = async () => {
          if (stopped) return;
          let text: string | null = null;
          try {
            text = await read();
          } catch {
            // A frame that could not be read: try the next one.
          }
          if (stopped) return;
          const id = text ? patientIdFromScan(text) : null;
          if (id) {
            openRef.current(id);
            return;
          }
          if (text) setNotice(q.notPatient);
          timer = setTimeout(tick, EVERY_MS);
        };
        tick();
      } catch (err) {
        console.error(err);
        if (!stopped) setStatus("failed");
      }
    };
    start();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [q.notPatient]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = patientIdFromScan(typed);
    if (!id) {
      setTypedError(q.idInvalid);
      return;
    }
    openPatient(id);
  };

  return (
    <Modal open title={q.scanTitle} onClose={onClose} fullScreenOnPhone>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{q.scanHint}</p>
        {status === "failed" ? (
          <Alert tone="yellow">{q.noCamera}</Alert>
        ) : (
          <div className="relative">
            <video ref={videoRef} muted playsInline aria-label={q.video} className="w-full aspect-[4/3] rounded-md bg-black object-cover" />
            {status === "starting" && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-white">{q.starting}</p>
            )}
            {/* The frame to hold the code in. */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-[18%] rounded-lg border-2 border-white/80" />
          </div>
        )}
        {notice && <Alert tone="yellow">{notice}</Alert>}
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
          <Field label={q.orType} error={typedError} className="flex-1 min-w-48">
            <TextInput
              value={typed}
              onChange={(event) => {
                setTyped(event.target.value);
                setTypedError("");
              }}
              placeholder="PAT-2026-00001"
              dir="ltr"
              autoComplete="off"
              aria-invalid={typedError ? true : undefined}
            />
          </Field>
          <Button type="submit" variant="secondary">
            {q.open}
          </Button>
        </form>
      </div>
    </Modal>
  );
}
