"use client";

import { useSession } from "@/context/SessionContext";
import { avatarLook, type AvatarLook } from "@/lib/avatar";
import { cx } from "@/lib/format";
import { fileHref } from "@/lib/frappe";

/**
 * A round picture of a person: their uploaded photo when there is one (doctors, users), otherwise a friendly
 * drawing made in code: a man, woman, boy or girl (from the gender and age), with small details from the name.
 * `role="doctor"` adds a white coat and a stethoscope. It is decoration only (hidden from screen readers):
 * the name is always written next to it.
 */
export default function Avatar({
  name,
  gender,
  age,
  photo,
  role,
  size = 40,
  className,
}: {
  name: string;
  gender?: string | null;
  age?: number | string | null;
  /** A file URL; shown instead of the drawing. */
  photo?: string | null;
  role?: "doctor";
  /** In pixels at 100 % screen size (it scales with the screen size setting). */
  size?: number;
  className?: string;
}) {
  const look = avatarLook(name, gender, age);
  const box = cx(
    "relative inline-flex shrink-0 overflow-hidden rounded-full ring-2 ring-white/80 shadow-sm print:hidden",
    className,
  );
  const style = { width: `${size / 16}rem`, height: `${size / 16}rem` };
  if (photo) {
    return (
      <span className={box} style={style} aria-hidden="true" data-avatar="photo">
        {/* eslint-disable-next-line @next/next/no-img-element -- an uploaded photo of unknown size */}
        <img src={fileHref(photo)} alt="" className="w-full h-full object-cover" />
      </span>
    );
  }
  return (
    <span className={box} style={style} aria-hidden="true" data-avatar={look.kind}>
      <Drawing look={look} doctor={role === "doctor"} />
    </span>
  );
}

const INK = "#2d2420";

function Drawing({ look, doctor }: { look: AvatarLook; doctor: boolean }) {
  const child = look.kind === "boy" || look.kind === "girl";
  // A child's head is a little bigger and lower, its body smaller.
  const face = child ? { cx: 32, cy: 30, rx: 11.5, ry: 12 } : { cx: 32, cy: 27, rx: 10.5, ry: 11.5 };
  const eyeY = face.cy - 0.5;
  const body = child ? "M13 66C13 54 21 48.5 32 48.5S51 54 51 66Z" : "M9 66C9 51 19 43.5 32 43.5S55 51 55 66Z";
  const neck = child ? { x: 29, y: 38, h: 12 } : { x: 28, y: 34, h: 11 };

  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      {/* The round frame (overflow-hidden) cuts the corners off. */}
      <g>
        <rect width="64" height="64" style={{ fill: `var(--avatar-${look.background})` }} />

        {/* Hair that falls behind the shoulders, and a girl's pigtails. */}
        {look.kind === "woman" && !look.hijab && (
          <path d="M18.5 28C18.5 15 25 11.5 32 11.5S45.5 15 45.5 28L47 46C42 48 37.5 47 35.5 45H28.5C26.5 47 22 48 17 46Z" fill={look.hair} />
        )}
        {look.kind === "girl" && (
          <>
            <circle cx="18" cy="32" r="5" fill={look.hair} />
            <circle cx="46" cy="32" r="5" fill={look.hair} />
            <circle cx="20.5" cy="27.5" r="1.8" fill="#f472b6" />
            <circle cx="43.5" cy="27.5" r="1.8" fill="#f472b6" />
          </>
        )}

        {/* Body: a shirt, or a white coat over scrubs for a doctor. */}
        <path d={body} fill={doctor ? "#ffffff" : look.shirt} />
        {doctor && (
          <>
            <path d={child ? "M28 48.5L32 56L36 48.5Z" : "M26.5 43.8L32 53L37.5 43.8Z"} style={{ fill: "var(--brand)" }} />
            <path d="M26.5 44L31 58M37.5 44L33 58" stroke="#d1d5db" strokeWidth="1.2" fill="none" />
            <path d="M25 45.5C22.5 52 24 57 28.5 57.5" stroke="#475569" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <circle cx="29.3" cy="57.6" r="1.9" fill="#475569" />
          </>
        )}
        <rect x={neck.x} y={neck.y} width={64 - neck.x * 2} height={neck.h} rx="3" fill={look.skin} />
        {!doctor && <path d={child ? "M28.5 48.6L32 53L35.5 48.6Z" : "M27.5 43.7L32 49L36.5 43.7Z"} fill={look.skin} />}

        {/* A headscarf goes around the face and down to the shoulders. */}
        {look.hijab && <path d="M16.5 30C16.5 17.5 23.5 11 32 11S47.5 17.5 47.5 30C47.5 41 43.5 47.5 32 49.5C20.5 47.5 16.5 41 16.5 30Z" fill={look.scarf} />}

        <ellipse {...face} fill={look.skin} />

        {/* Hair on top of the head. */}
        {look.kind === "man" && (
          <path d="M20.8 25.5C20.5 16.5 25.5 12.8 32 12.8S43.5 16.5 43.2 25.5C41.8 21.2 37.8 19.4 32 19.4S22.2 21.2 20.8 25.5Z" fill={look.hair} />
        )}
        {look.kind === "person" && (
          <path d="M20.8 26C20.5 16.5 25.5 12.6 32 12.6S43.5 16.5 43.2 26C42 22 38 20.2 33 21.6C29 20 23.5 21.5 20.8 26Z" fill={look.hair} />
        )}
        {look.kind === "woman" && !look.hijab && (
          <path d="M20.8 26C21.5 17.5 26.5 14 32 14S42.5 17.5 43.2 26C40 20.5 35.5 18.8 29.5 19.8C26 20.5 22.8 22.5 20.8 26Z" fill={look.hair} />
        )}
        {look.kind === "boy" && (
          <path d="M20 28C19.8 18 25 14.5 32 14.5S44.2 18 44 28C42.5 23.5 39.5 21.5 36 22C34 20 30 20 28 22C24.5 21.5 21.5 23.5 20 28ZM31 14.8C31.5 12 34 11 36 12C34 12.5 33 13.5 33 15Z" fill={look.hair} />
        )}
        {look.kind === "girl" && (
          <path d="M20 28C20.5 19 25.5 15 32 15S43.5 19 44 28C41 22.5 37 20.5 32 21.5C27 20.5 23 22.5 20 28Z" fill={look.hair} />
        )}

        {/* Beard or moustache. */}
        {look.beard && (
          <path d="M21.6 27.5C22 35.5 26 39 32 39S42 35.5 42.4 27.5C41 32.5 37 34.2 32 34.2S23 32.5 21.6 27.5Z" fill={look.hair} />
        )}
        {(look.beard || look.moustache) && (
          <path d="M27.8 31.6C29.6 30.2 31 30.6 32 31.3C33 30.6 34.4 30.2 36.2 31.6C34.4 32.5 33 32.2 32 31.8C31 32.2 29.6 32.5 27.8 31.6Z" fill={look.hair} />
        )}

        {/* Face: eyes, rosy cheeks and a smile. */}
        <circle cx={face.cx - 4.2} cy={eyeY} r="1.35" fill={INK} />
        <circle cx={face.cx + 4.2} cy={eyeY} r="1.35" fill={INK} />
        <circle cx={face.cx - 6.8} cy={eyeY + 3.6} r="2" fill="#f28b82" opacity="0.4" />
        <circle cx={face.cx + 6.8} cy={eyeY + 3.6} r="2" fill="#f28b82" opacity="0.4" />
        {look.glasses && (
          <g stroke="#374151" strokeWidth="1" fill="none">
            <circle cx={face.cx - 4.2} cy={eyeY} r="3.1" />
            <circle cx={face.cx + 4.2} cy={eyeY} r="3.1" />
            <path d={`M${face.cx - 1.1} ${eyeY}H${face.cx + 1.1}`} />
          </g>
        )}
        <path
          d={`M${face.cx - 3.4} ${eyeY + (look.beard || look.moustache ? 6.6 : 5)}Q${face.cx} ${eyeY + (look.beard || look.moustache ? 9.2 : 7.8)} ${face.cx + 3.4} ${eyeY + (look.beard || look.moustache ? 6.6 : 5)}`}
          stroke={look.beard ? "#f5e6dc" : "#8a4a36"}
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

/** The avatar of the person using the app: their photo (or their Doctor record's), else a drawing. */
export function MyAvatar({ size = 32, className }: { size?: number; className?: string }) {
  const { profile, doctor, displayName } = useSession();
  return (
    <Avatar
      name={displayName}
      gender={profile?.gender || doctor?.gender}
      photo={profile?.user_image || doctor?.photo}
      role={doctor ? "doctor" : undefined}
      size={size}
      className={className}
    />
  );
}
