import { num, plural } from "../runtime";

/** X-rays and photos attached to a patient (src/components/PatientFiles.tsx). */
export const files = {
  title: "X-rays and Photos",
  takePhoto: "Take Photo",
  addFiles: "Add Files",
  /** `names`: the files, joined with ", ". */
  tooBig: (names: string, mb: number) => `${names}: larger than ${num(mb)} MB, not added.`,
  added: (n: number) => plural(n, { one: "File added.", other: "# files added." }),
  addFailed: "Could not add the file.",
  /** Some files of a batch were sent before one failed. */
  partlyAdded: (added: number, count: number, name: string, reason: string) =>
    `${num(added)} of ${num(count)} files added. ${name} was not added: ${reason}`,
  deleted: "File deleted.",
  deleteFailed: "Could not delete the file.",
  uploadingOf: (index: number, count: number, name: string) => `Uploading ${num(index)} of ${num(count)}: ${name}`,
  uploading: (name: string) => `Uploading ${name}`,
  empty: "No X-rays or photos yet",
  emptyText: "Add X-rays, intra-oral photos or PDF reports. On a tablet, Take Photo opens the camera.",
  opensInTab: "This file opens in a new tab.",
  openInTab: "Open in a new tab",
  delete: "Delete",
  deleteTitle: "Delete this file?",
  /** Shown after the file name, in bold. */
  deleteText: " will be removed from the patient for good.",
  deleteConfirm: "Delete File",
  /** Between file names. */
  separator: ", ",
};
