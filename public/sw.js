const CACHE = "spendly-v2";
const OFFLINE_URL = "/offline";
const PRECACHE = ["/", "/offline", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Authenticated API responses must always reflect the active session.
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return;

  // Network-first for navigations, fall back to cache/offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (url.pathname === "/" || url.pathname === OFFLINE_URL) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(async () => {
          if (url.pathname === "/" || url.pathname === OFFLINE_URL) {
            const cached = await caches.match(request);
            if (cached) return cached;
          }
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Cache-first for static assets.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
    )
  );
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Spendly";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "You have a new update.",
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",    })
  );
});
