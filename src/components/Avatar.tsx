"use client";

import Link from "next/link";
import { useSession } from "@/context/SessionContext";
import { cx } from "@/lib/format";
import { fileHref } from "@/lib/frappe";
import { patientHref } from "@/lib/links";

/** Up to two letters from a name: "Zahraa Hussein" → "ZH", "Dr. Noor Al-Saadi" → "NS", "زهراء حسين" → "زح". */
export function initials(name: string): string {
  const words = name
    .replace(/^(dr|د)\.?\s+/i, "")
    .split(/[\s\-_.]+/)
    .filter((word) => /\p{L}/u.test(word) && !/^(al|el|ال)$/i.test(word));
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words.slice(0, 1);
  // A family name "الساعدي" counts from its first real letter; a first name keeps its own first letter.
  return letters
    .map((word, index) => {
      const family = letters.length > 1 && index === letters.length - 1;
      return [...(family ? word.replace(/^ال(?=\p{L}{2})/u, "") : word)][0] ?? "";
    })
    .join("")
    .toUpperCase();
}

/**
 * A round picture of a person: their uploaded photo when there is one (doctors, users), otherwise their initials on
 * a soft tint of the clinic colour. It is decoration only (hidden from screen readers): the name is always written
 * next to it.
 */
export default function Avatar({
  name,
  photo,
  size = 40,
  className,
}: {
  name: string;
  /** Kept for the callers that pass it; the initials look the same for everyone. */
  gender?: string | null;
  age?: number | string | null;
  /** A file URL; shown instead of the initials. */
  photo?: string | null;
  role?: "doctor";
  /** In pixels at 100 % screen size (it scales with the screen size setting). */
  size?: number;
  className?: string;
}) {
  const box = cx("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full print:hidden", className);
  const style = { width: `${size / 16}rem`, height: `${size / 16}rem`, fontSize: `${Math.max(11, size * 0.36) / 16}rem` };
  if (photo) {
    return (
      <span className={box} style={style} aria-hidden="true" data-avatar="photo">
        {/* eslint-disable-next-line @next/next/no-img-element -- an uploaded photo of unknown size */}
        <img src={fileHref(photo)} alt="" className="w-full h-full object-cover" />
      </span>
    );
  }
  return (
    <span className={cx(box, "bg-primary-100 text-primary-700 font-medium")} style={style} aria-hidden="true" data-avatar="initials">
      {initials(name) || "?"}
    </span>
  );
}

/** The user who is logged in: their photo (or their doctor photo), else their initials. */
export function MyAvatar({ size = 32, className }: { size?: number; className?: string }) {
  const { profile, doctor, displayName } = useSession();
  return <Avatar name={displayName} photo={profile?.user_image || doctor?.photo} size={size} className={className} />;
}

/** A patient in a list: their initials and their name, linking to their page. */
export function PatientLink({ id, name }: { id: string; name?: string | null }) {
  return (
    <Link href={patientHref(id)} className="inline-flex items-center gap-2.5 text-gray-800 font-medium hover:text-primary-600">
      <Avatar name={name || id} size={32} className="max-sm:hidden" />
      <span className="min-w-0">{name || id}</span>
    </Link>
  );
}
