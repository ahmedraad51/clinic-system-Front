"use client";

import { messages } from "@/i18n";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import Avatar from "@/components/Avatar";
import { getList, type FilterRow } from "@/lib/frappe";
import { searchFilters, useDebounced } from "@/lib/hooks";
import { cx } from "@/lib/format";
import type { Doc } from "@/lib/types";
import { Popover } from "./Popover";
import { inputClass } from "./styles";

interface Option {
  name: string;
  label: string;
  detail?: string;
}

interface Result {
  query: string;
  options: Option[];
}

const noop = () => {};

/**
 * A searchable picker for a Link field, e.g. choosing a patient. It asks the server
 * as you type, so it works with any number of records. `value` is the linked doc's
 * name (its ID); the label is only for display. The list is the app's own (a Popover on the page body, so a dialog
 * never cuts it off); people (patients, doctors) get their initials before the name, and the chosen one a check mark.
 */
export default function LinkSelect({
  doctype,
  value,
  onChange,
  labelField = "full_name",
  detailField,
  initialLabel,
  placeholder = messages().ui.searchPlaceholder,
  required = false,
  disabled = false,
  filters,
}: {
  doctype: string;
  value: string;
  onChange: (name: string) => void;
  labelField?: string;
  /** A second line under each option, e.g. the phone number. It is searched too. */
  detailField?: string;
  /** The label for `value` when it is already known, to skip a lookup. */
  initialLabel?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  filters?: FilterRow[];
}) {
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  // Patients and doctors are people: their initials go before each name.
  const people = doctype === "Patient" || doctype === "Doctor";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>(
    value && initialLabel ? { [value]: initialLabel } : {},
  );
  const debounced = useDebounced(query, 250);
  const filtersKey = JSON.stringify(filters ?? []);

  // Search while the list is open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      const orFilters = searchFilters(debounced, [labelField, "name", ...(detailField ? [detailField] : [])]);
      try {
        const rows = await getList<Doc>(doctype, ["name", labelField, ...(detailField ? [detailField] : [])], {
          filters: JSON.parse(filtersKey) as FilterRow[],
          orFilters,
          orderBy: `${labelField} asc`,
          limit: 20,
        });
        if (!cancelled) {
          setResult({
            query: debounced,
            options: rows.map((row) => ({
              name: row.name,
              label: String(row[labelField] || row.name),
              detail: detailField && row[detailField] ? String(row[detailField]) : undefined,
            })),
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, debounced, doctype, labelField, detailField, filtersKey]);

  // Look up the label of a value set from outside (e.g. a form opened with a patient chosen).
  useEffect(() => {
    if (!value || labels[value]) return;
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getList<Doc>(doctype, ["name", labelField], { filters: [["name", "=", value]], limit: 1 });
        if (!cancelled) {
          setLabels((prev) => ({ ...prev, [value]: rows[0] ? String(rows[0][labelField] || value) : value }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [value, labels, doctype, labelField]);

  const options = result?.options ?? [];
  const searching = open && (result === null || result.query !== debounced || debounced !== query);

  const choose = (option: Option) => {
    setLabels((prev) => ({ ...prev, [option.name]: option.label }));
    onChange(option.name);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (options[highlight]) choose(options[highlight]);
    } else if (event.key === "Tab") {
      setOpen(false);
      setQuery("");
    } else if (event.key === "Escape") {
      // Closes only the list, not a dialog the picker is in.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setQuery("");
    }
  };

  const shownLabel = value ? labels[value] || value : "";

  return (
    <div ref={boxRef} className="relative">
      {open ? (
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          className={inputClass}
        />
      ) : (
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen(true)}
            className={cx(inputClass, "text-start flex items-center gap-2 pe-16")}
          >
            {people && value && <Avatar name={shownLabel} size={24} />}
            <span className={cx("truncate", value ? "text-gray-800" : "text-gray-500")}>{shownLabel || placeholder}</span>
          </button>
          <span className="absolute end-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-500">
            {value && !required && !disabled && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="p-1 rounded hover:bg-gray-100 hover:text-gray-700"
                aria-label={messages().ui.clear}
              >
                <X size={14} />
              </button>
            )}
            <ChevronDown size={16} className="pointer-events-none" />
          </span>
        </div>
      )}

      {/* Lets the browser's own "please fill in this field" check work for required links. */}
      <input
        tabIndex={-1}
        aria-hidden="true"
        data-choice=""
        required={required}
        value={value}
        onChange={noop}
        className="absolute bottom-0 start-4 h-px w-px opacity-0 pointer-events-none"
      />

      {open && (
        <Popover
          anchor={boxRef}
          sheet={false}
          onClose={() => {
            setOpen(false);
            setQuery("");
          }}
        >
          <ul id={listId} role="listbox" className="overflow-y-auto p-1">
            {options.length === 0 ? (
              <li className="px-3.5 py-2.5 text-sm text-gray-500">{searching ? messages().ui.searching : messages().ui.noMatches}</li>
            ) : (
              options.map((option, index) => (
                <li key={option.name} role="option" aria-selected={option.name === value}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(option)}
                    className={cx(
                      "w-full flex items-center gap-2.5 text-start px-2.5 py-1.5 pointer-coarse:py-2.5 rounded-md text-sm",
                      index === highlight ? "bg-primary-50 text-primary-700" : "text-gray-800 hover:bg-gray-100",
                    )}
                  >
                    {people && <Avatar name={option.label} size={28} />}
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium break-words">{option.label}</span>
                      {option.detail && (
                        <span className="block text-xs text-gray-500 truncate">
                          <bdi>{option.detail}</bdi>
                        </span>
                      )}
                    </span>
                    {option.name === value && <Check size={16} className="shrink-0 text-primary-600" aria-hidden="true" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </Popover>
      )}
    </div>
  );
}
