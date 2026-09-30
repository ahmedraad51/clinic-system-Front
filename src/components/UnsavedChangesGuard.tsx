"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useI18n } from "@/context/LanguageContext";

/**
 * Put this in a form and pass `when={formHasChanges}`. While it is true:
 * - closing or reloading the tab asks the browser's own "Leave site?" question;
 * - clicking any link inside the app first asks "Leave without saving?";
 * - so does a button marked `data-confirm-unsaved` (the language switch, which draws the page again from scratch).
 * Navigation done in code (router.push after a save) is not stopped, so saving still moves on.
 */
export default function UnsavedChangesGuard({ when }: { when: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  // Where to go (a link), or the button to press again, once the user agrees to leave.
  const [pending, setPending] = useState<string | HTMLElement | null>(null);
  const pressingAgain = useRef(false);

  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const button = (event.target as HTMLElement | null)?.closest?.("[data-confirm-unsaved]") as HTMLElement | null;
      if (button) {
        if (pressingAgain.current) {
          pressingAgain.current = false;
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        setPending(button);
        return;
      }
      const link = (event.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      // Stop the link (and Next's own click handler) and ask first.
      event.preventDefault();
      event.stopPropagation();
      setPending(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [when]);

  return (
    <ConfirmDialog
      open={pending !== null}
      title={t.history.leaveTitle}
      message={<p>{t.history.leaveText}</p>}
      confirmLabel={t.history.leaveConfirm}
      onCancel={() => setPending(null)}
      onConfirm={() => {
        const target = pending;
        setPending(null);
        if (typeof target === "string") router.push(target);
        else if (target) {
          pressingAgain.current = true;
          target.click();
        }
      }}
    />
  );
}
