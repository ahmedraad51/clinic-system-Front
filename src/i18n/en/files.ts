import { num } from "../runtime";

/** Sending files to the server (the X-ray section uses these while it uploads). */
export const files = {
  /** `names`: the files, joined with ", ". */
  tooBig: (names: string, mb: number) => `${names}: larger than ${num(mb)} MB, not added.`,
  /** Some files of a batch were sent before one failed. */
  partlyAdded: (added: number, count: number, name: string, reason: string) =>
    `${num(added)} of ${num(count)} files added. ${name} was not added: ${reason}`,
  uploadingOf: (index: number, count: number, name: string) => `Uploading ${num(index)} of ${num(count)}: ${name}`,
  uploading: (name: string) => `Uploading ${name}`,
  /** Between file names. */
  separator: ", ",
};
