/** The DentClinic mark: a simple molar outline, drawn like the lucide icons used everywhere else. */
export default function ToothLogo({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7.4 3.2C5 3.2 3.4 5.1 3.4 7.7c0 2 .7 3.5 1.3 4.9.6 1.5.9 3.2 1.2 5.3.3 2.2.9 3.4 2 3.4 1.3 0 1.6-1.6 2-3.5.3-1.4.8-2.6 2.1-2.6s1.8 1.2 2.1 2.6c.4 1.9.7 3.5 2 3.5 1.1 0 1.7-1.2 2-3.4.3-2.1.6-3.8 1.2-5.3.6-1.4 1.3-2.9 1.3-4.9 0-2.6-1.6-4.5-4-4.5-1.9 0-3 1.1-4.6 1.1S9.3 3.2 7.4 3.2z" />
      <path d="M9 7.2c.9.5 1.9.7 3 .7" opacity={0.55} />
    </svg>
  );
}
