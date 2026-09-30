/**
 * QR codes for patients: what a patient's code holds (the address of their file, so a phone camera opens it too)
 * and reading a scanned code back to a patient ID. The code itself is drawn by components/QrCode.tsx.
 */
import qrcode from "qrcode-generator";

/** The dark and light modules of a QR code for `text` (error correction M: still reads when a little worn). */
export function qrMatrix(text: string): boolean[][] {
  const code = qrcode(0, "M");
  code.addData(text);
  code.make();
  const size = code.getModuleCount();
  return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => code.isDark(row, col)));
}

/** What a patient's code holds: the address of their file on this clinic's DentClinic. */
export function patientQrValue(id: string, origin: string): string {
  return `${origin.replace(/\/+$/, "")}/patients/${encodeURIComponent(id)}`;
}

/** Patient IDs as the naming series makes them: PAT-2026-00001. */
const PATIENT_ID = /^PAT-\d{4}-\d{3,}$/i;

/**
 * The patient ID in a scanned or typed text: the address of a patient's file (from any DentClinic address, with or
 * without more after it), or the ID itself. Anything else is null.
 */
export function patientIdFromScan(text: string): string | null {
  const value = text.trim();
  if (!value) return null;
  if (PATIENT_ID.test(value)) return value.toUpperCase();
  const match = /\/patients\/([^/?#\s]+)/.exec(value);
  if (!match) return null;
  let id: string;
  try {
    id = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  return PATIENT_ID.test(id) ? id.toUpperCase() : null;
}
