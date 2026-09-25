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
  InputHTMLAttributes,
  MouseEvent,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Info, Lock, Search, X, type LucideIcon } from "lucide-react";
import { cx } from "@/lib/format";

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

const ICON_TONES: Record<Tone, string> = {
  primary: "bg-primary-50 text-primary-600",
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  gray: "bg-gray-100 text-gray-600",
  red: "bg-red-50 text-red-600",
  yellow: "bg-yellow-50 text-yellow-600",
  purple: "bg-purple-50 text-purple-600",
};

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
    <span className={cx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap", BADGE_TONES[tone])}>
      {children}
    </span>
  );
}

/** The colour of a status value, so other views (like the calendar) match the badges. */
export function statusTone(kind: StatusKind, status?: string | null): Tone {
  const tones: Record<string, Tone> = STATUS_TONES[kind];
  return (status && tones[status]) || "gray";
}

export function StatusBadge({ kind, status }: { kind: StatusKind; status?: string | null }) {
  if (!status) return null;
  return <Badge tone={statusTone(kind, status)}>{status}</Badge>;
}

/* --------------------------------------------------------------- layout -- */

export function PageContainer({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className={cx("mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6", narrow ? "max-w-3xl" : "max-w-7xl")}>
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
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 print:hidden"
        >
          <ArrowLeft size={15} className="rtl:rotate-180" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-800 break-words">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({
  title,
  actions,
  children,
  className,
  flush = false,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** No padding around the body. Use for tables. */
  flush?: boolean;
}) {
  const hasHeader = Boolean(title || actions);
  return (
    <section className={cx("bg-white rounded-2xl border border-gray-100 shadow-sm", className)}>
      {hasHeader && (
        <div className={cx("flex items-center justify-between gap-3 px-5 sm:px-6 pt-5", flush && "pb-4")}>
          {title ? <h2 className="text-base font-semibold text-gray-800">{title}</h2> : <span />}
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
  hint,
  href,
}: {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  /** Defaults to the clinic colour. */
  tone?: Tone;
  hint?: ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <div className={cx("w-10 h-10 rounded-xl flex items-center justify-center mb-3", ICON_TONES[tone])}>
        <Icon size={20} />
      </div>
      <div className="text-2xl font-bold text-gray-800 truncate">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{title}</div>
      {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
    </>
  );
  const className = "block bg-white rounded-2xl border border-gray-100 shadow-sm p-5";
  return href ? (
    <Link href={href} className={cx(className, "hover:shadow-md hover:border-primary-100 transition")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/* -------------------------------------------------------------- buttons -- */

type Variant = "primary" | "secondary" | "danger" | "ghost" | "success";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-sm",
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
      {loading ? <Spinner size={iconSize} /> : Icon ? <Icon size={iconSize} /> : null}
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
      {Icon && <Icon size={size === "sm" ? 14 : 16} />}
      {children}
    </Link>
  );
}

/* --------------------------------------------------------------- inputs -- */

export const inputClass =
  "w-full min-h-11 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 " +
  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500";

/** A label above one input. The input goes inside as children, so clicking the label focuses it. */
export function Field({
  label,
  required = false,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ms-0.5">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-gray-400 mt-1">{hint}</span>}
    </label>
  );
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(inputClass, className)} {...rest} />;
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
      <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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
          aria-label="Clear search"
          className="absolute end-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
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
    <div role="group" aria-label={label} className="inline-flex rounded-xl bg-gray-100 p-1 gap-1">
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
              "inline-flex items-center justify-center gap-1.5 min-h-9 pointer-coarse:min-h-11 px-3.5 rounded-lg text-sm font-medium transition",
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

/** The row of search box and filters above a list. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">{children}</div>;
}

/* --------------------------------------------------------------- tables -- */

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cx(
        "text-start px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 border-b border-gray-100 whitespace-nowrap",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx("px-5 py-3.5 text-gray-600 border-b border-gray-50 align-middle", className)}>{children}</td>;
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

/** A message across the whole table, e.g. "Loading...". With an icon it is a friendly empty state. */
export function TableMessage({ colSpan, children, icon }: { colSpan: number; children: ReactNode; icon?: LucideIcon }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-12 text-center text-sm text-gray-500">
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
    return <p className="px-5 py-3 text-xs text-gray-400">{total === 1 ? "1 record" : `${total} records`}</p>;
  }
  const pages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const arrow =
    "inline-flex items-center justify-center w-9 h-9 pointer-coarse:w-11 pointer-coarse:h-11 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-gray-500">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" className={arrow} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft size={16} className="rtl:rotate-180" />
        </button>
        <span className="px-2 whitespace-nowrap">
          Page {page} of {pages}
        </span>
        <button type="button" className={arrow} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="sm:col-span-2 text-sm text-gray-800 whitespace-pre-line break-words">
        {empty ? <span className="text-gray-300">—</span> : children}
      </dd>
    </div>
  );
}

export function DetailList({ children }: { children: ReactNode }) {
  return <dl>{children}</dl>;
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
    <div className="border-b border-gray-200 overflow-x-auto print:hidden">
      <div className="flex gap-1 min-w-max" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => onChange(tab.key)}
            className={cx(
              "min-h-11 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap",
              active === tab.key
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-800",
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

export function PageLoading({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-gray-400" role="status">
      <Spinner size={20} />
      <span className="text-sm">{label}</span>
    </div>
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
      {text && <p className="text-sm text-gray-400 mt-1 max-w-sm">{text}</p>}
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
          title="You do not have access to this page"
          text="Ask a clinic manager to turn on the permission for you under Users."
          action={<LinkButton href="/dashboard" variant="secondary">Go to Dashboard</LinkButton>}
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
          title={error ? `Could not open this ${what.toLowerCase()}` : `${what} not found`}
          text={error || "It may have been deleted, or the link is wrong."}
          action={<LinkButton href={backHref} variant="secondary">{backLabel}</LinkButton>}
        />
      </Card>
    </PageContainer>
  );
}
