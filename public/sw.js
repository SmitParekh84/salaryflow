/*
 * The cache name carries the version. `activate` deletes every cache that
 * isn't the current one, so bumping this number is how a bad entry from a
 * previous release gets thrown away — v1 cached things it should not have.
 */
const CACHE = "aartha-v2";
const OFFLINE_URL = "/offline";
const PRECACHE = ["/", OFFLINE_URL, "/manifest.webmanifest"];

/**
 * Build output is content-hashed: a change to the bytes changes the URL. A hit
 * here can be served without ever asking the network.
 */
const IMMUTABLE = /^\/_next\/static\//;

/**
 * Stable URLs whose bytes *can* change between releases — icons, the manifest,
 * the loose SVGs in `public`. Serving the cached copy immediately and updating
 * it in the background keeps them instant without pinning a stale version.
 */
const REVALIDATE = /^\/icons\/|\.(?:png|jpe?g|svg|webp|avif|gif|ico|woff2?)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

/** Only a plain, same-origin 200 is worth keeping. */
function isCacheable(response) {
  return Boolean(response) && response.status === 200 && response.type === "basic";
}

function putInCache(request, response) {
  if (!isCacheable(response)) return;
  const copy = response.clone();
  void caches.open(CACHE).then((cache) => cache.put(request, copy));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Authenticated API responses must always reflect the active session.
  if (url.pathname.startsWith("/api/")) return;

  /*
   * Router payloads are not static assets.
   *
   * A client-side navigation is a `fetch` for the route's RSC payload, not a
   * `navigate` request, so v1's blanket cache-first rule stored them and then
   * served them forever. That froze whatever the server had decided at the
   * moment of the first visit — including the signed-in/signed-out branch in
   * the app layout, so a user who signed out could still be handed the shell
   * of a page they no longer have a session for. These always go to the
   * network.
   */
  if (url.searchParams.has("_rsc") || request.headers.has("RSC")) return;

  // Network-first for navigations, fall back to cache/offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (url.pathname === "/" || url.pathname === OFFLINE_URL) putInCache(request, res);
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || (await caches.match(OFFLINE_URL)) || Response.error();
        }),
    );
    return;
  }

  // Cache-first for the hashed build output — the URL is the version.
  if (IMMUTABLE.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            putInCache(request, res);
            return res;
          }),
      ),
    );
    return;
  }

  // Stale-while-revalidate for assets that keep their URL across releases.
  if (REVALIDATE.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            putInCache(request, res);
            return res;
          })
          .catch(() => cached);
        // The refresh has to outlive the response, or the worker can be killed
        // before it lands and the entry never actually updates.
        if (cached) event.waitUntil(network);
        return cached || network;
      }),
    );
    return;
  }

  // Anything else — including page data and anything added later — is left to
  // the network and the HTTP cache, which know what is safe to reuse.
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Aartha";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "You have a new update.",
      icon: "/icons/icon-192.png",
      badge: "/icons/favicon-64.png",
    }),
  );
});
