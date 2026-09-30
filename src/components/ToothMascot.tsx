import { cx } from "@/lib/format";

/**
 * A smiling tooth with sparkles, for the dashboard's welcome banner. The same outline as the tooth logo, filled
 * white, with a face. Decoration only.
 */
export default function ToothMascot({ size = 120, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={cx("overflow-visible", className)} aria-hidden="true">
      {/* A soft shadow on the ground. */}
      <ellipse cx="16" cy="30.2" rx="7.5" ry="1.1" fill="currentColor" opacity="0.18" />
      <g transform="translate(4 3.4)">
        <path
          d="M7.4 3.2C5 3.2 3.4 5.1 3.4 7.7c0 2 .7 3.5 1.3 4.9.6 1.5.9 3.2 1.2 5.3.3 2.2.9 3.4 2 3.4 1.3 0 1.6-1.6 2-3.5.3-1.4.8-2.6 2.1-2.6s1.8 1.2 2.1 2.6c.4 1.9.7 3.5 2 3.5 1.1 0 1.7-1.2 2-3.4.3-2.1.6-3.8 1.2-5.3.6-1.4 1.3-2.9 1.3-4.9 0-2.6-1.6-4.5-4-4.5-1.9 0-3 1.1-4.6 1.1S9.3 3.2 7.4 3.2z"
          fill="#ffffff"
          stroke="currentColor"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
        {/* Shine */}
        <path d="M6 6.2c.5-1.1 1.4-1.6 2.4-1.5" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.35" />
        {/* Face */}
        <circle cx="9.6" cy="9.6" r="0.75" fill="#1f2937" />
        <circle cx="14.4" cy="9.6" r="0.75" fill="#1f2937" />
        <circle cx="8.2" cy="11.4" r="0.9" fill="#fb7185" opacity="0.45" />
        <circle cx="15.8" cy="11.4" r="0.9" fill="#fb7185" opacity="0.45" />
        <path d="M10.4 11.6q1.6 1.4 3.2 0" stroke="#1f2937" strokeWidth="0.6" strokeLinecap="round" fill="none" />
      </g>
      {/* Sparkles */}
      <path d="M27 5.5v3M25.5 7h3" stroke="#fbbf24" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M4 11v2.2M2.9 12.1h2.2" stroke="#fbbf24" strokeWidth="0.7" strokeLinecap="round" />
      <circle cx="27.5" cy="14" r="0.7" fill="#fbbf24" />
    </svg>
  );
}
