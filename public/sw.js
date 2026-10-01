/*
 * DentClinic's service worker. It makes the app installable and shows a friendly page when there is no connection.
 * On purpose it caches nothing else: patient data must always come fresh from the server (/frappe/…), and the app's
 * own files are cached by the browser as usual. A page that loads fine is never touched.
 */
const CACHE = "dentclinic-offline-v1";
const OFFLINE_FILES = ["/offline.html", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Only opening a page in this app: everything else goes to the network as if there were no service worker.
  if (request.method !== "GET" || request.mode !== "navigate" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match("/offline.html")) || Response.error();
    }),
  );
});
