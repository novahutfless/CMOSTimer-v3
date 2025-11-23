
const CACHE_NAME = 'cmostimer-v1';

// Install event - skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Fetch event - Runtime caching strategy (Stale-while-revalidate)
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests or non-GET requests
  if (!event.request.url.startsWith(self.location.origin) || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Update the cache with the new network response
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Network failed, nothing to do here specifically for now
        });

        // Return cached response if available, otherwise wait for network
        return response || fetchPromise;
      });
    })
  );
});
