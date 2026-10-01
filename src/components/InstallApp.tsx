"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Download, MonitorSmartphone } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { useI18n } from "@/context/LanguageContext";

/** The browser's install offer (Chrome, Edge, Android), kept until the user asks for it. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let offer: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Keep it for the Install button instead of the browser's own banner.
    event.preventDefault();
    offer = event as InstallPromptEvent;
    changed();
  });
  window.addEventListener("appinstalled", () => {
    offer = null;
    changed();
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const useOffer = () => useSyncExternalStore(subscribe, () => offer, () => null);

/** Running as the installed app (its own window), not in a browser tab. */
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const noChange = () => () => {};
const useInstalled = () => useSyncExternalStore(noChange, standalone, () => false);
/** iPhone and iPad have no install offer: Share, then Add to Home Screen. */
const useApple = () => useSyncExternalStore(noChange, () => /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && "ontouchend" in document, () => false);

/**
 * Registers the service worker (public/sw.js) in the production build only, so the dev server is never cached. It
 * makes the app installable, and keeps the app's files and the pages opened so they still open offline.
 */
/** The app's files already sent to the worker to keep. */
const sentFiles = new Set<string>();

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => console.error(err));
  }, []);

  // Each page opened, with the files it loaded, is kept by the worker so it opens offline too (moving inside the app
  // may use a prefetched page, which the worker never sees being asked for).
  const pathname = usePathname();
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready
      .then((registration) => {
        const urls = performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((name) => (name.startsWith(`${location.origin}/_next/static/`) || name.startsWith(`${location.origin}/fonts/`)) && !sentFiles.has(name));
        urls.forEach((name) => sentFiles.add(name));
        registration.active?.postMessage({ type: "keep", urls: [...urls, pathname] });
      })
      .catch(() => {
        // No worker: nothing to keep.
      });
  }, [pathname]);
  return null;
}

/** "Install DentClinic on this computer" on the profile page: the button where the browser offers it, else how. */
export function InstallAppCard() {
  const { t } = useI18n();
  const x = t.install;
  const available = useOffer();
  const installed = useInstalled();
  const apple = useApple();
  const [busy, setBusy] = useState(false);

  const install = async () => {
    if (!available) return;
    setBusy(true);
    try {
      await available.prompt();
      await available.userChoice;
    } finally {
      offer = null;
      changed();
      setBusy(false);
    }
  };

  return (
    <Card title={x.title} icon={MonitorSmartphone}>
      <p className="text-sm text-gray-600">{x.text}</p>
      <div className="mt-4" data-testid="install-state">
        {installed ? (
          <p className="text-sm font-medium text-green-700">{x.installed}</p>
        ) : available ? (
          <Button icon={Download} loading={busy} onClick={install}>
            {x.button}
          </Button>
        ) : (
          <p className="text-sm text-gray-600">{apple ? x.apple : x.howTo}</p>
        )}
      </div>
    </Card>
  );
}
