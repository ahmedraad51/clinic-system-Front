/*
 * DentClinic's service worker. It makes the app installable and lets it be looked at while the connection is lost.
 *
 * - The app's own files (/_next/static/…, fonts, icons) are kept as they load: their names change with every build, so
 *   a kept file is never out of date. The newest STATIC_LIMIT are kept.
 * - Each page of the app (its HTML) is kept when it is opened, and is always asked from the network first. The pages
 *   hold no patient data: every record is loaded by the page itself from /frappe/…, which this worker never touches
 *   (the last copy of what was read lives in the tab's memory and sessionStorage, see src/lib/frappe.ts).
 * - Opened by moving inside the app, a page's HTML is fetched in the background (the page says which, with the files
 *   it loaded; at most every 10 minutes per page), so it is there too when the connection is lost and the browser has
 *   to load it whole.
 * - With no connection and no kept copy, the friendly offline page shows.
 * Bump the version below when this file or the offline page changes.
 */
const VERSION = "v2";
const OFFLINE_CACHE = `dentclinic-offline-${VERSION}`;
const STATIC_CACHE = `dentclinic-static-${VERSION}`;
const PAGES_CACHE = `dentclinic-pages-${VERSION}`;
const OFFLINE_FILES = ["/offline.html", "/icons/icon.svg"];
const STATIC_LIMIT = 400;
const PAGES_LIMIT = 80;
const WARM_EVERY_MS = 10 * 60 * 1000;
const warmedAt = new Map();

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.addAll(OFFLINE_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = [OFFLINE_CACHE, STATIC_CACHE, PAGES_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

/** Keeps a cache to its newest `limit` entries (the oldest were put first). */
async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - limit; i++) await cache.delete(keys[i]);
}

const isStatic = (url) => url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/icons/");
/** A page of the app, kept by its path only (?view=week is the same page). */
const pageKey = (url) => new Request(new URL(url.pathname, url.origin).href);
/** Not the data, not the public website's form, not Next's own files. */
const isAppPage = (url) => !url.pathname.startsWith("/frappe/") && !url.pathname.startsWith("/_next/") && !url.pathname.startsWith("/api/");

async function staticFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const kept = (await cache.match(request)) || (await caches.match(request));
  if (kept) return kept;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    trim(STATIC_CACHE, STATIC_LIMIT);
  }
  return response;
}

async function pageNetworkFirst(request, url) {
  try {
    const response = await fetch(request);
    if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
      const cache = await caches.open(PAGES_CACHE);
      await cache.put(pageKey(url), response.clone());
      warmedAt.set(url.pathname, Date.now());
      trim(PAGES_CACHE, PAGES_LIMIT);
    }
    return response;
  } catch {
    const kept = await (await caches.open(PAGES_CACHE)).match(pageKey(url));
    if (kept) return kept;
    return (await (await caches.open(OFFLINE_CACHE)).match("/offline.html")) || Response.error();
  }
}

/** Fetches and keeps a page's HTML in the background (a page opened by moving inside the app). */
async function warmPage(url) {
  const last = warmedAt.get(url.pathname) || 0;
  if (Date.now() - last < WARM_EVERY_MS) return;
  warmedAt.set(url.pathname, Date.now());
  try {
    const response = await fetch(new URL(url.pathname, url.origin).href, { credentials: "same-origin" });
    if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
      await (await caches.open(PAGES_CACHE)).put(pageKey(url), response);
      trim(PAGES_CACHE, PAGES_LIMIT);
    }
  } catch {
    // No connection: try again next time.
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The offline page's own files (its icon), even when it is not a page being opened.
  if (OFFLINE_FILES.includes(url.pathname) && request.mode !== "navigate") {
    event.respondWith(caches.match(url.pathname).then((kept) => kept || fetch(request)));
    return;
  }
  if (isStatic(url)) {
    event.respondWith(staticFirst(request));
    return;
  }
  if (request.mode === "navigate" && isAppPage(url)) {
    event.respondWith(pageNetworkFirst(request, url));
    return;
  }
  // Everything else, and all data (/frappe/…), goes to the network untouched.
});

/** The page sends the files it loaded before this worker took over, and its own address, to be kept. */
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "keep" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    (async () => {
      for (const href of data.urls) {
        const url = new URL(href, self.location.origin);
        if (url.origin !== self.location.origin) continue;
        try {
          if (isStatic(url)) await staticFirst(new Request(url.href));
          else if (isAppPage(url)) await warmPage(url);
        } catch {
          // Not reachable now: kept the next time it loads.
        }
      }
    })(),
  );
});
