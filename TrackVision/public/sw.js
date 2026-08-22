const CACHE_NAME = 'trackvision-v2.1.0';
const MODEL_CACHE = 'trackvision-models-v2';

// Files to cache for offline fallback
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Model files to cache
const MODEL_FILES = [
  '/models/yolov8n.onnx'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== MODEL_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET and HEAD requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Network-First for HTML / Navigation to avoid stale HTML with old asset hashes
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request) || caches.match('/index.html'))
    );
    return;
  }

  // Cache model files with "stale-while-revalidate" strategy
  if (url.pathname.startsWith('/models/')) {
    event.respondWith(
      caches.open(MODEL_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        
        // Fetch fresh version in background if online
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => null);
        
        return cachedResponse || fetchPromise || new Response('Model not available offline', { status: 503 });
      })
    );
    return;
  }
  
  // Assets with hashes (/assets/...) - Cache first with network fallback
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }
  
  // Default: Network first with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Handle model preloading
self.addEventListener('message', (event) => {
  if (event.data?.type === 'PRELOAD_MODELS') {
    event.waitUntil(
      caches.open(MODEL_CACHE).then((cache) => {
        return Promise.all(
          MODEL_FILES.map((file) =>
            fetch(file)
              .then((res) => {
                if (res.ok) return cache.put(file, res);
              })
              .catch(() => {})
          )
        );
      })
    );
  }
});