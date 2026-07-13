// Retire the legacy offline cache. Fingerprinted assets are cached by the CDN.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('portfolio-'))
          .map((cacheName) => caches.delete(cacheName))
      );
      await self.clients.claim();
      await self.registration.unregister();
    })()
  );
});
