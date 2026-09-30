"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing, CalendarDays, CalendarPlus, ClipboardCheck, CreditCard, Search, Stethoscope, User, UserPlus, type LucideIcon,
} from "lucide-react";
import { Spinner } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";
import { useSession } from "@/context/SessionContext";
import type { Messages } from "@/i18n";
import { getList } from "@/lib/frappe";
import { cx } from "@/lib/format";
import { searchFilters, useDebounced } from "@/lib/hooks";
import { patientHref } from "@/lib/links";
import type { Patient, PermissionKey } from "@/lib/types";

/**
 * Search from any page: the button in the top bar, or Ctrl+K (⌘K on a Mac).
 * Finds patients by name, phone or ID, and offers the everyday actions. Arrow keys move, Enter opens.
 */

interface Action {
  /** Its label, hint and search words in the translation files (nav.search.actions). */
  key: keyof Messages["nav"]["search"]["actions"];
  href: string;
  icon: LucideIcon;
  permission?: PermissionKey;
}

const ACTIONS: Action[] = [
  { key: "newAppointment", href: "/appointments/new", icon: CalendarPlus, permission: "add_appointments" },
  { key: "addPatient", href: "/patients/new", icon: UserPlus, permission: "add_patients" },
  { key: "today", href: "/today", icon: ClipboardCheck, permission: "view_appointments" },
  { key: "calendar", href: "/appointments?view=day", icon: CalendarDays, permission: "view_appointments" },
  { key: "newTreatment", href: "/treatments/new", icon: Stethoscope, permission: "add_treatments" },
  { key: "recall", href: "/recall", icon: BellRing, permission: "view_appointments" },
  { key: "payment", href: "/payments/new", icon: CreditCard, permission: "add_payments" },
];

interface Result {
  kind: "patient" | "action";
  key: string;
  label: string;
  /** Parts of the second line (phone, age, ID), each shown with its own direction. */
  hint: string[];
  href: string;
  icon: LucideIcon;
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  // Ctrl+K / ⌘K from anywhere.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.nav.search.button}
        aria-keyshortcuts="Control+K"
        className={cx(
          "flex items-center gap-2 h-11 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 transition",
          "w-11 justify-center sm:w-72 sm:justify-start sm:px-3.5",
        )}
      >
        <Search size={18} className="shrink-0" />
        <span className="hidden sm:inline text-sm">{t.nav.search.short}</span>
        <kbd className="hidden sm:inline ms-auto rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-xs font-sans text-gray-500">
          {t.nav.search.shortcut}
        </kbd>
      </button>
      {open && <SearchDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { can } = useSession();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [found, setFound] = useState<{ query: string; patients: Patient[] } | null>(null);
  const debounced = useDebounced(query.trim(), 200);
  const canSearch = can("view_patients");
  const { t } = useI18n();
  const s = t.nav.search;

  useEffect(() => {
    if (!debounced || !canSearch) return;
    let cancelled = false;
    const load = async () => {
      const orFilters = searchFilters(debounced, ["full_name", "phone_number", "secondary_phone", "name"]);
      try {
        const patients = await getList<Patient>("Patient", ["name", "full_name", "phone_number", "age"], {
          orFilters,
          orderBy: "full_name asc",
          limit: 8,
        });
        if (!cancelled) setFound({ query: debounced, patients });
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [debounced, canSearch]);

  const needle = query.trim().toLowerCase();
  const patients = needle && found?.query === debounced ? found.patients : [];
  const searching = Boolean(needle && canSearch && (found?.query !== debounced || debounced !== query.trim()));
  const actions = ACTIONS.filter((a) => !a.permission || can(a.permission))
    .map((a) => ({ ...a, ...s.actions[a.key] }))
    .filter((a) => !needle || `${a.label} ${a.hint} ${a.words}`.toLowerCase().includes(needle));
  const results: Result[] = [
    ...patients.map((p) => ({
      kind: "patient" as const,
      key: p.name,
      label: p.full_name,
      hint: [p.phone_number, p.age ? t.common.years(p.age) : "", p.name].filter(Boolean),
      href: patientHref(p.name),
      icon: User,
    })),
    ...actions.map((a) => ({ kind: "action" as const, key: a.href, label: a.label, hint: [a.hint], href: a.href, icon: a.icon })),
  ];
  const active = Math.min(highlight, Math.max(0, results.length - 1));

  const go = (result: Result) => {
    onClose();
    router.push(result.href);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight(Math.min(active + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight(Math.max(active - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (results[active]) go(results[active]);
    } else if (event.key === "Escape") {
      onClose();
    }
  };

  const optionId = (index: number) => `${listId}-${index}`;
  const firstAction = patients.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] print:hidden">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={s.dialog} className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-gray-100">
          <Search size={20} className="text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlight(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={canSearch ? s.placeholder : s.placeholderActionsOnly}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results.length ? optionId(active) : undefined}
            aria-autocomplete="list"
            className="flex-1 min-w-0 h-14 text-base text-gray-800 placeholder:text-gray-500 focus:outline-none bg-transparent"
          />
          {searching && <Spinner size={16} className="text-gray-500" />}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-gray-200 px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-50"
          >
            {s.esc}
          </button>
        </div>

        <ul id={listId} role="listbox" aria-label={s.results} className="max-h-[60vh] overflow-y-auto py-2">
          {needle && canSearch && !searching && patients.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-500">{s.noPatient(query.trim())}</li>
          )}
          {results.map((result, index) => {
            const Icon = result.icon;
            return (
              <li key={`${result.kind}-${result.key}`}>
                {(index === 0 && result.kind === "patient") || index === firstAction ? (
                  <p className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {result.kind === "patient" ? s.patientsGroup : s.actionsGroup}
                  </p>
                ) : null}
                <div
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => go(result)}
                  className={cx(
                    "mx-2 flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-11 cursor-pointer",
                    index === active ? "bg-primary-50" : "hover:bg-gray-50",
                  )}
                >
                  <span
                    className={cx(
                      "w-9 h-9 shrink-0 rounded-lg flex items-center justify-center",
                      result.kind === "patient" ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-600",
                    )}
                  >
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-800 truncate">{result.label}</span>
                    <span className="block text-xs text-gray-500 truncate">
                      {result.hint.map((part, i) => (
                        <span key={i}>
                          {i > 0 && t.common.dot}
                          <bdi>{part}</bdi>
                        </span>
                      ))}
                    </span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="hidden sm:block px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
          {s.keys}
        </p>
      </div>
    </div>
  );
}
