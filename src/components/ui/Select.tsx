"use client";

import {
  Children, Fragment, isValidElement, useId, useLayoutEffect, useRef, useState,
  type KeyboardEvent, type ReactElement, type ReactNode, type SelectHTMLAttributes,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { messages } from "@/i18n";
import { cx } from "@/lib/format";
import { toLatinDigits } from "@/lib/phone";
import { coarsePointer, fieldLabelOf, Popover } from "./Popover";
import { inputClass } from "./styles";

interface Option {
  value: string;
  label: string;
  disabled: boolean;
  group?: string;
}

/** A list longer than this gets a search box. */
const SEARCH_FROM = 8;

/** Text compared without case, with Arabic-keyboard digits as 0-9. */
const norm = (text: string) => toLatinDigits(text).toLowerCase();

/** The text of an option's children (strings, numbers, and the text inside elements). */
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) return textOf((node as ReactElement<{ children?: ReactNode }>).props.children);
  return "";
}

/** The <option>s among the children, through fragments and <optgroup>s. */
function readOptions(children: ReactNode, group?: string): Option[] {
  const out: Option[] = [];
  Children.toArray(children).forEach((child) => {
    if (!isValidElement(child)) return;
    const props = child.props as { children?: ReactNode; value?: unknown; disabled?: boolean; label?: string };
    if (child.type === Fragment) out.push(...readOptions(props.children, group));
    else if (child.type === "optgroup") out.push(...readOptions(props.children, props.label));
    else if (child.type === "option") {
      const label = textOf(props.children);
      out.push({ value: props.value !== undefined ? String(props.value) : label, label, disabled: Boolean(props.disabled), group });
    }
  });
  return out;
}

/** Sets a native control's value the way the browser does, so React's onChange runs with a real event. */
export function setNativeValue(element: HTMLSelectElement | HTMLInputElement, value: string, event: "change" | "input") {
  const proto = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(element, value);
  element.dispatchEvent(new Event(event, { bubbles: true }));
}

/** What the visible control of a hidden native one looks like when the native one has focus, an error or is off. */
export const peerFieldClass =
  "peer-focus:border-primary-600 peer-focus:ring-1 peer-focus:ring-primary-600 peer-focus:shadow-primary " +
  "peer-aria-invalid:border-error peer-aria-invalid:ring-1 peer-aria-invalid:ring-error " +
  "peer-disabled:bg-gray-100 peer-disabled:text-gray-500 peer-disabled:cursor-not-allowed";

/**
 * The app's own dropdown, used like a <select> (same props, <option> and <optgroup> children). A real <select> stays
 * underneath, invisible: it is what the label points at, what Tab reaches and forms read, and what `required` checks
 * (so tests can still use selectOption). On top, our button shows the chosen option; clicking it, or Enter, Space or
 * an arrow key on the select, opens our list (a Popover: under the field, or a sheet on a phone): the app's font,
 * rounded corners and shadow, hover and keyboard highlight, a check mark on the chosen item, a search box when there
 * are more than 8 items, and typing jumps to an item. Choosing sets the real select and fires its change event, so
 * every onChange handler works unchanged. `media(value)` puts a picture (initials, a photo) before an item.
 */
export function SelectInput({
  className,
  children,
  value,
  defaultValue,
  onChange,
  media,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { media?: (value: string) => ReactNode }) {
  const options = readOptions(children);
  const selectRef = useRef<HTMLSelectElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [inner, setInner] = useState(defaultValue !== undefined ? String(defaultValue) : options[0]?.value ?? "");
  const [open, setOpen] = useState(false);
  // The field's label, read when the list opens: the phone sheet's title and the list's name.
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const typed = useRef({ text: "", at: 0 });

  const current = value !== undefined ? String(value ?? "") : inner;
  // Like a native select: the matching option, or the first one.
  const chosen = options.find((option) => option.value === current) ?? options[0];
  const searchable = options.length > SEARCH_FROM;
  const words = norm(query.trim());
  const shown = words ? options.filter((option) => norm(option.label).includes(words)) : options;
  const t = messages().ui;

  const openList = () => {
    if (rest.disabled) return;
    setQuery("");
    setTitle(fieldLabelOf(boxRef.current) || rest["aria-label"] || "");
    setActive(Math.max(0, options.findIndex((option) => option.value === current)));
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) selectRef.current?.focus({ preventScroll: true });
  };
  const choose = (option: Option | undefined, byTouch = false) => {
    if (!option || option.disabled || !selectRef.current) return;
    if (option.value !== current) setNativeValue(selectRef.current, option.value, "change");
    close(!byTouch);
  };

  // The search box (or the list) takes the keys while open; the active item stays in view.
  useLayoutEffect(() => {
    if (!open) return;
    (searchable ? searchRef.current : listRef.current)?.focus({ preventScroll: true });
  }, [open, searchable]);
  useLayoutEffect(() => {
    if (!open) return;
    // After the panel is placed (it gets its height limit in the same frame).
    const frame = requestAnimationFrame(() =>
      listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [open, active]);

  /** The next item that can be chosen, `step` away (wrapping stops at the ends). */
  const move = (from: number, step: number) => {
    let index = from;
    for (let tries = 0; tries < shown.length; tries++) {
      const next = Math.min(shown.length - 1, Math.max(0, index + step));
      if (next === index) break;
      index = next;
      if (!shown[index].disabled) return index;
    }
    return from;
  };

  const onListKey = (event: KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => setActive((i) => move(i, 1)),
      ArrowUp: () => setActive((i) => move(i, -1)),
      PageDown: () => setActive((i) => move(i, 8)),
      PageUp: () => setActive((i) => move(i, -8)),
      Home: () => setActive(move(-1, 1)),
      End: () => setActive(move(shown.length, -1)),
      Enter: () => choose(shown[active]),
      Escape: () => close(),
      Tab: () => close(),
    };
    const action = keys[event.key];
    if (action) {
      // Escape closes only the list, never a dialog the field is in.
      event.preventDefault();
      event.stopPropagation();
      action();
      return;
    }
    // Typing jumps to the next item that starts with the letters typed (without a search box).
    if (!searchable && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = event.timeStamp;
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + norm(event.key), at: now };
      // A second letter narrows the item already found; a first one moves on to the next match.
      const startAt = typed.current.text.length > 1 ? active : active + 1;
      const order = [...shown.keys()].map((n) => (startAt + n) % shown.length);
      const hit = order.find((n) => !shown[n].disabled && norm(shown[n].label).startsWith(typed.current.text));
      if (hit !== undefined) setActive(hit);
    }
  };

  const onSelectKey = (event: KeyboardEvent<HTMLSelectElement>) => {
    if (["ArrowDown", "ArrowUp", "Enter", " ", "F4"].includes(event.key)) {
      event.preventDefault();
      openList();
    }
  };

  return (
    <div ref={boxRef} className={cx("relative w-full", className)}>
      <select
        ref={selectRef}
        {...rest}
        {...(value !== undefined ? { value } : { defaultValue })}
        onChange={(event) => {
          if (value === undefined) setInner(event.target.value);
          onChange?.(event);
        }}
        onKeyDown={onSelectKey}
        className="peer absolute inset-0 w-full h-full opacity-0 pointer-events-none appearance-none"
      >
        {children}
      </select>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        disabled={rest.disabled}
        data-picker={rest.name ?? rest.id}
        onClick={() => (open ? close() : openList())}
        className={cx(
          inputClass,
          peerFieldClass,
          "flex items-center gap-2 text-start pe-9 cursor-pointer",
          open && "border-primary-600 ring-1 ring-primary-600",
        )}
      >
        {chosen && media?.(chosen.value)}
        <span className="flex-1 min-w-0 truncate">{chosen?.label ?? ""}</span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={cx("absolute end-3 top-1/2 -translate-y-1/2 text-gray-500 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <Popover anchor={boxRef} onClose={() => close(false)} title={title}>
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={onListKey}
                placeholder={t.searchList}
                aria-label={t.searchList}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={shown[active] ? `${listId}-${active}` : undefined}
                className={cx(inputClass, "min-h-9")}
              />
            </div>
          )}
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label={title}
            aria-activedescendant={shown[active] ? `${listId}-${active}` : undefined}
            onKeyDown={onListKey}
            className="min-h-0 flex-1 overflow-y-auto py-1 focus:outline-none"
          >
            {shown.map((option, index) => {
              const selected = option.value === current;
              const groupStart = option.group && option.group !== shown[index - 1]?.group;
              return (
                <Fragment key={`${option.value}-${index}`}>
                  {groupStart && (
                    <li role="presentation" className="px-3 pt-2 pb-1 text-xs font-medium text-gray-500">
                      {option.group}
                    </li>
                  )}
                  <li
                    id={`${listId}-${index}`}
                    data-index={index}
                    data-value={option.value}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={option.disabled || undefined}
                    onMouseMove={() => !option.disabled && setActive(index)}
                    onClick={() => choose(option, coarsePointer())}
                    className={cx(
                      "mx-1 flex items-center gap-3 rounded px-2.5 py-2 min-h-10 pointer-coarse:min-h-12 text-sm max-sm:text-base cursor-pointer",
                      index === active && "bg-gray-100",
                      selected ? "text-primary-700 font-medium" : "text-gray-800",
                      option.disabled && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {media?.(option.value)}
                    <span className="flex-1 min-w-0 truncate">{option.label}</span>
                    {selected && <Check size={16} aria-hidden="true" className="shrink-0 text-primary-600" />}
                  </li>
                </Fragment>
              );
            })}
            {shown.length === 0 && <li className="px-3 py-2 text-sm text-gray-500">{t.noMatches}</li>}
          </ul>
        </Popover>
      )}
    </div>
  );
}
