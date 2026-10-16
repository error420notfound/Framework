const CACHE_NAME = "formwork-pwa-v1";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const appUrl = self.registration.scope;
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([
      appUrl,
      new URL("manifest.webmanifest", appUrl),
      new URL("apple-touch-icon.png", appUrl),
      new URL("icons/icon-192.png", appUrl),
      new URL("icons/icon-512.png", appUrl),
    ]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("formwork-pwa-") && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const appUrl = self.registration.scope;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin || !request.url.startsWith(appUrl)) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(appUrl, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(appUrl)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return Response.error();
    }
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "PRECACHE_ASSETS" || !Array.isArray(event.data.urls)) return;
  event.waitUntil((async () => {
    const appUrl = self.registration.scope;
    const cache = await caches.open(CACHE_NAME);
    const urls = event.data.urls.filter((value) => {
      if (typeof value !== "string") return false;
      try {
        const asset = new URL(value);
        return asset.origin === self.location.origin && asset.href.startsWith(appUrl);
      } catch {
        return false;
      }
    });
    await Promise.all(urls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) await cache.put(url, response);
      } catch {
        // A temporarily unavailable asset can be cached on its next request.
      }
    }));
  })());
});
