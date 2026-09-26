"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/Modal";

/**
 * Put this in a form and pass `when={formHasChanges}`. While it is true:
 * - closing or reloading the tab asks the browser's own "Leave site?" question;
 * - clicking any link inside the app first asks "Leave without saving?".
 * Navigation done in code (router.push after a save) is not stopped, so saving still moves on.
 */
export default function UnsavedChangesGuard({ when }: { when: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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
      title="Leave without saving?"
      message={<p>Your changes on this page have not been saved. If you leave now, they will be lost.</p>}
      confirmLabel="Leave without saving"
      onCancel={() => setPending(null)}
      onConfirm={() => {
        const href = pending;
        setPending(null);
        if (href) router.push(href);
      }}
    />
  );
}
