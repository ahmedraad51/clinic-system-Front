"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => console.error(err));
    // The files this page loaded before the worker took over, and the page itself, so they work offline too.
    navigator.serviceWorker.ready
      .then((registration) => {
        const urls = performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((name) => name.startsWith(`${location.origin}/_next/static/`) || name.startsWith(`${location.origin}/fonts/`));
        registration.active?.postMessage({ type: "keep", urls: [...urls, location.pathname] });
      })
      .catch(() => {
        // No worker: nothing to keep.
      });
  }, []);
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
