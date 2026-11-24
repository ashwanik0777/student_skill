/* TestPrep service worker — offline centre + static asset caching.
   Bump VERSION to invalidate old caches after a deploy. */
const VERSION = "tp-v2";
const MAX_STATIC_ENTRIES = 300;
const SHELL_CACHE = `${VERSION}-shell`;
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = "/offline";

async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  const res = await fetch(OFFLINE_URL, { cache: "reload" });
  if (!res.ok) return;
  await cache.put(OFFLINE_URL, res.clone());
  // Cache every script/style the offline page needs so it can boot with no network.
  const html = await res.text();
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) || [])];
  const staticCache = await caches.open(STATIC_CACHE);
  await Promise.all(
    [...assets, "/manifest.webmanifest", "/icon.svg", "/icons/icon-192.png"].map((url) =>
      staticCache.add(url).catch(() => undefined),
    ),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Navigation preload: the page request starts while the worker boots, instead of after it.
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await pruneStatic();
      await self.clients.claim();
    })(),
  );
});

/** Hashed assets from old deploys pile up; keep only the newest entries (insertion order). */
async function pruneStatic() {
  const cache = await caches.open(STATIC_CACHE);
  const keys = await cache.keys();
  const excess = keys.length - MAX_STATIC_ENTRIES;
  if (excess > 0) await Promise.all(keys.slice(0, excess).map((k) => cache.delete(k)));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // never cache API calls

  // Hashed build assets never change: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Page navigations: network first, offline centre as the fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = (await event.preloadResponse) || (await fetch(request));
          if (url.pathname === OFFLINE_URL && res.ok) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(OFFLINE_URL, res.clone());
          }
          return res;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (await cache.match(OFFLINE_URL)) || new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
        }
      })(),
    );
    return;
  }

  // Icons, fonts and other public files: stale-while-revalidate.
  if (/\.(png|svg|ico|webmanifest|woff2?)$/.test(url.pathname) || url.pathname === "/manifest.webmanifest") {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || network;
      }),
    );
  }
});
