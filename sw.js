// Service Worker for PWA functionality
const VERSION = '1.0.0';
const CACHE_NAME = `nearbychat-v${VERSION}`;
const DATA_CACHE_NAME = `nearbychat-data-v${VERSION}`;

// Critical resources that must be cached
const CORE_CACHE_URLS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/css/styles.css',
    '/assets/js/location.js',
    '/assets/js/messaging.js',
    '/assets/js/ui.js',
    '/assets/js/app.js'
];

// Optional resources
const OPTIONAL_CACHE_URLS = [
    '/assets/icons/icon-192x192.png',
    '/assets/icons/icon-512x512.png',
    '/assets/icons/icon-72x72.png',
    '/assets/icons/icon-96x96.png',
    '/assets/icons/icon-128x128.png',
    '/assets/icons/icon-144x144.png',
    '/assets/icons/icon-152x152.png',
    '/assets/icons/icon-384x384.png'
];

// Install event - cache resources with error handling
self.addEventListener('install', (event) => {
    console.log(`Service Worker ${VERSION} installing...`);
    
    event.waitUntil(
        (async () => {
            try {
                const cache = await caches.open(CACHE_NAME);
                console.log(`Cache ${CACHE_NAME} opened`);
                
                // Cache core resources first (critical)
                await cache.addAll(CORE_CACHE_URLS);
                console.log('Core resources cached successfully');
                
                // Cache optional resources (non-critical)
                try {
                    await cache.addAll(OPTIONAL_CACHE_URLS);
                    console.log('Optional resources cached successfully');
                } catch (error) {
                    console.warn('Some optional resources failed to cache:', error);
                    // Continue anyway - app can work without icons
                }
                
                // Skip waiting to activate new service worker immediately
                self.skipWaiting();
                
            } catch (error) {
                console.error('Service worker installation failed:', error);
                throw error;
            }
        })()
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log(`Service Worker ${VERSION} activating...`);
    
    event.waitUntil(
        (async () => {
            try {
                const cacheNames = await caches.keys();
                const cachesToDelete = cacheNames.filter(cacheName => {
                    return cacheName.startsWith('nearbychat-') && 
                           cacheName !== CACHE_NAME && 
                           cacheName !== DATA_CACHE_NAME;
                });
                
                await Promise.all(
                    cachesToDelete.map(cacheName => {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
                
                // Take control of all clients
                await self.clients.claim();
                
                console.log(`Service Worker ${VERSION} activated successfully`);
                
            } catch (error) {
                console.error('Service worker activation failed:', error);
            }
        })()
    );
});

// Fetch event - enhanced caching strategies
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }
    
    event.respondWith(
        (async () => {
            try {
                const cache = await caches.open(CACHE_NAME);
                const cachedResponse = await cache.match(event.request);
                
                // For core resources, serve from cache first
                if (cachedResponse && isCoreResource(event.request.url)) {
                    // Update cache in background for next time
                    updateCacheInBackground(event.request);
                    return cachedResponse;
                }
                
                // For other resources, try network first, fallback to cache
                try {
                    const networkResponse = await fetch(event.request);
                    
                    // Cache successful responses
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        const responseToCache = networkResponse.clone();
                        await cache.put(event.request, responseToCache);
                    }
                    
                    return networkResponse;
                } catch (networkError) {
                    console.warn('Network request failed, serving from cache:', event.request.url);
                    
                    // Return cached version if available
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    
                    // Return offline page for navigation requests
                    if (event.request.mode === 'navigate') {
                        return cache.match('/') || new Response('App is offline', { status: 503 });
                    }
                    
                    throw networkError;
                }
                
            } catch (error) {
                console.error('Fetch event error:', error);
                return new Response('Service temporarily unavailable', { status: 503 });
            }
        })()
    );
});

// Helper function to check if URL is a core resource
function isCoreResource(url) {
    return CORE_CACHE_URLS.some(coreUrl => url.endsWith(coreUrl));
}

// Update cache in background
async function updateCacheInBackground(request) {
    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response);
        }
    } catch (error) {
        console.warn('Background cache update failed:', error);
    }
}

// Background sync for messages (if supported)
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync-messages') {
        event.waitUntil(
            (async () => {
                try {
                    console.log('Background sync triggered for messages');
                    // In a real implementation, this would sync queued messages
                    const clients = await self.clients.matchAll();
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'BACKGROUND_SYNC',
                            tag: event.tag
                        });
                    });
                } catch (error) {
                    console.error('Background sync failed:', error);
                }
            })()
        );
    }
});

// Message handling for client communication
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Push notifications (if implemented later)
self.addEventListener('push', (event) => {
    const title = 'NearbyChat';
    const options = {
        body: event.data ? event.data.text() : 'New message received',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-72x72.png',
        tag: 'nearbychat-notification',
        requireInteraction: false,
        silent: false
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        (async () => {
            try {
                const clientList = await clients.matchAll({
                    type: 'window',
                    includeUncontrolled: true
                });
                
                // Try to focus existing window
                for (const client of clientList) {
                    if (client.url.includes(location.origin) && 'focus' in client) {
                        await client.focus();
                        return;
                    }
                }
                
                // Open new window if none exists
                if (clients.openWindow) {
                    await clients.openWindow('/');
                }
            } catch (error) {
                console.error('Notification click handling failed:', error);
            }
        })()
    );
});

// Error reporting
self.addEventListener('error', (event) => {
    console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker unhandled rejection:', event.reason);
    event.preventDefault();
});

// Performance monitoring
let performanceMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    networkRequests: 0
};

// Log performance metrics periodically
setInterval(() => {
    if (performanceMetrics.networkRequests > 0) {
        console.log('SW Performance:', performanceMetrics);
    }
}, 5 * 60 * 1000); // Every 5 minutes