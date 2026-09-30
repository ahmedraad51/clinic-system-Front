/**
 * Helpers for the X-ray section (Dental Image records): which files are accepted, a first guess at an image's
 * type from its file name, and the teeth an image shows.
 */

import { label, messages } from "@/i18n";
import { formatDate } from "./format";
import type { DentalImage, ImageType } from "./types";

/** JPG, PNG and PDF are accepted; DICOM comes later. */
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
export const ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf";
export const MAX_IMAGE_MB = 10;

export function isAccepted(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type) || /\.(jpe?g|png|pdf)$/i.test(file.name);
}

export function isPdf(image: Pick<DentalImage, "image" | "file_name">): boolean {
  return /\.pdf$/i.test(image.file_name || "") || /^data:application\/pdf/.test(image.image || "") || /\.pdf($|\?)/i.test(image.image || "");
}

/** A first guess from the file name: "opg-2026.png" → Panoramic. A photo from the camera is an intraoral photo. */
export function guessImageType(file: File, fromCamera = false): ImageType {
  const name = file.name.toLowerCase();
  if (/\.pdf$/.test(name) || file.type === "application/pdf") return "Other";
  if (/pano|opg|orthopan/.test(name)) return "Panoramic (OPG)";
  if (/bitewing|\bbw/.test(name)) return "Bitewing";
  if (/ceph/.test(name)) return "Cephalometric";
  if (/cbct|cone/.test(name)) return "CBCT screenshot";
  if (fromCamera || /photo|img_|dsc|intraoral|\.jpe?g$/.test(name)) return "Intraoral photo";
  return "Periapical";
}

/** FDI tooth numbers: 11-18, 21-28, 31-38, 41-48, and the child teeth 51-55, 61-65, 71-75, 81-85. */
export function isToothNumber(value: string): boolean {
  if (!/^\d{2}$/.test(value)) return false;
  const quadrant = Number(value[0]);
  const tooth = Number(value[1]);
  if (quadrant >= 1 && quadrant <= 4) return tooth >= 1 && tooth <= 8;
  if (quadrant >= 5 && quadrant <= 8) return tooth >= 1 && tooth <= 5;
  return false;
}

/**
 * Reads what was typed in a Teeth box ("36, 37", "36 37", "٣٦،٣٧"): the teeth in order without repeats, and the
 * parts that are not tooth numbers.
 */
export function parseTeeth(text: string): { teeth: string[]; bad: string[] } {
  const latin = text.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const parts = latin.split(/[\s,،;؛]+/).map((part) => part.trim()).filter(Boolean);
  const teeth: string[] = [];
  const bad: string[] = [];
  parts.forEach((part) => {
    if (!isToothNumber(part)) bad.push(part);
    else if (!teeth.includes(part)) teeth.push(part);
  });
  return { teeth, bad };
}

/** The teeth saved on an image ("36,37"). */
export function imageTeeth(image: Pick<DentalImage, "teeth">): string[] {
  return (image.teeth || "").split(",").map((tooth) => tooth.trim()).filter(Boolean);
}

/** A list of teeth, joined the way the language writes lists: "26, 27" (Arabic "26، 27"). */
export function joinTeeth(teeth: string[]): string {
  return teeth.join(messages().files.separator);
}

/** How an image is named to a person: "Periapical · 18 Jun 2026 · Tooth 36". */
export function imageTitle(image: Pick<DentalImage, "image_type" | "taken_on" | "teeth">): string {
  const x = messages();
  const teeth = imageTeeth(image);
  return [
    label(x.enums.imageType, image.image_type),
    formatDate(image.taken_on),
    teeth.length === 1 ? x.xrays.tooth(teeth[0]) : teeth.length ? x.xrays.teethShort(joinTeeth(teeth)) : "",
  ]
    .filter(Boolean)
    .join(x.common.dot);
}

/** The fields a list of images needs. */
export const IMAGE_FIELDS = ["name", "patient", "patient_name", "image", "file_name", "image_type", "taken_on", "description", "teeth", "annotations"];

/** Newest first; images taken the same day in the order they were added. */
export function sortImages(images: DentalImage[]): DentalImage[] {
  return [...images].sort((a, b) => (b.taken_on || "").localeCompare(a.taken_on || "") || a.name.localeCompare(b.name));
}
