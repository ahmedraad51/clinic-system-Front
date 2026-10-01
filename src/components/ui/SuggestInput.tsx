"use client";

import { useId, useRef, useState, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { cx } from "@/lib/format";
import { Popover } from "./Popover";
import { setNativeValue } from "./Select";
import { inputClass } from "./styles";

export interface Suggestion {
  /** What goes into the box. */
  value: string;
  /** Shown beside it, quieter (for example the name in the other language). */
  hint?: string;
}

/** The suggestions that fit what was typed: those starting with it first, then those containing it. */
function matching(suggestions: Suggestion[], text: string): Suggestion[] {
  const query = text.trim().toLowerCase();
  if (!query) return suggestions;
  const starts: Suggestion[] = [];
  const contains: Suggestion[] = [];
  for (const item of suggestions) {
    const words = `${item.value} ${item.hint ?? ""}`.toLowerCase();
    if (item.value.toLowerCase().startsWith(query) || (item.hint ?? "").toLowerCase().startsWith(query)) starts.push(item);
    else if (words.includes(query)) contains.push(item);
  }
  return [...starts, ...contains];
}

/**
 * A text box with suggestions, the app's own <datalist>: free text still works, and while the box has the focus a
 * list under it (also on a phone, above the keyboard) offers the suggestions that fit what was typed. Up and Down
 * move in the list, Enter or a click puts the suggestion in the box (as if typed: onChange gets the input's event),
 * Escape, Tab or a click elsewhere closes the list. Used like <input> (value, onChange, name …).
 */
export function SuggestInput({
  suggestions,
  className,
  value,
  onChange,
  onKeyDown,
  onFocus,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "list" | "value"> & { suggestions: Suggestion[]; value?: string }) {
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const text = value ?? "";
  const shown = matching(suggestions, text).filter((item) => item.value !== text.trim()).slice(0, 8);
  const visible = open && shown.length > 0;

  const choose = (item: Suggestion) => {
    if (inputRef.current) setNativeValue(inputRef.current, item.value, "input");
    setOpen(false);
    setActive(-1);
  };

  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!visible) {
        setOpen(true);
        setActive(0);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive(active < 0 ? (step > 0 ? 0 : shown.length - 1) : (active + step + shown.length) % shown.length);
    } else if (event.key === "Enter" && visible && active >= 0 && shown[active]) {
      event.preventDefault();
      choose(shown[active]);
    } else if (event.key === "Tab") {
      setOpen(false);
    } else if (event.key === "Escape" && visible) {
      // Closes the list only, never the dialog around the box.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className={cx("relative w-full", className)}>
      <input
        ref={inputRef}
        {...rest}
        value={text}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={visible ? listId : undefined}
        aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        onChange={(event) => {
          onChange?.(event);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={(event) => {
          onFocus?.(event);
          setOpen(true);
        }}
        onKeyDown={onKey}
        className={inputClass}
      />
      {visible && (
        <Popover anchor={boxRef} onClose={() => setOpen(false)} sheet={false}>
          <ul id={listId} role="listbox" className="overflow-y-auto p-1">
            {shown.map((item, index) => (
              <li
                key={item.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                // Keeps the focus (and the phone's keyboard) in the box.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
                onPointerEnter={() => setActive(index)}
                className={cx(
                  "flex items-center justify-between gap-3 px-3 h-9 pointer-coarse:h-11 rounded-md text-sm cursor-pointer",
                  index === active ? "bg-primary-50 text-primary-700" : "text-gray-800",
                )}
              >
                <span className="truncate">{item.value}</span>
                {item.hint && <span className="text-xs text-gray-500 truncate">{item.hint}</span>}
              </li>
            ))}
          </ul>
        </Popover>
      )}
    </div>
  );
}
