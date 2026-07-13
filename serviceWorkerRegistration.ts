async function removeLegacyRegistrations() {
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

async function removeLegacyCaches() {
  if (!('caches' in window)) return;

  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName.startsWith('portfolio-'))
      .map((cacheName) => caches.delete(cacheName))
  );
}

export function cleanupLegacyServiceWorker() {
  if (!import.meta.env.PROD) return;

  const cleanup = async () => {
    const results = await Promise.allSettled([
      removeLegacyRegistrations(),
      removeLegacyCaches(),
    ]);

    results.forEach((result) => {
      if (result.status === 'rejected') {
        console.warn('Legacy service worker cleanup failed:', result.reason);
      }
    });
  };

  if (document.readyState === 'complete') {
    void cleanup();
  } else {
    window.addEventListener('load', () => void cleanup(), { once: true });
  }
}
