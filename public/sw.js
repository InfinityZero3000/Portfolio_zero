// Service Worker for caching and offline support
const CACHE_NAME = 'portfolio-v2';
const CACHE_DURATION = 3 * 24 * 60 * 60 * 1000; // 3 days
const CACHE_TIMESTAMP_HEADER = 'sw-cache-timestamp';

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/index.html'
];

const withCacheTimestamp = async (response) => {
  const headers = new Headers(response.headers);
  headers.set(CACHE_TIMESTAMP_HEADER, String(Date.now()));
  const body = await response.clone().arrayBuffer();

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const cacheResponse = async (request, response) => {
  if (response.status !== 200) return;

  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, await withCacheTimestamp(response));
  } catch (err) {
    console.error('Failed to cache response:', err);
  }
};

const getFreshCachedResponse = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  if (!cachedResponse) return null;

  const cachedAt = Number(cachedResponse.headers.get(CACHE_TIMESTAMP_HEADER));
  if (cachedAt && Date.now() - cachedAt <= CACHE_DURATION) {
    return cachedResponse;
  }

  await cache.delete(request);
  return null;
};

const deleteExpiredEntries = async () => {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();

  await Promise.all(
    requests.map(async (request) => {
      const cachedResponse = await cache.match(request);
      const cachedAt = Number(cachedResponse?.headers.get(CACHE_TIMESTAMP_HEADER));
      if (!cachedAt || Date.now() - cachedAt > CACHE_DURATION) {
        await cache.delete(request);
      }
    })
  );
};

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        PRECACHE_ASSETS.map(async (asset) => {
          const response = await fetch(asset, { cache: 'reload' });
          if (response.ok) {
            await cache.put(asset, await withCacheTimestamp(response));
          }
        })
      ).catch((err) => {
        console.error('Failed to precache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return deleteExpiredEntries();
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, then cache with timeout
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and external CDN requests
  if (request.url.startsWith('chrome-extension://') || 
      request.url.includes('unpkg.com') ||
      request.url.includes('cdn.')) {
    return;
  }

  let cacheWrite = Promise.resolve();
  const networkFetch = fetch(request).then((response) => {
    // Clone response for caching
    if (response.status === 200) {
      cacheWrite = cacheResponse(request, response.clone());
    }
    return response;
  });

  event.waitUntil(networkFetch.then(() => cacheWrite).catch(() => undefined));

  event.respondWith(
    // Network first strategy with timeout
    Promise.race([
      networkFetch,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 3000)
      )
    ]).catch(async () => {
      // Fallback to cache
      const cachedResponse = await getFreshCachedResponse(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Return offline page for navigation requests
      if (request.mode === 'navigate') {
        const indexResponse = await getFreshCachedResponse('/index.html');
        if (indexResponse) return indexResponse;
      }

      return new Response('Network error', {
        status: 408,
        statusText: 'Network timeout'
      });
    })
  );
});

// Message event - handle cache clearing
self.addEventListener('message', (event) => {
  if (event.data === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});
