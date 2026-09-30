"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { reopenPanelAfterLanguageChange } from "./appearancePanelState";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Columns2, Monitor, Moon, PanelLeft, PanelLeftClose, RectangleHorizontal, RotateCcw, Square, SquareDashed, Sun, X,
  type LucideIcon,
} from "lucide-react";
import { Toggle } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import { LANG_NAMES, LANGS } from "@/i18n";
import { DEFAULT_APPEARANCE, saveAppearance, useAppearance } from "@/lib/appearance";
import { cx } from "@/lib/format";

/** A row of choices shown as small cards with an icon; the chosen one has a border in the clinic colour. */
function Choices<K extends string>({
  label,
  options,
  value,
  onChange,
  confirmUnsaved = false,
}: {
  label: string;
  options: Array<{ value: K; label: string; icon?: LucideIcon; lang?: string }>;
  value: K;
  onChange: (value: K) => void;
  /** The choice draws the page again (the language): a form with unsaved changes asks first. */
  confirmUnsaved?: boolean;
}) {
  return (
    <div role="group" aria-label={label}>
      <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
      <div className="grid grid-cols-3 gap-3">
        {options.map((option) => {
          const Icon = option.icon;
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              lang={option.lang}
              aria-pressed={active}
              data-confirm-unsaved={confirmUnsaved || undefined}
              onClick={() => onChange(option.value)}
              className="flex flex-col items-center gap-1.5 text-sm text-gray-700"
            >
              <span
                className={cx(
                  "w-full h-14 rounded-md border flex items-center justify-center transition-colors",
                  active ? "border-2 border-primary-600 text-primary-600" : "border-gray-300 text-gray-600 hover:border-gray-500",
                )}
              >
                {Icon ? <Icon size={24} aria-hidden="true" /> : <span className="text-base font-medium">{option.label.slice(0, 2)}</span>}
              </span>
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-6 py-5 border-b border-gray-200 space-y-5">
      <h3 className="inline-flex rounded bg-primary-100 px-2.5 h-6 items-center text-xs font-medium text-primary-700">{title}</h3>
      {children}
    </section>
  );
}

/**
 * How the app looks on this computer (src/lib/appearance.ts): light, dark or the computer's own setting, the skin,
 * a semi-dark menu, the menu open or collapsed, the page width, and the language. A drawer on the end side.
 */
export default function AppearancePanel({ onClose }: { onClose: () => void }) {
  const { t, lang, setLang } = useI18n();
  const { can } = useSession();
  const appearance = useAppearance();
  const a = t.nav.appearance;
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // The latest onClose, so the effect below runs once and does not move the focus on every choice.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      // Tab stays inside the panel.
      if (event.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input, select, textarea")];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return createPortal(
    // Above the menu (z-50); a question it asks (unsaved changes) comes above it (z-55).
    <div className="fixed inset-0 z-[52] print:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={a.title}
        ref={panelRef}
        className="absolute inset-y-0 end-0 w-[25rem] max-w-full bg-surface shadow-xl flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-medium text-gray-900">{a.title}</h2>
            <p className="text-sm text-gray-500">{a.subtitle}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => saveAppearance(DEFAULT_APPEARANCE)}
              className="w-9 h-9 pointer-coarse:w-11 pointer-coarse:h-11 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100"
              aria-label={a.reset}
              title={a.reset}
            >
              <RotateCcw size={18} />
            </button>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="w-9 h-9 pointer-coarse:w-11 pointer-coarse:h-11 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100"
              aria-label={a.close}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="thin-scroll flex-1 overflow-y-auto">
          <Section title={t.nav.theme}>
            <Choices
              label={a.mode}
              value={appearance.mode}
              onChange={(mode) => saveAppearance({ mode })}
              options={[
                { value: "light", label: t.nav.themeModes.light, icon: Sun },
                { value: "dark", label: t.nav.themeModes.dark, icon: Moon },
                { value: "system", label: t.nav.themeModes.system, icon: Monitor },
              ]}
            />
            <Choices
              label={a.skin}
              value={appearance.skin}
              onChange={(skin) => saveAppearance({ skin })}
              options={[
                { value: "default", label: a.skins.default, icon: Square },
                { value: "bordered", label: a.skins.bordered, icon: SquareDashed },
              ]}
            />
            <Toggle
              checked={appearance.semiDark}
              onChange={(semiDark) => saveAppearance({ semiDark })}
              label={a.semiDark}
              description={a.semiDarkHint}
              disabled={appearance.mode === "dark"}
            />
            <p className="text-xs text-gray-500">
              {can("manage_users") ? (
                <Link href="/settings" onClick={onClose} className="text-primary-600 hover:underline">
                  {a.colourNote}
                </Link>
              ) : (
                a.colourNote
              )}
            </p>
          </Section>

          <Section title={a.menu}>
            <Choices
              label={a.menu}
              value={appearance.collapsed ? "collapsed" : "open"}
              onChange={(value) => saveAppearance({ collapsed: value === "collapsed" })}
              options={[
                { value: "open", label: a.menus.open, icon: PanelLeft },
                { value: "collapsed", label: a.menus.collapsed, icon: PanelLeftClose },
              ]}
            />
            <Choices
              label={a.width}
              value={appearance.width}
              onChange={(width) => saveAppearance({ width })}
              options={[
                { value: "compact", label: a.widths.compact, icon: Columns2 },
                { value: "wide", label: a.widths.wide, icon: RectangleHorizontal },
              ]}
            />
            <Choices
              label={a.language}
              value={lang}
              onChange={(value) => {
                // The whole screen is drawn again in the other language: the panel opens again after it.
                reopenPanelAfterLanguageChange();
                setLang(value);
              }}
              confirmUnsaved
              options={LANGS.map((option) => ({ value: option, label: LANG_NAMES[option], lang: option }))}
            />
          </Section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
