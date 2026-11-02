/*
 * PI-CORE service worker — deliberately minimal.
 *
 * Caching strategy (see docs/PWA.md):
 *   - Page navigations: NETWORK ONLY. HTML is per-user and authorization-dependent, so it is never
 *     stored. If the network fails, the precached /offline page is shown instead.
 *   - /_next/static/*: cache-first. File names are content-hashed and contain no user data.
 *   - /icons/*, /brand/*: cache-first (public images).
 *   - Everything else — RSC payloads, Server Actions (POST), Supabase API (cross-origin),
 *     the manifest — is NOT intercepted and goes straight to the network.
 * Nothing user-specific is ever written to Cache Storage, so logging out or switching accounts
 * cannot expose another user's data or stale permissions.
 */
const VERSION = "v2";
const PRECACHE = `pi-core-precache-${VERSION}`;
const STATIC = `pi-core-static-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [OFFLINE_URL, "/brand/pmk-logo-192.png", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith("pi-core-") && key !== PRECACHE && key !== STATIC).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isCacheableStatic(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/brand/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(OFFLINE_URL, { cacheName: PRECACHE });
        return cached || new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
      }),
    );
    return;
  }

  if (isCacheableStatic(url)) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok && response.type === "basic") cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
