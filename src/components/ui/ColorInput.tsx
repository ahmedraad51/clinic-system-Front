"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { messages } from "@/i18n";
import { cx } from "@/lib/format";
import { useMediaQuery } from "@/lib/hooks";
import { Popover } from "./Popover";
import { inputClass } from "./styles";

/** Strong colours that carry white text, in rows of six: reds and pinks, violets and blues, teals and greens, warm. */
const PALETTE = [
  "#c62828", "#d81b60", "#ad1457", "#8e24aa", "#6a1b9a", "#5e35b1",
  "#3949ab", "#283593", "#1e88e5", "#1565c0", "#0277bd", "#00838f",
  "#00796b", "#00695c", "#2e7d32", "#558b2f", "#ef6c00", "#d84315",
  "#6d4c41", "#4e342e", "#546e7a", "#37474f", "#455a64", "#212121",
];

/** "#abc", "abc", "#AABBCC" … → "#aabbcc"; null when it is not a colour code. */
function readHex(text: string): string | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!match) return null;
  const digits = match[1].length === 3 ? [...match[1]].map((d) => d + d).join("") : match[1];
  return `#${digits.toLowerCase()}`;
}

/**
 * The app's own colour field, instead of the browser's <input type="color">: a round sample and the colour code;
 * a click opens a panel (a sheet on a phone) with a palette of strong colours and a box for any colour code
 * (#6a5fdd). Each choice calls onChange with the code at once.
 */
export function ColorInput({
  value,
  onChange,
  label,
  className,
}: {
  value: string;
  onChange: (hex: string) => void;
  /** Says what the colour is for (the button's name and the sheet's title). */
  label: string;
  className?: string;
}) {
  const t = messages().ui;
  const boxRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  // Wider on touch screens, so each colour is at least 44 px.
  const coarse = useMediaQuery("(pointer: coarse)");
  const [code, setCode] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const current = readHex(value) ?? value;

  // The panel takes the keys when it opens: the chosen colour, or the first one.
  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>("[aria-pressed='true']") ?? panel?.querySelector<HTMLElement>("button"))?.focus({ preventScroll: true });
  }, [open]);

  const openPanel = () => {
    setCode(current);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    buttonRef.current?.focus({ preventScroll: true });
  };

  return (
    <div ref={boxRef} className={cx("inline-block", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : openPanel())}
        className="flex items-center gap-2 h-10 pointer-coarse:h-11 ps-1.5 pe-3 rounded-md border border-gray-300 bg-surface text-sm text-gray-800 hover:border-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
      >
        <span className="w-7 h-7 rounded-full border border-black/10" style={{ backgroundColor: current }} aria-hidden="true" />
        <span dir="ltr" className="font-mono text-xs uppercase">{current}</span>
        <Palette size={16} className="text-gray-500" aria-hidden="true" />
      </button>
      {open && (
        <Popover anchor={boxRef} onClose={() => setOpen(false)} width={coarse ? 20.5 : 16.5} title={label} tall>
          <div
            ref={panelRef}
            role="dialog"
            aria-label={label}
            className="p-3 max-sm:px-5"
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              // Closes the panel only, never the page's dialog.
              event.preventDefault();
              event.stopPropagation();
              close();
            }}
          >
            <div className="grid grid-cols-6 gap-2">
              {PALETTE.map((colour) => (
                <button
                  key={colour}
                  type="button"
                  aria-label={colour}
                  aria-pressed={colour === current}
                  onClick={() => {
                    onChange(colour);
                    setCode(colour);
                  }}
                  className="relative w-full aspect-square rounded-full border border-black/10 hover:scale-110 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-600"
                  style={{ backgroundColor: colour }}
                >
                  {colour === current && <Check size={16} className="absolute inset-0 m-auto text-white" aria-hidden="true" />}
                </button>
              ))}
            </div>
            <label className="block mt-3">
              <span className="block text-xs text-gray-800 mb-1">{t.colourCode}</span>
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 shrink-0 rounded-md border border-black/10" style={{ backgroundColor: readHex(code) ?? current }} aria-hidden="true" />
                <input
                  value={code}
                  dir="ltr"
                  spellCheck={false}
                  autoComplete="off"
                  aria-invalid={code !== "" && !readHex(code)}
                  placeholder="#6a5fdd"
                  onChange={(event) => {
                    setCode(event.target.value);
                    const hex = readHex(event.target.value);
                    if (hex) onChange(hex);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      close();
                    }
                  }}
                  className={cx(inputClass, "font-mono")}
                />
              </div>
            </label>
            <div className="flex justify-end mt-3 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={close}
                className="px-4 h-9 pointer-coarse:h-11 rounded-md text-sm font-medium text-primary-600 hover:bg-primary-50"
              >
                {t.done}
              </button>
            </div>
          </div>
        </Popover>
      )}
    </div>
  );
}
