/* Vanguard service worker — offline shell and public guidance caching.
 * Privacy rule: only PUBLIC pages are cached as HTML. Authenticated pages are never
 * stored by the service worker; personal data for offline use lives encrypted in IndexedDB. */
const VERSION = "v1";
const SHELL = `vanguard-shell-${VERSION}`;
const PAGES = `vanguard-pages-${VERSION}`;
const ASSETS = `vanguard-assets-${VERSION}`;
const PRECACHE = ["/offline", "/guides", "/guides/typhoon", "/guides/earthquake", "/guides/flood", "/guides/volcano", "/guides/landslide", "/guides/fire", "/guides/tsunami", "/guides/general", "/manifest.webmanifest", "/icons/icon-192.png"];
const PUBLIC_PAGE = /^\/(offline|guides(\/[a-z]+)?|about\/privacy)?$/;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await Promise.all(PRECACHE.map((u) => cache.add(new Request(u, { cache: "reload", credentials: "omit" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("vanguard-") && !k.endsWith(VERSION)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // Immutable build assets: cache-first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(woff2?|png|svg|ico)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok) (await caches.open(ASSETS)).put(req, res.clone());
      return res;
    })());
    return;
  }

  // Page navigations: network-first. Cache public pages only; fall back to /offline.
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok && PUBLIC_PAGE.test(url.pathname)) (await caches.open(PAGES)).put(url.pathname, res.clone());
        return res;
      } catch {
        return (await caches.match(url.pathname)) || (await caches.match("/offline")) || new Response("<h1>Offline</h1><p>Call 911 in an emergency.</p>", { headers: { "content-type": "text/html" } });
      }
    })());
  }
});
