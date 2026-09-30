"use client";

/**
 * The shared building blocks for every screen. Use these instead of writing new
 * Tailwind classes for cards, buttons, inputs, tables and badges, so the app looks
 * the same everywhere. Spacing uses start/end (not left/right) so a right-to-left
 * layout can be added later without rewriting screens.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ButtonHTMLAttributes,
  ComponentType,
  InputHTMLAttributes,
  MouseEvent,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import {
  AlertCircle, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info, Lock, RotateCcw, Search, X,
  type LucideIcon,
} from "lucide-react";
import { label, messages } from "@/i18n";
import { cleanNumberText, cx } from "@/lib/format";
import { toLatinDigits } from "@/lib/phone";

/* ---------------------------------------------------------------- tones -- */

export type Tone = "primary" | "blue" | "green" | "gray" | "red" | "yellow" | "purple";

const BADGE_TONES: Record<Tone, string> = {
  primary: "bg-primary-100 text-primary-800",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  gray: "bg-gray-100 text-gray-700",
  red: "bg-red-100 text-red-700",
  yellow: "bg-yellow-100 text-yellow-700",
  purple: "bg-purple-100 text-purple-700",
};

/**
 * The part of the clinic something belongs to. Each has its own colour (globals.css);
 * a card, tile or chart inside takes it through the bg-sec / text-sec-ink / … classes.
 */
export type Section = "patients" | "appointments" | "treatments" | "money" | "reports" | "system" | "whatsapp";

/** A section, or one of the plain tones. */
export type Hue = Section | Tone;

const HUE_CLASSES: Record<Hue, string> = {
  patients: "sec-patients",
  appointments: "sec-appointments",
  treatments: "sec-treatments",
  money: "sec-money",
  reports: "sec-reports",
  system: "sec-system",
  whatsapp: "sec-whatsapp",
  primary: "sec-brand",
  blue: "sec-blue",
  green: "sec-green",
  gray: "sec-gray",
  red: "sec-red",
  yellow: "sec-yellow",
  purple: "sec-purple",
};

/** The class that gives everything inside the colour of this section or tone. */
export function hueClass(hue?: Hue): string | undefined {
  return hue ? HUE_CLASSES[hue] : undefined;
}

/** Badge colour for every status value. Keep in line with the allowed values in lib/types.ts. */
const STATUS_TONES = {
  appointment: { Scheduled: "blue", Confirmed: "green", Completed: "gray", Cancelled: "red", "No Show": "yellow" },
  treatment: { Planned: "blue", "In Progress": "yellow", Completed: "green", Cancelled: "red" },
  session: { Scheduled: "blue", Completed: "green", Cancelled: "red" },
  method: { Cash: "green", Card: "blue", "Bank Transfer": "purple" },
  whatsapp: { Sent: "green", Failed: "red", Pending: "yellow" },
  trigger: { "24 Hours Before": "blue", "2 Hours Before": "purple", Manual: "gray" },
  user: { Active: "green", Disabled: "red" },
} satisfies Record<string, Record<string, Tone>>;

export type StatusKind = keyof typeof STATUS_TONES;

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
        "ring-1 ring-inset ring-current/15",
        BADGE_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/** The colour of a status value, so other views (like the calendar) match the badges. */
export function statusTone(kind: StatusKind, status?: string | null): Tone {
  const tones: Record<string, Tone> = STATUS_TONES[kind];
  return (status && tones[status]) || "gray";
}

/** Where each kind of status finds its translated labels. */
const STATUS_LABELS: Record<StatusKind, () => Record<string, string>> = {
  appointment: () => messages().enums.appointmentStatus,
  treatment: () => messages().enums.treatmentStatus,
  session: () => messages().enums.sessionStatus,
  method: () => messages().enums.paymentMethod,
  whatsapp: () => messages().enums.whatsappStatus,
  trigger: () => messages().enums.whatsappTrigger,
  user: () => messages().enums.userStatus,
};

/** A status in the current language, e.g. "Scheduled" → "محجوز". */
export function statusLabel(kind: StatusKind, status?: string | null): string {
  return label(STATUS_LABELS[kind](), status);
}

export function StatusBadge({ kind, status }: { kind: StatusKind; status?: string | null }) {
  if (!status) return null;
  return <Badge tone={statusTone(kind, status)}>{statusLabel(kind, status)}</Badge>;
}

/* --------------------------------------------------------------- layout -- */

/**
 * The page's frame. `section` gives everything inside the colour of that part of the clinic (icon tiles, charts,
 * the header's icon), unless a card sets its own.
 */
export function PageContainer({ children, narrow = false, section }: { children: ReactNode; narrow?: boolean; section?: Hue }) {
  return (
    <div className={cx("mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6", narrow ? "max-w-3xl" : "max-w-7xl", hueClass(section))}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  badge,
  avatar,
  icon,
  section,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  badge?: ReactNode;
  /** A picture before the title, e.g. the patient's Avatar. */
  avatar?: ReactNode;
  /** The screen's icon, in a tile of its section's colour before the title (when there is no avatar). */
  icon?: CardIconType;
  section?: Hue;
}) {
  return (
    <div className="space-y-2">
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 pointer-coarse:min-h-11 text-sm text-gray-500 hover:text-gray-800 print:hidden"
        >
          <ArrowLeft size={15} className="rtl:rotate-180" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0 flex items-center gap-4">
          {avatar ?? (icon && <IconTile icon={icon} hue={section} size="lg" className="max-sm:hidden" />)}
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 break-words">{title}</h1>
              {badge}
            </div>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
      </div>
    </div>
  );
}

/** A lucide icon, or one of ours drawn the same way (the tooth). */
type CardIconType = ComponentType<{ size?: number; className?: string }>;

const TILE_SIZES = {
  sm: { box: "w-8 h-8 rounded-lg", icon: 17 },
  md: { box: "w-10 h-10 rounded-xl", icon: 20 },
  lg: { box: "w-12 h-12 rounded-2xl", icon: 24 },
} as const;

/**
 * An icon in a rounded tile with a glowing gradient. The colour is `hue`, or the section of the card around it (the
 * clinic colour by default).
 */
export function IconTile({
  icon: Icon,
  hue,
  size = "md",
  className,
}: {
  icon: CardIconType;
  hue?: Hue;
  size?: keyof typeof TILE_SIZES;
  className?: string;
}) {
  const { box, icon } = TILE_SIZES[size];
  return (
    <span
      aria-hidden="true"
      className={cx(
        hueClass(hue),
        box,
        "shrink-0 inline-flex items-center justify-center print:hidden",
        "bg-linear-to-br from-sec to-sec-deep text-white shadow-sm",
        className,
      )}
    >
      <Icon size={icon} />
    </span>
  );
}

/** The small coloured tile that holds a card's icon, before its title. */
export function CardIcon({ icon }: { icon: CardIconType }) {
  return <IconTile icon={icon} size="sm" />;
}

/** The look of every card: crisp white with a thin border. */
export const CARD_CLASS = "bg-white rounded-2xl border border-gray-200/80 shadow-sm";

export function Card({
  title,
  icon,
  actions,
  children,
  className,
  flush = false,
  section,
}: {
  title?: ReactNode;
  /** Shown in a small tinted square before the title, so a long page is easy to scan. */
  icon?: CardIconType;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** No padding around the body. Use for tables. */
  flush?: boolean;
  /** The part of the clinic the card is about: colours its icon, charts and top edge. */
  section?: Hue;
}) {
  const hasHeader = Boolean(title || actions);
  return (
    <section className={cx(CARD_CLASS, hueClass(section), section && "border-t-[3px] border-t-sec", className)}>
      {hasHeader && (
        <div className={cx("flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 sm:px-6 pt-5", flush && "pb-4")}>
          {title ? (
            <div className="flex items-center gap-2.5 min-w-0">
              {icon && <CardIcon icon={icon} />}
              <h2 className="text-base font-semibold text-gray-800">{title}</h2>
            </div>
          ) : (
            <span />
          )}
          {actions && <div className="flex items-center gap-2 print:hidden">{actions}</div>}
        </div>
      )}
      <div className={cx(!flush && "px-5 sm:px-6 pb-5 sm:pb-6", !flush && (hasHeader ? "pt-4" : "pt-5 sm:pt-6"))}>
        {children}
      </div>
    </section>
  );
}

export function StatCard({
  title,
  value,
  icon: Icon,
  tone = "primary",
  section,
  hint,
  href,
  order = 0,
}: {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  /** Defaults to the clinic colour. */
  tone?: Tone;
  /** The part of the clinic the number is about; its colour wins over `tone`. */
  section?: Hue;
  hint?: ReactNode;
  href?: string;
  /** Position in a row of cards: each one rises into place a moment after the one before. */
  order?: number;
}) {
  const body = (
    <>
      {/* A coloured edge along the bottom. */}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-linear-to-r from-sec to-sec-light" />
      <div className="relative w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-linear-to-br from-sec to-sec-deep text-white shadow-sm">
        <Icon size={20} />
      </div>
      {/* Wraps instead of cutting off: "IQD 1,250,000" does not fit a phone's half-width card on one line. The
          currency format joins "IQD" and the number with a no-break space; a plain one lets it wrap there. */}
      <div className="relative text-xl sm:text-2xl font-bold text-gray-800 leading-tight break-words">
        {typeof value === "string" ? value.replace(/ /g, " ") : value}
      </div>
      <div className="relative text-sm text-gray-500 mt-1">{title}</div>
      {hint && <div className="relative text-xs text-gray-500 mt-1">{hint}</div>}
    </>
  );
  const className = cx(
    hueClass(section ?? tone),
    "relative overflow-hidden block rounded-2xl p-5 motion-safe:animate-rise",
    "bg-white border border-gray-200/80 shadow-sm",
  );
  const style = { animationDelay: `${order * 70}ms` };
  return href ? (
    <Link href={href} style={style} className={cx(className, "hover:shadow-md motion-safe:hover:-translate-y-px transition")}>
      {body}
    </Link>
  ) : (
    <div style={style} className={className}>
      {body}
    </div>
  );
}

/**
 * A large tile for an everyday job ("New Appointment · Book a visit"): a gradient in the colour of its section,
 * with white text. Put a few of them in a grid near the top of a page, so the job is one tap away.
 */
export function ActionTile({
  href,
  label,
  hint,
  icon: Icon,
  section,
  order = 0,
}: {
  href: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  /** The part of the clinic the job belongs to (its colour). The clinic colour when left out. */
  section?: Hue;
  order?: number;
}) {
  return (
    <Link
      href={href}
      style={{ animationDelay: `${order * 60}ms` }}
      className={cx(
        hueClass(section),
        "group flex items-center gap-3 min-h-[4.5rem] rounded-2xl border p-3 sm:p-4 transition motion-safe:animate-rise motion-safe:hover:-translate-y-px",
        "bg-linear-to-br from-sec to-sec-deep border-transparent shadow-md hover:shadow-lg",
      )}
    >
      <span
        className={cx(
          "w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl flex items-center justify-center bg-white/20 text-white",
        )}
      >
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white leading-snug">{label}</span>
        {/* Two tiles share a phone's width: the hint would squeeze the label, so it shows from sm up. */}
        {hint && <span className="block text-xs text-white/90 leading-snug max-sm:hidden">{hint}</span>}
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------- buttons -- */

type Variant = "primary" | "secondary" | "danger" | "ghost" | "success";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-linear-to-br from-primary-600 to-primary-800 text-white hover:to-primary-900 shadow-md shadow-primary-600/25",
  secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  ghost: "text-gray-600 hover:bg-gray-100",
  success: "bg-green-600 text-white hover:bg-green-700 shadow-sm",
};

const SIZES: Record<Size, string> = {
  // Small buttons grow to 44 px on touch screens, so they are easy to hit with a finger.
  sm: "min-h-9 pointer-coarse:min-h-11 px-3 py-1.5 text-xs gap-1.5",
  md: "min-h-11 px-4 py-2 text-sm gap-2",
};

const buttonClass = (variant: Variant, size: Size, className?: string) =>
  cx(
    "inline-flex items-center justify-center rounded-xl font-medium transition whitespace-nowrap",
    // Felt at once on a touch screen: the button gives a little while pressed.
    "motion-safe:active:scale-[0.98] disabled:active:scale-100",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1",
    VARIANTS[variant],
    SIZES[size],
    className,
  );

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("inline-block animate-spin rounded-full border-2 border-current border-t-transparent", className)}
      style={{ width: size, height: size }}
    />
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
}

/** Icons that point sideways: on a button they turn round in a right-to-left page, like the reading direction. */
const SIDEWAYS_ICONS = new Set<LucideIcon>([ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight]);
const iconClass = (Icon: LucideIcon) => (SIDEWAYS_ICONS.has(Icon) ? "rtl:rotate-180" : undefined);

export function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const iconSize = size === "sm" ? 14 : 16;
  return (
    <button type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
      {loading ? <Spinner size={iconSize} /> : Icon ? <Icon size={iconSize} className={iconClass(Icon)} /> : null}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  icon: Icon,
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {Icon && <Icon size={size === "sm" ? 14 : 16} className={iconClass(Icon)} />}
      {children}
    </Link>
  );
}

/* --------------------------------------------------------------- inputs -- */

export const inputClass =
  "w-full min-h-11 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm max-sm:text-base text-gray-800 placeholder:text-gray-500 " +
  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 " +
  // A field that failed its check (the form sets aria-invalid, and passes the message to Field's `error`).
  "aria-invalid:border-red-400 aria-invalid:focus:ring-red-400";

/**
 * A label above one input. The input goes inside as children, so clicking the label focuses it. The label takes
 * the clinic colour while its input has focus. `error` shows the reason a check failed right under the field;
 * give the input `aria-invalid` too, and move to it with `focusField()`.
 */
export function Field({
  label,
  required = false,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block group/field", className)}>
      <span
        className={cx(
          "block text-sm font-medium mb-1.5 transition-colors",
          error ? "text-red-700" : "text-gray-700 group-focus-within/field:text-primary-700",
        )}
      >
        {label}
        {required && <span className="text-red-500 ms-0.5">*</span>}
      </span>
      {children}
      {error && (
        <span role="alert" className="flex items-start gap-1.5 text-xs font-medium text-red-700 mt-1.5">
          <AlertCircle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
          {error}
        </span>
      )}
      {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    </label>
  );
}

/**
 * Moves to a form field that failed its check: focuses it and scrolls it to the middle of the screen, clear of
 * the sticky Save bar at the bottom.
 */
export function focusField(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);
  if (!(field instanceof HTMLElement)) return;
  field.focus({ preventScroll: true });
  field.scrollIntoView({ block: "center", behavior: "smooth" });
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(inputClass, className)} {...rest} />;
}

/**
 * Rewrites a text box's value with `clean` and puts the caret back where it was (setting .value moves it to the
 * end, so a digit typed in the middle would otherwise send the next one to the end).
 */
function replaceKeepingCaret(input: HTMLInputElement, clean: (text: string) => string) {
  const value = input.value;
  const cleaned = clean(value);
  if (cleaned === value) return;
  const caret = input.selectionStart;
  input.value = cleaned;
  if (caret !== null && document.activeElement === input) {
    const position = Math.min(clean(value.slice(0, caret)).length, cleaned.length);
    input.setSelectionRange(position, position);
  }
}

/**
 * A box for amounts, prices and ages. Digits typed on an Arabic keyboard become 0-9 and anything that is not
 * part of a number is dropped while typing (cleanNumberText), so onChange always gets a plain number as text.
 * It is a text box, not type="number", which would quietly empty itself on Arabic digits, and it checks no
 * min or max: forms check limits when saving. `decimals={false}` for whole numbers and whole-dinar amounts
 * (`currencyDecimals(currency) > 0`).
 */
export function NumberInput({
  className,
  decimals = true,
  onChange,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode"> & { decimals?: boolean }) {
  return (
    <input
      {...rest}
      type="text"
      inputMode={decimals ? "decimal" : "numeric"}
      dir="ltr"
      autoComplete="off"
      className={cx(inputClass, className)}
      onChange={(event) => {
        replaceKeepingCaret(event.target, (text) => cleanNumberText(text, decimals));
        onChange?.(event);
      }}
    />
  );
}

/** A phone number box: Arabic-keyboard digits become 0-9 while typing; spaces and + stay as typed. */
export function PhoneInput({ className, onChange, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <input
      {...rest}
      type="tel"
      dir="ltr"
      className={cx(inputClass, className)}
      onChange={(event) => {
        replaceKeepingCaret(event.target, toLatinDigits);
        onChange?.(event);
      }}
    />
  );
}

export function SelectInput({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(inputClass, className)} {...rest}>
      {children}
    </select>
  );
}

export function TextArea({
  className,
  rows = 3,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return <textarea rows={rows} className={cx(inputClass, className)} {...rest} />;
}

/** An on/off switch with a label, for 0/1 fields. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 text-start w-full disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className={cx("relative inline-flex h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-primary-600" : "bg-gray-200")}>
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "start-[22px]" : "start-0.5",
          )}
        />
      </span>
      <span>
        <span className="block text-sm font-medium text-gray-800">{label}</span>
        {description && <span className="block text-xs text-gray-500 mt-0.5">{description}</span>}
      </span>
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative flex-1 min-w-0 sm:min-w-[240px]">
      <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cx(inputClass, "ps-10 pe-11 [&::-webkit-search-cancel-button]:appearance-none")}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={messages().ui.clearSearch}
          className="absolute end-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

/** A small row of joined buttons to switch between views, e.g. Day / Week / List. */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: K; label: string; icon?: LucideIcon }>;
  value: K;
  onChange: (value: K) => void;
  /** Read out by screen readers, e.g. "View". */
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap max-w-full rounded-xl bg-gray-200/70 p-1 gap-1">
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cx(
              "inline-flex items-center justify-center gap-1.5 min-h-9 pointer-coarse:min-h-11 px-2.5 sm:px-3.5 rounded-lg text-sm font-medium transition",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
              active ? "bg-white text-primary-700 shadow-sm" : "text-gray-600 hover:text-gray-900",
            )}
          >
            {Icon && <Icon size={15} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The Save / Cancel row at the end of a form. It sticks to the bottom of the screen while the form is taller
 * than the screen, so Save is always one tap away on a phone or tablet. Use it inside PageContainer.
 */
export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-[color-mix(in_oklab,var(--page-bg)_95%,transparent)] border-t border-gray-200 flex flex-wrap items-center gap-3 print:hidden">
      {children}
    </div>
  );
}

/** The row of search box and filters above a list. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">{children}</div>;
}

/* --------------------------------------------------------------- tables -- */

/**
 * A data table. On phones (below the sm breakpoint) every row becomes a small card: the header row is
 * hidden and each cell with a `label` shows it beside its value. Give every Td except the first (the
 * row's name or date, which leads the card) and action cells a label, the same text as its Th.
 */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cx(
          "w-full text-sm",
          "max-sm:block max-sm:[&>thead]:hidden max-sm:[&>tbody]:block",
          "max-sm:[&>tbody>tr]:block max-sm:[&>tbody>tr]:px-4 max-sm:[&>tbody>tr]:py-3 max-sm:[&>tbody>tr]:border-b max-sm:[&>tbody>tr]:border-gray-100",
        )}
      >
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cx(
        // text-start unless the column is right-aligned (text-end), so numbers line up under their header.
        className?.includes("text-end") ? "" : "text-start",
        "px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 border-b border-gray-100 whitespace-nowrap",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, label }: { children?: ReactNode; className?: string; label?: string }) {
  return (
    <td
      data-label={label}
      className={cx(
        "px-5 py-3.5 text-gray-600 border-b border-gray-50 align-middle",
        // Phone card layout (see Table).
        "max-sm:flex max-sm:items-center max-sm:gap-4 max-sm:px-0 max-sm:py-1 max-sm:border-0 max-sm:max-w-none",
        label
          ? "max-sm:justify-between max-sm:text-end max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-gray-500 max-sm:before:text-start max-sm:before:shrink-0"
          : "max-sm:justify-start max-sm:text-start",
        // An empty spacer cell is not worth a line on a phone card.
        (children === undefined || children === null) && "max-sm:hidden",
        className,
      )}
    >
      {label ? <span className="min-w-0">{children}</span> : children}
    </td>
  );
}

/** A table row that opens a record when clicked. Links and buttons inside it keep working on their own. */
export function ClickableRow({ href, children, dimmed = false }: { href: string; children: ReactNode; dimmed?: boolean }) {
  const router = useRouter();
  const onClick = (event: MouseEvent<HTMLTableRowElement>) => {
    if ((event.target as HTMLElement).closest("a,button,input,select,textarea")) return;
    router.push(href);
  };
  return (
    <tr onClick={onClick} className={cx("cursor-pointer hover:bg-gray-50 transition-colors", dimmed && "opacity-60")}>
      {children}
    </tr>
  );
}

/** Grey placeholder rows while a list loads, so the page keeps its shape. Screen readers hear "Loading...". */
export function TableLoading({ colSpan, rows = 5 }: { colSpan: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} aria-hidden={row > 0 ? true : undefined}>
          <td colSpan={colSpan} className="px-5 py-4 border-b border-gray-50 max-sm:block">
            {row === 0 && <span className="sr-only" role="status">{messages().ui.loading}</span>}
            <div className="flex items-center gap-6 animate-pulse">
              <div className="h-4 w-1/4 rounded bg-gray-100" />
              <div className="h-4 w-1/6 rounded bg-gray-100 max-sm:hidden" />
              <div className="h-4 w-1/5 rounded bg-gray-100" />
              <div className="h-4 w-1/6 rounded bg-gray-100 max-sm:hidden" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

/**
 * A failed load inside a table, with its reason and a Try Again button. Show it instead of the rows and
 * instead of the empty message: a list that could not load must never read as "No patients yet".
 */
export function TableError({ colSpan, message, onRetry }: { colSpan: number; message: string; onRetry: () => void }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-sm max-sm:block">
        <div role="alert" className="flex flex-col items-center gap-3 text-red-700">
          <AlertCircle size={22} aria-hidden="true" />
          <p>{message}</p>
          <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry}>
            {messages().ui.tryAgain}
          </Button>
        </div>
      </td>
    </tr>
  );
}

/** Under a "no match" message: empties the search box and the filters. */
export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="secondary" size="sm" icon={X} onClick={onClick} className="mt-3">
      {messages().ui.clearFilters}
    </Button>
  );
}

/** A message across the whole table, e.g. "Loading...". With an icon it is a friendly empty state. */
export function TableMessage({ colSpan, children, icon }: { colSpan: number; children: ReactNode; icon?: LucideIcon }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-12 text-center text-sm text-gray-500 max-sm:block">
        {icon ? (
          <div className="flex flex-col items-center">
            <EmptyDrawing icon={icon} />
            {children}
          </div>
        ) : (
          children
        )}
      </td>
    </tr>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (total === 0) return null;
  if (total <= pageSize) {
    return <p className="px-5 py-3 text-xs text-gray-500">{messages().ui.records(total)}</p>;
  }
  const pages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const arrow =
    "inline-flex items-center justify-center w-9 h-9 pointer-coarse:w-11 pointer-coarse:h-11 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-gray-500">
      <span>{messages().ui.range(from, to, total)}</span>
      <div className="flex items-center gap-1">
        <button type="button" className={arrow} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={messages().ui.previousPage}>
          <ChevronLeft size={16} className="rtl:rotate-180" />
        </button>
        <span className="px-2 whitespace-nowrap">{messages().ui.pageOf(page, pages)}</span>
        <button type="button" className={arrow} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label={messages().ui.nextPage}>
          <ChevronRight size={16} className="rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------- details and state -- */

/** One label and value on a detail page. Empty values show a dash. */
export function DetailRow({ label, children }: { label: string; children?: ReactNode }) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div className="grid grid-cols-1 @xs:grid-cols-3 gap-1 @xs:gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <dt className="text-sm text-gray-500 break-words">{label}</dt>
      <dd className="@xs:col-span-2 min-w-0 text-sm text-gray-800 whitespace-pre-line break-words">
        {/* Typed text keeps its own direction (<bdi>): an English note on an Arabic screen ends with its full stop. */}
        {empty ? <span className="text-gray-300">—</span> : typeof children === "string" ? <bdi>{children}</bdi> : children}
      </dd>
    </div>
  );
}

export function DetailList({ children }: { children: ReactNode }) {
  // Label beside the value when the card is wide enough, above it in a narrow card.
  return <dl className="@container">{children}</dl>;
}

export function Tabs<K extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ key: K; label: string; count?: number }>;
  active: K;
  onChange: (key: K) => void;
}) {
  return (
    <div
      className={cx(
        // A white bar of pill tabs.
        "overflow-x-auto print:hidden border border-gray-200/80 bg-white rounded-2xl p-1.5 shadow-sm",
      )}
    >
      <div className="flex gap-1 min-w-max" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => onChange(tab.key)}
            className={cx(
              "min-h-11 px-4 py-2 text-sm font-medium rounded-xl transition whitespace-nowrap",
              active === tab.key ? "bg-primary-600 text-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ms-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{tab.count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Alert({
  tone = "blue",
  title,
  children,
}: {
  tone?: "blue" | "red" | "yellow";
  title?: string;
  children: ReactNode;
}) {
  const styles = {
    // Information uses the clinic colour.
    blue: "bg-primary-50 border-primary-100 text-primary-800",
    red: "bg-red-50 border-red-100 text-red-800",
    yellow: "bg-yellow-50 border-yellow-100 text-yellow-800",
  }[tone];
  const Icon = tone === "blue" ? Info : AlertCircle;
  return (
    <div role={tone === "red" ? "alert" : undefined} className={cx("flex gap-3 rounded-xl border px-4 py-3 text-sm", styles)}>
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}

/** A part of a page that could not load: the reason and a Try Again button, instead of zeros or blanks. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert tone="red">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>{message}</span>
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry}>
          {messages().ui.tryAgain}
        </Button>
      </div>
    </Alert>
  );
}

/** A thin bar that fills up, for an upload or how much of a plan is paid. `value` is 0 to 100. */
export function ProgressBar({
  value,
  label,
  showLabel = true,
  tone = "primary",
}: {
  value: number;
  /** Read by screen readers, and shown above the bar with the percentage unless showLabel is false. */
  label: string;
  showLabel?: boolean;
  tone?: "primary" | "green";
}) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      {showLabel && (
        <div className="flex items-baseline justify-between gap-3 mb-1.5 text-xs text-gray-600">
          <span className="truncate">{label}</span>
          <span className="shrink-0 tabular-nums font-medium">{percent}%</span>
        </div>
      )}
      <div
        className="w-full h-2 rounded-full bg-gray-100 overflow-hidden"
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cx("h-full rounded-full transition-[width] duration-200", tone === "green" ? "bg-green-500" : "bg-primary-600")}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function PageLoading({ label: text = messages().ui.loading }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-gray-500" role="status">
      <Spinner size={20} />
      <span className="text-sm">{text}</span>
    </div>
  );
}

/** A grey card of the skeleton below: a title with its icon square, then a few lines. */
function SkeletonCard({ lines }: { lines: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gray-100" />
        <div className="h-4 w-32 rounded bg-gray-200/70" />
      </div>
      {Array.from({ length: lines }, (_, line) => (
        <div key={line} className="flex gap-6">
          <div className="h-3.5 w-1/4 rounded bg-gray-100" />
          <div className={cx("h-3.5 rounded bg-gray-100", line % 2 ? "w-2/5" : "w-1/2")} />
        </div>
      ))}
    </div>
  );
}

/**
 * The loading state of a record page (a patient, appointment, treatment plan or payment): a grey outline of the
 * page (title, summary card, two cards) that gently pulses, so the page keeps its shape and does not jump when
 * the record arrives. Screen readers and `waitForData()` read its hidden "Loading...".
 */
export function RecordLoading() {
  return (
    <PageContainer>
      <div role="status" className="space-y-6">
        <span className="sr-only">{messages().ui.loading}</span>
        <div aria-hidden="true" className="space-y-6 animate-pulse motion-reduce:animate-none">
          <div className="space-y-3">
            <div className="h-3.5 w-24 rounded bg-gray-100" />
            <div className="h-7 w-64 max-w-full rounded-lg bg-gray-200/70" />
            <div className="h-3.5 w-44 rounded bg-gray-100" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-5">
            {Array.from({ length: 4 }, (_, box) => (
              <div key={box} className={cx("space-y-2", box > 1 && "max-sm:hidden")}>
                <div className="h-3 w-16 rounded bg-gray-100" />
                <div className="h-5 w-28 max-w-full rounded bg-gray-200/70" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard lines={5} />
            <div className="max-lg:hidden">
              <SkeletonCard lines={3} />
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

/** A small, calm drawing for empty lists: a soft disc with sparkles and the icon on a card. */
function EmptyDrawing({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="relative w-32 h-28 mb-4" aria-hidden="true">
      <svg viewBox="0 0 128 112" className="absolute inset-0 w-full h-full">
        <ellipse cx="64" cy="102" rx="36" ry="5" className="fill-gray-200/70" />
        <circle cx="64" cy="52" r="42" className="fill-primary-50" />
        <circle cx="64" cy="52" r="30" className="fill-primary-100/60" />
        <circle cx="16" cy="26" r="4" className="fill-primary-200" />
        <circle cx="114" cy="72" r="3" className="fill-primary-200" />
        <circle cx="24" cy="84" r="2.5" className="fill-gray-200" />
        <path d="M108 14v10M103 19h10" strokeWidth="2.5" strokeLinecap="round" className="stroke-primary-300" />
        <path d="M14 56v6M11 59h6" strokeWidth="2" strokeLinecap="round" className="stroke-gray-300" />
      </svg>
      <span className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl bg-white shadow-sm border border-primary-100 text-primary-600 flex items-center justify-center">
        <Icon size={26} strokeWidth={1.75} />
      </span>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <EmptyDrawing icon={Icon} />
      <p className="font-semibold text-gray-700">{title}</p>
      {text && <p className="text-sm text-gray-500 mt-1 max-w-sm">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Shown instead of a page when the user lacks the permission for it. */
export function NoAccess() {
  return (
    <PageContainer narrow>
      <Card>
        <EmptyState
          icon={Lock}
          title={messages().ui.noAccessTitle}
          text={messages().ui.noAccessText}
          action={<LinkButton href="/dashboard" variant="secondary">{messages().ui.goToDashboard}</LinkButton>}
        />
      </Card>
    </PageContainer>
  );
}

/** Shown when a record does not exist, e.g. an old link. */
export function NotFoundCard({
  what,
  backHref,
  backLabel,
  error,
}: {
  what: string;
  backHref: string;
  backLabel: string;
  /** Why the load failed, when it was not simply a missing record (e.g. no permission). */
  error?: string;
}) {
  return (
    <PageContainer narrow>
      <Card>
        <EmptyState
          icon={error ? AlertCircle : Search}
          title={error ? messages().ui.couldNotOpen(what) : messages().ui.notFound(what)}
          text={error || messages().ui.notFoundText}
          action={<LinkButton href={backHref} variant="secondary">{backLabel}</LinkButton>}
        />
      </Card>
    </PageContainer>
  );
}
