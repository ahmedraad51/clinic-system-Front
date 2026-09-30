/**
 * Friendly drawn avatars for patients and staff (src/components/Avatar.tsx draws them). The look comes from the
 * gender and age, and small details (skin tone, hair colour, a beard, a headscarf, glasses) from the name, so a
 * person always gets the same drawing and two people rarely get the same one.
 */

export type AvatarKind = "man" | "woman" | "boy" | "girl" | "person";

/** Patients younger than this are drawn as children. */
export const CHILD_UNDER = 13;

export function avatarKind(gender?: string | null, age?: number | string | null): AvatarKind {
  // An empty age comes back as 0 (Frappe's empty Int), so 0 counts as not known: drawn as a grown-up.
  const years = Number(age);
  const child = Number.isFinite(years) && years > 0 && years < CHILD_UNDER;
  if (gender === "Male") return child ? "boy" : "man";
  if (gender === "Female") return child ? "girl" : "woman";
  return "person";
}

/** A stable number from a name (FNV-1a), so the same name always gets the same details. */
export function nameSeed(name: string): number {
  let hash = 0x811c9dc5;
  for (const char of name.trim().toLowerCase()) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

const SKIN = ["#f6d2b0", "#eec19a", "#e2ab80", "#cf9266", "#b97a52"];
const HAIR = ["#2a1c15", "#3b2719", "#1d1917", "#4c3222", "#6a4529"];
const SHIRTS = ["#38bdf8", "#34d399", "#a78bfa", "#fbbf24", "#fb7185", "#60a5fa", "#2dd4bf", "#f472b6"];
const SCARVES = ["#8b5cf6", "#0f766e", "#be185d", "#1e40af", "#b45309", "#475569", "#db2777", "#0e7490"];

export interface AvatarLook {
  kind: AvatarKind;
  skin: string;
  hair: string;
  shirt: string;
  scarf: string;
  /** 1-6: which of the design's background colours (--avatar-1 … --avatar-6). */
  background: number;
  beard: boolean;
  moustache: boolean;
  hijab: boolean;
  glasses: boolean;
}

export function avatarLook(name: string, gender?: string | null, age?: number | string | null): AvatarLook {
  const kind = avatarKind(gender, age);
  const seed = nameSeed(name || "?");
  // Different bits of the seed for each detail, so they do not all change together.
  const pick = <T>(list: readonly T[], shift: number) => list[(seed >>> shift) % list.length];
  const older = Number(age) >= 60;
  const adult = kind === "man" || kind === "woman" || kind === "person";
  return {
    kind,
    skin: pick(SKIN, 0),
    hair: older ? "#b9b4ae" : pick(HAIR, 3),
    shirt: pick(SHIRTS, 6),
    scarf: pick(SCARVES, 9),
    background: ((seed >>> 12) % 6) + 1,
    beard: kind === "man" && (seed >>> 15) % 3 === 0,
    moustache: kind === "man" && (seed >>> 15) % 3 === 1,
    hijab: kind === "woman" && (seed >>> 17) % 3 !== 0,
    glasses: adult && (older || (seed >>> 19) % 5 === 0),
  };
}
