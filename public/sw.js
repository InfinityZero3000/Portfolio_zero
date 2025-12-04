// Service Worker for caching and offline support
const CACHE_NAME = 'portfolio-v1';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/assets/js/index.js',
  '/assets/css/index.css'
];

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
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

  event.respondWith(
    // Network first strategy with timeout
    Promise.race([
      fetch(request).then((response) => {
        // Clone response for caching
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 3000)
      )
    ]).catch(() => {
      // Fallback to cache
      return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Network error', {
          status: 408,
          statusText: 'Network timeout'
        });
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
