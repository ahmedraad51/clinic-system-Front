"use client";

import { useMemo } from "react";
import { qrMatrix } from "@/lib/qr";

/**
 * A QR code drawn as one SVG path: black on white in every theme and on paper, with the quiet margin scanners
 * need. `label` is what a screen reader hears.
 */
export default function QrCode({ value, size = 96, label, className }: { value: string; size?: number; label: string; className?: string }) {
  const { path, count } = useMemo(() => {
    const matrix = qrMatrix(value);
    const parts: string[] = [];
    matrix.forEach((row, y) =>
      row.forEach((dark, x) => {
        if (dark) parts.push(`M${x + 4} ${y + 4}h1v1h-1z`);
      }),
    );
    return { path: parts.join(""), count: matrix.length };
  }, [value]);
  const box = count + 8;
  return (
    <svg
      role="img"
      aria-label={label}
      data-qr-value={value}
      viewBox={`0 0 ${box} ${box}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={box} height={box} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
